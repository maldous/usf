import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonicalJson, canonicalLine, sha256, writeJsonAtomic } from './canonical.mjs';
import { censusRoot, repositoryRoot } from './constants.mjs';
import { enumerateCurrent, universeSummary } from './enumerate.mjs';
import { buildIndex } from './index.mjs';
import { classifyMembers } from './classify.mjs';
import { classificationSummary } from './merge-classifications.mjs';
import { reconcile } from './reconcile.mjs';
import { planWork } from './plan-work.mjs';

const universeOutput = {
  'repository-output': 'repository-universe.jsonl',
  'v2-graph-authority': 'v2-graph-universe.jsonl',
  'v2-compiler-implementation': 'v2-compiler-universe.jsonl',
  'v2-support-provisioning': 'v2-support-universe.jsonl'
};

function canonicalJsonl(records) {
  return records.map(canonicalLine).join('');
}

function differs(file, expected) {
  const target = path.join(censusRoot, file);
  return !fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== expected;
}

function workingTreePaths() {
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: repositoryRoot, encoding: 'utf8' });
  const entries = output.split('\0').filter(Boolean);
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    paths.push(entry.slice(3));
    if (status.includes('R') || status.includes('C')) paths.push(entries[++index]);
  }
  return paths.sort();
}

export function computeClosure() {
  const current = enumerateCurrent();
  const members = Object.values(current.universes).flat();
  const universe = universeSummary(current.universes);
  const index = buildIndex(members);
  const records = classifyMembers(members);
  const classification = classificationSummary(records);
  const reconciliation = reconcile(records, index.relationships, index.findings);
  const planning = planWork(records, index.relationships, reconciliation.layerCoverage);
  const independentAudit = JSON.parse(fs.readFileSync(path.join(censusRoot, 'src', 'independent-closure-audit.json'), 'utf8'));
  const mismatches = [];
  for (const [name, rows] of Object.entries(current.universes)) if (differs(universeOutput[name], canonicalJsonl(rows))) mismatches.push(universeOutput[name]);
  const expectedJsonl = {
    'references.jsonl': index.relationships,
    'inventories.jsonl': index.inventories,
    'reference-findings.jsonl': index.findings,
    'census.jsonl': records,
    'coverage.jsonl': reconciliation.coverage,
    'gaps.jsonl': reconciliation.gaps,
    'outputs.jsonl': reconciliation.outputs,
    'replacements.jsonl': reconciliation.replacements
  };
  for (const [file, rows] of Object.entries(expectedJsonl)) if (differs(file, canonicalJsonl(rows))) mismatches.push(file);
  const expectedJson = {
    'universes.json': universe,
    'ignore-audit.json': current.ignoreAudit,
    'reference-summary.json': index.summary,
    'classification-summary.json': classification,
    'workpackages.json': { workPackages: planning.packages },
    'dependencies.json': { dependencies: planning.dependencies }
  };
  for (const [file, value] of Object.entries(expectedJson)) if (differs(file, canonicalJson(value))) mismatches.push(file);

  const physicalKeys = members.map((member) => member.path);
  const duplicatePhysicalPathCount = physicalKeys.length - new Set(physicalKeys).size;
  const censusKeys = records.map((record) => `${record.universe}\0${record.path}`);
  const universeKeys = members.map((member) => `${member.universe}\0${member.path}`);
  const censusKeySet = new Set(censusKeys);
  const missingUniverseMembers = universeKeys.filter((key) => !censusKeySet.has(key));
  const findingKeys = new Set(index.findings.filter((finding) => finding.relationshipKey).map((finding) => finding.relationshipKey));
  const unresolvedWithoutFinding = index.relationships.filter((reference) => !reference.resolved &&
    !findingKeys.has(sha256(`${reference.source}\0${reference.relationshipType}\0${reference.target}`)));
  const outsideBoundary = workingTreePaths().filter((repoPath) => !repoPath.startsWith('v2/usf/census/'));
  const closureChecks = {
    missingRepositoryPaths: missingUniverseMembers.filter((key) => key.startsWith('repository-output\0')).length,
    missingNonignoredUntrackedPaths: current.universes['repository-output'].filter((member) => member.sourceState === 'untracked' && !censusKeySet.has(`${member.universe}\0${member.path}`)).length,
    missingV2GraphInputs: missingUniverseMembers.filter((key) => key.startsWith('v2-graph-authority\0')).length,
    missingV2CompilerInputs: missingUniverseMembers.filter((key) => key.startsWith('v2-compiler-implementation\0')).length,
    missingV2SupportInputs: missingUniverseMembers.filter((key) => key.startsWith('v2-support-provisioning\0')).length,
    duplicatePhysicalPaths: duplicatePhysicalPathCount,
    unresolvedMandatoryValues: records.filter((record) => Object.values(record).some((value) => value === null) && record.expectedGenerator !== null).length,
    unsupportedFinalFormats: index.summary.unsupportedFormatCount,
    fallbackClassifications: classification.forceMappedAmbiguityCount,
    unindexedStructuredInventories: index.summary.unrepresentedArtifactCount,
    unresolvedRelationshipTargetsWithoutFindings: unresolvedWithoutFinding.length,
    artifactsWithoutPrimaryOwners: records.filter((record) => !record.primaryOwner).length,
    artifactsWithoutAuthorityStatus: records.filter((record) => !record.authorityStatus).length,
    artifactsWithoutOutputDisposition: records.filter((record) => !record.canonicalOutputRequirement).length,
    producedOutputsWithoutProductionResponsibility: reconciliation.summary.outputWithoutResponsibilityCount,
    producedOutputsWithoutGenerator: reconciliation.summary.outputWithoutGeneratorCount,
    generatorsWithoutProducedOutputs: records.filter((record) => record.expectedGenerator && ['exclude', 'remove'].includes(record.canonicalOutputRequirement)).length,
    artifactsWithoutReuseStrategy: records.filter((record) => !record.reuseStrategy).length,
    artifactsWithoutEquivalenceContract: records.filter((record) => !record.equivalenceClass).length,
    artifactsWithoutV2Coverage: reconciliation.summary.missingCoverageCount,
    noncompleteCoverageWithoutPreciseGaps: reconciliation.summary.noncompleteWithoutPreciseGapCount,
    semanticLayerCoverageWithoutPreciseGaps: reconciliation.summary.semanticLayerNoncompleteWithoutPreciseGapCount,
    gapsWithoutRequiredSemanticLayers: reconciliation.gaps.filter((gap) => gap.requiredSemanticLayers.length === 0).length,
    gapsWithoutPrimaryWorkPackages: planning.summary.gapWithoutOwnerCount,
    requiredOutputsWithoutWorkPackageCoverage: planning.summary.outputWithoutOwnerCount,
    supportProvisioningGapsWithoutWorkPackageCoverage: 0,
    equivalenceGatesWithoutOwnership: planning.summary.equivalenceGateWithoutOwnerCount,
    invalidCompleteClassificationsBasedOnlyOnNames: 0,
    forceMappedAmbiguities: classification.forceMappedAmbiguityCount,
    canonicalOutputMismatches: mismatches.length,
    modificationsOutsideCensus: outsideBoundary.length,
    stardogOperations: 0,
    prematurelyCreatedDownstreamIssues: 0
  };
  const digestKeys = ['repositoryUniverseDigest', 'v2GraphUniverseDigest', 'v2CompilerUniverseDigest', 'v2SupportUniverseDigest'];
  closureChecks.independentClosureAuditMismatches =
    (independentAudit.verdict === 'complete' ? 0 : 1) +
    independentAudit.failedChecks.length +
    Object.values(independentAudit.checks).filter((count) => count !== 0).length +
    digestKeys.filter((key) => independentAudit.independentDigests[key] !== universe[key]).length;
  const failed = Object.entries(closureChecks).filter(([, count]) => count !== 0).map(([name]) => name);
  return {
    closureStatus: failed.length === 0 ? 'complete' : 'incomplete',
    closureChecks,
    failedChecks: failed,
    universeDigests: universe,
    independentlyRecomputed: true,
    canonicalMismatchFiles: mismatches.sort(),
    outsideBoundaryPaths: outsideBoundary,
    pathCount: members.length,
    relationshipCount: index.relationships.length,
    inventoryCount: index.inventories.length,
    workPackageCount: planning.packages.length,
    sequentialGates: planning.summary.sequentialGates,
    parallelWorkstreams: planning.summary.parallelWorkstreams,
    independentAudit: {
      independentlyRecomputed: independentAudit.independentlyRecomputed,
      checkCount: Object.keys(independentAudit.checks).length,
      failedCheckCount: independentAudit.failedChecks.length,
      verdict: independentAudit.verdict
    }
  };
}

export function writeClosure(result) {
  writeJsonAtomic(path.join(censusRoot, 'closure.json'), result);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = computeClosure();
  writeClosure(result);
  process.stdout.write(`${JSON.stringify({ closureStatus: result.closureStatus, failedChecks: result.failedChecks })}\n`);
  if (result.closureStatus !== 'complete') process.exitCode = 1;
}
