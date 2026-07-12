import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { repositoryRoot } from '../src/constants.mjs';
import { repositoryState, stableJson, verifyStardogObservation } from '../audit/live-observation.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('independent Stardog observation verifies signature, trust, repository, digests, validation and rollback', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const fingerprint = sha256(publicKey.export({ type: 'spki', format: 'der' }));
  const graph = { graph: 'urn:usf:graph:test', algorithm: 'URDNA2015', digestAlgorithm: 'sha256', sha256: 'a'.repeat(64), triples: 1 };
  const names = [
    'load', 'collect-observed', 'invalid-observed-rdf', 'validate-authored', 'validate-observed',
    'derive', 'wrong-rule-output', 'validate-derived', 'integrity', 'contamination', 'verify-counts',
    'commit', 'rollback-response'
  ];
  const payload = {
    schemaVersion: 1,
    kind: 'source-to-database',
    observationKind: 'stardog-access-boundary',
    accessMethod: 'official-sdk',
    connectionAttempted: true,
    observedAt: new Date().toISOString(),
    repository: repositoryState(repositoryRoot),
    canonicalization: { algorithm: 'URDNA2015', digestAlgorithm: 'sha256' },
    sourceGraphDigests: [graph],
    databaseGraphDigests: [graph],
    comparison: { missingGraphs: [], unexpectedGraphs: [], mismatchedGraphs: [] },
    verification: { reachable: true, graphCount: 1, tripleCount: 1, missingGraphs: [], unexpectedGraphs: [], validationConforms: true, integrityConforms: true, contaminationCount: 0 },
    rollback: { ok: true, faultCount: names.length, digestsUnchanged: true, faults: names.map((name) => ({ name, rollbackCount: 1, errorPhase: name })) },
  };
  const envelope = {
    payload,
    signature: { algorithm: 'Ed25519', publicKey: publicKeyPem, publicKeyFingerprint: fingerprint, value: sign(null, Buffer.from(stableJson(payload)), privateKey).toString('base64') },
  };
  const target = path.join(os.tmpdir(), `usf-stardog-observation-${process.pid}.json`);
  fs.writeFileSync(target, JSON.stringify(envelope));
  try {
    const result = verifyStardogObservation(target, fingerprint, repositoryRoot);
    assert.equal(result.status, 'observed');
    assert.equal(result.observation.rollbackFaultCount, 13);
    assert.deepEqual(payload.repository.excludedPaths, ['v2/usf/census/audit.json', 'v2/usf/census/closure.json']);
    envelope.payload.verification.tripleCount = 2;
    fs.writeFileSync(target, JSON.stringify(envelope));
    assert.equal(verifyStardogObservation(target, fingerprint, repositoryRoot).status, 'invalid');
  } finally {
    fs.rmSync(target, { force: true });
  }
});
