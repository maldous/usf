import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import {
  existsSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { DataFactory } from 'n3';
import { canonicalResource, literalValue, oneObject, subjectsOfType, USF } from './authority-dataset.js';
import { requireCompleteGenerationPlan } from './generation-plan.js';
import { CompilerError } from './compiler.js';
import { validateGeneratedOutput } from './validators/index.js';

const { namedNode } = DataFactory;
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

function authorityDigest(store) {
  const rows = store.getQuads(null, null, null, null).map((q) =>
    [q.subject.termType, q.subject.value, q.predicate.value, q.object.termType, q.object.value, q.graph.value].join('\u0000')
  );
  return sha256(rows.sort().join('\n'));
}

function componentQuery(store, component) {
  const query = literalValue(oneObject(store, namedNode(component), namedNode(`${USF}semanticInputQuery`)));
  const match = query?.match(/^\s*SELECT\s+\?resource\s+WHERE\s*\{([\s\S]*)\}\s*$/i);
  if (!match) throw new CompilerError(`unsupported semantic input query for ${component}`, { phase: 'generate:query', component, query });
  const statements = match[1].split('.').map((item) => item.trim()).filter(Boolean);
  const constraints = [];
  for (const statement of statements) {
    if (!statement.startsWith('?resource ')) throw new CompilerError(`unsupported semantic input query for ${component}`, { phase: 'generate:query', component, query, statement });
    const clauses = statement.slice('?resource '.length).split(';').map((item) => item.trim()).filter(Boolean);
    for (const clause of clauses) {
      const triple = clause.match(/^(a|<([^>]+)>)\s+<([^>]+)>$/);
      if (!triple) throw new CompilerError(`unsupported semantic input query for ${component}`, { phase: 'generate:query', component, query, clause });
      constraints.push({ predicate: triple[1] === 'a' ? RDF_TYPE : triple[2], object: triple[3] });
    }
  }
  const type = constraints.find((item) => item.predicate === RDF_TYPE);
  if (!type || !constraints.length) throw new CompilerError(`unsupported semantic input query for ${component}`, { phase: 'generate:query', component, query });
  return { query, classIri: type.object, constraints };
}

function projection(store, output, sourceDigest) {
  const selected = componentQuery(store, output.component);
  const resources = subjectsOfType(store, selected.classIri)
    .filter((subject) => selected.constraints.every((constraint) =>
      store.countQuads(subject, namedNode(constraint.predicate), namedNode(constraint.object), null) > 0
    ))
    .sort((a, b) => a.value.localeCompare(b.value))
    .map((subject) => canonicalResource(store, subject));
  if (!resources.length) throw new CompilerError(`semantic input query produced no resources for ${output.component}`, {
    phase: 'generate:missing-semantics',
    component: output.component,
    classIri: selected.classIri,
    obligation: { classIri: selected.classIri, output: output.artefact },
  });
  return {
    schemaVersion: 1,
    authorityDigest: sourceDigest,
    artefact: output.artefact,
    artefactKind: output.artefactKind,
    component: output.component,
    semanticInputQuery: selected.query,
    resources,
    nonClaims: ['generated projection is lower authority than its semantic inputs'],
  };
}

function releaseAuthority(store, output) {
  const component = namedNode(output.component);
  const identities = store.getObjects(component, namedNode(`${USF}authorisedSigningIdentity`), null);
  if (identities.length !== 1) throw new CompilerError('release generator requires exactly one authorised signing identity', {
    phase: 'generate:signing-authority', component: output.component, observed: identities.length,
  });
  const fingerprint = literalValue(oneObject(store, identities[0], namedNode(`${USF}signingKeyFingerprint`)));
  if (!fingerprint || !/^[0-9a-f]{64}$/.test(fingerprint)) throw new CompilerError('authorised signing identity has no valid key fingerprint', {
    phase: 'generate:signing-authority', signingIdentity: identities[0].value,
  });
  const versions = subjectsOfType(store, `${USF}Version`).filter((subject) =>
    store.countQuads(subject, namedNode(`${USF}versionOf`), namedNode(output.artefact), null) === 1
  );
  if (versions.length !== 1) throw new CompilerError('release manifest requires exactly one governed version', {
    phase: 'generate:release-version', artefact: output.artefact, observed: versions.length,
  });
  const version = literalValue(oneObject(store, versions[0], namedNode(`${USF}versionIdentifier`)));
  if (!version || !/^\d+\.\d+\.\d+(?:[+-][0-9A-Za-z.-]+)?$/.test(version)) throw new CompilerError('governed release version is not SemVer-shaped', {
    phase: 'generate:release-version', versionResource: versions[0].value,
  });
  return { signingIdentity: identities[0].value, signingKeyFingerprint: fingerprint, versionResource: versions[0].value, version };
}

function render(output, data) {
  if (output.path === 'contracts/schemas/compiler-output.schema.json') {
    return stableJson({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'urn:usf:generated:schema:compiler-output',
      title: 'USF generated semantic projection',
      type: 'object',
      required: ['schemaVersion', 'authorityDigest', 'artefact', 'component', 'resources'],
      properties: {
        schemaVersion: { const: 1 }, authorityDigest: { type: 'string', pattern: '^[0-9a-f]{64}$' },
        artefact: { type: 'string' }, component: { type: 'string' }, resources: { type: 'array' },
      },
      additionalProperties: true,
    });
  }
  if (output.path === 'ui/schemas/rendererinput.schema.json') {
    return stableJson({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'urn:usf:generated:schema:renderer-input',
      title: 'USF framework-neutral renderer input',
      type: 'object',
      required: ['schemaVersion', 'authorityDigest', 'artefact', 'component', 'resources'],
      properties: {
        schemaVersion: { const: 1 },
        authorityDigest: { type: 'string', pattern: '^[0-9a-f]{64}$' },
        artefact: { type: 'string', format: 'uri' },
        component: { type: 'string', format: 'uri' },
        resources: { type: 'array', items: { type: 'object' } },
        nonClaims: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    });
  }
  if (output.path === 'contracts/openapi/foundation.openapi.json') {
    return stableJson({ openapi: '3.1.0', info: { title: 'USF generated foundation contract projection', version: '0.1.0' }, paths: {},
      'x-usf-authority-digest': data.authorityDigest, 'x-usf-semantic-resources': data.resources,
      'x-usf-nonclaims': ['no HTTP path is emitted without authored HTTP method and route semantics'] });
  }
  if (output.path === 'workspace/package.json') {
    return stableJson({ name: 'usf-generated-foundation', version: '0.1.0', private: true, type: 'module',
      scripts: { test: 'node --test test/generated.test.mjs', validate: 'node ../proof/evidence-pipeline.mjs verify', proof: 'node ../proof/evidence-pipeline.mjs collect' } });
  }
  if (output.path === 'workspace/src/implementation-obligations.mjs') {
    return `// Generated obligations only; no domain behaviour is invented.\nexport default ${JSON.stringify(data.resources, null, 2)};\n`;
  }
  if (output.path === 'workspace/test/generated.test.mjs') {
    return `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport obligations from '../src/implementation-obligations.mjs';\ntest('generated obligations are explicit',()=>assert.ok(Array.isArray(obligations)&&obligations.length>0));\n`;
  }
  if (output.path === 'proof/evidence-pipeline.mjs') {
    return `import fs from 'node:fs';\nimport crypto from 'node:crypto';\nconst mode=process.argv[2];\nconst manifest=JSON.parse(fs.readFileSync(new URL('../release/manifest.json',import.meta.url)));\nconst digest=(p)=>crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+p,import.meta.url))).digest('hex');\nconst failures=manifest.files.filter(f=>digest(f.path)!==f.sha256);\nif(failures.length){console.error(JSON.stringify({status:'fail',failures}));process.exit(1)}\nconsole.log(JSON.stringify({status:'pass',mode,checked:manifest.files.length}));\n`;
  }
  if (output.path === '.github/workflows/validate.yml') {
    return `name: generated-foundation-validation\non:\n  push:\npermissions:\n  contents: read\nconcurrency:\n  group: generated-foundation-\${{ github.sha }}\n  cancel-in-progress: false\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - run: cd workspace && npm test\n`;
  }
  if (output.path === 'runtime/compose.json') {
    return stableJson({ name: 'usf-generated-foundation', services: {}, 'x-usf-authority-digest': data.authorityDigest,
      'x-usf-service-obligations': data.resources,
      'x-usf-nonclaims': ['no runnable service is emitted without authored image or build semantics'] });
  }
  if (output.path.endsWith('.graphql')) {
    return `# Generated framework-neutral contract projection.\nscalar USFSemanticResource\ntype Query { semanticResources: [USFSemanticResource!]! }\n`;
  }
  if (output.path.endsWith('.md')) {
    return `# Generated USF architecture projection\n\nAuthority digest: ${data.authorityDigest}\n\nResources: ${data.resources.length}\n\nThis generated report is lower authority than the graph.\n`;
  }
  if (output.path.endsWith('.mjs')) return `export default ${JSON.stringify(data, null, 2)};\n`;
  return stableJson(data);
}

function write(root, relativePath, content, reuseRoot = null) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  const digest = sha256(content);
  const prior = reuseRoot ? join(reuseRoot, relativePath) : null;
  if (prior && existsSync(prior) && sha256(readFileSync(prior)) === digest) {
    copyFileSync(prior, target);
    return { path: relativePath, bytes: Buffer.byteLength(content), sha256: digest, reused: true };
  }
  writeFileSync(target, content, { encoding: 'utf8', mode: relativePath.endsWith('.mjs') ? 0o755 : 0o644 });
  return { path: relativePath, bytes: Buffer.byteLength(content), sha256: digest, reused: false };
}

function materialiseTemplate(output, sourceRoot) {
  if (!sourceRoot) throw new CompilerError('template-backed generation requires an explicit source root', {
    phase: 'generate:template', component: output.component, template: output.template?.artefact,
  });
  const root = resolve(sourceRoot);
  const source = resolve(root, output.template.path);
  if (source !== root && !source.startsWith(`${root}/`)) throw new CompilerError('template path escapes the declared source root', {
    phase: 'generate:template', template: output.template.artefact, path: output.template.path,
  });
  if (!existsSync(source)) throw new CompilerError('declared template is missing', {
    phase: 'generate:template', template: output.template.artefact, path: output.template.path,
  });
  const content = readFileSync(source);
  const observed = sha256(content);
  if (observed !== output.template.sha256) throw new CompilerError('declared template checksum does not match source bytes', {
    phase: 'generate:template-integrity', template: output.template.artefact, path: output.template.path,
    expected: output.template.sha256, observed,
  });
  return content;
}

export function generateAuthority({ store, outputDir, mode = 'full', signingKeyPath, sourceRoot = null }) {
  if (!['full', 'incremental'].includes(mode)) throw new CompilerError(`unsupported generation mode: ${mode}`, { phase: 'generate:configuration' });
  const target = resolve(outputDir);
  if (mode === 'full' && existsSync(target)) throw new CompilerError('full generation requires an absent output directory', { phase: 'generate:clean-room', outputDir: target });
  const plan = requireCompleteGenerationPlan(store);
  const sourceDigest = authorityDigest(store);
  mkdirSync(dirname(target), { recursive: true });
  const old = mode === 'incremental' && existsSync(target) ? verifyOutput(target, false) : null;
  const reuseRoot = old ? target : null;
  const staging = mkdtempSync(join(dirname(target) || tmpdir(), '.usf-generation-'));
  const ordinary = plan.outputs.filter((item) => !item.path.startsWith('release/'));
  const release = plan.outputs.filter((item) => item.path.startsWith('release/'));
  const files = [];
  try {
    for (const output of ordinary) {
      const data = projection(store, output, sourceDigest);
      const content = output.template ? materialiseTemplate(output, sourceRoot) : render(output, data);
      files.push(write(staging, output.path, content, reuseRoot));
    }
    const generatedRelease = release.filter((item) => !/(?:manifest|checksums|signature|attestation)\.json$/.test(item.path));
    for (const output of generatedRelease) {
      const base = projection(store, output, sourceDigest);
      const content = output.path.endsWith('/sbom.json')
        ? stableJson({ bomFormat: 'CycloneDX', specVersion: '1.5', version: 1, components: files.map((f) => ({ type: 'file', name: f.path, hashes: [{ alg: 'SHA-256', content: f.sha256 }] })) })
        : stableJson({ ...base, materials: files.map((f) => ({ path: f.path, sha256: f.sha256 })) });
      files.push(write(staging, output.path, content, reuseRoot));
    }
    const checksumOutput = release.find((item) => item.path.endsWith('/checksums.json'));
    if (!checksumOutput) throw new CompilerError('release checksum artefact is absent from semantic plan', { phase: 'generate:release' });
    files.push(write(staging, checksumOutput.path, stableJson({ algorithm: 'sha256', files: [...files].map(({ reused, ...record }) => record).sort((a, b) => a.path.localeCompare(b.path)) }), reuseRoot));
    const manifestOutput = release.find((item) => item.path.endsWith('/manifest.json'));
    if (!manifestOutput) throw new CompilerError('release manifest artefact is absent from semantic plan', { phase: 'generate:release' });
    const releaseAuthorityContract = releaseAuthority(store, manifestOutput);
    const manifestFiles = [...files].map(({ reused, ...record }) => record).sort((a, b) => a.path.localeCompare(b.path));
    const manifest = { schemaVersion: 1, compilerVersion: '0.1.0', releaseVersion: releaseAuthorityContract.version,
      releaseVersionResource: releaseAuthorityContract.versionResource, authorityDigest: sourceDigest, files: manifestFiles };
    const manifestContent = stableJson(manifest);
    write(staging, manifestOutput.path, manifestContent);
    const signatureOutput = release.find((item) => item.path.endsWith('/signature.json'));
    const attestationOutput = release.find((item) => item.path.endsWith('/attestation.json'));
    if (!signatureOutput || !attestationOutput) throw new CompilerError('release signature or attestation artefact is absent from semantic plan', { phase: 'generate:release' });
    if (!signingKeyPath) throw new CompilerError('release signing requires --signing-key <PEM path>', { phase: 'generate:signing' });
    const privateKey = createPrivateKey(readFileSync(resolve(signingKeyPath)));
    const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
    const fingerprint = sha256(createPublicKey(privateKey).export({ type: 'spki', format: 'der' }));
    if (fingerprint !== releaseAuthorityContract.signingKeyFingerprint) throw new CompilerError('release key is not authorised by graph authority', {
      phase: 'generate:signing-authority', expected: releaseAuthorityContract.signingKeyFingerprint, observed: fingerprint,
    });
    const signature = sign(null, Buffer.from(manifestContent), privateKey).toString('base64');
    write(staging, signatureOutput.path, stableJson({ algorithm: 'Ed25519', signedPath: manifestOutput.path, signedSha256: sha256(manifestContent), publicKey, publicKeyFingerprint: fingerprint, signingIdentity: releaseAuthorityContract.signingIdentity, signature }), reuseRoot);
    write(staging, attestationOutput.path, stableJson({ schemaVersion: 1, kind: 'cleanroomgeneration', authorityDigest: sourceDigest, manifestPath: manifestOutput.path, manifestSha256: sha256(manifestContent), signaturePath: signatureOutput.path, signingIdentity: releaseAuthorityContract.signingIdentity, signingIdentityFingerprint: fingerprint, releaseVersion: releaseAuthorityContract.version, verificationRequired: true, nonClaims: ['integrity proof is not production readiness or external certification'] }), reuseRoot);
    const verified = verifyOutput(staging, true, releaseAuthorityContract.signingKeyFingerprint);
    const backup = `${target}.previous-${process.pid}`;
    if (existsSync(backup)) rmSync(backup, { recursive: true, force: true });
    if (existsSync(target)) renameSync(target, backup);
    try {
      renameSync(staging, target);
      if (existsSync(backup)) rmSync(backup, { recursive: true, force: true });
    } catch (error) {
      if (existsSync(target)) rmSync(target, { recursive: true, force: true });
      if (existsSync(backup)) renameSync(backup, target);
      throw error;
    }
    const prior = new Map((old?.manifest?.files ?? []).map((f) => [f.path, f.sha256]));
    return { ok: true, mode, outputDir: target, authorityDigest: sourceDigest, outputCount: verified.manifest.files.length + 3,
      reused: files.filter((f) => f.reused).length, changed: verified.manifest.files.filter((f) => prior.get(f.path) !== f.sha256).length,
      aggregateDigest: sha256(verified.manifest.files.map((f) => `${f.path}\u0000${f.sha256}`).join('\n')) };
  } catch (error) {
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    if (error instanceof CompilerError) throw error;
    throw new CompilerError(error.message, { phase: 'generate' });
  }
}

export function verifyOutput(outputDir, required = true, expectedPublicKeyFingerprint = null) {
  const root = resolve(outputDir);
  const manifestPath = join(root, 'release/manifest.json');
  if (!existsSync(manifestPath)) {
    if (!required) return null;
    throw new CompilerError('generated release manifest is missing', { phase: 'verify-output' });
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const failures = [];
  for (const record of manifest.files ?? []) {
    const target = join(root, record.path);
    if (!existsSync(target)) failures.push({ path: record.path, reason: 'missing' });
    else if (sha256(readFileSync(target)) !== record.sha256) failures.push({ path: record.path, reason: 'digest-mismatch' });
  }
  const manifestContent = readFileSync(manifestPath);
  const signaturePath = join(root, 'release/signature.json');
  const attestationPath = join(root, 'release/attestation.json');
  if (!existsSync(signaturePath)) failures.push({ path: 'release/signature.json', reason: 'missing' });
  if (!existsSync(attestationPath)) failures.push({ path: 'release/attestation.json', reason: 'missing' });
  if (existsSync(signaturePath)) {
    try {
      const signature = JSON.parse(readFileSync(signaturePath, 'utf8'));
      const fingerprint = sha256(createPublicKey(signature.publicKey).export({ type: 'spki', format: 'der' }));
      if (signature.algorithm !== 'Ed25519' || signature.signedSha256 !== sha256(manifestContent)) failures.push({ path: 'release/signature.json', reason: 'signature-metadata-mismatch' });
      if (signature.publicKeyFingerprint !== fingerprint) failures.push({ path: 'release/signature.json', reason: 'public-key-fingerprint-mismatch' });
      if (expectedPublicKeyFingerprint && fingerprint !== expectedPublicKeyFingerprint) failures.push({ path: 'release/signature.json', reason: 'unexpected-signing-identity' });
      if (!verify(null, manifestContent, createPublicKey(signature.publicKey), Buffer.from(signature.signature, 'base64'))) failures.push({ path: 'release/signature.json', reason: 'signature-invalid' });
    } catch (error) { failures.push({ path: 'release/signature.json', reason: `invalid:${error.message}` }); }
  }
  if (existsSync(attestationPath)) {
    try {
      const attestation = JSON.parse(readFileSync(attestationPath, 'utf8'));
      if (attestation.manifestSha256 !== sha256(manifestContent) || attestation.authorityDigest !== manifest.authorityDigest || attestation.verificationRequired !== true) failures.push({ path: 'release/attestation.json', reason: 'attestation-mismatch' });
    } catch (error) { failures.push({ path: 'release/attestation.json', reason: `invalid:${error.message}` }); }
  }
  if (failures.length) throw new CompilerError('generated output verification failed', { phase: 'verify-output', failures });
  const independent = validateGeneratedOutput(root, { expectedPublicKeyFingerprint });
  if (!independent.ok) throw new CompilerError('independent generated output validation failed', {
    phase: 'verify-output:independent', failures: independent.findings,
  });
  return { ok: true, manifest, checked: manifest.files.length, independent };
}

export const generatorInternals = { componentQuery };
