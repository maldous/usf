import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DataFactory, Parser, Store, Writer } from 'n3';

const { namedNode, literal, quad } = DataFactory;
const RDF_TYPE = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const USF = 'urn:usf:ontology:';
const p = (local) => namedNode(`${USF}${local}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const UNIVERSES = Object.freeze({
  'repository-output': 'canonicalrepository',
  'v2-compiler-implementation': 'compilerimplementation',
  'v2-graph-authority': 'graphauthority',
  'v2-support-provisioning': 'supportprovisioning',
});

const FAMILY_ROLES = Object.freeze({
  automation: 'automation',
  'documentation-assets': 'documentation',
  implementation: 'implementation',
  'machine-semantics': 'machinesemantics',
  'proof-evidence': 'proofevidence',
  'repository-governance': 'repositorygovernance',
  'runtime-topology': 'runtimetopology',
  'v2-support': 'supportprovisioning',
  verification: 'verification',
});

const EQUIVALENCE_FIXTURE_EXACT_PATHS = new Set([
  'tests/packages/supply-chain/supply-chain-planted-defects.json',
]);

function isEquivalenceFixture(artifact) {
  if (artifact.universe !== 'repository-output') return false;
  if (EQUIVALENCE_FIXTURE_EXACT_PATHS.has(artifact.path)) return true;
  return artifact.path.split('/').some((segment) =>
    segment === 'fixtures' || segment === 'planted-defects' || segment.endsWith('-planted-defects')
  );
}

function readJsonl(path) {
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function exactlyOne(store, subject, predicate, label) {
  const values = store.getObjects(subject, predicate, null);
  if (values.length !== 1) throw new Error(`${label} requires exactly one value for ${subject.value}; observed ${values.length}`);
  return values[0];
}

function sourceSemanticBindings(manifest) {
  const store = new Store();
  for (const entry of [...manifest.definitions, ...manifest.authored]) {
    store.addQuads(new Parser({ format: entry.contentType, baseIRI: manifest.baseIri }).parse(readFileSync(entry.path, 'utf8')));
  }
  const bindings = new Map();
  for (const binding of store.getSubjects(RDF_TYPE, namedNode(`${USF}SourceSemanticBinding`), null)) {
    const source = exactlyOne(store, binding, p('sourceBindingSource'), 'source semantic binding source');
    const path = exactlyOne(store, binding, p('sourceBindingPath'), 'source semantic binding path').value;
    const contentDigest = exactlyOne(store, binding, p('sourceBindingContentDigest'), 'source semantic binding content digest').value;
    const match = source.value.match(/^urn:usf:sourceartefact:s([0-9a-f]{64})$/);
    if (!match || !/^[0-9a-f]{64}$/.test(contentDigest)) throw new Error(`invalid source semantic binding identity: ${binding.value}`);
    const targets = store.getObjects(binding, p('sourceBindingTarget'), null).filter((term) => term.termType === 'NamedNode').map((term) => term.value).sort();
    if (!targets.length || bindings.has(match[1])) throw new Error(`ambiguous or empty source semantic binding: ${binding.value}`);
    bindings.set(match[1], { binding: binding.value, path, contentDigest, targets });
  }
  return bindings;
}

function graphRoleByPath(manifest) {
  const result = new Map();
  const add = (entries, role) => {
    for (const entry of entries) if (entry.file) result.set(`v2/usf/graph/${entry.file}`, role);
  };
  add(manifest.definitions, 'semanticdefinition');
  add(manifest.authored, 'authoredsemantics');
  add(manifest.shapes, 'validatorshape');
  add(manifest.rules, 'derivationrule');
  add(manifest.derived, 'derivedprojection');
  result.set('v2/usf/graph/manifest.yaml', 'authoritymanifest');
  return result;
}

function rolesFor(artifact, registeredRoles, manifest) {
  const roles = new Set();
  const familyRole = FAMILY_ROLES[artifact.artifactFamily];
  if (familyRole) roles.add(familyRole);
  if (registeredRoles.has(artifact.path)) roles.add(registeredRoles.get(artifact.path));
  const fixtureRoots = [manifest.fixtures?.conforming, manifest.fixtures?.defects].filter(Boolean)
    .map((root) => `v2/usf/graph/${root}/`);
  if (fixtureRoots.some((root) => artifact.path.startsWith(root))) roles.add('fixture');
  if (isEquivalenceFixture(artifact)) roles.add('equivalencefixture');
  if (artifact.path.endsWith('/.gitkeep') || artifact.path === '.gitkeep') roles.add('placeholder');
  if (artifact.universe === 'v2-support-provisioning' && !roles.has('placeholder')) roles.add('supportprovisioning');
  return [...roles].sort();
}

function observationRows(artifacts, mappings, manifest, semanticBindings = new Map()) {
  const mappingByKey = new Map(mappings.map((record) => [record.artifactKey, record]));
  const registeredRoles = graphRoleByPath(manifest);
  const carrierPaths = new Set([
    ...manifest.observed.filter((entry) => entry.file).map((entry) => `v2/usf/graph/${entry.file}`),
    ...manifest.derived.filter((entry) => entry.file).map((entry) => `v2/usf/graph/${entry.file}`),
  ]);
  const rows = artifacts.filter((artifact) => !carrierPaths.has(artifact.path)).map((artifact) => {
    const universe = UNIVERSES[artifact.universe];
    if (!universe) throw new Error(`unknown source universe: ${artifact.universe}`);
    const roles = rolesFor(artifact, registeredRoles, manifest);
    if (!roles.length) throw new Error(`source observation has no structural role: ${artifact.artifactKey}`);
    const binding = semanticBindings.get(artifact.artifactKey);
    if (binding && (binding.path !== artifact.path || binding.contentDigest !== artifact.contentDigest)) {
      throw new Error(`source semantic binding does not match current artifact: ${binding.binding}`);
    }
    const semanticReferences = [...new Set([
      ...(mappingByKey.get(artifact.artifactKey)?.matchedResources ?? []),
      ...(binding?.targets ?? []),
    ])].sort();
    return {
      artifactKey: artifact.artifactKey,
      path: artifact.path,
      contentDigest: artifact.contentDigest,
      fileMode: artifact.fileMode,
      universe,
      roles,
      semanticReferences,
    };
  }).sort((a, b) => a.artifactKey.localeCompare(b.artifactKey));
  const setDigest = sha256(rows.map((row) => JSON.stringify(row)).join('\n'));
  return { rows, setDigest, carrierPaths: [...carrierPaths].sort() };
}

function writeTriG(quads) {
  return new Promise((resolvePromise, reject) => {
    const writer = new Writer({ format: 'application/trig' });
    writer.addQuads(quads);
    writer.end((error, output) => error ? reject(error) : resolvePromise(output));
  });
}

export async function collectRepositorySourceObservations({ manifest, entry }) {
  const repositoryRoot = resolve(manifest.root, '../../..');
  const censusRoot = join(repositoryRoot, 'v2/usf/census');
  const artifacts = readJsonl(join(censusRoot, 'artifacts.jsonl'));
  const mappings = readJsonl(join(censusRoot, 'mappings.jsonl'));
  const mappingKeys = new Set(mappings.map((record) => record.artifactKey));
  if (artifacts.some((artifact) => !mappingKeys.has(artifact.artifactKey))) {
    throw new Error('source observation collection requires one current mapping per artifact');
  }
  const bindings = sourceSemanticBindings(manifest);
  for (const artifactKey of bindings.keys()) if (!artifacts.some((artifact) => artifact.artifactKey === artifactKey)) {
    throw new Error(`source semantic binding has no current census artifact: ${artifactKey}`);
  }
  const { rows, setDigest, carrierPaths } = observationRows(artifacts, mappings, manifest, bindings);
  const quads = [];
  for (const row of rows) {
    const sourceName = `s${row.artifactKey}`;
    const source = namedNode(`urn:usf:sourceartefact:${sourceName}`);
    const observationDigest = sha256(JSON.stringify({ ...row, setDigest }));
    const observationName = `o${observationDigest}`;
    const observation = namedNode(`urn:usf:sourceartefactobservation:${observationName}`);
    quads.push(
      quad(source, RDF_TYPE, namedNode(`${USF}SourceArtefact`)),
      quad(source, p('canonicalName'), literal(sourceName)),
      quad(source, p('sourceIdentityDigest'), literal(row.artifactKey)),
      quad(source, p('hasCurrentSourceObservation'), observation),
      quad(observation, RDF_TYPE, namedNode(`${USF}SourceArtefactObservation`)),
      quad(observation, p('canonicalName'), literal(observationName)),
      quad(observation, p('observesSourceArtefact'), source),
      quad(observation, p('observedSourcePath'), literal(row.path)),
      quad(observation, p('observedContentDigest'), literal(row.contentDigest)),
      quad(observation, p('observedFileMode'), literal(row.fileMode)),
      quad(observation, p('observedUniverse'), namedNode(`urn:usf:sourceuniverse:${row.universe}`)),
      quad(observation, p('observationSetDigest'), literal(setDigest)),
    );
    for (const role of row.roles) quads.push(quad(observation, p('observedContentRole'), namedNode(`urn:usf:sourcecontentrole:${role}`)));
    for (const reference of row.semanticReferences) quads.push(quad(observation, p('hasExactSemanticReference'), namedNode(reference)));
  }
  return Object.freeze({
    graph: entry.graph,
    contentType: 'application/trig',
    content: await writeTriG(quads.map((item) => quad(item.subject, item.predicate, item.object, namedNode(entry.graph)))),
    sourceCount: rows.length,
    tripleCount: quads.length,
    observationSetDigest: setDigest,
    excludedCarrierPaths: carrierPaths,
  });
}

export async function collectObservedEntry({ manifest, entry }) {
  if (entry.collector === 'repositorysourceobserver') return collectRepositorySourceObservations({ manifest, entry });
  throw new Error(`unknown observed graph collector: ${entry.collector}`);
}

export const sourceObserverInternals = { EQUIVALENCE_FIXTURE_EXACT_PATHS, FAMILY_ROLES, UNIVERSES, isEquivalenceFixture, observationRows, rolesFor, sourceSemanticBindings };
