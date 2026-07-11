import path from 'node:path';
import { classifications, forbiddenFinalTokens, mandatoryArtifactFields, assertClassification } from './constants.mjs';

const digestPattern = /^[a-f0-9]{64}$/;
const modePattern = /^[0-7]{6}$/;

export function validateRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.includes('\0') || path.posix.isAbsolute(value)) {
    throw new Error(`invalid relative path: ${String(value)}`);
  }
  const normal = path.posix.normalize(value);
  if (normal !== value || value === '..' || value.startsWith('../') || value.includes('/../')) {
    throw new Error(`escaping or noncanonical path: ${value}`);
  }
}

export function validateConfidence(confidence) {
  if (!confidence || typeof confidence !== 'object') throw new Error('confidence must be an object');
  assertClassification('confidenceLevels', confidence.level, 'confidence level');
  if (typeof confidence.score !== 'number' || confidence.score < 0 || confidence.score > 1) throw new Error('confidence score out of range');
  if (!Array.isArray(confidence.reasons) || confidence.reasons.length === 0) throw new Error('confidence reasons required');
}

export function validateUniverseMember(record) {
  validateRelativePath(record.path);
  assertClassification('universes', record.universe);
  assertClassification('sourceStates', record.sourceState);
  assertClassification('formatKinds', record.formatKind);
  if (!digestPattern.test(record.contentDigest)) throw new Error(`invalid digest for ${record.path}`);
  if (!Number.isInteger(record.byteSize) || record.byteSize < 0) throw new Error(`invalid byte size for ${record.path}`);
  if (!modePattern.test(record.fileMode)) throw new Error(`invalid file mode for ${record.path}`);
  if (typeof record.executable !== 'boolean' || typeof record.binary !== 'boolean') throw new Error(`invalid flags for ${record.path}`);
}

export function validateArtifact(record) {
  for (const field of mandatoryArtifactFields) {
    if (!(field in record)) throw new Error(`missing mandatory field ${field} for ${record.path ?? '<record>'}`);
  }
  validateRelativePath(record.path);
  assertClassification('universes', record.universe);
  assertClassification('sourceStates', record.sourceState);
  assertClassification('formatKinds', record.formatKind);
  assertClassification('artifactFamilies', record.artifactFamily);
  assertClassification('authorityStatuses', record.authorityStatus);
  assertClassification('outputRequirements', record.canonicalOutputRequirement);
  assertClassification('equivalenceClasses', record.equivalenceClass);
  assertClassification('reuseStrategies', record.reuseStrategy);
  assertClassification('v2CoverageStates', record.v2ConceptCoverage);
  assertClassification('implementationSizes', record.implementationSize);
  for (const value of record.productionResponsibility) assertClassification('productionResponsibilities', value);
  for (const value of record.gapClassification) assertClassification('gapClassifications', value);
  for (const value of record.requiredSemanticLayers) assertClassification('semanticLayers', value);
  for (const value of record.riskDrivers) assertClassification('riskDrivers', value);
  for (const value of record.reasonCodes) assertClassification('reasonCodes', value);
  validateConfidence(record.confidence);
  if (!digestPattern.test(record.contentDigest)) throw new Error(`invalid digest for ${record.path}`);
  if (record.v2ConceptCoverage !== 'complete' && record.v2ConceptCoverage !== 'notrequired') {
    if (record.gapClassification.length === 0 || record.requiredSemanticLayers.length === 0) {
      throw new Error(`noncomplete record lacks precise gaps: ${record.path}`);
    }
  }
  rejectFinalFallback(record);
}

export function validateRelationship(record) {
  validateRelativePath(record.source);
  assertClassification('relationshipTypes', record.relationshipType);
  assertClassification('targetKinds', record.targetKind);
  validateConfidence(record.confidence);
  if (typeof record.target !== 'string' || record.target.length === 0) throw new Error('relationship target required');
  if (typeof record.resolved !== 'boolean') throw new Error('relationship resolution must be boolean');
  if (!Array.isArray(record.reasonCodes) || record.reasonCodes.length === 0) throw new Error('relationship reason codes required');
}

export function validateInventory(record) {
  validateRelativePath(record.path);
  assertClassification('inventoryKinds', record.inventoryKind);
  if (!Array.isArray(record.declarations) || !Array.isArray(record.relationships) || !Array.isArray(record.findings)) {
    throw new Error(`malformed inventory record: ${record.path}`);
  }
  validateConfidence(record.confidence);
  rejectFinalFallback(record);
}

export function rejectFinalFallback(value) {
  const visit = (item) => {
    if (typeof item === 'string' && forbiddenFinalTokens.has(item.toLowerCase())) throw new Error(`forbidden final fallback: ${item}`);
    if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === 'object') Object.values(item).forEach(visit);
  };
  visit(value);
}

export function assertUnique(records, key) {
  const seen = new Set();
  for (const record of records) {
    const value = typeof key === 'function' ? key(record) : record[key];
    if (seen.has(value)) throw new Error(`duplicate primary record: ${value}`);
    seen.add(value);
  }
}

export function validateClassificationContract() {
  for (const [group, values] of Object.entries(classifications)) {
    if (['id', 'version'].includes(group)) continue;
    if (!Array.isArray(values) || values.length === 0) throw new Error(`empty classification group: ${group}`);
    if (new Set(values).size !== values.length) throw new Error(`duplicate classification in ${group}`);
    values.forEach((value) => rejectFinalFallback(value));
  }
}
