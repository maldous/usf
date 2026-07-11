import fs from 'node:fs';
import path from 'node:path';
import { censusRoot } from './constants.mjs';
import { assertUnique, validateArtifact, validateClassificationContract, validateInventory, validateRelationship, validateUniverseMember } from './contract.mjs';
import { readJsonl } from './canonical.mjs';

const universeFiles = ['repository-universe.jsonl', 'v2-graph-universe.jsonl', 'v2-compiler-universe.jsonl', 'v2-support-universe.jsonl'];
validateClassificationContract();
for (const file of universeFiles) {
  const records = readJsonl(path.join(censusRoot, file));
  records.forEach(validateUniverseMember);
  assertUnique(records, 'path');
}
const universes = JSON.parse(fs.readFileSync(path.join(censusRoot, 'universes.json'), 'utf8'));
const ignoreAudit = JSON.parse(fs.readFileSync(path.join(censusRoot, 'ignore-audit.json'), 'utf8'));
if (ignoreAudit.closureStatus !== 'complete' || ignoreAudit.blockedPatternCount !== 0) throw new Error('ignore audit is incomplete');
for (const key of ['repositoryUniverseDigest', 'v2GraphUniverseDigest', 'v2CompilerUniverseDigest', 'v2SupportUniverseDigest']) {
  if (!/^[a-f0-9]{64}$/.test(universes[key])) throw new Error(`invalid universe digest: ${key}`);
}
const references = readJsonl(path.join(censusRoot, 'references.jsonl'));
const inventories = readJsonl(path.join(censusRoot, 'inventories.jsonl'));
const findings = readJsonl(path.join(censusRoot, 'reference-findings.jsonl'));
references.forEach(validateRelationship);
inventories.forEach(validateInventory);
const findingKeys = new Set(findings.filter((finding) => finding.relationshipKey).map((finding) => finding.relationshipKey));
for (const reference of references.filter((record) => !record.resolved)) {
  const key = (await import('./canonical.mjs')).sha256(`${reference.source}\0${reference.relationshipType}\0${reference.target}`);
  if (!findingKeys.has(key)) throw new Error(`unresolved relationship lacks bounded finding: ${reference.source}`);
}
const referenceSummary = JSON.parse(fs.readFileSync(path.join(censusRoot, 'reference-summary.json'), 'utf8'));
if (referenceSummary.closureStatus !== 'complete' || referenceSummary.unrepresentedArtifactCount !== 0 || referenceSummary.unsupportedFormatCount !== 0) {
  throw new Error('relationship and inventory index is incomplete');
}
const census = readJsonl(path.join(censusRoot, 'census.jsonl'));
census.forEach(validateArtifact);
assertUnique(census, (record) => `${record.universe}\0${record.path}`);
const expectedCount = Object.values(universes.universeCounts).reduce((sum, count) => sum + count, 0);
if (census.length !== expectedCount) throw new Error('census path closure failed');
for (const file of ['outputs.jsonl', 'replacements.jsonl']) {
  const rows = readJsonl(path.join(censusRoot, file));
  assertUnique(rows, (row) => row.artifactKey);
  if (rows.length !== census.length) throw new Error(`${file} coverage failed`);
}
const coverage = readJsonl(path.join(censusRoot, 'coverage.jsonl'));
assertUnique(coverage, 'coverageKey');
const artifactCoverage = coverage.filter((row) => row.recordScope === 'artifact');
const semanticLayerCoverage = coverage.filter((row) => row.recordScope === 'semantic-layer');
if (artifactCoverage.length !== census.length || semanticLayerCoverage.length !== 24) throw new Error('coverage row closure failed');
if (semanticLayerCoverage.some((row) => row.coverageStatus !== 'complete' && (row.preciseGaps.length === 0 || row.requiredSemanticLayers.length === 0))) throw new Error('semantic layer lacks precise gaps');
const gaps = readJsonl(path.join(censusRoot, 'gaps.jsonl'));
if (gaps.some((gap) => gap.requiredSemanticLayers.length === 0)) throw new Error('gap lacks semantic layer');
const workpackages = JSON.parse(fs.readFileSync(path.join(censusRoot, 'workpackages.json'), 'utf8')).workPackages;
assertUnique(workpackages, 'key');
const owners = workpackages.flatMap((item) => item.affectedRows);
if (owners.length !== census.length + semanticLayerCoverage.length || new Set(owners).size !== owners.length) throw new Error('work-package ownership closure failed');
const dependencyKeys = new Set(workpackages.map((item) => item.key));
const dependencies = JSON.parse(fs.readFileSync(path.join(censusRoot, 'dependencies.json'), 'utf8')).dependencies;
if (dependencies.some((item) => !dependencyKeys.has(item.workPackage) || !dependencyKeys.has(item.dependsOn))) throw new Error('invalid work-package dependency');
const closure = JSON.parse(fs.readFileSync(path.join(censusRoot, 'closure.json'), 'utf8'));
if (closure.closureStatus !== 'complete' || closure.failedChecks.length !== 0 || Object.values(closure.closureChecks).some((count) => count !== 0)) throw new Error('closure is incomplete');
process.stdout.write(`${JSON.stringify({ validationStatus: 'pass', validatedUniverseFiles: universeFiles.length, artifacts: census.length, references: references.length, inventories: inventories.length, findings: findings.length, workPackages: workpackages.length, closureStatus: closure.closureStatus })}\n`);
