import { compareBy, sha256 } from './canonical.mjs';
import { buildSourcePlanOwnership } from './source-plan-ownership.mjs';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const ARTEFACT_PLAN_CLASS = 'urn:usf:ontology:ArtefactPlan';

function observedArtefactPlans(parserResults) {
  const plans = new Map();
  for (const parsed of parserResults.filter((record) => record.universe === 'v2-graph-authority' && !record.path.includes('/fixtures/'))) {
    for (const declaration of parsed.declarations) {
      const attributes = declaration.attributes ?? {};
      if (declaration.kind !== 'semantic-triple' || attributes.predicate !== RDF_TYPE || attributes.object !== ARTEFACT_PLAN_CLASS || attributes.subject?.startsWith('_:')) continue;
      if (!plans.has(attributes.subject)) plans.set(attributes.subject, { planIri: attributes.subject, evidencePaths: [] });
      plans.get(attributes.subject).evidencePaths.push(parsed.path);
    }
  }
  return [...plans.values()].map((record) => ({ ...record, evidencePaths: [...new Set(record.evidencePaths)].sort() })).sort(compareBy(['planIri']));
}

export function validateReplacementGroup(record, currentKeys, canonicalKeys) {
  const allowed = new Set(['one-to-one', 'many-to-one', 'one-to-many', 'many-to-many', 'one-to-zero', 'zero-to-one']);
  if (!allowed.has(record.cardinality)) throw new Error(`invalid replacement cardinality: ${record.groupKey}`);
  if (record.currentArtifacts.some((key) => !currentKeys.has(key))) throw new Error(`replacement has missing current artifact: ${record.groupKey}`);
  if (record.canonicalArtifacts.some((key) => !canonicalKeys.has(key))) throw new Error(`replacement has missing canonical artifact: ${record.groupKey}`);
  const counts = `${record.currentArtifacts.length}:${record.canonicalArtifacts.length}`;
  const valid = record.cardinality === 'one-to-one' ? counts === '1:1' :
    record.cardinality === 'many-to-one' ? record.currentArtifacts.length > 1 && record.canonicalArtifacts.length === 1 :
    record.cardinality === 'one-to-many' ? record.currentArtifacts.length === 1 && record.canonicalArtifacts.length > 1 :
    record.cardinality === 'many-to-many' ? record.currentArtifacts.length > 1 && record.canonicalArtifacts.length > 1 :
    record.cardinality === 'one-to-zero' ? record.currentArtifacts.length === 1 && record.canonicalArtifacts.length === 0 :
    record.currentArtifacts.length === 0 && record.canonicalArtifacts.length === 1;
  if (!valid) throw new Error(`replacement cardinality mismatch: ${record.groupKey}`);
}

export function buildArtifactPlan(artifacts, _parserResults, mappings, _missingEntirely, _relationships) {
  const mappingByKey = new Map(mappings.map((record) => [record.artifactKey, record]));
  const graphPlans = observedArtefactPlans(_parserResults);
  const sourceOwnership = buildSourcePlanOwnership(artifacts, _parserResults, graphPlans);
  const ownershipByKey = new Map(sourceOwnership.assessments.map((record) => [record.artifactKey, record]));
  const planEvidencePaths = [...new Set(graphPlans.flatMap((record) => record.evidencePaths))].sort();
  const canonicalArtifacts = [];
  const replacementGroups = [...artifacts].sort(compareBy(['universe', 'path'])).map((artifact) => {
    const mapping = mappingByKey.get(artifact.artifactKey);
    const ownership = ownershipByKey.get(artifact.artifactKey);
    const dispositionStatus = ownership?.accepted
      ? ownership.planRequired ? 'graph-owned-output-plan' : 'graph-owned-no-output-disposition'
      : 'missing-accepted-source-disposition';
    const reasonCode = ownership?.accepted
      ? ownership.planRequired ? 'accepted-output-disposition-and-plan' : 'accepted-no-output-disposition'
      : ownership?.findings?.[0] ?? 'accepted-source-disposition-not-observed';
    const groupKey = `replacement-${sha256(`artifact-plan-missing\0${artifact.artifactKey}`).slice(0, 24)}`;
    return {
      groupKey,
      semanticInvariant: `No canonical target or disposition may be selected for ${artifact.path} until graph authority defines an accepted source disposition and, for output-producing kinds, an artifact plan.`,
      currentArtifacts: [artifact.artifactKey],
      canonicalArtifacts: [],
      cardinality: 'one-to-zero',
      consolidationClass: ownership?.accepted
        ? ownership.planRequired ? 'accepted-output-plan' : 'accepted-no-output-disposition'
        : 'source-disposition-unavailable',
      dispositionStatus,
      requiredGraphObligation: {
        classIri: 'urn:usf:ontology:SourceArtefactDisposition',
        outputPlanClassIri: ownership?.planRequired ? 'urn:usf:ontology:ArtefactPlan' : null,
        artifactPath: artifact.path,
        mappingState: mapping?.coverageDecision ?? 'absent',
        reasonCode,
        observedArtefactPlanCount: graphPlans.length,
        observedArtefactPlanEvidencePaths: planEvidencePaths,
        sourceOwnershipFindings: ownership?.findings ?? ['source-ownership-assessment-missing'],
        sourceIri: ownership?.sourceIri ?? null,
        observationIri: ownership?.observationIri ?? null,
        dispositionIri: ownership?.dispositionIri ?? null,
        planRequired: ownership?.planRequired ?? false,
        assignedPlanIri: ownership?.planIri ?? null,
        dispositionKindIri: ownership?.dispositionKindIri ?? null,
        decisionStateIri: ownership?.decisionStateIri ?? null
      },
      safetyEvidence: [`mapping:${artifact.artifactKey}`, `graph-artefact-plan-instance-count:${graphPlans.length}`, ...planEvidencePaths.map((evidencePath) => `graph-evidence:${evidencePath}`)],
      reuseActions: ['none'],
      removedDuplication: [],
      requiredGenerationProjections: [],
      equivalenceGates: [`artifact-plan-required-${artifact.artifactKey}`],
      proofEvidenceGates: [`artifact-plan-required-${artifact.artifactKey}`],
      migrationOrdering: ['define-artifact-plan-semantics', 'author-artifact-plan', 'recompute-census'],
      confidence: ownership?.accepted
        ? { level: 'high', score: 0.99, reasons: [ownership.planRequired ? 'accepted-exact-output-disposition-and-plan' : 'accepted-exact-no-output-disposition'] }
        : { level: 'low', score: 0.1, reasons: ['accepted-source-disposition-not-observed'] },
      reviewStatus: 'machine-reviewed'
    };
  }).sort(compareBy(['groupKey']));
  const currentKeys = new Set(artifacts.map((record) => record.artifactKey));
  const canonicalKeys = new Set();
  for (const group of replacementGroups) validateReplacementGroup(group, currentKeys, canonicalKeys);
  return { canonicalArtifacts, replacementGroups, observedArtefactPlans: graphPlans, sourcePlanOwnership: sourceOwnership };
}

export const artifactPlanInternals = { observedArtefactPlans };
