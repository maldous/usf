import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataFactory, Parser, Store, Writer } from 'n3';

const { namedNode, literal, quad } = DataFactory;
const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(HERE, '..', '..', '..', '..');
const GRAPH_DIR = join(REPOSITORY_ROOT, 'v2/usf/graph');
const CONTRACT_DIR = join(REPOSITORY_ROOT, 'spec/instances/semantic-contract');
const CENSUS_ARTIFACTS = join(REPOSITORY_ROOT, 'v2/usf/census/artifacts.jsonl');
const OUTPUT = join(GRAPH_DIR, 'contracts/semantic-depth.trig');
const GRAPH = namedNode('urn:usf:graph:semanticdepth');
const RDF_TYPE = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const USF = 'urn:usf:ontology:';
const p = (local) => namedNode(`${USF}${local}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const reviewedOverrides = new Map([
  ['semantic-contract.authentication-platform#uiSemanticDefinition', {
    status: 'complete',
    statement: 'Authentication UI semantics require a public login route, a framework-neutral login view model, explicit unauthenticated, authenticating, authenticated, and denied states, a login form bound to the authentication operation, explicit inline, forbidden, banner, and summary errors, and governed accessibility and localisation requirements.',
  }],
  ['semantic-contract.user-identity-and-tenant-membership#uiSemanticDefinition', {
    status: 'notapplicable',
    statement: 'User identity and tenant membership is explicitly not exposed as a UI capability. Profile list and detail surfaces are governed by the end-user profile and preferences capability, so this contract must not invent a duplicate membership UI.',
  }],
]);

function parseJsonl(path) {
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function one(store, subject, predicate, label) {
  const values = store.getObjects(subject, predicate, null);
  if (values.length !== 1) throw new Error(`${label} requires exactly one value for ${subject.value}; observed ${values.length}`);
  return values[0];
}

function sanitiseStatement(value) {
  const statement = value
    .replace(/fresh USF proof pending USF-[0-9]+(?:\/USF-[0-9]+)*/gi, 'fresh proof remains pending')
    .trim();
  if (/linear[.]app|github[.]com|gitlab[.]com|refs\/heads|commitSha|branchName|issueId|projectId|ADR-[0-9]|USF-[0-9]/i.test(statement)) {
    throw new Error('semantic statement contains forbidden external coordination metadata');
  }
  return statement;
}

const capabilityStore = new Store(new Parser({ format: 'application/trig' }).parse(
  readFileSync(join(GRAPH_DIR, 'contracts/capabilities.trig'), 'utf8'),
));
const contractsByName = new Map();
for (const row of capabilityStore.getQuads(null, RDF_TYPE, namedNode(`${USF}SemanticContract`), null)) {
  contractsByName.set(one(capabilityStore, row.subject, p('canonicalName'), 'contract canonicalName').value, row.subject);
}
const artifactsByPath = new Map(parseJsonl(CENSUS_ARTIFACTS).map((row) => [row.path, row]));
const documents = readdirSync(CONTRACT_DIR).filter((file) => file.endsWith('.json')).sort()
  .map((file) => ({ file, sourcePath: `spec/instances/semantic-contract/${file}`, document: JSON.parse(readFileSync(join(CONTRACT_DIR, file), 'utf8')) }));

if (documents.length !== 67 || contractsByName.size !== 67) {
  throw new Error(`contract migration requires 67 source and 67 target contracts; observed ${documents.length}/${contractsByName.size}`);
}

const quads = [];
const boundBindings = [];
let facetCount = 0;
let overrideCount = 0;
let semanticBindingCount = 0;
for (const { sourcePath, document } of documents) {
  const expectedId = `semantic-contract.${document.capability}`;
  if (document.id !== expectedId) throw new Error(`source contract identity mismatch: ${sourcePath}`);
  const contractName = canonical(document.capability);
  const contract = contractsByName.get(contractName);
  if (!contract) throw new Error(`no explicit target contract selected for ${sourcePath}`);
  const artifact = artifactsByPath.get(sourcePath);
  if (!artifact || artifact.contentDigest !== sha256(readFileSync(join(REPOSITORY_ROOT, sourcePath)))) {
    throw new Error(`current census digest mismatch for ${sourcePath}`);
  }
  const facets = capabilityStore.getObjects(contract, p('declaresFacet'), null);
  const facetsByKind = new Map(facets.map((facet) => {
    const kind = one(capabilityStore, facet, p('facetKind'), 'facet kind').value.split(':').at(-1);
    return [kind, facet];
  }));
  if (facetsByKind.size !== 10 || Object.keys(document.facets).length !== 10) throw new Error(`contract facet cardinality mismatch: ${sourcePath}`);

  const bindingName = `${contractName}semanticsource`;
  const binding = namedNode(`urn:usf:sourcesemanticbinding:${bindingName}`);
  const source = namedNode(`urn:usf:sourceartefact:s${artifact.artifactKey}`);
  quads.push(
    quad(binding, RDF_TYPE, namedNode(`${USF}SourceSemanticBinding`), GRAPH),
    quad(binding, p('canonicalName'), literal(bindingName), GRAPH),
    quad(binding, p('sourceBindingSource'), source, GRAPH),
    quad(binding, p('sourceBindingTarget'), contract, GRAPH),
    quad(binding, p('sourceBindingContentDigest'), literal(artifact.contentDigest), GRAPH),
    quad(binding, p('sourceBindingPath'), literal(sourcePath), GRAPH),
    quad(binding, p('sourceBindingEquivalenceKind'), namedNode('urn:usf:equivalencekind:structural'), GRAPH),
    quad(contract, p('semanticLifecycleState'), namedNode(`urn:usf:semanticlifecyclestate:${canonical(document.lifecycleState)}`), GRAPH),
  );
  boundBindings.push(binding);

  let overridden = false;
  for (const [sourceKind, sourceFacet] of Object.entries(document.facets)) {
    const kind = sourceKind === 'uiSemanticDefinition' ? 'uisemantics' : canonical(sourceKind);
    const facet = facetsByKind.get(kind);
    if (!facet) throw new Error(`no explicit target facet selected for ${sourcePath}#${sourceKind}`);
    const override = reviewedOverrides.get(`${document.id}#${sourceKind}`);
    if (override) { overridden = true; overrideCount += 1; }
    const status = override?.status ?? canonical(sourceFacet.status);
    const statement = sanitiseStatement(override?.statement ?? sourceFacet.description ?? '');
    if (!statement) throw new Error(`identity-only source facet requires a reviewed override: ${sourcePath}#${sourceKind}`);
    if (!['complete', 'gap', 'notapplicable'].includes(status)) throw new Error(`unsupported facet status ${status}: ${sourcePath}#${sourceKind}`);
    quads.push(
      quad(binding, p('sourceBindingTarget'), facet, GRAPH),
      quad(facet, p('facetStatus'), namedNode(`urn:usf:facetstatus:${status}`), GRAPH),
      quad(facet, p('facetStatement'), literal(statement), GRAPH),
    );
    facetCount += 1;
  }
  if (!overridden) {
    quads.push(quad(binding, p('sourceBindingEquivalenceKind'), namedNode('urn:usf:equivalencekind:semantic'), GRAPH));
    semanticBindingCount += 1;
  }
}

const policy = namedNode('urn:usf:sourcedispositionpolicy:semanticcontractsource');
quads.push(
  quad(policy, RDF_TYPE, namedNode(`${USF}SourceDispositionPolicy`), GRAPH),
  quad(policy, p('canonicalName'), literal('semanticcontractsource'), GRAPH),
  quad(policy, p('policyDispositionKind'), namedNode('urn:usf:dispositionkind:retainsemanticauthority'), GRAPH),
  quad(policy, p('policyDispositionBasis'), namedNode('urn:usf:dispositionbasis:exactsemanticbinding'), GRAPH),
  quad(policy, p('policyDispositionBasis'), namedNode('urn:usf:dispositionbasis:independentintegrityobservation'), GRAPH),
  quad(policy, p('policyDecisionState'), namedNode('urn:usf:dispositiondecisionstate:accepted'), GRAPH),
  quad(policy, p('policyOutputMode'), namedNode('urn:usf:dispositionoutputmode:nooutput'), GRAPH),
  quad(policy, p('policyGenerationInputRole'), namedNode('urn:usf:generationinputrole:semanticauthority'), GRAPH),
  quad(policy, p('isDefaultDispositionPolicy'), literal(false), GRAPH),
  quad(policy, p('isActiveDispositionPolicy'), literal(true), GRAPH),
  quad(policy, p('decisionRationale'), literal('Each selected source is joined through an exact authored identity, path, and content-digest binding to its contract and facet resources; normalized names and path resemblance are not selectors.'), GRAPH),
);
for (const binding of boundBindings.sort((a, b) => a.value.localeCompare(b.value))) {
  quads.push(quad(policy, p('policyMatchesSourceBinding'), binding, GRAPH));
}

const writer = new Writer({ format: 'application/trig' });
writer.addQuads(quads);
const output = await new Promise((resolveOutput, reject) => writer.end((error, value) => error ? reject(error) : resolveOutput(value)));
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, output, 'utf8');
process.stdout.write(`${JSON.stringify({ output: 'v2/usf/graph/contracts/semantic-depth.trig', contracts: documents.length, facets: facetCount, bindings: documents.length, semanticBindings: semanticBindingCount, reviewedOverrides: overrideCount, triples: quads.length, sha256: sha256(output) })}\n`);
