import assert from 'node:assert/strict';
import test from 'node:test';
import { buildArtifactPlan, validateReplacementGroup } from '../src/artifact-plan.mjs';
import { dependencyGraphInternals } from '../src/dependency-graph.mjs';
import { buildMappings, buildMissingEntirely } from '../src/mapping.mjs';
import { buildRelationships } from '../src/relationships.mjs';
import { buildSourcePlanOwnership } from '../src/source-plan-ownership.mjs';

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
const triple = (graph, subject, predicate, object) => ({ kind: 'semantic-triple', identifier: `${subject}:${predicate}`, attributes: { graph, subject, predicate, object } });
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

function dispositionDataset({ kind = 'urn:usf:dispositionkind:retainedasset', state = 'urn:usf:dispositiondecisionstate:accepted', digest = 'a'.repeat(64), planCount = 0, includePlan = false, registeredGraph = true } = {}) {
  const authorityGraph = registeredGraph ? 'urn:usf:graph:source-dispositions' : 'urn:usf:graph:not-registered';
  const declarations = [
    triple(null, 'urn:usf:namedgraph:source-dispositions', RDF_TYPE, 'urn:usf:ontology:NamedGraph'),
    triple(null, 'urn:usf:namedgraph:source-dispositions', 'urn:usf:ontology:graphIri', '"urn:usf:graph:source-dispositions"^^http://www.w3.org/2001/XMLSchema#anyURI'),
    triple(null, 'urn:usf:namedgraph:source-dispositions', 'urn:usf:ontology:graphClass', 'urn:usf:graphclass:authoredgraph'),
    triple(authorityGraph, 'urn:usf:source:a', RDF_TYPE, 'urn:usf:ontology:SourceArtefact'),
    triple(authorityGraph, 'urn:usf:observation:a', RDF_TYPE, 'urn:usf:ontology:SourceArtefactObservation'),
    triple(authorityGraph, 'urn:usf:disposition:a', RDF_TYPE, 'urn:usf:ontology:SourceArtefactDisposition'),
    triple(authorityGraph, kind, RDF_TYPE, 'urn:usf:ontology:DispositionKind'),
    triple(authorityGraph, 'urn:usf:observation:a', 'urn:usf:ontology:observesSourceArtefact', 'urn:usf:source:a'),
    triple(authorityGraph, 'urn:usf:observation:a', 'urn:usf:ontology:observedSourcePath', '"src/example.ts"^^http://www.w3.org/2001/XMLSchema#string'),
    triple(authorityGraph, 'urn:usf:observation:a', 'urn:usf:ontology:observedContentDigest', `"${digest}"^^http://www.w3.org/2001/XMLSchema#string`),
    triple(authorityGraph, 'urn:usf:observation:a', 'urn:usf:ontology:observedUniverse', '"repository-output"^^http://www.w3.org/2001/XMLSchema#string'),
    triple(authorityGraph, 'urn:usf:source:a', 'urn:usf:ontology:hasSourceDisposition', 'urn:usf:disposition:a'),
    triple(authorityGraph, 'urn:usf:disposition:a', 'urn:usf:ontology:dispositionOfSourceArtefact', 'urn:usf:source:a'),
    triple(authorityGraph, 'urn:usf:disposition:a', 'urn:usf:ontology:hasDispositionKind', kind),
    triple(authorityGraph, 'urn:usf:disposition:a', 'urn:usf:ontology:hasDispositionDecisionState', state)
  ];
  const count = includePlan ? Math.max(1, planCount) : planCount;
  for (let index = 0; index < count; index += 1) {
    const suffix = String.fromCharCode(97 + index);
    declarations.push(triple(authorityGraph, `urn:usf:artefactplan:${suffix}`, RDF_TYPE, 'urn:usf:ontology:ArtefactPlan'));
    declarations.push(triple(authorityGraph, 'urn:usf:disposition:a', 'urn:usf:ontology:assignedToArtefactPlan', `urn:usf:artefactplan:${suffix}`));
  }
  return [parsed('v2/usf/graph/source-dispositions.trig', declarations, 'v2-graph-authority')];
}

test('typed graph instances map only through exact semantic identifiers', () => {
  const graph = parsed('v2/usf/graph/example.trig', [
    { kind: 'semantic-triple', identifier: 'typed', attributes: { graph: 'urn:g', subject: 'urn:usf:capability:ownedthing', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', object: 'urn:usf:ontology:Capability' } },
    { kind: 'owl-class', identifier: 'urn:usf:ontology:SameName', attributes: {} }
  ], 'v2-graph-authority');
  const source = parsed('src/example.ts', [{ kind: 'semantic-reference', identifier: 'urn:usf:capability:ownedthing', attributes: {} }, { kind: 'function', identifier: 'SameName', attributes: {} }]);
  const result = buildMappings([artifact('a', 'src/example.ts')], [graph, source], []).mappings[0];
  assert.equal(result.coverageDecision, 'partial');
  assert.deepEqual(result.matchedResources, ['urn:usf:capability:ownedthing']);
  assert.ok(!result.matchedResources.includes('urn:usf:ontology:SameName'));
});

test('artifact planning remains an explicit graph obligation and invents no target or disposition', () => {
  const sourceArtifact = artifact('a', 'src/example.ts');
  const mapping = buildMappings([sourceArtifact], [parsed('src/example.ts', [])], []).mappings[0];
  const result = buildArtifactPlan([sourceArtifact], [], [mapping], [], []);
  assert.deepEqual(result.canonicalArtifacts, []);
  assert.equal(result.replacementGroups[0].dispositionStatus, 'missing-accepted-source-disposition');
  assert.equal(result.replacementGroups[0].requiredGraphObligation.classIri, 'urn:usf:ontology:SourceArtefactDisposition');
  assert.deepEqual(result.replacementGroups[0].requiredGenerationProjections, []);
});

test('artifact planning does not treat unrelated observed plans as source disposition ownership', () => {
  const sourceArtifact = artifact('a', 'src/example.ts');
  const mapping = buildMappings([sourceArtifact], [parsed('src/example.ts', [])], []).mappings[0];
  const graph = parsed('v2/usf/graph/generation.trig', [{
    kind: 'semantic-triple',
    identifier: 'urn:usf:artefactplan:example',
    attributes: {
      graph: 'urn:usf:graph:generation',
      subject: 'urn:usf:artefactplan:example',
      predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      object: 'urn:usf:ontology:ArtefactPlan'
    }
  }], 'v2-graph-authority');
  const fixture = { ...graph, path: 'v2/usf/graph/fixtures/defects/generation.trig' };
  const result = buildArtifactPlan([sourceArtifact], [graph, fixture], [mapping], [], []);
  assert.equal(result.observedArtefactPlans.length, 1);
  assert.equal(result.replacementGroups[0].dispositionStatus, 'missing-accepted-source-disposition');
  assert.equal(result.replacementGroups[0].requiredGraphObligation.observedArtefactPlanCount, 1);
  assert.equal(result.replacementGroups[0].requiredGraphObligation.reasonCode, 'source-observation-missing');
});

test('accepted no-output source disposition needs no artifact plan while output kinds do', () => {
  const sourceArtifact = artifact('a', 'src/example.ts');
  const noOutput = buildSourcePlanOwnership([sourceArtifact], dispositionDataset(), []);
  assert.equal(noOutput.acceptedDispositionCount, 1);
  assert.equal(noOutput.acceptedNoOutputDispositionCount, 1);
  assert.equal(noOutput.assessments[0].planRequired, false);
  const outputWithoutPlan = buildSourcePlanOwnership([sourceArtifact], dispositionDataset({ kind: 'urn:usf:dispositionkind:generateequivalent' }), []);
  assert.equal(outputWithoutPlan.rejectedDispositionCount, 1);
  assert.ok(outputWithoutPlan.assessments[0].findings.includes('source-disposition-plan-cardinality-invalid'));
  const outputWithPlan = buildSourcePlanOwnership([sourceArtifact], dispositionDataset({ kind: 'urn:usf:dispositionkind:generateequivalent', includePlan: true }), [{ planIri: 'urn:usf:artefactplan:a' }]);
  assert.equal(outputWithPlan.acceptedDispositionCount, 1);
  assert.equal(outputWithPlan.acceptedOutputPlanCount, 1);
  const outputWithManyPlans = buildSourcePlanOwnership(
    [sourceArtifact],
    dispositionDataset({ kind: 'urn:usf:dispositionkind:generateequivalent', planCount: 2 }),
    [{ planIri: 'urn:usf:artefactplan:a' }, { planIri: 'urn:usf:artefactplan:b' }]
  );
  assert.equal(outputWithManyPlans.acceptedDispositionCount, 1);
  assert.deepEqual(outputWithManyPlans.assessments[0].planIris, ['urn:usf:artefactplan:a', 'urn:usf:artefactplan:b']);
  const noOutputWithPlan = buildSourcePlanOwnership([sourceArtifact], dispositionDataset({ planCount: 1 }), [{ planIri: 'urn:usf:artefactplan:a' }]);
  assert.ok(noOutputWithPlan.assessments[0].findings.includes('source-disposition-plan-cardinality-invalid'));
});

test('source disposition ownership fails closed on review, stale digest, missing plan, unregistered graph, and rejection', () => {
  const sourceArtifact = artifact('a', 'src/example.ts');
  const cases = [
    [dispositionDataset({ state: 'urn:usf:dispositiondecisionstate:reviewrequired' }), 'source-disposition-review-required', []],
    [dispositionDataset({ digest: 'b'.repeat(64) }), 'source-observation-digest-mismatch', []],
    [dispositionDataset({ kind: 'urn:usf:dispositionkind:generateequivalent', includePlan: true }), 'source-disposition-plan-missing', []],
    [dispositionDataset({ registeredGraph: false }), 'source-observation-unregistered-graph', []],
    [dispositionDataset({ state: 'urn:usf:dispositiondecisionstate:rejected' }), 'source-disposition-not-accepted', []]
  ];
  for (const [dataset, reason, plans] of cases) {
    const result = buildSourcePlanOwnership([sourceArtifact], dataset, plans);
    assert.equal(result.rejectedDispositionCount, 1, reason);
    assert.ok(result.assessments[0].findings.includes(reason), reason);
  }
});

test('workflow mapping does not invent every family semantic layer', () => {
  const workflow = artifact('workflow', '.github/workflows/validate.yml', { artifactFamily: 'automation', formatKind: 'structured-yaml' });
  const mapping = buildMappings([workflow], [parsed(workflow.path, [])], []).mappings[0];
  assert.deepEqual(mapping.missingSemantics, []);
  const missing = buildMissingEntirely([mapping]);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].requiredClassIri, 'urn:usf:ontology:SourceArtefactDisposition');
  assert.deepEqual(missing[0].requiredSemanticLayers, []);
  assert.doesNotMatch(JSON.stringify(missing[0]), /Constraint|EquivalenceRule|GeneratorContract|InterfaceContract/);
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

test('dependency status is derived from structural relationship context rather than cycle presence', () => {
  const classify = dependencyGraphInternals.relationshipDependencyStatus;
  assert.equal(classify({ extractionMethod: 'json-pointer', attributes: { keyPath: 'include.0' } }), 'coordination');
  assert.equal(classify({ extractionMethod: 'json-pointer', attributes: { keyPath: 'exclude.2' } }), 'coordination');
  assert.equal(classify({ extractionMethod: 'json-pointer', attributes: { keyPath: 'compilerOptions.paths.alias.0' } }), 'coordination');
  assert.equal(classify({ extractionMethod: 'json-pointer', attributes: { keyPath: 'extends' } }), 'blocking');
  assert.equal(classify({ extractionMethod: 'babel-import-declaration', attributes: {} }), 'blocking');
});

test('dependency ownership uses the canonical semantic-layer owner, not the first consumer', () => {
  const packages = [
    { key: 'consumer', requiredSemanticLayers: ['equivalence-rules'], ownedSemanticLayers: [] },
    { key: 'validation-owner', requiredSemanticLayers: ['equivalence-rules'], ownedSemanticLayers: ['equivalence-rules'] }
  ];
  assert.equal(dependencyGraphInternals.ownerMaps(packages).layers.get('equivalence-rules'), 'validation-owner');
  assert.throws(
    () => dependencyGraphInternals.ownerMaps([...packages, { key: 'duplicate-owner', ownedSemanticLayers: ['equivalence-rules'] }]),
    /semantic layer has multiple package owners/
  );
});

test('relationship closure distinguishes allowlisted external references from unresolved internal targets', () => {
  const raw = parsed('src/example.mjs', [], 'repository-output');
  raw.relationships = [
    { relationshipType: 'references', target: 'https://example.test/schema.json', targetKind: 'artifact', extractionMethod: 'fixture', evidenceKind: 'structurally-proven', confidence },
    { relationshipType: 'imports', target: './missing.mjs', targetKind: 'artifact', extractionMethod: 'fixture', evidenceKind: 'structurally-proven', confidence }
  ];
  const result = buildRelationships([{ path: 'src/example.mjs' }], [raw]);
  const external = result.relationships.find((record) => record.target.startsWith('https:'));
  const internal = result.relationships.find((record) => record.target === './missing.mjs');
  assert.equal(external.targetKind, 'external-resource');
  assert.ok(external.reasonCodes.includes('expected-external-reference'));
  assert.equal(internal.resolved, false);
  assert.equal(result.relationshipFindings.length, 1);
  assert.equal(result.relationshipFindings[0].resolutionStatus, 'open');
});
