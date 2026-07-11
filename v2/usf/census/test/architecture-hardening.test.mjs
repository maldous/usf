import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReplacementGroup } from '../src/artifact-plan.mjs';
import { dependencyGraphInternals } from '../src/dependency-graph.mjs';
import { buildMappings } from '../src/mapping.mjs';

const confidence = { level: 'high', score: 0.98, reasons: ['structural-parser-evidence'] };
const artifact = (artifactKey, path, overrides = {}) => ({
  artifactKey, path, universe: 'repository-output', sourceState: 'tracked', contentDigest: 'a'.repeat(64),
  mediaType: 'text/plain', fileMode: '100644', formatKind: 'source-code', syntaxKind: 'javascript-typescript',
  parserImplementation: 'fixture', machineFamilyProposal: 'implementation', artifactFamily: 'implementation',
  familyScores: {}, ownershipEvidence: [{}], authorityStatus: 'implementation', formatConfidence: confidence,
  relationshipConfidence: confidence, familyConfidence: confidence, mappingConfidence: confidence,
  coverageConfidence: confidence, reviewStatus: 'machine-reviewed', reviewEvidence: [], ...overrides
});
const parsed = (path, declarations, universe = 'repository-output') => ({ path, universe, declarations, relationships: [] });

test('typed graph instances map owned declarations while same-name classes remain candidates only', () => {
  const graph = parsed('v2/usf/graph/example.trig', [
    { kind: 'semantic-triple', identifier: 'typed', attributes: { graph: 'urn:g', subject: 'urn:usf:capability:ownedthing', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', object: 'urn:usf:ontology:Capability' } },
    { kind: 'owl-class', identifier: 'urn:usf:ontology:SameName', attributes: {} }
  ], 'v2-graph-authority');
  const source = parsed('src/example.ts', [{ kind: 'function', identifier: 'OwnedThing', attributes: {} }, { kind: 'function', identifier: 'SameName', attributes: {} }]);
  const result = buildMappings([artifact('a', 'src/example.ts')], [graph, source], []).mappings[0];
  assert.equal(result.coverageDecision, 'partial');
  assert.deepEqual(result.matchedResources, ['urn:usf:capability:ownedthing']);
  assert.ok(!result.matchedResources.includes('urn:usf:ontology:SameName'));
});

test('same-name formal resource without typed instance evidence remains absent', () => {
  const graph = parsed('v2/usf/graph/example.trig', [{ kind: 'owl-class', identifier: 'urn:usf:ontology:OnlyAName', attributes: {} }], 'v2-graph-authority');
  const source = parsed('src/name.ts', [{ kind: 'function', identifier: 'OnlyAName', attributes: {} }]);
  const result = buildMappings([artifact('b', 'src/name.ts')], [graph, source], []).mappings[0];
  assert.equal(result.coverageDecision, 'absent');
  assert.equal(result.mappingType, 'unmapped');
  assert.ok(result.mappingEvidence.some((entry) => entry.kind === 'exhaustive-negative-resource-search'));
});

test('replacement cardinalities are closed and mismatches fail', () => {
  const current = new Set(['a', 'b']);
  const canonical = new Set(['x', 'y']);
  for (const record of [
    { groupKey: '1-1', cardinality: 'one-to-one', currentArtifacts: ['a'], canonicalArtifacts: ['x'] },
    { groupKey: 'n-1', cardinality: 'many-to-one', currentArtifacts: ['a', 'b'], canonicalArtifacts: ['x'] },
    { groupKey: '1-n', cardinality: 'one-to-many', currentArtifacts: ['a'], canonicalArtifacts: ['x', 'y'] },
    { groupKey: 'n-n', cardinality: 'many-to-many', currentArtifacts: ['a', 'b'], canonicalArtifacts: ['x', 'y'] },
    { groupKey: '1-0', cardinality: 'one-to-zero', currentArtifacts: ['a'], canonicalArtifacts: [] },
    { groupKey: '0-1', cardinality: 'zero-to-one', currentArtifacts: [], canonicalArtifacts: ['x'] }
  ]) validateReplacementGroup(record, current, canonical);
  assert.throws(() => validateReplacementGroup({ groupKey: 'bad', cardinality: 'many-to-one', currentArtifacts: ['a'], canonicalArtifacts: ['x'] }, current, canonical), /cardinality mismatch/);
});

test('blocking graph algorithms detect cycles and remove transitive edges', () => {
  const edge = (source, prerequisite) => ({ source, prerequisite });
  assert.equal(dependencyGraphInternals.hasCycle([edge('a', 'b'), edge('b', 'a')]), true);
  const reduced = dependencyGraphInternals.transitiveReduction([edge('a', 'b'), edge('b', 'c'), edge('a', 'c')]);
  assert.equal(reduced.kept.length, 2);
  assert.deepEqual(reduced.removed, [edge('a', 'c')]);
});
