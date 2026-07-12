// The USF semantic compiler.
//
// JavaScript owns orchestration only. The graph under v2/usf/graph owns all
// meaning: ontology, vocabulary, SHACL constraints, derivation rules,
// integrity invariants and readiness. Nothing here duplicates that meaning,
// and authored graph files are never modified during normal execution.

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  authoredLoadList,
  observedLoadList,
  shapesGraph,
  managedGraphs,
  derivationRules,
  integrityRule,
  DERIVATION_ORDER,
} from './manifest.js';
import { collectObservedEntry } from './source-observer.js';

export class CompilerError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CompilerError';
    Object.assign(this, details);
  }
}

// Forbidden content that must never appear in graph data. These are generic
// detectors (work-tracking, repository and source-control markers), not
// references to any specific item. The shapes graph legitimately contains
// these strings as its own SHACL detectors, so it is always excluded from
// contamination scans.
export const CONTAMINATION_PATTERNS = Object.freeze([
  'linear\\.app',
  'github\\.com',
  'gitlab\\.com',
  'USF-[0-9]',
  'issueId',
  'projectId',
  'branchName',
  'commitSha',
  'refs/heads',
]);
const CONTAMINATION_RE = new RegExp(CONTAMINATION_PATTERNS.join('|'));
// Backslashes must be doubled so the SPARQL string literal yields the intended
// regex (e.g. `linear\.app`) rather than an invalid `\.` string escape.
const SPARQL_CONTAMINATION = CONTAMINATION_PATTERNS.join('|').replace(/\\/g, '\\\\');
const SHAPES_GRAPH_MARKER = 'urn:usf:graph:shapes';

const readText = (p) => readFileSync(p, 'utf8');

// --- Local, offline checks -------------------------------------------------

// Recursively list loadable graph files (*.ttl / *.trig / *.rq) under root.
function listLoadable(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) walk(full);
      else if (/\.(ttl|trig|rq)$/.test(name.name)) out.push(full);
    }
  };
  walk(root);
  return out;
}

export function checkLocal(manifest) {
  const failures = [];
  const fail = (m) => failures.push(m);

  const all = [
    ...manifest.definitions,
    ...manifest.authored,
    ...manifest.observed,
    ...manifest.shapes,
    ...manifest.rules,
    ...manifest.derived,
  ];

  // Every registered file exists, is a regular file, and is non-empty.
  for (const e of all) {
    if (e.collector && !e.path) continue;
    let st;
    try {
      st = statSync(e.path);
    } catch {
      fail(`registered file missing: ${e.file}`);
      continue;
    }
    if (!st.isFile()) fail(`registered path is not a file: ${e.file}`);
    else if (readText(e.path).trim().length === 0) fail(`registered file is empty: ${e.file}`);
  }

  // No unregistered loadable file exists outside the fixtures directory.
  const registered = new Set(all.map((e) => e.path).filter(Boolean));
  const fixturesRoot = manifest.fixtures
    ? join(manifest.root, 'fixtures')
    : null;
  for (const path of listLoadable(manifest.root)) {
    if (registered.has(path)) continue;
    if (fixturesRoot && (path === fixturesRoot || path.startsWith(fixturesRoot + sep))) continue;
    fail(`unregistered loadable file: ${relative(manifest.root, path)}`);
  }

  // Graph IRIs of authored data are unique; derived IRIs are unique; the two
  // sets are disjoint (authored and derived are distinguishable).
  const authoredGraphs = authoredLoadList(manifest).map((e) => e.graph);
  const dupAuthored = authoredGraphs.filter((g, i) => authoredGraphs.indexOf(g) !== i);
  if (dupAuthored.length) fail(`duplicate authored graph IRI: ${[...new Set(dupAuthored)].join(', ')}`);

  const derivedGraphs = manifest.derived.map((d) => d.graph);
  const dupDerived = derivedGraphs.filter((g, i) => derivedGraphs.indexOf(g) !== i);
  if (dupDerived.length) fail(`duplicate derived graph IRI: ${[...new Set(dupDerived)].join(', ')}`);

  for (const g of authoredGraphs) {
    if (derivedGraphs.includes(g)) fail(`graph IRI used as both authored and derived: ${g}`);
  }
  const observedGraphs = observedLoadList(manifest).map((e) => e.graph);
  const duplicateObserved = observedGraphs.filter((g, i) => observedGraphs.indexOf(g) !== i);
  if (duplicateObserved.length) fail(`duplicate observed graph IRI: ${[...new Set(duplicateObserved)].join(', ')}`);
  for (const graph of observedGraphs) {
    if (authoredGraphs.includes(graph) || derivedGraphs.includes(graph)) fail(`observed graph IRI overlaps authored or derived graph: ${graph}`);
  }

  // Load order is deterministic: no repeated order among authored inputs.
  const orders = [...authoredLoadList(manifest), ...observedLoadList(manifest)].map((e) => e.order);
  if (orders.some((o, i) => orders.indexOf(o) !== i) || orders.some((o) => typeof o !== 'number')) {
    fail('authored load order is not a unique, total ordering');
  }

  // Rule order is deterministic and matches the one required derivation order.
  const ruleNames = derivationRules(manifest).map((r) => r.file.split('/').pop().replace('.rq', ''));
  if (ruleNames.join(',') !== DERIVATION_ORDER.join(',')) {
    fail(`derivation rule order is ${ruleNames.join(',')}, expected ${DERIVATION_ORDER.join(',')}`);
  }
  if (!integrityRule(manifest)) fail('no integrity rule registered');

  // Each rule output is a registered derived graph (no rule writes elsewhere).
  for (const r of derivationRules(manifest)) {
    if (!derivedGraphs.includes(r.output)) fail(`rule ${r.file} targets unregistered graph ${r.output}`);
  }

  // Fixture data is never treated as authority.
  if (manifest.fixtures && manifest.fixtures.loadAsAuthority) {
    fail('fixtures are marked loadAsAuthority: they must never be loaded as authority');
  }

  // Contamination scan of file contents (shapes files excluded — they are the
  // detectors and legitimately contain the patterns).
  for (const e of all) {
    if (e.role === 'shapes') continue;
    if (!e.path) continue;
    if (CONTAMINATION_RE.test(readText(e.path))) {
      fail(`forbidden content in graph file: ${e.file}`);
    }
  }

  if (failures.length) {
    throw new CompilerError('local checks failed', { phase: 'check', failures });
  }
  return {
    ok: true,
    files: all.length,
    authoredGraphs: authoredGraphs.length,
    derivedGraphs: derivedGraphs.length,
    observedGraphs: observedGraphs.length,
  };
}

// --- Deterministic operation plan -----------------------------------------

// The exact, ordered sequence of graph operations a compile performs. It is a
// pure function of the manifest, so two runs produce an identical plan — the
// basis of idempotence.
export function buildPlan(manifest) {
  const plan = [];
  for (const g of managedGraphs(manifest)) plan.push({ op: 'clear', graph: g });
  for (const e of authoredLoadList(manifest)) plan.push({ op: 'load', graph: e.graph, file: e.file });
  const sg = shapesGraph(manifest);
  for (const s of manifest.shapes) plan.push({ op: 'loadShapes', graph: sg, file: s.file });
  plan.push({ op: 'validate', state: 'authored' });
  for (const e of observedLoadList(manifest)) plan.push({ op: 'collectObserved', graph: e.graph, collector: e.collector });
  plan.push({ op: 'validate', state: 'observed' });
  for (const r of derivationRules(manifest)) plan.push({ op: 'derive', rule: r.file, graph: r.output });
  plan.push({ op: 'validate', state: 'derived' });
  plan.push({ op: 'integrity' });
  plan.push({ op: 'contamination' });
  plan.push({ op: 'verifyCounts' });
  plan.push({ op: 'commit' });
  return plan;
}

// --- Compile ---------------------------------------------------------------

// Concatenate every shape file into a single constraints document used for
// SHACL validation.
function shapeConstraints(manifest) {
  return manifest.shapes.map((s) => readText(s.path)).join('\n');
}

const countInTx = async (client, tx, graph) => {
  const rows = await client.selectInTx(
    tx,
    `SELECT (COUNT(*) AS ?c) WHERE { GRAPH <${graph}> { ?s ?p ?o } }`
  );
  return rows.length ? Number(rows[0].c.value) : 0;
};

export async function compile({ manifest, client, observedCollector = collectObservedEntry }) {
  checkLocal(manifest);
  await client.connectivity();

  const shapes = shapeConstraints(manifest);
  const integrity = integrityRule(manifest);
  const derivedTriples = {};
  const observed = {};
  let tx;

  try {
    tx = await client.begin();

    // Clear only registered named graphs — never the whole database.
    for (const g of managedGraphs(manifest)) await client.clearGraph(tx, g);

    // Load authored RDF in manifest order, then the SHACL shapes.
    for (const e of authoredLoadList(manifest)) {
      await client.addData(tx, readText(e.path), e.contentType, e.graph);
    }
    for (const s of manifest.shapes) {
      await client.addData(tx, readText(s.path), s.contentType, s.graph);
    }

    // Validate the authored state before deriving.
    if (!(await client.validateInTx(tx, shapes))) {
      const report = await client.reportInTx(tx, shapes);
      throw new CompilerError('authored state failed SHACL validation', { phase: 'validate:authored', report });
    }

    // Collect non-authoritative repository observations after authored state
    // validates, then load and validate them inside the same transaction.
    for (const entry of observedLoadList(manifest)) {
      const collection = await observedCollector({ manifest, entry });
      await client.addData(tx, collection.content, collection.contentType, entry.graph);
      observed[entry.graph] = {
        collector: entry.collector,
        sourceCount: collection.sourceCount,
        tripleCount: collection.tripleCount,
        observationSetDigest: collection.observationSetDigest,
        excludedCarrierPaths: collection.excludedCarrierPaths,
      };
    }
    if (!(await client.validateInTx(tx, shapes))) {
      const report = await client.reportInTx(tx, shapes);
      throw new CompilerError('observed state failed SHACL validation', { phase: 'validate:observed', report });
    }

    // Execute derivation rules in the required order. Rule text is used
    // verbatim (CONSTRUCT), and its output is inserted into the rule's
    // registered derived graph — orchestration, not re-authoring.
    for (const rule of derivationRules(manifest)) {
      const blocks = readText(rule.path).split('#---NEXT---#').map((b) => b.trim()).filter(Boolean);
      for (const block of blocks) {
        const turtle = await client.constructInTx(tx, block);
        if (turtle && turtle.trim()) await client.addData(tx, turtle, 'text/turtle', rule.output);
      }
      derivedTriples[rule.output] = await countInTx(client, tx, rule.output);
    }

    // Validate the derived state.
    if (!(await client.validateInTx(tx, shapes))) {
      const report = await client.reportInTx(tx, shapes);
      throw new CompilerError('derived state failed SHACL validation', { phase: 'validate:derived', report });
    }

    // Integrity invariants: the authored SELECT must return zero rows.
    const violations = await client.selectInTx(tx, readText(integrity.path));
    if (violations.length) {
      throw new CompilerError('integrity violations present', {
        phase: 'integrity',
        violations: violations.slice(0, 20).map((v) => ({
          rule: v.violation?.value,
          subject: v.subject?.value,
        })),
      });
    }

    // Contamination: no forbidden markers in any non-shapes graph.
    const contam = await client.selectInTx(
      tx,
      `SELECT (COUNT(*) AS ?c) WHERE {
         GRAPH ?g { ?s ?p ?o }
         FILTER(STR(?g) != "${SHAPES_GRAPH_MARKER}")
         FILTER(REGEX(CONCAT(STR(?s)," ",STR(?p)," ",STR(?o)), "${SPARQL_CONTAMINATION}"))
       }`
    );
    const contamCount = contam.length ? Number(contam[0].c.value) : 0;
    if (contamCount > 0) {
      throw new CompilerError('contaminated content present in graph data', {
        phase: 'contamination',
        count: contamCount,
      });
    }

    // Required-resource check: every authored graph and every derived graph
    // holds content.
    for (const e of authoredLoadList(manifest)) {
      if ((await countInTx(client, tx, e.graph)) === 0) {
        throw new CompilerError(`authored graph is empty after load: ${e.graph}`, {
          phase: 'verifyCounts',
        });
      }
    }
    for (const d of manifest.derived) {
      if ((await countInTx(client, tx, d.graph)) === 0) {
        throw new CompilerError(`derived graph is empty after derivation: ${d.graph}`, {
          phase: 'verifyCounts',
        });
      }
    }
    for (const entry of observedLoadList(manifest)) {
      if ((await countInTx(client, tx, entry.graph)) === 0) {
        throw new CompilerError(`observed graph is empty after collection: ${entry.graph}`, { phase: 'verifyCounts' });
      }
    }

    await client.commit(tx);
    return {
      ok: true,
      graphsCleared: managedGraphs(manifest).length,
      authoredLoaded: authoredLoadList(manifest).length,
      observedLoaded: observedLoadList(manifest).length,
      observed,
      shapesLoaded: manifest.shapes.length,
      derived: derivedTriples,
      contaminationCount: 0,
    };
  } catch (err) {
    if (tx) {
      try {
        await client.rollback(tx);
      } catch {
        // Rollback failure must not mask the original error; the transaction
        // is abandoned server-side regardless.
      }
    }
    if (err instanceof CompilerError) throw err;
    throw new CompilerError(err.message, { phase: 'compile' });
  }
}

// --- Verify (read-only) ----------------------------------------------------

export async function verify({ manifest, client }) {
  const database = manifest.database;
  const registeredGraphs = managedGraphs(manifest);
  const result = {
    database,
    reachable: false,
    graphCount: 0,
    tripleCount: 0,
    registeredGraphs,
    missingGraphs: [],
    unexpectedGraphs: [],
    validationConforms: null,
    integrityConforms: null,
    contaminationCount: null,
    readinessCount: null,
  };

  try {
    result.tripleCount = await client.size();
    result.reachable = true;
  } catch {
    return result; // unreachable: report what we know, leave checks null
  }

  const graphRows = await client.select(
    `SELECT ?g (COUNT(*) AS ?c) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?g`
  );
  const present = new Map(graphRows.map((r) => [r.g.value, Number(r.c.value)]));
  result.graphCount = present.size;
  result.missingGraphs = registeredGraphs.filter((g) => !present.has(g) || present.get(g) === 0);
  result.unexpectedGraphs = [...present.keys()].filter(
    (g) => g.startsWith('urn:usf:graph:') && !registeredGraphs.includes(g)
  );

  result.validationConforms = await client.validate(shapeConstraints(manifest));

  const integrity = integrityRule(manifest);
  const violations = await client.select(readText(integrity.path));
  result.integrityConforms = violations.length === 0;

  const contam = await client.select(
    `SELECT (COUNT(*) AS ?c) WHERE {
       GRAPH ?g { ?s ?p ?o }
       FILTER(STR(?g) != "${SHAPES_GRAPH_MARKER}")
       FILTER(REGEX(CONCAT(STR(?s)," ",STR(?p)," ",STR(?o)), "${SPARQL_CONTAMINATION}"))
     }`
  );
  result.contaminationCount = contam.length ? Number(contam[0].c.value) : 0;

  const readiness = await client.select(
    `SELECT (COUNT(?r) AS ?c) WHERE {
       GRAPH <urn:usf:graph:derived:readiness> { ?r a <urn:usf:ontology:Readiness> }
     }`
  );
  result.readinessCount = readiness.length ? Number(readiness[0].c.value) : 0;

  return result;
}
