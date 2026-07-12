import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { DataFactory, Parser, Writer } from 'n3';
import * as rdfCanonize from 'rdf-canonize';

import { authoredLoadList, managedGraphs } from './manifest.js';
import { compile, CompilerError, verify as verifyDatabase } from './compiler.js';

const { blankNode, defaultGraph, quad } = DataFactory;
const NQUADS = 'application/n-quads';
const REPOSITORY_BINDING_EXCLUSIONS = Object.freeze(['v2/usf/census/closure.json']);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export const stableJson = (value) => JSON.stringify(stable(value));

function nquadsFor(quads) {
  return new Promise((resolveOutput, reject) => {
    const writer = new Writer({ format: 'N-Quads' });
    writer.addQuads(quads);
    writer.end((error, output) => error ? reject(error) : resolveOutput(output));
  });
}

export async function canonicalGraphDigest(nquads) {
  const canonical = await rdfCanonize.canonize(nquads, {
    algorithm: 'URDNA2015',
    inputFormat: NQUADS,
    format: NQUADS,
  });
  return {
    algorithm: 'URDNA2015',
    digestAlgorithm: 'sha256',
    sha256: sha256(canonical),
    triples: canonical.split('\n').filter(Boolean).length,
  };
}

function scopeBlankNodes(parsed, scope) {
  const ids = new Map();
  const scoped = (term) => {
    if (term.termType !== 'BlankNode') return term;
    if (!ids.has(term.value)) ids.set(term.value, blankNode(`${scope}_${ids.size}`));
    return ids.get(term.value);
  };
  return parsed.map((item) => quad(
    scoped(item.subject),
    item.predicate,
    scoped(item.object),
    defaultGraph(),
  ));
}

function graphEntries(manifest) {
  return [...authoredLoadList(manifest), ...manifest.shapes, ...manifest.derived];
}

export async function localGraphDigests(manifest) {
  const grouped = new Map(managedGraphs(manifest).map((graph) => [graph, []]));
  for (const [index, entry] of graphEntries(manifest).entries()) {
    const parsed = new Parser({ format: entry.contentType, baseIRI: 'urn:usf:' })
      .parse(readFileSync(entry.path, 'utf8'));
    grouped.get(entry.graph).push(...scopeBlankNodes(parsed, `f${index}`));
  }
  const records = [];
  for (const graph of [...grouped.keys()].sort()) {
    records.push({ graph, ...await canonicalGraphDigest(await nquadsFor(grouped.get(graph))) });
  }
  return records;
}

export async function liveGraphDigests(manifest, client) {
  const records = [];
  for (const graph of [...managedGraphs(manifest)].sort()) {
    const content = await client.construct(
      `CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <${graph}> { ?s ?p ?o } }`,
      NQUADS,
    );
    records.push({ graph, ...await canonicalGraphDigest(content) });
  }
  return records;
}

export function compareGraphDigests(source, database) {
  const expected = new Map(source.map((item) => [item.graph, item]));
  const observed = new Map(database.map((item) => [item.graph, item]));
  return {
    missingGraphs: [...expected.keys()].filter((graph) => !observed.has(graph)).sort(),
    unexpectedGraphs: [...observed.keys()].filter((graph) => !expected.has(graph)).sort(),
    mismatchedGraphs: [...expected.keys()].filter((graph) =>
      observed.has(graph) && (
        expected.get(graph).sha256 !== observed.get(graph).sha256 ||
        expected.get(graph).triples !== observed.get(graph).triples
      )
    ).sort(),
  };
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: null, maxBuffer: 128 * 1024 * 1024 });
}

export function repositoryState(repoRoot) {
  const root = realpathSync(repoRoot);
  const paths = git(root, ['ls-files', '-co', '--exclude-standard', '-z'])
    .toString('utf8').split('\0').filter(Boolean)
    .filter((item) => !REPOSITORY_BINDING_EXCLUSIONS.includes(item)).sort();
  const accumulator = createHash('sha256');
  for (const path of paths) {
    const absolute = resolve(root, path);
    const content = !existsSync(absolute)
      ? Buffer.from('deleted')
      : lstatSync(absolute).isSymbolicLink()
        ? Buffer.from(`symlink:${readlinkSync(absolute)}`)
        : readFileSync(absolute);
    accumulator.update(path).update('\0').update(sha256(content)).update('\n');
  }
  const statusEntries = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    .toString('utf8').split('\0').filter(Boolean);
  const includedStatus = [];
  for (let index = 0; index < statusEntries.length; index += 1) {
    const entry = statusEntries[index];
    const status = entry.slice(0, 2);
    const firstPath = entry.slice(3);
    const secondPath = status.includes('R') || status.includes('C') ? statusEntries[++index] : null;
    if (REPOSITORY_BINDING_EXCLUSIONS.includes(firstPath) || (secondPath && REPOSITORY_BINDING_EXCLUSIONS.includes(secondPath))) continue;
    includedStatus.push(entry);
    if (secondPath) includedStatus.push(secondPath);
  }
  const status = Buffer.from(includedStatus.join('\0'));
  return {
    gitHead: git(root, ['rev-parse', 'HEAD']).toString('utf8').trim(),
    files: paths.length,
    contentRootSha256: accumulator.digest('hex'),
    statusSha256: sha256(status),
    clean: status.length === 0,
    excludedPaths: [...REPOSITORY_BINDING_EXCLUSIONS],
  };
}

function registeredSourceFiles(manifest, repoRoot) {
  return graphEntries(manifest).map((entry) => ({
    path: relative(repoRoot, entry.path).split(sep).join('/'),
    sha256: sha256(readFileSync(entry.path)),
  })).sort((a, b) => a.path.localeCompare(b.path));
}

function fingerprint(publicKey) {
  return sha256(publicKey.export({ type: 'spki', format: 'der' }));
}

function outsideRepository(path, repoRoot) {
  const resolved = resolve(path);
  const rel = relative(realpathSync(repoRoot), resolved);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

export async function observeLiveDrift({ manifest, client }) {
  const sourceGraphDigests = await localGraphDigests(manifest);
  const databaseGraphDigests = await liveGraphDigests(manifest, client);
  const comparison = compareGraphDigests(sourceGraphDigests, databaseGraphDigests);
  return {
    conforms: comparison.missingGraphs.length === 0 &&
      comparison.unexpectedGraphs.length === 0 && comparison.mismatchedGraphs.length === 0,
    sourceGraphDigests,
    databaseGraphDigests,
    comparison,
  };
}

function verificationProjection(report) {
  return {
    reachable: report.reachable,
    graphCount: report.graphCount,
    tripleCount: report.tripleCount,
    missingGraphs: report.missingGraphs,
    unexpectedGraphs: report.unexpectedGraphs,
    validationConforms: report.validationConforms,
    integrityConforms: report.integrityConforms,
    contaminationCount: report.contaminationCount,
  };
}

function verificationPasses(report) {
  return report.reachable === true && report.validationConforms === true &&
    report.integrityConforms === true && report.contaminationCount === 0 &&
    report.missingGraphs.length === 0 && report.unexpectedGraphs.length === 0;
}

export async function proveLiveRollback({ manifest, client }) {
  const before = await liveGraphDigests(manifest, client);
  const firstAuthored = authoredLoadList(manifest)[0].graph;
  const faults = [
    ['load', () => ({ async addData() { throw new Error('injected load failure'); } })],
    ['validate-authored', () => {
      let calls = 0;
      return { async validateInTx(...args) { calls += 1; return calls === 1 ? false : client.validateInTx(...args); } };
    }],
    ['derive', () => ({ async constructInTx() { throw new Error('injected derivation failure'); } })],
    ['validate-derived', () => {
      let calls = 0;
      return { async validateInTx(...args) { calls += 1; return calls === 2 ? false : client.validateInTx(...args); } };
    }],
    ['integrity', () => ({
      async selectInTx(tx, query) {
        if (query.includes('?violation')) return [{ violation: { value: 'injected' }, subject: { value: 'urn:usf:injected' } }];
        return client.selectInTx(tx, query);
      },
    })],
    ['contamination', () => ({
      async selectInTx(tx, query) {
        if (query.includes('REGEX(CONCAT')) return [{ c: { value: '1' } }];
        return client.selectInTx(tx, query);
      },
    })],
    ['verify-counts', () => ({
      async selectInTx(tx, query) {
        if (query.includes(`GRAPH <${firstAuthored}>`) && query.includes('COUNT(*)')) return [{ c: { value: '0' } }];
        return client.selectInTx(tx, query);
      },
    })],
    ['commit', () => ({ async commit() { throw new Error('injected commit failure'); } })],
  ];
  const results = [];
  for (const [name, buildFault] of faults) {
    let rollbacks = 0;
    const faultClient = {
      ...client,
      ...buildFault(),
      async rollback(tx) {
        rollbacks += 1;
        return client.rollback(tx);
      },
    };
    let observedError = null;
    try {
      await compile({ manifest, client: faultClient });
    } catch (error) {
      observedError = error;
    }
    if (!observedError || rollbacks !== 1) {
      throw new CompilerError(`rollback fault was not proven: ${name}`, { phase: 'attest:rollback', failures: [{ name, rollbacks }] });
    }
    results.push({ name, rollbackCount: rollbacks, errorPhase: observedError.phase ?? 'compile' });
  }
  const after = await liveGraphDigests(manifest, client);
  const digestsUnchanged = stableJson(before) === stableJson(after);
  if (!digestsUnchanged) throw new CompilerError('live graph drift followed rollback fault proof', {
    phase: 'attest:rollback', failures: compareGraphDigests(before, after),
  });
  return { ok: true, faultCount: results.length, faults: results, digestsUnchanged };
}

export async function createLiveAttestation({
  manifest,
  client,
  repoRoot,
  target,
  signingKeyPath,
  outputPath,
}) {
  if (!signingKeyPath) throw new CompilerError('live attestation requires an Ed25519 signing key', { phase: 'attest:configuration' });
  if (!outputPath || !outsideRepository(outputPath, repoRoot)) {
    throw new CompilerError('source-to-database attestation must be written outside the repository', { phase: 'attest:configuration' });
  }
  const drift = await observeLiveDrift({ manifest, client });
  if (!drift.conforms) throw new CompilerError('live graph state differs from local semantic authority', {
    phase: 'attest:drift', failures: drift.comparison,
  });
  const privateKey = createPrivateKey(readFileSync(signingKeyPath));
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new CompilerError('live attestation key must be Ed25519', { phase: 'attest:configuration' });
  }
  const verification = verificationProjection(await verifyDatabase({ manifest, client }));
  if (!verificationPasses(verification)) {
    throw new CompilerError('live database verification failed before attestation', { phase: 'attest:validation', failures: verification });
  }
  const rollback = await proveLiveRollback({ manifest, client });
  const publicKey = createPublicKey(privateKey);
  const payload = {
    schemaVersion: 1,
    kind: 'source-to-database',
    createdAt: new Date().toISOString(),
    observationKind: 'stardog-access-boundary',
    accessMethod: 'official-sdk',
    connectionAttempted: true,
    observedAt: new Date().toISOString(),
    repository: repositoryState(repoRoot),
    registeredSourceFiles: registeredSourceFiles(manifest, repoRoot),
    target,
    canonicalization: { algorithm: 'URDNA2015', digestAlgorithm: 'sha256' },
    sourceGraphDigests: drift.sourceGraphDigests,
    databaseGraphDigests: drift.databaseGraphDigests,
    comparison: drift.comparison,
    verification,
    rollback,
  };
  const bytes = Buffer.from(stableJson(payload));
  const envelope = {
    payload,
    signature: {
      algorithm: 'Ed25519',
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
      publicKeyFingerprint: fingerprint(publicKey),
      value: sign(null, bytes, privateKey).toString('base64'),
    },
  };
  writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });
  return {
    ok: true,
    output: outputPath,
    publicKeyFingerprint: envelope.signature.publicKeyFingerprint,
    graphs: drift.sourceGraphDigests.length,
    triples: drift.sourceGraphDigests.reduce((sum, item) => sum + item.triples, 0),
    repository: payload.repository,
    comparison: payload.comparison,
    verification: payload.verification,
    rollback: payload.rollback,
  };
}

export async function verifyLiveAttestation({
  inputPath,
  expectedKeyFingerprint,
  manifest,
  client,
  repoRoot,
}) {
  let envelope;
  try {
    envelope = JSON.parse(readFileSync(inputPath, 'utf8'));
  } catch (error) {
    throw new CompilerError(`cannot parse live attestation: ${error.message}`, { phase: 'attest:verify' });
  }
  const publicKey = createPublicKey(envelope?.signature?.publicKey || '');
  const observedFingerprint = fingerprint(publicKey);
  const signatureVerified = envelope?.signature?.algorithm === 'Ed25519' &&
    observedFingerprint === envelope?.signature?.publicKeyFingerprint &&
    verify(null, Buffer.from(stableJson(envelope.payload)), publicKey, Buffer.from(envelope.signature.value || '', 'base64'));
  const trustVerified = typeof expectedKeyFingerprint === 'string' &&
    expectedKeyFingerprint.length > 0 && expectedKeyFingerprint === observedFingerprint;
  const repository = repositoryState(repoRoot);
  const repositoryVerified = stableJson(repository) === stableJson(envelope.payload?.repository);
  const drift = await observeLiveDrift({ manifest, client });
  const currentVerification = verificationProjection(await verifyDatabase({ manifest, client }));
  const sourceVerified = stableJson(drift.sourceGraphDigests) === stableJson(envelope.payload?.sourceGraphDigests);
  const databaseVerified = stableJson(drift.databaseGraphDigests) === stableJson(envelope.payload?.databaseGraphDigests);
  const validationVerified = verificationPasses(currentVerification) &&
    stableJson(currentVerification) === stableJson(envelope.payload?.verification);
  const rollback = envelope.payload?.rollback;
  const requiredFaults = ['commit', 'contamination', 'derive', 'integrity', 'load', 'validate-authored', 'validate-derived', 'verify-counts'];
  const rollbackVerified = rollback?.ok === true && rollback?.digestsUnchanged === true &&
    rollback?.faultCount === requiredFaults.length &&
    stableJson((rollback?.faults ?? []).map((item) => item.name).sort()) === stableJson(requiredFaults) &&
    (rollback?.faults ?? []).every((item) => item.rollbackCount === 1 && typeof item.errorPhase === 'string');
  const ok = signatureVerified && trustVerified && repositoryVerified && sourceVerified &&
    databaseVerified && validationVerified && rollbackVerified && drift.conforms;
  return {
    ok,
    signatureVerified,
    trustVerified,
    repositoryVerified,
    sourceVerified,
    databaseVerified,
    validationVerified,
    rollbackVerified,
    publicKeyFingerprint: observedFingerprint,
    comparison: drift.comparison,
  };
}
