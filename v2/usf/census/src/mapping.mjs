import fs from 'node:fs';
import path from 'node:path';
import { compareBy, readJsonl, sha256, sortUnique } from './canonical.mjs';
import { censusRoot } from './constants.mjs';
import { assertUnique, validateMapping } from './contract.mjs';

const familyLayers = {
  automation: ['constraints-permissions', 'interfaces-events-workflows', 'generation-renderer-contracts', 'equivalence-rules'],
  'documentation-assets': ['requirements-projections', 'artifact-output-plans', 'generation-renderer-contracts'],
  implementation: ['contracts', 'implementation-obligations', 'artifact-output-plans', 'generation-renderer-contracts', 'equivalence-rules'],
  'machine-semantics': ['ontology', 'vocabulary', 'taxonomy', 'contracts', 'derivation-integrity', 'artifact-output-plans'],
  'proof-evidence': ['proof-obligations', 'evidence-requirements', 'collector-normaliser-ingestion-contracts', 'readiness-consequences'],
  'repository-governance': ['policy', 'constraints-permissions', 'artifact-output-plans'],
  'runtime-topology': ['data-configuration-lifecycle', 'provider-service-realisation', 'materialisation-contracts', 'equivalence-rules'],
  'v2-support': ['materialisation-contracts', 'self-hosting-clean-room-support', 'equivalence-rules'],
  verification: ['validation-tests-fixtures-defects', 'proof-obligations', 'generation-renderer-contracts']
};
const mappingReviewPath = path.join(censusRoot, 'src', 'mapping-reviews.jsonl');
const convergenceReviewPath = path.join(censusRoot, 'src', 'identity-convergence-reviews.jsonl');

function localName(identifier) {
  const value = String(identifier);
  return value.slice(Math.max(value.lastIndexOf('#'), value.lastIndexOf('/'), value.lastIndexOf(':')) + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function graphResources(parserResults) {
  const resourceKinds = new Set(['owl-class', 'owl-datatype-property', 'owl-object-property', 'shacl-node-shape', 'semantic-graph']);
  const resources = new Map();
  for (const parsed of parserResults.filter((entry) => entry.universe === 'v2-graph-authority')) {
    for (const declaration of parsed.declarations) {
      let kind = declaration.kind;
      let identifier = declaration.identifier;
      let attributes = declaration.attributes ?? {};
      if (declaration.kind === 'semantic-triple' && declaration.attributes?.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' && !declaration.attributes.subject.startsWith('_:') && !/\/owl#|\/rdf-schema#|\/shacl#/.test(declaration.attributes.object)) {
        identifier = declaration.attributes.subject;
        kind = `rdf-instance:${localName(declaration.attributes.object)}`;
        attributes = { graph: declaration.attributes.graph, rdfType: declaration.attributes.object };
      } else if (!resourceKinds.has(declaration.kind)) continue;
      if (!identifier || identifier.startsWith('_:')) continue;
      const existing = resources.get(identifier);
      if (!existing || resourceKinds.has(kind)) resources.set(identifier, { identifier, localName: localName(identifier), kind, source: parsed.path, attributes });
    }
  }
  return [...resources.values()].sort((a, b) => a.identifier.localeCompare(b.identifier));
}

function explicitCandidates(artifact, parsed, relations, resources) {
  const ownedDeclarationKinds = new Set(['async-function', 'class', 'compose-service', 'compose-volume', 'export', 'function', 'graphql-enum', 'graphql-interface', 'graphql-object-type', 'graphql-operation', 'graphql-scalar', 'graphql-union', 'interface', 'method', 'migration', 'namespace', 'table', 'type', 'variable', 'workflow-job']);
  const genericLocalNames = new Set(['config', 'data', 'error', 'id', 'name', 'result', 'status', 'type', 'value']);
  const byIdentifier = new Map(resources.map((resource) => [resource.identifier, resource]));
  const byLocal = new Map();
  for (const resource of resources) {
    if (!byLocal.has(resource.localName)) byLocal.set(resource.localName, []);
    byLocal.get(resource.localName).push(resource);
  }
  const candidates = new Map();
  const evidence = [];
  const add = (resource, kind, source, strength) => {
    if (!resource) return;
    candidates.set(resource.identifier, resource);
    evidence.push({ kind, source, resource: resource.identifier, strength });
  };
  for (const relation of relations.filter((entry) => entry.targetKind === 'semantic-entity')) {
    const exact = byIdentifier.get(relation.target);
    if (exact) add(exact, 'explicit-semantic-identifier', `relationship:${relation.extractionMethod}`, 1);
    else for (const candidate of byLocal.get(localName(relation.target)) ?? []) add(candidate, 'confirmed-inventory-declaration', `relationship-local-candidate:${relation.extractionMethod}`, 0.65);
  }
  for (const declaration of parsed.declarations) {
    const exact = byIdentifier.get(declaration.identifier);
    if (exact) add(exact, artifact.universe === 'v2-graph-authority' ? 'manifest-registration' : 'explicit-semantic-identifier', `declaration:${declaration.kind}`, 1);
    const declarationLocal = localName(declaration.identifier);
    if (declarationLocal.length >= 4) {
      for (const candidate of byLocal.get(declarationLocal) ?? []) {
        const provedInstance = candidate.kind.startsWith('rdf-instance:') && ownedDeclarationKinds.has(declaration.kind) && !genericLocalNames.has(declarationLocal);
        add(candidate, artifact.universe === 'v2-graph-authority' ? 'manifest-registration' : 'confirmed-inventory-declaration', `declaration-local:${declaration.kind}`, artifact.universe === 'v2-graph-authority' ? 1 : provedInstance ? 0.85 : 0.65);
      }
    }
  }
  if (artifact.universe === 'v2-graph-authority') {
    for (const resource of resources.filter((entry) => entry.source === artifact.path)) add(resource, 'manifest-registration', 'graph-source-membership', 1);
  }
  return { candidates: [...candidates.values()], evidence };
}

function nonRequired(artifact) {
  return artifact.authorityStatus === 'transient' || artifact.path.endsWith('.gitkeep') ||
    (artifact.artifactFamily === 'proof-evidence' && /(?:^|\/)(?:artifacts|\.claude\/runs)\//.test(artifact.path));
}

function coverageFor(artifact, parsed, candidates, evidence) {
  if (nonRequired(artifact)) return { state: 'notrequired', reason: 'Closed removal, exclusion, or transient-state disposition requires no semantic identity.', represented: [], missing: [], score: 0.98 };
  if (candidates.length === 0) return { state: 'absent', reason: 'No adequate semantic resource was found from structural declarations or relationships.', represented: [], missing: familyLayers[artifact.artifactFamily], score: 0.92 };
  const materialEvidence = evidence.some((entry) => entry.strength >= 0.8) && (parsed.relationships.length > 0 || parsed.declarations.length > 1 || artifact.universe === 'v2-graph-authority');
  if (!materialEvidence) return { state: 'identityonly', reason: 'A semantic identity is proved, but structural evidence does not materially define behavior or generation.', represented: ['semantic-identity'], missing: familyLayers[artifact.artifactFamily], score: 0.72 };
  const represented = sortUnique(['semantic-identity', ...candidates.map((resource) => `resource-kind:${resource.kind}`)]);
  const missing = sortUnique(familyLayers[artifact.artifactFamily].filter((layer) => !candidates.some((resource) => localName(resource.identifier).includes(layer.replace(/-/g, '')))));
  return { state: 'partial', reason: 'A material semantic mapping exists, with explicit remaining semantic and generation boundaries.', represented, missing: missing.length ? missing : ['artifact-output-plans', 'generation-renderer-contracts', 'equivalence-rules'], score: 0.84 };
}

function mappingTypeFor(artifact, candidates, coverage) {
  if (coverage.state === 'notrequired') return 'not-required';
  if (coverage.state === 'absent') return 'unmapped';
  if (artifact.universe === 'v2-graph-authority') return candidates.length === 1 ? 'exact-semantic-identity' : 'semantic-resource-component';
  if (artifact.artifactFamily === 'implementation') return 'contract-or-obligation-implementation';
  if (artifact.artifactFamily === 'verification' || artifact.artifactFamily === 'proof-evidence') return 'requirement-fixture-or-proof';
  if (artifact.artifactFamily === 'v2-support' || artifact.artifactFamily === 'runtime-topology') return 'support-contract-materialisation';
  return candidates.length > 1 ? 'one-artifact-many-resources' : 'semantic-resource-projection';
}

export function buildMappings(artifacts, parserResults, relationships) {
  const parsedByPath = new Map(parserResults.map((record) => [record.path, record]));
  const relationsByPath = new Map();
  for (const relation of relationships) {
    if (!relationsByPath.has(relation.source)) relationsByPath.set(relation.source, []);
    relationsByPath.get(relation.source).push(relation);
  }
  const resources = graphResources(parserResults);
  const reviewRecords = [mappingReviewPath, convergenceReviewPath].flatMap((target) => fs.existsSync(target) ? readJsonl(target) : []);
  const reviews = new Map(reviewRecords.map((review) => [`${review.artifactKey}\0${review.contentDigest}`, review]));
  const preliminary = [];
  for (const artifact of artifacts) {
    const parsed = parsedByPath.get(artifact.path);
    const discovered = explicitCandidates(artifact, parsed, relationsByPath.get(artifact.path) ?? [], resources);
    const provedIdentifiers = new Set(discovered.evidence.filter((entry) => entry.strength >= 0.8).map((entry) => entry.resource));
    const candidates = discovered.candidates.filter((candidate) => provedIdentifiers.has(candidate.identifier));
    const evidence = discovered.evidence.filter((entry) => provedIdentifiers.has(entry.resource));
    const coverage = coverageFor(artifact, parsed, candidates, evidence);
    preliminary.push({ artifact, parsed, candidates, evidence, coverage });
  }
  const resourceUse = new Map();
  for (const entry of preliminary) for (const resource of entry.candidates) resourceUse.set(resource.identifier, (resourceUse.get(resource.identifier) ?? 0) + 1);
  const mappings = preliminary.map(({ artifact, parsed, candidates, evidence, coverage }) => {
    const mappingType = mappingTypeFor(artifact, candidates, coverage);
    const sharedResource = candidates.some((resource) => resourceUse.get(resource.identifier) > 1);
    const mappingCardinality = coverage.state === 'notrequired' ? 'one-to-zero' : candidates.length === 0 ? 'one-to-zero' : candidates.length > 1 ? 'one-to-many' : sharedResource ? 'many-to-one' : 'one-to-one';
    const mappingConfidence = {
      level: coverage.state === 'absent' || evidence.some((entry) => entry.strength < 0.8) ? 'medium' : 'high',
      score: coverage.state === 'absent' ? 0.8 : evidence.length ? Math.min(0.99, evidence.reduce((maximum, entry) => Math.max(maximum, entry.strength), 0)) : 0.95,
      reasons: coverage.state === 'absent' ? ['no-adequate-semantic-resource'] : coverage.state === 'notrequired' ? ['closed-no-output-disposition'] : ['explicit-semantic-identifier']
    };
    const coverageConfidence = { level: coverage.score >= 0.9 ? 'high' : 'medium', score: coverage.score, reasons: [coverage.state === 'absent' ? 'no-adequate-semantic-resource' : coverage.state === 'notrequired' ? 'closed-no-output-disposition' : 'missing-semantic-depth'] };
    const mappingEvidence = evidence.length ? evidence.map(({ kind, source, resource, strength }) => ({ kind, source, resource, strength })) : [{
      kind: coverage.state === 'notrequired' ? 'closed-disposition' : 'exhaustive-negative-resource-search',
      source: coverage.state === 'notrequired' ? 'authority-and-lifecycle-disposition' : 'normalized-graph-resource-catalogue',
      resource: null,
      strength: coverage.state === 'notrequired' ? 0.98 : 0.92
    }];
    let record = {
      artifactKey: artifact.artifactKey,
      path: artifact.path,
      universe: artifact.universe,
      mappingType,
      mappingCardinality,
      matchedResources: candidates.map((resource) => resource.identifier).sort(),
      mappingEvidence: mappingEvidence.sort((a, b) => String(a.resource ?? '').localeCompare(String(b.resource ?? '')) || a.kind.localeCompare(b.kind)),
      representedSemantics: coverage.represented,
      missingSemantics: coverage.missing,
      representedConstraints: candidates.filter((resource) => /shape|constraint|policy|permission/i.test(`${resource.kind} ${resource.identifier}`)).map((resource) => resource.identifier),
      representedProofEvidence: candidates.filter((resource) => /proof|evidence|obligation|result/i.test(`${resource.kind} ${resource.identifier}`)).map((resource) => resource.identifier),
      representedGeneration: candidates.filter((resource) => /artifact|generator|renderer|materiali/i.test(`${resource.kind} ${resource.identifier}`)).map((resource) => resource.identifier),
      ambiguities: evidence.some((entry) => entry.strength < 0.8) ? ['local-identifier-match-requires-architectural-review'] : [],
      conflicts: [],
      mappingConfidence,
      coverageDecision: coverage.state,
      coverageReason: coverage.reason,
      coverageConfidence,
      reviewStatus: artifact.reviewStatus === 'architect-reviewed' ? 'architect-reviewed' : 'machine-reviewed'
    };
    const review = reviews.get(`${artifact.artifactKey}\0${artifact.contentDigest}`);
    if (review) {
      const reviewedResources = review.matchedResources ?? review.acceptedResources ?? [];
      const reviewedDecision = review.coverageDecision ?? review.correctedDecision ?? review.independentDecision;
      const rejectedResources = review.rejectedResources ?? [];
      const reviewedReasons = review.reasonCodes ?? ['reviewed-architectural-determination'];
      record = {
      ...record,
      mappingType: reviewedDecision === 'absent' ? 'unmapped' : mappingTypeFor(artifact, reviewedResources.map((identifier) => ({ identifier })), { state: reviewedDecision }),
      mappingCardinality: reviewedResources.length === 0 ? 'one-to-zero' : reviewedResources.length > 1 ? 'one-to-many' : 'one-to-one',
      matchedResources: reviewedResources,
      mappingEvidence: (reviewedResources.length ? reviewedResources : [null]).map((resource) => ({ kind: 'reviewed-architectural-determination', source: reviewedReasons.join(':'), resource, strength: 1 })),
      representedSemantics: review.representedSemantics ?? (reviewedDecision === 'partial' ? ['semantic-identity', 'reviewed-audit-event-taxonomy'] : []),
      missingSemantics: familyLayers[artifact.artifactFamily],
      ambiguities: rejectedResources.map((resource) => `rejected-local-name-overmatch:${resource}`),
      mappingConfidence: { level: 'high', score: 0.98, reasons: ['reviewed-architectural-determination'] },
      coverageDecision: reviewedDecision,
      coverageReason: reviewedDecision === 'absent' ? 'Independent architectural review rejected incidental local-name matches and found no adequate semantic identity.' : 'Independent architectural review retained proved typed-resource identities, rejected collisions, and preserved explicit missing semantic layers.',
      coverageConfidence: { level: 'high', score: 0.96, reasons: ['reviewed-architectural-determination', 'missing-semantic-depth'] },
      reviewStatus: review.reviewStatus
      };
    }
    validateMapping(record);
    return record;
  }).sort(compareBy(['universe', 'path']));
  assertUnique(mappings, (record) => `${record.universe}\0${record.path}`);
  return { mappings, resources };
}

export function rankIdentityCandidates(artifacts, mappings, relationships, baselineCandidateRows = null) {
  const relationCounts = new Map();
  for (const relation of relationships) {
    relationCounts.set(relation.source, (relationCounts.get(relation.source) ?? 0) + 1);
    if (relation.targetKind === 'artifact') relationCounts.set(relation.target, (relationCounts.get(relation.target) ?? 0) + 1);
  }
  const artifactByKey = new Map(artifacts.map((record) => [record.artifactKey, record]));
  const familyWeight = { implementation: 9, 'proof-evidence': 9, automation: 8, verification: 8, 'runtime-topology': 8, 'machine-semantics': 7, 'repository-governance': 6, 'v2-support': 8, 'documentation-assets': 4 };
  const baselineCandidates = baselineCandidateRows ? new Set(baselineCandidateRows) : null;
  return mappings.filter((mapping) => baselineCandidates ? baselineCandidates.has(`${mapping.universe}:${mapping.path}`) : mapping.coverageDecision === 'identityonly')
    .map((mapping) => {
      const artifact = artifactByKey.get(mapping.artifactKey);
      const centrality = relationCounts.get(mapping.path) ?? 0;
      const score = centrality * 3 + (familyWeight[artifact.artifactFamily] ?? 1) * 5 + mapping.missingSemantics.length * 4 + Math.round((1 - mapping.mappingConfidence.score) * 20);
      return { artifactKey: mapping.artifactKey, path: mapping.path, universe: mapping.universe, artifactFamily: artifact.artifactFamily, candidateCoverage: mapping.coverageDecision, matchedResources: mapping.matchedResources, mappingEvidence: mapping.mappingEvidence, representedSemantics: mapping.representedSemantics, missingSemantics: mapping.missingSemantics, rankingScore: score, rankingEvidence: { relationshipCentrality: centrality, familyImportance: familyWeight[artifact.artifactFamily] ?? 1, semanticDepth: mapping.missingSemantics.length, mappingUncertainty: 1 - mapping.mappingConfidence.score } };
    }).sort((a, b) => b.rankingScore - a.rankingScore || a.path.localeCompare(b.path));
}

export function buildMissingEntirely(mappings) {
  return mappings.filter((mapping) => mapping.coverageDecision === 'absent').map((mapping) => ({
    missingKey: sha256(`missing\0${mapping.artifactKey}`),
    artifactKey: mapping.artifactKey,
    path: mapping.path,
    universe: mapping.universe,
    missingKind: 'required-artifact-semantic-definition',
    requiredSemanticLayers: mapping.missingSemantics,
    evidence: ['explicit-unmapped-result', 'normalized-graph-resource-comparison'],
    requiredCanonicalOutcome: `Define and plan the canonical outcome represented by ${path.posix.basename(mapping.path)}.`,
    primaryWorkPackage: null
  })).sort(compareBy(['universe', 'path']));
}

export const mappingInternals = { familyLayers, graphResources, localName };
