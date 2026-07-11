import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalJson, framedDigest } from '../src/canonical.mjs';
import {
  assertUnique,
  rejectFinalFallback,
  validateArtifact,
  validateClassificationContract,
  validateInventory,
  validateRelationship,
  validateRelativePath,
  validateUniverseMember
} from '../src/contract.mjs';

const digest = 'a'.repeat(64);
const confidence = { level: 'high', score: 1, reasons: ['machine-verifiable'] };

function member(overrides = {}) {
  return {
    path: 'docs/example.md', universe: 'repository-output', sourceState: 'tracked', contentDigest: digest,
    byteSize: 1, fileMode: '100644', executable: false, binary: false, extension: '.md',
    mediaType: 'text/markdown', formatKind: 'document-markdown', symbolicLinkTarget: null, canonicalSource: true, ...overrides
  };
}

function artifact(overrides = {}) {
  return {
    path: 'docs/example.md', universe: 'repository-output', sourceState: 'tracked', contentDigest: digest,
    mediaType: 'text/markdown', fileMode: '100644', formatKind: 'document-markdown',
    artifactFamily: 'documentation-assets', authorityStatus: 'humanprojection', canonicalOutputRequirement: 'generate',
    productionResponsibility: ['renderer'], expectedGenerator: 'documentation-renderer', equivalenceClass: 'normalised',
    reuseStrategy: 'template', v2ConceptCoverage: 'partial', gapClassification: ['missingrenderer'],
    requiredSemanticLayers: ['generation-renderer-contracts'], implementationSize: 'small', confidence,
    riskDrivers: ['missing-behavioural-specification'], reasonCodes: ['primary-responsibility'], primaryOwner: 'documentation-assets',
    ...overrides
  };
}

test('classification contract is closed and contains no fallback values', () => {
  validateClassificationContract();
});

test('universe and artifact positive records validate', () => {
  validateUniverseMember(member());
  validateArtifact(artifact());
});

test('missing mandatory fields are rejected', () => {
  const value = artifact();
  delete value.authorityStatus;
  assert.throws(() => validateArtifact(value), /missing mandatory field/);
});

test('invalid and escaping paths are rejected', () => {
  for (const value of ['/absolute', '../escape', 'a/../escape', 'a\\b']) assert.throws(() => validateRelativePath(value));
});

test('duplicate primary records are rejected', () => {
  assert.throws(() => assertUnique([member(), member()], 'path'), /duplicate primary record/);
});

test('invalid universe and unknown final classifications are rejected', () => {
  assert.throws(() => validateUniverseMember(member({ universe: 'another-universe' })), /invalid universes/);
  assert.throws(() => validateArtifact(artifact({ artifactFamily: 'other' })), /invalid artifactFamilies/);
  assert.throws(() => rejectFinalFallback({ value: 'unresolved' }), /forbidden final fallback/);
});

test('noncomplete classifications require precise gaps and semantic layers', () => {
  assert.throws(() => validateArtifact(artifact({ gapClassification: [] })), /precise gaps/);
  assert.throws(() => validateArtifact(artifact({ requiredSemanticLayers: [] })), /precise gaps/);
});

test('malformed relationships are rejected', () => {
  assert.throws(() => validateRelationship({ source: 'a', relationshipType: 'references', target: '', targetKind: 'artifact', extractionMethod: 'parser', evidenceKind: 'structurally-proven', confidence, resolved: false, reasonCodes: ['x'] }), /target required/);
});

test('unsupported inventory records are rejected', () => {
  assert.throws(() => validateInventory({ path: 'a.json', inventoryKind: 'mystery', declarations: [], relationships: [], findings: [], confidence }), /invalid inventoryKinds/);
});

test('canonical ordering and framed hashing are deterministic and unambiguous', () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 } }), '{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "z": 1\n}\n');
  const first = framedDigest([{ path: 'ab', state: 'c' }], ['path', 'state']);
  const second = framedDigest([{ path: 'a', state: 'bc' }], ['path', 'state']);
  assert.notEqual(first, second);
});
