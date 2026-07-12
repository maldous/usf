import path from 'node:path';
import { compareBy, sha256, sortUnique } from './canonical.mjs';
import { assertUnique, validateConfidence, validateRelationship } from './contract.mjs';

function extensionCandidates(value) {
  if (path.posix.extname(value)) return [value];
  return [value, `${value}.js`, `${value}.mjs`, `${value}.cjs`, `${value}.ts`, `${value}.tsx`, `${value}.py`, `${value}.json`, `${value}.yaml`, `${value}.yml`, `${value}/index.js`, `${value}/index.mjs`, `${value}/__init__.py`, `${value}/package.json`];
}

function externalReferenceClass(value) {
  const target = String(value);
  if (/^https?:/.test(target)) return 'web-uri';
  if (/^urn:/.test(target)) return 'semantic-urn';
  if (/^mailto:/.test(target)) return 'mail-uri';
  if (/^data:/.test(target)) return 'embedded-data';
  if (/^node:/.test(target)) return 'runtime-module';
  if (target.startsWith('@')) return 'scoped-package';
  return null;
}

function resolveArtifactTarget(source, target, pathSet) {
  const clean = String(target).split('#')[0].split('?')[0];
  if (!clean) return { target: String(target), resolved: true };
  if (externalReferenceClass(clean)) return { target: clean, resolved: true };
  if (clean.startsWith('/')) {
    for (const candidate of extensionCandidates(`v2${clean}`)) if (pathSet.has(candidate)) return { target: candidate, resolved: true };
  }
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(source), clean));
  for (const candidate of extensionCandidates(relative)) if (pathSet.has(candidate)) return { target: candidate, resolved: true };
  for (const candidate of extensionCandidates(clean.replace(/^\.\//, ''))) if (pathSet.has(candidate)) return { target: candidate, resolved: true };
  return { target: clean, resolved: false };
}

function relationshipKey(record) {
  return sha256([record.source, record.relationshipType, record.target, record.targetKind, record.extractionMethod].join('\0'));
}

function classifyFinding(record, overrides = {}) {
  return {
    ...record,
    findingCategory: overrides.findingCategory ?? 'inventory-consistency',
    findingClass: overrides.findingClass ?? record.detailCode,
    severity: overrides.severity ?? 'blocking',
    resolutionStatus: 'open',
    ownerClass: overrides.ownerClass ?? 'source-artifact-owner',
    requiredAction: overrides.requiredAction ?? 'define-or-correct-declared-resource',
    classificationEvidence: overrides.classificationEvidence ?? ['structural-parser-result', 'physical-universe-comparison']
  };
}

export function buildRelationships(members, parserResults) {
  const pathSet = new Set(members.map((member) => member.path));
  const relationships = [];
  const findings = [];
  for (const parsed of parserResults) {
    for (const raw of parsed.relationships) {
      const externalClass = externalReferenceClass(raw.target);
      const externalArtifactTarget = raw.targetKind === 'artifact' && externalClass !== null;
      const targetKind = externalArtifactTarget ? 'external-resource' : raw.targetKind;
      const resolvedTarget = targetKind === 'artifact' ? resolveArtifactTarget(parsed.path, raw.target, pathSet) : { target: raw.target, resolved: true };
      const record = {
        source: parsed.path,
        relationshipType: raw.relationshipType,
        target: resolvedTarget.target,
        targetKind,
        attributes: raw.attributes ?? {},
        extractionMethod: raw.extractionMethod,
        evidenceKind: raw.evidenceKind,
        confidence: raw.confidence,
        resolved: resolvedTarget.resolved,
        reasonCodes: externalClass
          ? ['structural-parser-evidence', 'expected-external-reference', `external-reference-class:${externalClass}`]
          : raw.targetKind === 'external-resource'
            ? ['structural-parser-evidence', 'parser-classified-external-resource']
            : [resolvedTarget.resolved ? 'structural-parser-evidence' : 'unresolved-target-finding']
      };
      validateRelationship(record);
      relationships.push(record);
      if (!record.resolved) findings.push(classifyFinding({
        findingKey: sha256(`missing-target\0${relationshipKey(record)}`),
        source: record.source,
        findingKind: 'missing-target',
        subject: record.target,
        detailCode: 'relationship-target-not-observed',
        relationshipKey: relationshipKey(record),
        comparisonEvidence: ['normalized-universe-path-set']
      }, { findingCategory: 'relationship-resolution', findingClass: 'unresolved-relationship-target', requiredAction: 'define-correct-or-explicitly-externalise-target' }));
    }
  }
  const unique = [...new Map(relationships.map((record) => [relationshipKey(record), record])).values()]
    .sort(compareBy(['source', 'relationshipType', 'target', 'extractionMethod']));
  return { relationships: unique, relationshipFindings: findings.sort(compareBy(['source', 'findingKind', 'subject'])) };
}

function declaredIdentifiers(parsed) {
  return (parsed.inventory?.declarations ?? parsed.declarations).map((entry) => typeof entry === 'string' ? entry : entry.identifier).filter(Boolean);
}

export function reconcileInventories(members, parserResults, relationships, relationshipFindings = []) {
  const pathSet = new Set(members.map((member) => member.path));
  const memberByPath = new Map(members.map((member) => [member.path, member]));
  const inventoryParsers = parserResults.filter((parsed) => parsed.inventory !== null);
  const identifierOwners = new Map();
  for (const parsed of inventoryParsers) for (const identifier of declaredIdentifiers(parsed)) {
    if (!identifierOwners.has(identifier)) identifierOwners.set(identifier, []);
    identifierOwners.get(identifier).push(parsed.path);
  }
  const inventories = [];
  const findings = [...relationshipFindings];
  for (const parsed of inventoryParsers) {
    const declared = declaredIdentifiers(parsed);
    const rawTargets = (parsed.inventory.relationships ?? []).map((entry) => typeof entry === 'string' ? entry : entry.target).filter(Boolean);
    const missingDeclarations = rawTargets.filter((target) => {
      if (externalReferenceClass(target)) return false;
      return !resolveArtifactTarget(parsed.path, target, pathSet).resolved;
    });
    const duplicateDeclarations = declared.filter((identifier, index) => declared.indexOf(identifier) !== index);
    const crossInventoryDuplicates = declared.filter((identifier) => (identifierOwners.get(identifier) ?? []).length > 1);
    const contradictions = [];
    for (const target of rawTargets) {
      const resolved = resolveArtifactTarget(parsed.path, target, pathSet);
      if (resolved.resolved && memberByPath.get(resolved.target)?.sourceState === 'deleted') contradictions.push(`declares-deleted:${resolved.target}`);
    }
    const completenessClaims = parsed.inventory.completenessClaims ?? [];
    const extraDeclarations = [];
    if (completenessClaims.includes('complete-graph-manifest')) {
      const declaredPaths = new Set(rawTargets.map((target) => resolveArtifactTarget(parsed.path, target, pathSet)).filter((entry) => entry.resolved).map((entry) => entry.target));
      for (const member of members.filter((entry) => entry.universe === 'v2-graph-authority' && /\.(?:ttl|trig|rq|sparql)$/.test(entry.path))) {
        if (member.path !== parsed.path && !member.path.includes('/fixtures/') && !declaredPaths.has(member.path)) extraDeclarations.push(member.path);
      }
    }
    const inventoryFindings = [
      ...missingDeclarations.map((subject) => ({ findingKind: 'missing-declaration', subject, detailCode: 'declared-target-not-observed', findingClass: 'inventory-target-missing', requiredAction: 'define-correct-or-remove-declared-target' })),
      ...duplicateDeclarations.map((subject) => ({ findingKind: 'duplicate-declaration', subject, detailCode: 'duplicate-within-inventory', findingClass: 'inventory-local-duplicate', requiredAction: 'deduplicate-inventory-declaration' })),
      ...crossInventoryDuplicates.map((subject) => ({ findingKind: 'duplicate-declaration', subject, detailCode: 'declared-by-multiple-inventories', findingClass: 'inventory-owner-collision', requiredAction: 'assign-canonical-inventory-owner' })),
      ...contradictions.map((subject) => ({ findingKind: 'contradictory-declaration', subject, detailCode: 'declaration-contradicts-universe-state', findingClass: 'inventory-state-contradiction', requiredAction: 'reconcile-declaration-with-observed-state' })),
      ...extraDeclarations.map((subject) => ({ findingKind: 'extra-declaration', subject, detailCode: 'complete-scope-member-unregistered', findingClass: 'inventory-scope-omission', requiredAction: 'register-or-explicitly-exempt-scope-member' }))
    ];
    for (const finding of inventoryFindings) findings.push(classifyFinding({
      findingKey: sha256([parsed.path, finding.findingKind, finding.subject, finding.detailCode].join('\0')),
      source: parsed.path,
      findingKind: finding.findingKind,
      subject: finding.subject,
      detailCode: finding.detailCode,
      relationshipKey: null,
      comparisonEvidence: ['physical-universe', 'cross-inventory-declarations', 'normalized-relationships']
    }, { findingClass: finding.findingClass, requiredAction: finding.requiredAction }));
    const confidence = inventoryFindings.length === 0
      ? { level: 'high', score: 0.95, reasons: ['inventory-cross-check'] }
      : { level: 'medium', score: 0.7, reasons: ['inventory-cross-check', 'semantic-ambiguity'] };
    validateConfidence(confidence);
    inventories.push({
      path: parsed.path,
      universe: parsed.universe,
      inventoryKind: parsed.inventory.inventoryKind,
      scope: parsed.inventory.scope,
      declarations: parsed.inventory.declarations ?? parsed.declarations,
      relationships: parsed.inventory.relationships ?? [],
      completenessClaims,
      actualMatchCount: rawTargets.length - missingDeclarations.length,
      missingDeclarations: sortUnique(missingDeclarations),
      extraDeclarations: sortUnique(extraDeclarations),
      duplicateDeclarations: sortUnique([...duplicateDeclarations, ...crossInventoryDuplicates]),
      contradictions: sortUnique(contradictions),
      ambiguities: sortUnique(inventoryFindings.filter((entry) => entry.findingKind === 'ambiguous-target').map((entry) => entry.subject)),
      stalenessFindings: sortUnique(missingDeclarations.map((target) => `missing-target:${target}`)),
      authorityAssessment: parsed.inventory.authorityAssessment,
      scopeCompleteness: inventoryFindings.length === 0 ? 'comparison-complete' : 'comparison-has-findings',
      comparisonExecuted: ['physical-universe', 'cross-inventory-declarations', 'normalized-relationships'],
      confidence
    });
  }
  inventories.sort(compareBy(['universe', 'path']));
  assertUnique(inventories, (record) => `${record.universe}\0${record.path}`);
  const uniqueFindings = [...new Map(findings.map((finding) => [finding.findingKey, finding])).values()].sort(compareBy(['source', 'findingKind', 'subject']));
  return { inventories, inventoryFindings: uniqueFindings };
}

export const relationshipInternals = { externalReferenceClass, relationshipKey, resolveArtifactTarget };
