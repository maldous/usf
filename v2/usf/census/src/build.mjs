import { enumerateCurrent, universeSummary, writeUniverseOutputs } from './enumerate.mjs';
import { buildIndex, writeIndexOutputs } from './index.mjs';
import { classifyMembers } from './classify.mjs';
import { classificationSummary, writeClassificationOutputs } from './merge-classifications.mjs';
import { reconcile, writeReconciliationOutputs } from './reconcile.mjs';
import { planWork, writePlanningOutputs } from './plan-work.mjs';
import { computeClosure, writeClosure } from './closure.mjs';
import { writeJsonAtomic } from './canonical.mjs';
import { censusRoot } from './constants.mjs';
import path from 'node:path';

const result = enumerateCurrent();
writeUniverseOutputs(result);
const index = buildIndex(Object.values(result.universes).flat());
writeIndexOutputs(index);
const records = classifyMembers(Object.values(result.universes).flat());
const classification = classificationSummary(records);
writeClassificationOutputs({ records, summary: classification });
const reconciliation = reconcile(records, index.relationships, index.findings);
writeReconciliationOutputs(reconciliation);
const planning = planWork(records, index.relationships, reconciliation.layerCoverage);
writePlanningOutputs(planning);
const summary = {
  ...universeSummary(result.universes),
  artifactFamilyDistribution: classification.artifactFamilyCounts,
  outputDispositionDistribution: classification.outputRequirementCounts,
  reuseDistribution: classification.reuseStrategyCounts,
  equivalenceDistribution: classification.equivalenceCounts,
  v2CoverageDistribution: classification.v2CoverageCounts,
  gapDistribution: Object.fromEntries([...new Set(reconciliation.gaps.map((gap) => gap.gapClassification))].sort().map((gap) => [gap, reconciliation.gaps.filter((row) => row.gapClassification === gap).length])),
  requiredSemanticLayerDistribution: Object.fromEntries([...new Set(reconciliation.gaps.flatMap((gap) => gap.requiredSemanticLayers))].sort().map((layer) => [layer, reconciliation.gaps.filter((gap) => gap.requiredSemanticLayers.includes(layer)).length])),
  workPackageCount: planning.packages.length,
  sequentialGates: planning.summary.sequentialGates,
  parallelWorkstreams: planning.summary.parallelWorkstreams,
  relationshipCount: index.summary.relationshipCount,
  inventoryCount: index.summary.inventoryCount
};
writeJsonAtomic(path.join(censusRoot, 'summary.json'), summary);
const closure = computeClosure();
writeClosure(closure);
if (closure.closureStatus !== 'complete') throw new Error(`closure incomplete: ${closure.failedChecks.join(', ')}`);
process.stdout.write(`${JSON.stringify({ stage: 'complete', closureStatus: closure.closureStatus, ...universeSummary(result.universes), relationshipCount: index.summary.relationshipCount, inventoryCount: index.summary.inventoryCount, workPackageCount: planning.packages.length })}\n`);
