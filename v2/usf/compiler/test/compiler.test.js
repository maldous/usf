// Unit tests for the USF semantic compiler.
//
// These never contact Stardog Cloud: the SDK adapter is replaced by a
// recording fake injected at the compiler boundary, and manifests are built in
// throwaway temp directories. Run with `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { loadConfig, describeConfig, ConfigError } from '../src/config.js';
import { loadManifest, managedGraphs, ManifestError } from '../src/manifest.js';
import { checkLocal, compile, buildPlan, CompilerError } from '../src/compiler.js';
import { createClient } from '../src/stardog.js';
import { loadAuthorityDataset } from '../src/authority-dataset.js';
import { buildGenerationPlan, requireCompleteGenerationPlan } from '../src/generation-plan.js';
import { canonicalGraphDigest, compareGraphDigests } from '../src/live-attestation.js';

// --- Fixtures --------------------------------------------------------------

// A minimal but structurally complete graph that passes all local checks.
function baseSpec() {
  const rule = (name) =>
    `PREFIX usf: <urn:usf:ontology:>\nCONSTRUCT { ?x a usf:${name} } WHERE { ?x a usf:Thing }\n`;
  return {
    'manifest.yaml': `version: 1
database: USF
baseIri: "urn:usf:"
definitionGraphs:
  - { file: ontology.ttl, graph: "urn:usf:graph:ontology", loadOrder: 1 }
authoredGraphs:
  - { file: providers.ttl, graph: "urn:usf:graph:providers", loadOrder: 2 }
shapeGraphs:
  - { file: shapes.ttl, graph: "urn:usf:graph:shapes" }
rules:
  - { file: rules/source-dispositions.rq, output: "urn:usf:graph:derived:sourcedispositions", kind: derivation }
  - { file: rules/obligations.rq, output: "urn:usf:graph:derived:obligations", kind: derivation }
  - { file: rules/evidence.rq, output: "urn:usf:graph:derived:evidence", kind: derivation }
  - { file: rules/surfaces.rq, output: "urn:usf:graph:derived:surfaces", kind: derivation }
  - { file: rules/coverage.rq, output: "urn:usf:graph:derived:coverage", kind: derivation }
  - { file: rules/readiness.rq, output: "urn:usf:graph:derived:readiness", kind: derivation }
  - { file: rules/integrity.rq, kind: integrity }
derivedGraphs:
  - { file: derived/source-dispositions.trig, graph: "urn:usf:graph:derived:sourcedispositions" }
  - { file: derived/obligations.trig, graph: "urn:usf:graph:derived:obligations" }
  - { file: derived/evidence.trig, graph: "urn:usf:graph:derived:evidence" }
  - { file: derived/surfaces.trig, graph: "urn:usf:graph:derived:surfaces" }
  - { file: derived/coverage.trig, graph: "urn:usf:graph:derived:coverage" }
  - { file: derived/readiness.trig, graph: "urn:usf:graph:derived:readiness" }
fixtures:
  conforming: fixtures/conforming
  defects: fixtures/defects
  loadAsAuthority: false
`,
    'ontology.ttl': '@prefix usf: <urn:usf:ontology:> .\nusf:Thing a <http://www.w3.org/2002/07/owl#Class> .\n',
    'providers.ttl': '@prefix usf: <urn:usf:> .\nusf:providers:acme a usf:ontology:Thing .\n',
    'shapes.ttl':
      '# SHACL detectors legitimately mention forbidden markers: github.com USF-1 commitSha\n@prefix sh: <http://www.w3.org/ns/shacl#> .\n',
    'rules/source-dispositions.rq': rule('SourceArtefactDisposition'),
    'rules/obligations.rq': rule('ProofObligation'),
    'rules/evidence.rq': rule('EvidenceRequirement'),
    'rules/surfaces.rq': rule('Surface'),
    'rules/coverage.rq': rule('Coverage'),
    'rules/readiness.rq': rule('Readiness'),
    'rules/integrity.rq':
      'SELECT ?violation ?subject WHERE { ?subject a ?t . BIND("x" AS ?violation) FILTER(false) }\n',
    'derived/source-dispositions.trig': '# placeholder derived source dispositions\n<urn:usf:x> a <urn:usf:ontology:SourceArtefactDisposition> .\n',
    'derived/obligations.trig': '@prefix usf: <urn:usf:ontology:> .\nGRAPH <urn:usf:graph:derived:obligations> { usf:x a usf:ProofObligation }\n',
    'derived/evidence.trig': '# placeholder derived evidence\n<urn:usf:x> a <urn:usf:ontology:EvidenceRequirement> .\n',
    'derived/surfaces.trig': '# placeholder derived surfaces\n<urn:usf:x> a <urn:usf:ontology:Surface> .\n',
    'derived/coverage.trig': '# placeholder derived coverage\n<urn:usf:x> a <urn:usf:ontology:Coverage> .\n',
    'derived/readiness.trig': '# placeholder derived readiness\n<urn:usf:x> a <urn:usf:ontology:Readiness> .\n',
    'fixtures/conforming/sample.ttl': '# fixture, never loaded as authority\n<urn:usf:x> a <urn:usf:ontology:Thing> .\n',
  };
}

// A validator asserting a CompilerError whose failure list mentions `substr`.
const hasFailure = (substr) => (e) =>
  e instanceof CompilerError && Array.isArray(e.failures) && e.failures.some((f) => f.includes(substr));

let dirs = [];
function writeGraph(spec) {
  const dir = mkdtempSync(join(tmpdir(), 'usf-graph-'));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(spec)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

function observedSpec() {
  const spec = baseSpec();
  spec['manifest.yaml'] = spec['manifest.yaml'].replace(
    'shapeGraphs:',
    'observedGraphs:\n  - { collector: repositorysourceobserver, graph: "urn:usf:graph:observed:sourceartefacts", loadOrder: 3 }\nshapeGraphs:'
  );
  return spec;
}

const observedCollector = async ({ entry }) => ({
  graph: entry.graph,
  contentType: 'text/turtle',
  content: '<urn:usf:source:s> <urn:usf:ontology:observedSourcePath> "x" .',
  sourceCount: 1,
  tripleCount: 1,
  observationSetDigest: 'a'.repeat(64),
});
test.after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

// A recording fake standing in for the SDK adapter.
function fakeClient(overrides = {}) {
  const rec = { cleared: [], added: [], committed: false, rolledBack: false, began: false };
  const client = {
    async connectivity() {
      return 0;
    },
    async begin() {
      rec.began = true;
      return 'tx-1';
    },
    async commit() {
      rec.committed = true;
    },
    async rollback() {
      rec.rolledBack = true;
    },
    async clearGraph(tx, graph) {
      assert.ok(graph, 'clearGraph must always receive a named graph');
      rec.cleared.push(graph);
    },
    async addData(tx, content, contentType, graph) {
      rec.added.push({ graph, contentType });
    },
    async constructInTx() {
      return '<urn:usf:x> a <urn:usf:ontology:ProofObligation> .';
    },
    async validateInTx() {
      return true;
    },
    async selectInTx(tx, q) {
      if (/REGEX/.test(q)) return [{ c: { value: '0' } }]; // contamination
      if (/\?violation/.test(q)) return []; // integrity: conforming
      return [{ c: { value: '5' } }]; // counts
    },
    async reportInTx() {
      return {};
    },
  };
  return { client: Object.assign(client, overrides), rec };
}

// --- config.js -------------------------------------------------------------

test('config: missing configuration is rejected', () => {
  assert.throws(() => loadConfig({}), ConfigError);
});

test('config: token authentication is accepted and takes precedence', () => {
  const c = loadConfig({
    STARDOG_SERVER: 'https://example.stardog.cloud:5820',
    STARDOG_DATABASE: 'USF',
    STARDOG_TOKEN: 'tok',
    STARDOG_USERNAME: 'u',
    STARDOG_PASSWORD: 'p',
  });
  assert.equal(c.auth.kind, 'token');
});

test('config: username and password authentication is accepted', () => {
  const c = loadConfig({
    STARDOG_SERVER: 'https://example.stardog.cloud:5820',
    STARDOG_USERNAME: 'u',
    STARDOG_PASSWORD: 'p',
  });
  assert.equal(c.auth.kind, 'basic');
  assert.equal(c.database, 'USF'); // documented default
});

test('config: a non-HTTPS endpoint is rejected', () => {
  assert.throws(
    () => loadConfig({ STARDOG_SERVER: 'http://example.stardog.cloud:5820', STARDOG_TOKEN: 't' }),
    ConfigError
  );
});

test('config: a localhost endpoint is rejected', () => {
  assert.throws(
    () => loadConfig({ STARDOG_SERVER: 'https://localhost:5820', STARDOG_TOKEN: 't' }),
    ConfigError
  );
});

test('config: credentials never appear in the describeConfig output', () => {
  const config = loadConfig({
    STARDOG_SERVER: 'https://example.stardog.cloud:5820',
    STARDOG_TOKEN: 'super-secret-token',
  });
  const described = describeConfig(config);
  const json = JSON.stringify(described);
  assert.ok(!json.includes('super-secret-token'));
  assert.deepEqual(Object.keys(described).sort(), ['authMode', 'database', 'endpoint']);
});

// --- manifest.js / checkLocal ---------------------------------------------

test('manifest: a missing manifest file throws', () => {
  assert.throws(() => loadManifest(join(tmpdir(), 'nope-does-not-exist')), Error);
});

test('manifest: a path escaping the graph directory is rejected', () => {
  const spec = baseSpec();
  spec['manifest.yaml'] = spec['manifest.yaml'].replace('file: ontology.ttl', 'file: ../ontology.ttl');
  const dir = writeGraph(spec);
  assert.throws(() => loadManifest(dir), ManifestError);
});

test('manifest: an unsupported (incorrect) content type is rejected', () => {
  const spec = baseSpec();
  spec['manifest.yaml'] = spec['manifest.yaml'].replace('file: ontology.ttl', 'file: ontology.md');
  spec['ontology.md'] = 'not rdf';
  const dir = writeGraph(spec);
  assert.throws(() => loadManifest(dir), ManifestError);
});

test('checkLocal: the base graph passes', () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  assert.equal(checkLocal(m).ok, true);
});

test('manifest: observed collector is registered separately from authority', () => {
  const manifest = loadManifest(writeGraph(observedSpec()));
  assert.equal(manifest.observed.length, 1);
  assert.equal(manifest.observed[0].collector, 'repositorysourceobserver');
  assert.equal(manifest.observed[0].path, null);
  assert.ok(managedGraphs(manifest).includes('urn:usf:graph:observed:sourceartefacts'));
});

test('checkLocal: a duplicate authored graph IRI fails', () => {
  const spec = baseSpec();
  spec['manifest.yaml'] = spec['manifest.yaml'].replace(
    '  - { file: providers.ttl, graph: "urn:usf:graph:providers", loadOrder: 2 }',
    '  - { file: providers.ttl, graph: "urn:usf:graph:providers", loadOrder: 2 }\n  - { file: providers2.ttl, graph: "urn:usf:graph:providers", loadOrder: 3 }'
  );
  spec['providers2.ttl'] = '<urn:usf:providers:beta> a <urn:usf:ontology:Thing> .\n';
  const dir = writeGraph(spec);
  assert.throws(() => checkLocal(loadManifest(dir)), hasFailure('duplicate authored graph IRI'));
});

test('checkLocal: a non-deterministic (duplicate) load order fails', () => {
  const spec = baseSpec();
  spec['manifest.yaml'] = spec['manifest.yaml'].replace('loadOrder: 2', 'loadOrder: 1');
  const dir = writeGraph(spec);
  assert.throws(() => checkLocal(loadManifest(dir)), hasFailure('load order'));
});

test('checkLocal: an unexpected unregistered graph file fails', () => {
  const spec = baseSpec();
  spec['stray.ttl'] = '<urn:usf:x> a <urn:usf:ontology:Thing> .\n';
  const dir = writeGraph(spec);
  assert.throws(() => checkLocal(loadManifest(dir)), hasFailure('unregistered loadable file'));
});

test('checkLocal: a derived graph treated as authored fails', () => {
  const spec = baseSpec();
  spec['manifest.yaml'] = spec['manifest.yaml'].replace(
    '  - { file: providers.ttl, graph: "urn:usf:graph:providers", loadOrder: 2 }',
    '  - { file: providers.ttl, graph: "urn:usf:graph:derived:obligations", loadOrder: 2 }'
  );
  const dir = writeGraph(spec);
  assert.throws(() => checkLocal(loadManifest(dir)), hasFailure('both authored and derived'));
});

test('checkLocal: forbidden contamination in an authored file fails', () => {
  const spec = baseSpec();
  spec['providers.ttl'] = '<urn:usf:x> <urn:usf:ontology:src> "see https://github.com/acme/repo" .\n';
  const dir = writeGraph(spec);
  assert.throws(() => checkLocal(loadManifest(dir)), hasFailure('forbidden content'));
});

test('checkLocal: the same markers inside the shapes file are allowed', () => {
  const spec = baseSpec();
  spec['shapes.ttl'] = '@prefix sh: <http://www.w3.org/ns/shacl#> .\n# detects github.com and USF-1 and commitSha\nsh:x a sh:NodeShape .\n';
  const dir = writeGraph(spec);
  assert.equal(checkLocal(loadManifest(dir)).ok, true);
});

// --- compile (mocked SDK) --------------------------------------------------

test('compile: only manifest-registered graphs are cleared, and never the whole database', async () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  const { client, rec } = fakeClient();
  await compile({ manifest: m, client });
  assert.deepEqual([...rec.cleared].sort(), [...managedGraphs(m)].sort());
  // The adapter exposes no whole-database clear operation.
  assert.equal(typeof client.clearDatabase, 'undefined');
});

test('compile: commits after full success', async () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  const { client, rec } = fakeClient();
  const result = await compile({ manifest: m, client });
  assert.equal(result.ok, true);
  assert.equal(rec.committed, true);
  assert.equal(rec.rolledBack, false);
});

test('compile: observed state is collected and validated inside the transaction', async () => {
  const manifest = loadManifest(writeGraph(observedSpec()));
  const { client, rec } = fakeClient();
  const result = await compile({ manifest, client, observedCollector });
  assert.equal(result.observedLoaded, 1);
  assert.equal(result.observed['urn:usf:graph:observed:sourceartefacts'].sourceCount, 1);
  assert.ok(rec.cleared.includes('urn:usf:graph:observed:sourceartefacts'));
  assert.ok(rec.added.some((entry) => entry.graph === 'urn:usf:graph:observed:sourceartefacts'));
  assert.equal(rec.committed, true);
});

test('compile: observed collection failure rolls back', async () => {
  const manifest = loadManifest(writeGraph(observedSpec()));
  const { client, rec } = fakeClient();
  await assert.rejects(
    compile({ manifest, client, observedCollector: async () => { throw new Error('collector failed'); } }),
    (error) => error instanceof CompilerError && error.phase === 'compile'
  );
  assert.equal(rec.rolledBack, true);
  assert.equal(rec.committed, false);
});

test('compile: observed validation failure rolls back', async () => {
  const manifest = loadManifest(writeGraph(observedSpec()));
  let validations = 0;
  const { client, rec } = fakeClient({ validateInTx: async () => (++validations) !== 2 });
  await assert.rejects(
    compile({ manifest, client, observedCollector }),
    (error) => error instanceof CompilerError && error.phase === 'validate:observed'
  );
  assert.equal(rec.rolledBack, true);
  assert.equal(rec.committed, false);
});

test('compile: rolls back after a load failure', async () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  const { client, rec } = fakeClient({
    async addData() {
      throw new Error('load boom');
    },
  });
  await assert.rejects(() => compile({ manifest: m, client }), CompilerError);
  assert.equal(rec.rolledBack, true);
  assert.equal(rec.committed, false);
});

test('compile: rolls back after a validation failure', async () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  const { client, rec } = fakeClient({
    async validateInTx() {
      return false;
    },
  });
  await assert.rejects(() => compile({ manifest: m, client }), /SHACL validation/);
  assert.equal(rec.rolledBack, true);
  assert.equal(rec.committed, false);
});

test('compile: rolls back after a derivation failure', async () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  const { client, rec } = fakeClient({
    async constructInTx() {
      throw new Error('derive boom');
    },
  });
  await assert.rejects(() => compile({ manifest: m, client }), CompilerError);
  assert.equal(rec.rolledBack, true);
  assert.equal(rec.committed, false);
});

test('compile: rolls back after an integrity violation', async () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  const { client, rec } = fakeClient({
    async selectInTx(tx, q) {
      if (/REGEX/.test(q)) return [{ c: { value: '0' } }];
      if (/\?violation/.test(q)) return [{ violation: { value: 'hyphenatedidentifier' }, subject: { value: 'urn:usf:bad_name' } }];
      return [{ c: { value: '5' } }];
    },
  });
  await assert.rejects(() => compile({ manifest: m, client }), /integrity/);
  assert.equal(rec.rolledBack, true);
});

test('compile: an error never carries the token', async () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  const { client } = fakeClient({
    async addData() {
      throw new Error('network error at https://example.stardog.cloud:5820');
    },
  });
  await assert.rejects(
    () => compile({ manifest: m, client }),
    (e) => !JSON.stringify({ m: e.message, ...e }).includes('super-secret-token')
  );
});

test('buildPlan: repeated compilation produces an identical operation plan', () => {
  const dir = writeGraph(baseSpec());
  const m = loadManifest(dir);
  assert.deepEqual(buildPlan(m), buildPlan(m));
  // Evidence is derived before readiness; commit is last; no whole-db clear.
  const ops = buildPlan(m);
  const kinds = ops.map((o) => o.op);
  assert.ok(kinds.indexOf('derive') !== -1);
  assert.equal(ops[ops.length - 1].op, 'commit');
  assert.ok(!ops.some((o) => o.op === 'clear' && !o.graph));
});

test('adapter: createClient exposes no whole-database clear', () => {
  const client = createClient(
    loadConfig({ STARDOG_SERVER: 'https://example.stardog.cloud:5820', STARDOG_TOKEN: 't' })
  );
  assert.equal(typeof client.clearDatabase, 'undefined');
  assert.equal(typeof client.clearGraph, 'function');
});

test('generation plan fails closed when graph authority has no artefact plans', () => {
  const dir = writeGraph(baseSpec());
  const dataset = loadAuthorityDataset(loadManifest(dir));
  const plan = buildGenerationPlan(dataset.store);
  assert.equal(plan.complete, false);
  assert.ok(plan.obligations.some((item) => item.kind === 'missing-artefact-plans'));
  assert.throws(() => requireCompleteGenerationPlan(dataset.store), /generation plan is incomplete/);
});

test('generation plan requires executable ownership and detects path collisions', () => {
  const spec = baseSpec();
  spec['providers.ttl'] = `@prefix usf: <urn:usf:ontology:> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
<urn:usf:repository:foundation> a usf:Repository .
<urn:usf:artefactplan:a> a usf:ArtefactPlan ; usf:ownedByRepository <urn:usf:repository:foundation> ; usf:plansArtefact <urn:usf:artefact:a> .
<urn:usf:artefactplan:b> a usf:ArtefactPlan ; usf:ownedByRepository <urn:usf:repository:foundation> ; usf:plansArtefact <urn:usf:artefact:b> .
<urn:usf:artefact:a> a usf:Artefact ; usf:canonicalPath "contracts/index.json" ; usf:artefactKind <urn:usf:artefactkind:contract> ; usf:governedByPathRule <urn:usf:pathrule:a> ; usf:generatedByComponent <urn:usf:generator:a> .
<urn:usf:artefact:b> a usf:Artefact ; usf:canonicalPath "contracts/index.json" ; usf:artefactKind <urn:usf:artefactkind:contract> ; usf:governedByPathRule <urn:usf:pathrule:b> ; usf:generatedByComponent <urn:usf:generator:a> .
<urn:usf:pathrule:a> usf:pathPattern "contracts/index.json" .
<urn:usf:pathrule:b> usf:pathPattern "contracts/index.json" .
<urn:usf:generator:a> usf:semanticInputQuery "SELECT ?resource WHERE { ?resource a <urn:usf:ontology:SemanticContract> . }" ; usf:outputSchema <urn:usf:artefact:a> ; usf:outputPathRule <urn:usf:pathrule:a> ; usf:integrityPolicy <urn:usf:policy:integrity> ; usf:normalisationPolicy <urn:usf:policy:normalisation> ; usf:missingSemanticsConstraint <urn:usf:constraint:missing> ; usf:requiresEquivalenceKind <urn:usf:equivalencekind:semantic> .
`;
  const plan = buildGenerationPlan(loadAuthorityDataset(loadManifest(writeGraph(spec))).store);
  assert.equal(plan.complete, false);
  assert.ok(plan.obligations.some((item) => item.kind === 'path-collision'));
});

test('live attestation: RDF canonicalization ignores blank-node labels', async () => {
  const left = '_:left <urn:usf:p> "value" .\n';
  const right = '_:unrelated <urn:usf:p> "value" .\n';
  assert.deepEqual(await canonicalGraphDigest(left), await canonicalGraphDigest(right));
});

test('live attestation: graph comparison reports missing, unexpected and mismatched graphs', () => {
  const source = [
    { graph: 'urn:g:a', sha256: 'a', triples: 1 },
    { graph: 'urn:g:b', sha256: 'b', triples: 2 },
  ];
  const database = [
    { graph: 'urn:g:a', sha256: 'changed', triples: 1 },
    { graph: 'urn:g:c', sha256: 'c', triples: 3 },
  ];
  assert.deepEqual(compareGraphDigests(source, database), {
    missingGraphs: ['urn:g:b'],
    unexpectedGraphs: ['urn:g:c'],
    mismatchedGraphs: ['urn:g:a'],
  });
});
