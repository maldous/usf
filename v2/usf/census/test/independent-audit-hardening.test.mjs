import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditCanonicalArtifacts, auditDependencies, auditDeterminism, auditFamilyOwnership, auditLinearStates,
  auditMappingsCoverage, auditMutationBoundary, auditParserRelationships, auditUniverses, auditWorkPackages,
  canonicalJson, framedDigest
} from '../audit/index.mjs';

const digest = 'a'.repeat(64);
const member = (path, universe = 'repository-output') => ({ path, universe, contentDigest: digest, sourceState: 'tracked', fileMode: '100644', binary: false, formatKind: 'structured-json' });
const artifact = { artifactKey: 'repository-output:a.json', universe: 'repository-output', path: 'a.json', artifactFamily: 'machine-semantics', ownershipEvidence: [{ reason: 'parsed semantic structure' }], familyConfidence: { level: 'high' } };
const mapping = { artifactKey: artifact.artifactKey, mappingEvidence: [{}], coverageDecision: 'partial', coverageReason: 'observed', representedGeneration: [], missingSemantics: ['x'] };
const canonical = { canonicalArtifactKey: 'artifact.a', targetPath: 'a.json', pathRule: null, mutabilityClass: 'generated', acceptanceGates: [{}], productionResponsibilities: ['generator'], replacementGroup: 'group.a' };
const work = { key: 'work.a', architecturalOutcome: 'Produce one canonical outcome.', canonicalArtifactKeys: ['artifact.a'], acceptanceCriteria: ['a'], complexityEvidence: [{}], equivalenceGates: [{}], dependencies: [] };

test('universe audit recomputes partition, ordering, counts, and framed digests', () => {
  const recordsByUniverse = {
    'repository-output': [member('a.json')],
    'v2-graph-authority': [member('v2/usf/graph/a.ttl', 'v2-graph-authority')],
    'v2-compiler-implementation': [member('v2/usf/compiler/a.mjs', 'v2-compiler-implementation')],
    'v2-support-provisioning': [member('v2/setup.sh', 'v2-support-provisioning')]
  };
  const summary = { universeCounts: Object.fromEntries(Object.entries(recordsByUniverse).map(([key, value]) => [key, value.length])) };
  const names = { 'repository-output': 'repositoryUniverseDigest', 'v2-graph-authority': 'v2GraphUniverseDigest', 'v2-compiler-implementation': 'v2CompilerUniverseDigest', 'v2-support-provisioning': 'v2SupportUniverseDigest' };
  for (const [key, records] of Object.entries(recordsByUniverse)) summary[names[key]] = framedDigest(records, ['universe', 'path', 'sourceState', 'fileMode', 'contentDigest']);
  assert.equal(auditUniverses({ recordsByUniverse, summary, physicalPaths: recordsByUniverse && Object.values(recordsByUniverse).flat().map((entry) => entry.path) }).status, 'pass');
  recordsByUniverse['repository-output'][0].universe = 'v2-support-provisioning';
  assert.equal(auditUniverses({ recordsByUniverse, summary }).status, 'fail');
});

test('parser and relationship audit rejects omissions, false resolution, partial silence, and context-free commands', () => {
  const members = [member('a.json')];
  const parser = { path: 'a.json', parserImplementation: 'x', parserMode: 'structural', pathContext: 'ordinary', structuralCoverage: 'complete', unsupportedStructures: [], declarations: [{ kind: 'command', identifier: 'x', attributes: { executableContext: { kind: 'script' } } }] };
  assert.equal(auditParserRelationships(members, [parser], [], [{ path: 'a.json', declarations: [{}], comparisonExecuted: ['physical'] }]).status, 'pass');
  delete parser.declarations[0].attributes.executableContext;
  parser.structuralCoverage = 'partial';
  assert.equal(auditParserRelationships(members, [parser], [{ source: 'a.json', target: 'missing', targetKind: 'artifact', resolved: true, relationshipType: 'references', extractionMethod: 'x' }], []).status, 'fail');
});

test('family ownership is exactly one evidence-backed owner per member', () => {
  assert.equal(auditFamilyOwnership([member('a.json')], [artifact]).status, 'pass');
  assert.equal(auditFamilyOwnership([member('a.json')], [artifact, { ...artifact }]).status, 'fail');
});

test('mappings and coverage cannot claim unsupported completeness or omit artifacts', () => {
  assert.equal(auditMappingsCoverage([artifact], [mapping], [{ artifactKey: artifact.artifactKey, coverageDecision: 'partial' }]).status, 'pass');
  assert.equal(auditMappingsCoverage([artifact], [{ ...mapping, coverageDecision: 'complete', missingSemantics: ['x'] }], [{ artifactKey: artifact.artifactKey, coverageDecision: 'complete' }]).status, 'fail');
});

test('canonical artifacts and replacement groups must close production contracts', () => {
  assert.equal(auditCanonicalArtifacts([canonical], [{ key: 'group.a', canonicalArtifactKeys: ['artifact.a'] }]).status, 'pass');
  assert.equal(auditCanonicalArtifacts([{ ...canonical, targetPath: null, acceptanceGates: [] }], []).status, 'fail');
});

test('work package coherence enforces singular complete artifact ownership', () => {
  assert.equal(auditWorkPackages([canonical], [work]).status, 'pass');
  assert.equal(auditWorkPackages([canonical], [work, { ...work, key: 'work.b' }]).status, 'fail');
});

test('dependency audit catches cycles, transitive edges, missing endpoints, and missing evidence', () => {
  const packages = ['a', 'b', 'c'].map((key) => ({ key }));
  const edge = (source, prerequisite) => ({ source, prerequisite, dependencyType: 'blocking', semanticEvidence: [`${source}:${prerequisite}`] });
  assert.equal(auditDependencies(packages, [edge('a', 'b'), edge('b', 'c')]).status, 'pass');
  assert.equal(auditDependencies(packages, [edge('a', 'b'), edge('b', 'c'), edge('a', 'c'), edge('c', 'a'), { ...edge('a', 'missing'), semanticEvidence: [] }]).status, 'fail');
});

test('canonical serialization is key-stable and record order is independently checked', () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{\n  "a": {\n    "x": 3,\n    "y": 2\n  },\n  "z": 1\n}\n');
  assert.equal(auditDeterminism({ rows: [{ path: 'a' }, { path: 'b' }] }).status, 'pass');
  assert.equal(auditDeterminism({ rows: [{ path: 'b' }, { path: 'a' }] }).status, 'fail');
});

test('mutation boundary rejects any changed file outside the census root', () => {
  const before = new Map([['README.md', 'a'], ['v2/usf/census/output.json', 'a']]);
  assert.equal(auditMutationBoundary(before, new Map(before)).status, 'pass');
  assert.equal(auditMutationBoundary(before, new Map([['README.md', 'b'], ['v2/usf/census/output.json', 'b']])).status, 'fail');
});

test('Linear readiness is read-only state evidence and fails closed on missing or wrong states', () => {
  const issues = [];
  for (let number = 1135; number <= 1141; number += 1) issues.push({ identifier: `USF-${number}`, state: { name: 'Done' } });
  issues.push({ identifier: 'USF-1132', state: { name: 'Backlog' } }, { identifier: 'USF-1134', state: { name: 'In Progress' } }, { identifier: 'USF-1142', state: { name: 'Done' } });
  assert.equal(auditLinearStates(issues).status, 'pass');
  issues.find((entry) => entry.identifier === 'USF-1135').state.name = 'Backlog';
  assert.equal(auditLinearStates(issues).status, 'fail');
  assert.equal(auditLinearStates(null).status, 'incomplete');
});

test('missing architectural inputs are incomplete rather than hard-coded success', () => {
  for (const value of [
    auditParserRelationships([], null, null), auditFamilyOwnership([], null), auditMappingsCoverage([], null, null),
    auditCanonicalArtifacts(null, null), auditWorkPackages(null, null), auditDependencies(null, null), auditDeterminism(null), auditMutationBoundary(null, null)
  ]) assert.equal(value.status, 'incomplete');
});

test('audit implementation has no production census imports or production invocation', () => {
  const source = new URL('../audit/index.mjs', import.meta.url);
  return import('node:fs').then(({ readFileSync }) => {
    const text = readFileSync(source, 'utf8');
    assert.doesNotMatch(text, /(?:from\s+|import\s*\()['"]\.\.\/src\//);
    assert.doesNotMatch(text, /execFileSync\([^,]*['"]node['"]/);
  });
});
