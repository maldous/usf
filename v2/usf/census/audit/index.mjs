import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CENSUS_ROOT = path.resolve(HERE, '..');
const REPOSITORY_ROOT = path.resolve(CENSUS_ROOT, '../../..');
const universeFiles = {
  'repository-output': 'repository-universe.jsonl',
  'v2-graph-authority': 'v2-graph-universe.jsonl',
  'v2-compiler-implementation': 'v2-compiler-universe.jsonl',
  'v2-support-provisioning': 'v2-support-universe.jsonl'
};

export function canonicalJson(value) {
  const normalize = (item) => Array.isArray(item) ? item.map(normalize) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, normalize(item[key])])) : item;
  return `${JSON.stringify(normalize(value), null, 2)}\n`;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function framedDigest(records, fields) {
  const hash = createHash('sha256');
  for (const record of records) for (const field of fields) {
    const value = Buffer.from(String(record[field] ?? ''), 'utf8');
    const length = Buffer.alloc(8); length.writeBigUInt64BE(BigInt(value.length));
    hash.update(length).update(value);
  }
  return hash.digest('hex');
}

function check(id, status, findings = [], facts = {}) {
  return { id, status, findings: [...new Set(findings)].sort(), facts };
}

function outcome(id, findings, facts = {}) {
  return check(id, findings.length ? 'fail' : 'pass', findings, facts);
}

function incomplete(id, reason, facts = {}) {
  return check(id, 'incomplete', [reason], facts);
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) { const text = fs.readFileSync(file, 'utf8'); return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)); }
function exists(root, relative) { return fs.existsSync(path.join(root, relative)); }
function loadJson(root, relative) { return exists(root, relative) ? readJson(path.join(root, relative)) : null; }
function loadJsonl(root, relative) { return exists(root, relative) ? readJsonl(path.join(root, relative)) : null; }

function universeFor(relative) {
  if (relative.startsWith('v2/usf/census/')) return null;
  if (relative.startsWith('v2/usf/graph/')) return 'v2-graph-authority';
  if (relative.startsWith('v2/usf/compiler/')) return 'v2-compiler-implementation';
  if (relative.startsWith('v2/')) return 'v2-support-provisioning';
  return 'repository-output';
}

function listGitVisible(root) {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'buffer', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').split('\0').filter(Boolean);
  const tracked = run(['ls-files', '--cached', '-z']);
  const untracked = run(['ls-files', '--others', '--exclude-standard', '-z']);
  const visibleUntracked = untracked.filter((item) => universeFor(item) !== 'v2-support-provisioning');
  return [...new Set([...tracked, ...visibleUntracked])]
    .filter((item) => !item.startsWith('.git/') && universeFor(item) !== null).sort();
}

function physicalDigest(root, relative) {
  const absolute = path.join(root, relative);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) return sha256(fs.readlinkSync(absolute));
  if (!stat.isFile()) return null;
  return sha256(fs.readFileSync(absolute));
}

export function auditUniverses({ recordsByUniverse, summary, repositoryRoot, physicalPaths = null }) {
  const findings = [];
  const all = [];
  for (const universe of Object.keys(universeFiles)) {
    const records = recordsByUniverse[universe];
    if (!Array.isArray(records)) return incomplete('universes', `missing-universe:${universe}`);
    const sorted = records.slice().sort((a, b) => a.path.localeCompare(b.path));
    if (JSON.stringify(records.map((entry) => entry.path)) !== JSON.stringify(sorted.map((entry) => entry.path))) findings.push(`nondeterministic-order:${universe}`);
    for (const record of records) {
      if (record.universe !== universe) findings.push(`wrong-universe-field:${record.path}`);
      if (universeFor(record.path) !== universe) findings.push(`wrong-membership:${record.path}`);
      if (all.some((entry) => entry.path === record.path)) findings.push(`overlapping-path:${record.path}`);
      all.push(record);
      if (repositoryRoot && fs.existsSync(path.join(repositoryRoot, record.path))) {
        const digest = physicalDigest(repositoryRoot, record.path);
        if (digest && digest !== record.contentDigest) findings.push(`digest-mismatch:${record.path}`);
      } else if (repositoryRoot) findings.push(`missing-physical-path:${record.path}`);
    }
    if (summary?.universeCounts?.[universe] !== records.length) findings.push(`count-mismatch:${universe}`);
  }
  if (physicalPaths) {
    const recordPaths = new Set(all.map((entry) => entry.path));
    for (const item of physicalPaths) if (!recordPaths.has(item)) findings.push(`unrecorded-path:${item}`);
    for (const item of recordPaths) if (!physicalPaths.includes(item)) findings.push(`recorded-path-not-enumerated:${item}`);
  }
  const digestNames = { 'repository-output': 'repositoryUniverseDigest', 'v2-graph-authority': 'v2GraphUniverseDigest', 'v2-compiler-implementation': 'v2CompilerUniverseDigest', 'v2-support-provisioning': 'v2SupportUniverseDigest' };
  for (const [universe, records] of Object.entries(recordsByUniverse)) {
    const computed = framedDigest(records, ['universe', 'path', 'sourceState', 'fileMode', 'contentDigest']);
    if (summary?.[digestNames[universe]] !== computed) findings.push(`summary-digest-mismatch:${universe}`);
  }
  return outcome('universes', findings, { universeCount: 4, memberCount: all.length });
}

export function auditParserRelationships(members, parserResults, relationships, inventories = []) {
  if (![members, parserResults, relationships, inventories].every(Array.isArray)) return incomplete('parser-relationships', 'missing-parser-or-relationship-input');
  const findings = [];
  const memberPaths = new Set(members.map((entry) => entry.path));
  const parsedPaths = new Set(parserResults.map((entry) => entry.path));
  for (const member of members) if (!member.binary && !['gitlink', 'symbolic-link'].includes(member.formatKind) && !parsedPaths.has(member.path)) findings.push(`unparsed:${member.path}`);
  for (const parsed of parserResults) {
    if (!memberPaths.has(parsed.path)) findings.push(`parser-without-member:${parsed.path}`);
    if (!parsed.parserImplementation || !parsed.parserMode || !parsed.pathContext) findings.push(`parser-metadata:${parsed.path}`);
    if (parsed.structuralCoverage === 'partial' && !(parsed.unsupportedStructures?.length)) findings.push(`partial-without-unsupported:${parsed.path}`);
    for (const command of (parsed.declarations ?? []).filter((entry) => entry.kind === 'command')) if (!command.attributes?.executableContext) findings.push(`command-without-context:${parsed.path}:${command.identifier}`);
  }
  const relationKeys = new Set();
  for (const relation of relationships) {
    const key = [relation.source, relation.relationshipType, relation.target, relation.extractionMethod].join('\0');
    if (relationKeys.has(key)) findings.push(`duplicate-relationship:${key}`); relationKeys.add(key);
    if (!memberPaths.has(relation.source)) findings.push(`relationship-source-missing:${relation.source}`);
    if (relation.targetKind === 'artifact' && relation.resolved && !/^(?:https?:|urn:|mailto:|data:|node:)/.test(relation.target) && !memberPaths.has(relation.target)) findings.push(`false-resolved-target:${relation.target}`);
  }
  for (const inventory of inventories) if (!Array.isArray(inventory.declarations) || !inventory.comparisonExecuted?.length) findings.push(`insubstantive-inventory:${inventory.path}`);
  return outcome('parser-relationships', findings, { parserCount: parserResults.length, relationshipCount: relationships.length, inventoryCount: inventories.length });
}

export function auditFamilyOwnership(members, artifacts) {
  if (![members, artifacts].every(Array.isArray)) return incomplete('family-ownership', 'missing-family-input');
  const findings = [];
  const owners = new Map();
  for (const artifact of artifacts) {
    const key = `${artifact.universe}\0${artifact.path}`;
    if (owners.has(key)) findings.push(`multiple-primary-owners:${artifact.path}`);
    if (!artifact.artifactFamily || !artifact.ownershipEvidence?.length || !artifact.familyConfidence || artifact.ownershipEvidence.every((entry) => entry.reason === 'supporting path signal')) findings.push(`unsubstantiated-owner:${artifact.path}`);
    else owners.set(key, artifact.artifactFamily);
  }
  for (const member of members) if (!owners.has(`${member.universe}\0${member.path}`)) findings.push(`unowned:${member.path}`);
  for (const key of owners.keys()) if (!members.some((member) => `${member.universe}\0${member.path}` === key)) findings.push(`owner-without-member:${key.split('\0')[1]}`);
  return outcome('family-ownership', findings, { ownerCount: owners.size });
}

export function auditMappingsCoverage(artifacts, mappings, coverage, identityReviews = null, missingEntirely = null) {
  if (![artifacts, mappings, coverage].every(Array.isArray)) return incomplete('mappings-coverage', 'missing-mapping-input');
  const findings = [];
  const artifactKeys = new Set(artifacts.map((entry) => entry.artifactKey ?? `${entry.universe}:${entry.path}`));
  const mapped = new Map();
  for (const mapping of mappings) {
    if (mapped.has(mapping.artifactKey)) findings.push(`duplicate-mapping:${mapping.artifactKey}`); mapped.set(mapping.artifactKey, mapping);
    if (!artifactKeys.has(mapping.artifactKey)) findings.push(`mapping-without-artifact:${mapping.artifactKey}`);
    if (mapping.coverageDecision === 'complete' && (mapping.missingSemantics?.length || !mapping.representedGeneration?.length)) findings.push(`unsupported-complete:${mapping.artifactKey}`);
    if (!mapping.mappingEvidence?.length || !mapping.coverageReason) findings.push(`mapping-without-evidence:${mapping.artifactKey}`);
  }
  for (const key of artifactKeys) if (!mapped.has(key)) findings.push(`unmapped-artifact:${key}`);
  for (const row of coverage) {
    const source = mapped.get(row.artifactKey);
    if (!source || row.coverageDecision !== source.coverageDecision) findings.push(`coverage-not-derived:${row.artifactKey}`);
  }
  if (identityReviews !== null) {
    if (!Array.isArray(identityReviews) || identityReviews.length < Math.min(100, mappings.length)) findings.push('identity-review-sample-incomplete');
    else for (const review of identityReviews) {
      if (review.reviewStatus !== 'independently-reviewed') findings.push(`identity-review-not-independent:${review.artifactKey}`);
      if (!review.workPackageOwnershipVerified || (review.reviewDecision === 'identityonly' && !review.provedIdentity)) findings.push(`identity-review-unverified:${review.artifactKey}`);
    }
  }
  if (missingEntirely !== null) {
    const absent = new Set(mappings.filter((mapping) => mapping.coverageDecision === 'absent').map((mapping) => mapping.artifactKey));
    const missing = new Set((missingEntirely ?? []).map((record) => record.artifactKey));
    for (const key of absent) if (!missing.has(key)) findings.push(`absent-without-missing-plan:${key}`);
    for (const record of missingEntirely ?? []) if (!record.primaryWorkPackage || !record.requiredSemanticLayers?.length) findings.push(`missing-entirely-unowned:${record.artifactKey}`);
  }
  return outcome('mappings-coverage', findings, { mappingCount: mappings.length, coverageCount: coverage.length });
}

export function auditCanonicalArtifacts(canonicalArtifacts, replacementGroups) {
  if (![canonicalArtifacts, replacementGroups].every(Array.isArray)) return incomplete('canonical-replacements', 'missing-canonical-input');
  const findings = [];
  const keys = new Set(); const groups = new Map(replacementGroups.map((entry) => [entry.groupKey ?? entry.key ?? entry.replacementGroup, entry]));
  for (const artifact of canonicalArtifacts) {
    if (keys.has(artifact.canonicalArtifactKey)) findings.push(`duplicate-canonical-key:${artifact.canonicalArtifactKey}`); keys.add(artifact.canonicalArtifactKey);
    if (!artifact.targetPath && !artifact.pathRule && artifact.mutabilityClass !== 'removed') findings.push(`missing-production-path:${artifact.canonicalArtifactKey}`);
    if (!artifact.acceptanceGates?.length || !artifact.productionResponsibilities?.length) findings.push(`missing-production-contract:${artifact.canonicalArtifactKey}`);
    if (!groups.has(artifact.replacementGroup)) findings.push(`missing-replacement-group:${artifact.canonicalArtifactKey}`);
  }
  for (const group of replacementGroups) for (const key of group.canonicalArtifacts ?? group.canonicalArtifactKeys ?? group.outputs ?? []) if (!keys.has(key)) findings.push(`replacement-target-missing:${key}`);
  return outcome('canonical-replacements', findings, { canonicalArtifactCount: keys.size, replacementGroupCount: groups.size });
}

export function auditWorkPackages(canonicalArtifacts, workPackages) {
  if (![canonicalArtifacts, workPackages].every(Array.isArray)) return incomplete('work-packages', 'missing-work-package-input');
  const findings = []; const ownership = new Map(); const packageKeys = new Set(workPackages.map((entry) => entry.key));
  for (const item of workPackages) {
    if (!item.key || !item.architecturalOutcome || !item.acceptanceCriteria?.length || !item.complexityEvidence?.length || !item.equivalenceGates?.length) findings.push(`incoherent-package:${item.key ?? '<missing>'}`);
    for (const key of item.canonicalArtifactKeys ?? item.ownedArtifacts ?? []) {
      if (ownership.has(key)) findings.push(`multiply-packaged:${key}`); ownership.set(key, item.key);
    }
    for (const dependency of item.dependencies ?? []) if (!packageKeys.has(dependency)) findings.push(`package-dependency-missing:${item.key}:${dependency}`);
  }
  for (const artifact of canonicalArtifacts) if (!ownership.has(artifact.canonicalArtifactKey)) findings.push(`unpackaged:${artifact.canonicalArtifactKey}`);
  return outcome('work-packages', findings, { workPackageCount: workPackages.length });
}

export function auditDependencies(workPackages, dependencies) {
  if (![workPackages, dependencies].every(Array.isArray)) return incomplete('dependencies', 'missing-dependency-input');
  const findings = []; const keys = new Set(workPackages.map((entry) => entry.key)); const graph = new Map([...keys].map((key) => [key, []])); const seen = new Set();
  for (const edge of dependencies) {
    const edgeKey = `${edge.source}\0${edge.prerequisite}\0${edge.dependencyType}`;
    if (seen.has(edgeKey)) findings.push(`duplicate-edge:${edge.source}:${edge.prerequisite}`); seen.add(edgeKey);
    if (!keys.has(edge.source) || !keys.has(edge.prerequisite)) findings.push(`edge-endpoint-missing:${edge.source}:${edge.prerequisite}`);
    if (edge.source === edge.prerequisite) findings.push(`self-cycle:${edge.source}`);
    const evidence = ['semanticEvidence', 'artifactEvidence', 'repositoryRelationshipEvidence', 'proofEquivalenceEvidence', 'migrationEvidence'].flatMap((field) => edge[field] ?? []);
    if (!evidence.length) findings.push(`edge-without-evidence:${edge.source}:${edge.prerequisite}`);
    if (edge.status === 'blocking') graph.get(edge.source)?.push(edge.prerequisite);
  }
  const visiting = new Set(); const visited = new Set();
  const visit = (node) => { if (visiting.has(node)) { findings.push(`dependency-cycle:${node}`); return; } if (visited.has(node)) return; visiting.add(node); for (const next of graph.get(node) ?? []) visit(next); visiting.delete(node); visited.add(node); };
  for (const key of keys) visit(key);
  for (const [source, direct] of graph) for (const intermediate of direct) for (const target of graph.get(intermediate) ?? []) if (direct.includes(target)) findings.push(`transitive-edge-not-reduced:${source}:${target}`);
  return outcome('dependencies', findings, { dependencyCount: dependencies.length });
}

export function auditDeterminism(outputs) {
  if (!outputs || typeof outputs !== 'object') return incomplete('determinism', 'missing-output-map');
  const findings = [];
  const selectors = {
    artifacts: (entry) => [entry.universe, entry.path],
    parserResults: (entry) => [entry.universe, entry.path],
    relationships: (entry) => [entry.source, entry.relationshipType, entry.target, entry.extractionMethod],
    inventories: (entry) => [entry.universe, entry.path],
    mappings: (entry) => [entry.universe, entry.path],
    coverage: (entry) => [entry.universe, entry.path],
    identityReview: (entry) => [String(entry.rank).padStart(6, '0')],
    missingEntirely: (entry) => [entry.universe, entry.path],
    canonicalArtifacts: (entry) => [entry.canonicalArtifactKey],
    replacementGroups: (entry) => [entry.groupKey],
    dependencies: (entry) => [entry.status, entry.source, entry.prerequisite]
  };
  for (const [name, value] of Object.entries(outputs)) {
    const records = Array.isArray(value) ? value : [value];
    const selector = selectors[name] ?? ((entry) => entry?.path ?? entry?.key ?? entry?.canonicalArtifactKey ?? entry?.artifactKey ?? JSON.stringify(entry));
    const keys = records.map((entry) => { const selected = selector(entry); return Array.isArray(selected) ? selected : [selected]; });
    const ordered = keys.slice().sort((left, right) => {
      for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
        const compared = String(left[index] ?? '').localeCompare(String(right[index] ?? ''));
        if (compared !== 0) return compared;
      }
      return 0;
    });
    if (JSON.stringify(keys) !== JSON.stringify(ordered)) findings.push(`nondeterministic-record-order:${name}`);
    if (canonicalJson(value) !== canonicalJson(JSON.parse(canonicalJson(value)))) findings.push(`unstable-canonical-json:${name}`);
  }
  return outcome('determinism', findings, { outputCount: Object.keys(outputs).length, canonicalDigest: sha256(canonicalJson(outputs)) });
}

export function auditMutationBoundary(before, after, mutableRoot = 'v2/usf/census') {
  if (!(before instanceof Map) || !(after instanceof Map)) return incomplete('mutation-boundary', 'missing-before-or-after-snapshot');
  const findings = [];
  for (const key of new Set([...before.keys(), ...after.keys()])) if (!key.startsWith(`${mutableRoot}/`) && before.get(key) !== after.get(key)) findings.push(`read-only-path-mutated:${key}`);
  return outcome('mutation-boundary', findings, { beforeCount: before.size, afterCount: after.size });
}

export function auditLinearStates(issues) {
  if (!Array.isArray(issues)) return incomplete('linear-readiness', 'linear-state-unavailable');
  const findings = []; const byId = new Map(issues.map((item) => [item.identifier, item.state?.name ?? item.status ?? '']));
  for (let number = 1135; number <= 1141; number += 1) if (byId.get(`USF-${number}`) !== 'Done') findings.push(`correction-tranche-not-done:USF-${number}`);
  for (const identifier of ['USF-1134', 'USF-1142']) if (!['In Progress', 'Done'].includes(byId.get(identifier))) findings.push(`required-active-or-done:${identifier}`);
  if (byId.get('USF-1132') !== 'Backlog') findings.push('required-backlog:USF-1132');
  return outcome('linear-readiness', findings, { inspectedIssueCount: byId.size });
}

export function auditArchitecturalReview(review) {
  if (!review) return incomplete('architectural-review', 'architectural-review-unavailable');
  const findings = [];
  if (review.verdict !== 'pass' || review.reviewStatus !== 'independently-reviewed') findings.push('architectural-review-not-accepted');
  if (Object.values(review.convergence?.findingCounts ?? {}).some((count) => count !== 0)) findings.push('convergence-findings-remain');
  if (review.missingEntirely?.unownedCount !== 0 || review.missingEntirely?.unplannedCount !== 0 || review.missingEntirely?.conflicts?.length !== 0) findings.push('missing-entirely-findings-remain');
  return outcome('architectural-review', findings, { workPackageCount: review.convergence?.metrics?.workPackageCount ?? null, missingEntirelyCount: review.convergence?.metrics?.missingEntirelyCount ?? null });
}

export function readLinearReadiness(apiKey = process.env.LINEAR_API_KEY) {
  if (!apiKey) return Promise.resolve(incomplete('linear-readiness', 'LINEAR_API_KEY-not-available'));
  const identifiers = [1132, 1134, 1135, 1136, 1137, 1138, 1139, 1140, 1141, 1142];
  const fields = identifiers.map((number) => `i${number}: issue(id: "USF-${number}") { identifier state { name } team { key } }`).join(' ');
  const body = JSON.stringify({ query: `query AuditIssues { ${fields} }` });
  return new Promise((resolve) => {
    const request = https.request('https://api.linear.app/graphql', { method: 'POST', headers: { Authorization: apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (response) => {
      let data = ''; response.setEncoding('utf8'); response.on('data', (chunk) => { data += chunk; }); response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (response.statusCode !== 200 || parsed.errors) return resolve(incomplete('linear-readiness', 'linear-query-failed', { httpStatus: response.statusCode }));
          const issues = parsed.data ? Object.values(parsed.data).filter(Boolean) : null;
          if (!Array.isArray(issues) || issues.some((item) => item.team?.key !== 'USF')) return resolve(incomplete('linear-readiness', 'canonical-USF-team-not-confirmed'));
          resolve(auditLinearStates(issues));
        } catch { resolve(incomplete('linear-readiness', 'linear-response-invalid')); }
      });
    });
    request.on('error', () => resolve(incomplete('linear-readiness', 'linear-connection-failed')));
    request.setTimeout(15000, () => request.destroy()); request.end(body);
  });
}

function snapshot(root, paths) {
  const map = new Map(); for (const relative of paths) { try { const digest = physicalDigest(root, relative); if (digest) map.set(relative, digest); } catch {} } return map;
}

export async function runAudit({ censusRoot = CENSUS_ROOT, repositoryRoot = REPOSITORY_ROOT, linearApiKey = process.env.LINEAR_API_KEY } = {}) {
  let physicalPaths;
  try { physicalPaths = listGitVisible(repositoryRoot); } catch { physicalPaths = null; }
  const outside = (physicalPaths ?? []).filter((item) => !item.startsWith('v2/usf/census/'));
  const before = snapshot(repositoryRoot, outside);
  const recordsByUniverse = Object.fromEntries(Object.entries(universeFiles).map(([key, file]) => [key, loadJsonl(censusRoot, file)]));
  const members = Object.values(recordsByUniverse).filter(Array.isArray).flat();
  const outputs = {
    artifacts: loadJsonl(censusRoot, 'artifacts.jsonl'), parserResults: loadJsonl(censusRoot, 'parser-results.jsonl'), relationships: loadJsonl(censusRoot, 'relationships.jsonl'),
    inventories: loadJsonl(censusRoot, 'inventories.jsonl'), mappings: loadJsonl(censusRoot, 'mappings.jsonl'), coverage: loadJsonl(censusRoot, 'coverage.jsonl'),
    canonicalArtifacts: loadJsonl(censusRoot, 'canonical-artifacts.jsonl'), replacementGroups: loadJsonl(censusRoot, 'replacement-groups.jsonl'),
    identityReview: loadJsonl(censusRoot, 'identity-review.jsonl'), missingEntirely: loadJsonl(censusRoot, 'missing-entirely.jsonl'),
    workPackages: loadJson(censusRoot, 'workpackages.json'), dependencies: loadJsonl(censusRoot, 'dependencies.jsonl')
  };
  const workPackages = Array.isArray(outputs.workPackages) ? outputs.workPackages : outputs.workPackages?.workPackages;
  const checks = [
    auditUniverses({ recordsByUniverse, summary: loadJson(censusRoot, 'universes.json'), repositoryRoot, physicalPaths }),
    auditParserRelationships(members, outputs.parserResults, outputs.relationships, outputs.inventories),
    auditFamilyOwnership(members, outputs.artifacts), auditMappingsCoverage(outputs.artifacts, outputs.mappings, outputs.coverage, outputs.identityReview, outputs.missingEntirely),
    auditCanonicalArtifacts(outputs.canonicalArtifacts, outputs.replacementGroups), auditWorkPackages(outputs.canonicalArtifacts, workPackages),
    auditDependencies(workPackages, outputs.dependencies), auditArchitecturalReview(loadJson(censusRoot, 'architectural-review.json')), auditDeterminism(Object.fromEntries(Object.entries(outputs).filter(([, value]) => value !== null)))
  ];
  checks.push(await readLinearReadiness(linearApiKey));
  const after = snapshot(repositoryRoot, outside); checks.push(auditMutationBoundary(before, after));
  const status = checks.some((entry) => entry.status === 'fail') ? 'fail' : checks.some((entry) => entry.status === 'incomplete') ? 'incomplete' : 'pass';
  return { auditId: 'independent-hardened-regeneration-census', status, checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const audit = await runAudit();
  const target = path.join(CENSUS_ROOT, 'audit.json');
  const temporary = `${target}.writing`;
  fs.writeFileSync(temporary, canonicalJson(audit));
  fs.renameSync(temporary, target);
  process.stdout.write(canonicalJson(audit));
  if (audit.status === 'fail') process.exitCode = 1;
  else if (audit.status === 'incomplete') process.exitCode = 2;
}
