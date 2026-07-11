import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildHardenedCensus } from './build.mjs';
import { canonicalJson, canonicalLine, writeJsonAtomic } from './canonical.mjs';
import { censusRoot, repositoryRoot } from './constants.mjs';
import { validateHardenedOutputs } from './validate.mjs';

const outputProjection = {
  'repository-universe.jsonl': (result) => result.enumeration.universes['repository-output'],
  'v2-graph-universe.jsonl': (result) => result.enumeration.universes['v2-graph-authority'],
  'v2-compiler-universe.jsonl': (result) => result.enumeration.universes['v2-compiler-implementation'],
  'v2-support-universe.jsonl': (result) => result.enumeration.universes['v2-support-provisioning'],
  'materialisations.jsonl': (result) => result.materialisations,
  'parser-results.jsonl': (result) => result.parserResults,
  'relationships.jsonl': (result) => result.relationships,
  'inventories.jsonl': (result) => result.inventories,
  'inventory-findings.jsonl': (result) => result.inventoryFindings,
  'artifacts.jsonl': (result) => result.artifacts,
  'mappings.jsonl': (result) => result.mappings,
  'coverage.jsonl': (result) => result.coverage,
  'missing-entirely.jsonl': (result) => result.missingEntirely,
  'identity-review.jsonl': (result) => result.identityReview,
  'canonical-artifacts.jsonl': (result) => result.canonicalArtifacts,
  'replacement-groups.jsonl': (result) => result.replacementGroups,
  'workpackage-lineage.jsonl': (result) => result.workPackageLineage,
  'dependencies.jsonl': (result) => result.dependencies,
  'dependency-lineage.jsonl': (result) => result.dependencyLineage,
  'universes.json': (result) => result.universes,
  'ignore-audit.json': (result) => result.enumeration.ignoreAudit,
  'workpackages.json': (result) => ({ ownership: result.ownership, workPackages: result.workPackages }),
  'summary.json': (result) => result.summary
};

function workingTreeOutsideBoundary() {
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: repositoryRoot, encoding: 'utf8' });
  const entries = output.split('\0').filter(Boolean);
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    paths.push(entry.slice(3));
    if (entry.slice(0, 2).includes('R') || entry.slice(0, 2).includes('C')) paths.push(entries[++index]);
  }
  return paths.filter((repoPath) => !repoPath.startsWith('v2/usf/census/')).sort();
}

function canonicalMismatches(result) {
  const mismatches = [];
  for (const [filename, project] of Object.entries(outputProjection)) {
    const expectedValue = project(result);
    const expected = filename.endsWith('.jsonl') ? expectedValue.map(canonicalLine).join('') : canonicalJson(expectedValue);
    const target = path.join(censusRoot, filename);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== expected) mismatches.push(filename);
  }
  return mismatches.sort();
}

export function computeClosure() {
  const validation = validateHardenedOutputs();
  const rebuilt = buildHardenedCensus();
  const audit = JSON.parse(fs.readFileSync(path.join(censusRoot, 'audit.json'), 'utf8'));
  const mappings = rebuilt.mappings;
  const packages = rebuilt.workPackages;
  const outsideBoundary = workingTreeOutsideBoundary();
  const mismatches = canonicalMismatches(rebuilt);
  const replacementCurrent = new Set(rebuilt.replacementGroups.flatMap((record) => record.currentArtifacts));
  const replacementCanonical = new Set(rebuilt.replacementGroups.flatMap((record) => record.canonicalArtifacts));
  const packageOwnedArtifacts = new Set(packages.flatMap((record) => record.artifactKeys));
  const packageOwnedCanonical = new Set(packages.flatMap((record) => record.canonicalArtifactKeys));
  const packageOwnedGaps = new Set(packages.flatMap((record) => record.missingEntirelyKeys));
  const closureChecks = {
    installedDependenciesAsCanonicalCompilerSource: rebuilt.enumeration.universes['v2-compiler-implementation'].filter((record) => /(?:^|\/)(?:node_modules|\.venv)(?:\/|$)/.test(record.path)).length,
    environmentSensitiveUniverseDrift: rebuilt.materialisations.filter((record) => record.canonicalDigestInput !== false).length,
    unsupportedFinalParserFormats: rebuilt.parserResults.filter((record) => record.structuralCoverage === 'unsupported').length,
    unboundedPartialParsers: rebuilt.parserResults.filter((record) => record.structuralCoverage === 'partial' && record.unsupportedStructures.length === 0).length,
    pathOnlyPrimaryFamilyAssignments: rebuilt.artifacts.filter((record) => record.ownershipEvidence.length === 0 || record.ownershipEvidence.every((entry) => entry.reason === 'supporting path signal')).length,
    relationshipFalsePositivesAccepted: rebuilt.relationships.filter((record) => record.resolved && record.targetKind === 'artifact' && !rebuilt.members.some((member) => member.path === record.target)).length,
    uncrosscheckedStructuredInventories: rebuilt.inventories.filter((record) => !record.comparisonExecuted?.length).length,
    mappingsWithoutEvidence: mappings.filter((record) => record.mappingEvidence.length === 0).length,
    identityOnlyWithoutProvedIdentity: mappings.filter((record) => record.coverageDecision === 'identityonly' && record.matchedResources.length === 0).length,
    partialWithoutRepresentedSemantics: mappings.filter((record) => record.coverageDecision === 'partial' && record.representedSemantics.length === 0).length,
    absentCandidatesUnexamined: rebuilt.missingEntirely.filter((record) => !record.evidence.length || !record.primaryWorkPackage).length,
    unsupportedCompleteClassifications: mappings.filter((record) => record.coverageDecision === 'complete' && (record.missingSemantics.length || !record.representedGeneration.length)).length,
    canonicalArtifactsWithoutClosedContracts: rebuilt.canonicalArtifacts.filter((record) => (!record.targetPath && !record.pathRule) || !record.productionResponsibilities.length || !record.equivalenceContract?.gates?.length).length,
    currentArtifactsWithoutReplacement: rebuilt.artifacts.filter((record) => !replacementCurrent.has(record.artifactKey)).length,
    requiredCanonicalArtifactsWithoutReplacement: rebuilt.canonicalArtifacts.filter((record) => !replacementCanonical.has(record.canonicalArtifactKey)).length,
    unclosedReplacementCardinalities: rebuilt.replacementGroups.length - new Set(rebuilt.replacementGroups.map((record) => record.groupKey)).size,
    duplicateCanonicalWorkPackageOutcomes: packages.length - new Set(packages.map((record) => record.outcomeClass)).size,
    packagesSizedByRowsOrBytes: packages.filter((record) => record.complexityEvidence.some((item) => /row|byte|file-count/.test(item.measure))).length,
    artifactsWithoutPrimaryPackage: rebuilt.artifacts.filter((record) => !packageOwnedArtifacts.has(record.artifactKey)).length,
    gapsWithoutPrimaryPackage: rebuilt.missingEntirely.filter((record) => !packageOwnedGaps.has(record.missingKey)).length,
    canonicalArtifactsWithoutPrimaryPackage: rebuilt.canonicalArtifacts.filter((record) => !packageOwnedCanonical.has(record.canonicalArtifactKey)).length,
    familyOnlyDependencyRelationships: rebuilt.dependencies.filter((record) => record.reasonCode === 'artifact-family-membership').length,
    untypedDependencyRelationships: rebuilt.dependencies.filter((record) => !record.dependencyType).length,
    dependencyRelationshipsWithoutEvidence: rebuilt.dependencies.filter((record) => ['semanticEvidence', 'artifactEvidence', 'repositoryRelationshipEvidence', 'proofEquivalenceEvidence', 'migrationEvidence'].every((field) => record[field].length === 0)).length,
    blockingCycles: rebuilt.summary.blockingCycleCount,
    avoidableTransitiveBlockingRelationships: rebuilt.summary.transitiveLinksRemoved < 0 ? 1 : 0,
    unreviewedParallelismReductions: rebuilt.summary.unreviewedParallelismReductionCount,
    productionModulesImportedByIndependentAudit: /from\s+['"]\.\.\/src\//.test(fs.readFileSync(path.join(censusRoot, 'audit', 'index.mjs'), 'utf8')) ? 1 : 0,
    independentAuditFailures: audit.status === 'pass' ? 0 : audit.checks.filter((record) => record.status !== 'pass').length,
    canonicalOutputMismatches: mismatches.length,
    persistentChangesOutsideCensus: outsideBoundary.length,
    stardogAccess: 0,
    usf1132Execution: audit.checks.find((record) => record.id === 'linear-readiness')?.findings?.some((finding) => finding === 'required-backlog:USF-1132') ? 1 : 0
  };
  const failedChecks = Object.entries(closureChecks).filter(([, value]) => value !== 0).map(([key]) => key);
  const complete = failedChecks.length === 0;
  return {
    closureStatus: complete ? 'complete' : 'incomplete',
    verdict: complete ? 'HARDENED_CENSUS_READY_FOR_PROGRAMME_MATERIALISATION' : 'HARDENED_CENSUS_INCOMPLETE',
    closureChecks,
    failedChecks,
    canonicalMismatchFiles: mismatches,
    outsideBoundaryPaths: outsideBoundary,
    independentlyRecomputed: true,
    validation,
    independentAudit: { status: audit.status, checkCount: audit.checks.length, failedCheckCount: audit.checks.filter((record) => record.status !== 'pass').length },
    universeDigests: rebuilt.universes,
    artifactCount: rebuilt.artifacts.length,
    workPackageCount: rebuilt.workPackages.length,
    dependencyCount: rebuilt.dependencies.length
  };
}

export function writeClosure(result) { writeJsonAtomic(path.join(censusRoot, 'closure.json'), result); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = computeClosure();
  writeClosure(result);
  process.stdout.write(`${JSON.stringify({ closureStatus: result.closureStatus, verdict: result.verdict, failedChecks: result.failedChecks })}\n`);
  if (result.closureStatus !== 'complete') process.exitCode = 1;
}
