import { compareBy } from './canonical.mjs';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const NS = 'urn:usf:ontology:';
const TERMS = Object.freeze({
  namedGraph: `${NS}NamedGraph`,
  graphIri: `${NS}graphIri`,
  graphClass: `${NS}graphClass`,
  sourceArtefact: `${NS}SourceArtefact`,
  observation: `${NS}SourceArtefactObservation`,
  disposition: `${NS}SourceArtefactDisposition`,
  dispositionKind: `${NS}DispositionKind`,
  observes: `${NS}observesSourceArtefact`,
  observedPath: `${NS}observedSourcePath`,
  observedDigest: `${NS}observedContentDigest`,
  observedUniverse: `${NS}observedUniverse`,
  hasDisposition: `${NS}hasSourceDisposition`,
  dispositionOf: `${NS}dispositionOfSourceArtefact`,
  assignedPlan: `${NS}assignedToArtefactPlan`,
  hasDispositionKind: `${NS}hasDispositionKind`,
  decisionState: `${NS}hasDispositionDecisionState`
});
const ACCEPTED = 'urn:usf:dispositiondecisionstate:accepted';
const DATA_GRAPH_CLASSES = new Set([
  'urn:usf:graphclass:definitiongraph',
  'urn:usf:graphclass:authoredgraph',
  'urn:usf:graphclass:observedgraph',
  'urn:usf:graphclass:derivedgraph'
]);
const SOURCE_UNIVERSES = new Map([
  ['urn:usf:sourceuniverse:canonicalrepository', 'repository-output'],
  ['urn:usf:sourceuniverse:compilerimplementation', 'v2-compiler-implementation'],
  ['urn:usf:sourceuniverse:graphauthority', 'v2-graph-authority'],
  ['urn:usf:sourceuniverse:supportprovisioning', 'v2-support-provisioning']
]);
const OUTPUT_DISPOSITION_KINDS = new Set([
  'urn:usf:dispositionkind:generateequivalent',
  'urn:usf:dispositionkind:retireafterequivalence'
]);

function dataset(parserResults) {
  return parserResults.filter((record) => record.universe === 'v2-graph-authority' && !record.path.includes('/fixtures/')).flatMap((record) =>
    record.declarations.filter((declaration) => declaration.kind === 'semantic-triple').map((declaration) => ({
      sourcePath: record.path,
      graph: declaration.attributes?.graph,
      subject: declaration.attributes?.subject,
      predicate: declaration.attributes?.predicate,
      object: declaration.attributes?.object
    }))
  ).filter((triple) => triple.subject && triple.predicate && triple.object);
}

function objects(triples, subject, predicate) {
  return [...new Set(triples.filter((triple) => triple.subject === subject && triple.predicate === predicate).map((triple) => triple.object))].sort();
}

function lexicalValue(term) {
  if (typeof term !== 'string' || !term.startsWith('"')) return term;
  const match = term.match(/^("(?:[^"\\]|\\.)*")(?:\^\^.+|@[A-Za-z0-9-]+)?$/s);
  if (!match) return term;
  try { return JSON.parse(match[1]); } catch { return term; }
}

function lexicalObjects(triples, subject, predicate) {
  return objects(triples, subject, predicate).map(lexicalValue);
}

function typedSubjects(triples, classIri) {
  return [...new Set(triples.filter((triple) => triple.predicate === RDF_TYPE && triple.object === classIri && !triple.subject.startsWith('_:')).map((triple) => triple.subject))].sort();
}

function registeredAuthorityGraphs(triples) {
  const registered = new Set();
  for (const subject of typedSubjects(triples, TERMS.namedGraph)) {
    const graphIris = lexicalObjects(triples, subject, TERMS.graphIri);
    const graphClasses = objects(triples, subject, TERMS.graphClass);
    if (graphIris.length === 1 && graphClasses.length === 1 && DATA_GRAPH_CLASSES.has(graphClasses[0])) registered.add(graphIris[0]);
  }
  return registered;
}

function resourceGraphs(triples, subject) {
  return [...new Set(triples.filter((triple) => triple.subject === subject && triple.graph).map((triple) => triple.graph))].sort();
}

function registeredResource(triples, registeredGraphs, subject) {
  const graphs = resourceGraphs(triples, subject);
  return graphs.length > 0 && graphs.every((graph) => registeredGraphs.has(graph));
}

function observationRows(triples) {
  return typedSubjects(triples, TERMS.observation).map((observationIri) => ({
    observationIri,
    sourceIris: objects(triples, observationIri, TERMS.observes),
    paths: lexicalObjects(triples, observationIri, TERMS.observedPath),
    digests: lexicalObjects(triples, observationIri, TERMS.observedDigest),
    universes: lexicalObjects(triples, observationIri, TERMS.observedUniverse).map((value) => SOURCE_UNIVERSES.get(value) ?? value)
  }));
}

function dispositionFor(triples, registeredGraphs, sourceIri, observationIri, planIris) {
  const forward = objects(triples, sourceIri, TERMS.hasDisposition);
  const reverse = typedSubjects(triples, TERMS.disposition).filter((subject) => objects(triples, subject, TERMS.dispositionOf).includes(sourceIri));
  const dispositions = [...new Set([...forward, ...reverse])].sort();
  const findings = [];
  if (forward.length !== 1 || reverse.length !== 1 || dispositions.length !== 1 || forward[0] !== reverse[0]) findings.push('source-disposition-bijection-invalid');
  if (dispositions.length !== 1) return { accepted: false, findings, observationIri };
  const dispositionIri = dispositions[0];
  const states = objects(triples, dispositionIri, TERMS.decisionState);
  const plans = objects(triples, dispositionIri, TERMS.assignedPlan);
  const kinds = objects(triples, dispositionIri, TERMS.hasDispositionKind);
  const planRequired = kinds.length === 1 && OUTPUT_DISPOSITION_KINDS.has(kinds[0]);
  if (!registeredResource(triples, registeredGraphs, dispositionIri)) findings.push('source-disposition-unregistered-graph');
  if (states.length !== 1 || states[0] !== ACCEPTED) findings.push(states.includes('urn:usf:dispositiondecisionstate:reviewrequired') ? 'source-disposition-review-required' : 'source-disposition-not-accepted');
  if ((planRequired && plans.length < 1) || (!planRequired && plans.length > 0)) findings.push('source-disposition-plan-cardinality-invalid');
  if (plans.some((plan) => !planIris.has(plan))) findings.push('source-disposition-plan-missing');
  if (kinds.length !== 1 || !typedSubjects(triples, TERMS.dispositionKind).includes(kinds[0])) findings.push('source-disposition-kind-invalid');
  return { accepted: findings.length === 0, findings, observationIri, dispositionIri, planRequired, planIris: plans, planIri: plans[0] ?? null, dispositionKindIri: kinds[0] ?? null, decisionStateIri: states[0] ?? null };
}

export function buildSourcePlanOwnership(artifacts, parserResults, observedPlans) {
  const triples = dataset(parserResults);
  const registeredGraphs = registeredAuthorityGraphs(triples);
  const planIris = new Set(observedPlans.map((record) => record.planIri));
  const sourceIris = new Set(typedSubjects(triples, TERMS.sourceArtefact));
  const observations = observationRows(triples);
  const byPathUniverse = new Map();
  for (const observation of observations) {
    if (observation.paths.length !== 1 || observation.universes.length !== 1) continue;
    const key = `${observation.universes[0]}\0${observation.paths[0]}`;
    if (!byPathUniverse.has(key)) byPathUniverse.set(key, []);
    byPathUniverse.get(key).push(observation);
  }
  const assessments = artifacts.map((artifact) => {
    const candidates = byPathUniverse.get(`${artifact.universe}\0${artifact.path}`) ?? [];
    const findings = [];
    if (candidates.length === 0) findings.push('source-observation-missing');
    if (candidates.length > 1) findings.push('source-observation-duplicate');
    const observation = candidates.length === 1 ? candidates[0] : null;
    if (!observation) return { artifactKey: artifact.artifactKey, path: artifact.path, universe: artifact.universe, accepted: false, findings };
    if (observation.sourceIris.length !== 1 || !sourceIris.has(observation.sourceIris[0])) findings.push('source-observation-source-invalid');
    if (observation.digests.length !== 1 || observation.digests[0] !== artifact.contentDigest) findings.push('source-observation-digest-mismatch');
    if (!registeredResource(triples, registeredGraphs, observation.observationIri)) findings.push('source-observation-unregistered-graph');
    const sourceIri = observation.sourceIris[0];
    if (sourceIri && !registeredResource(triples, registeredGraphs, sourceIri)) findings.push('source-artefact-unregistered-graph');
    const disposition = sourceIri ? dispositionFor(triples, registeredGraphs, sourceIri, observation.observationIri, planIris) : { accepted: false, findings: [] };
    findings.push(...disposition.findings);
    return {
      artifactKey: artifact.artifactKey,
      path: artifact.path,
      universe: artifact.universe,
      accepted: findings.length === 0 && disposition.accepted,
      findings: [...new Set(findings)].sort(),
      sourceIri: sourceIri ?? null,
      observationIri: observation.observationIri,
      dispositionIri: disposition.dispositionIri ?? null,
      planRequired: disposition.planRequired ?? false,
      planIris: disposition.planIris ?? [],
      planIri: disposition.planIri ?? null,
      dispositionKindIri: disposition.dispositionKindIri ?? null,
      decisionStateIri: disposition.decisionStateIri ?? null
    };
  }).sort(compareBy(['universe', 'path']));
  const matchedObservations = new Set(assessments.map((record) => record.observationIri).filter(Boolean));
  const orphanObservationCount = observations.filter((record) => !matchedObservations.has(record.observationIri)).length;
  return {
    assessments,
    registeredAuthorityGraphCount: registeredGraphs.size,
    sourceResourceCount: sourceIris.size,
    observationResourceCount: observations.length,
    dispositionResourceCount: typedSubjects(triples, TERMS.disposition).length,
    acceptedDispositionCount: assessments.filter((record) => record.accepted).length,
    rejectedDispositionCount: assessments.filter((record) => !record.accepted).length,
    outputDispositionCount: assessments.filter((record) => record.planRequired).length,
    acceptedOutputPlanCount: assessments.filter((record) => record.accepted && record.planRequired && record.planIri).length,
    acceptedNoOutputDispositionCount: assessments.filter((record) => record.accepted && !record.planRequired).length,
    orphanObservationCount,
    findingDistribution: Object.fromEntries([...new Set(assessments.flatMap((record) => record.findings))].sort().map((reason) => [reason, assessments.filter((record) => record.findings.includes(reason)).length]))
  };
}

export const sourcePlanOwnershipInternals = { ACCEPTED, DATA_GRAPH_CLASSES, OUTPUT_DISPOSITION_KINDS, SOURCE_UNIVERSES, TERMS, dataset, lexicalValue, objects, registeredAuthorityGraphs, typedSubjects };
