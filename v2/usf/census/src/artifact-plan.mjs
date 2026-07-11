import path from 'node:path';
import { compareBy, sha256, sortUnique } from './canonical.mjs';
import { assertUnique, validateCanonicalArtifact } from './contract.mjs';

function lifecycleContext(repoPath) {
  const lower = repoPath.toLowerCase();
  for (const value of ['development', 'test', 'staging', 'production']) if (lower.includes(value)) return value;
  if (/(?:^|\/)evidence\//.test(lower) || lower.includes('machine-runs')) return 'runtime-evidence';
  return 'shared';
}

function artifactKind(artifact, parsed) {
  if (artifact.path.endsWith('package.json') || artifact.path.endsWith('package-lock.json') || artifact.path.endsWith('pnpm-lock.yaml')) return artifact.path.endsWith('package.json') ? 'package-metadata' : 'workspace-metadata';
  if (['rdf-turtle', 'rdf-trig', 'sparql', 'graphql', 'json-schema'].includes(parsed.syntaxKind)) return 'schema-contract';
  if (artifact.artifactFamily === 'automation') return 'automation-projection';
  if (artifact.artifactFamily === 'runtime-topology') return parsed.syntaxKind === 'dockerfile' ? 'container-deployment-asset' : 'runtime-projection';
  if (artifact.artifactFamily === 'verification') return 'validator-test';
  if (artifact.artifactFamily === 'proof-evidence') return artifact.authorityStatus === 'evidence' ? 'evidence-output' : 'proof-executable';
  if (artifact.artifactFamily === 'documentation-assets') return artifact.mediaType.startsWith('image/') || artifact.mediaType.startsWith('font/') ? 'static-retained-asset' : 'requirement-runbook-projection';
  if (artifact.artifactFamily === 'implementation') return 'source-module';
  if (artifact.artifactFamily === 'v2-support') return 'compiler-support-artifact';
  if (parsed.syntaxKind === 'make' || parsed.declarations.some((entry) => entry.kind === 'command')) return 'command-surface';
  return 'configuration';
}

function outputDisposition(artifact, mapping, kind) {
  if (mapping.coverageDecision === 'notrequired') return artifact.path.endsWith('.gitkeep') ? 'remove' : 'exclude';
  if (artifact.universe === 'v2-graph-authority') return artifact.path.includes('/derived/') ? 'derive' : 'retain';
  if (kind === 'static-retained-asset') return 'retain';
  if (kind === 'evidence-output') return 'collect';
  if (kind === 'external-materialisation' || artifact.path.endsWith('package-lock.json') || artifact.path.endsWith('pnpm-lock.yaml')) return 'materialise';
  return 'generate';
}

function reuseStrategy(artifact, mapping, kind) {
  if (mapping.coverageDecision === 'notrequired') return 'none';
  if (artifact.universe === 'v2-graph-authority' || kind === 'static-retained-asset') return 'adopt';
  if (artifact.artifactFamily === 'implementation') return mapping.coverageDecision === 'partial' ? 'wrap' : 'rewrite';
  if (artifact.artifactFamily === 'v2-support') return 'wrap';
  if (artifact.artifactFamily === 'machine-semantics') return 'replace';
  return 'template';
}

function responsibility(disposition, kind) {
  if (disposition === 'remove' || disposition === 'exclude') return ['none'];
  if (disposition === 'retain') return kind === 'static-retained-asset' ? ['asset-copier'] : ['human-authoring'];
  if (disposition === 'collect') return ['collector', 'normaliser', 'ingestor'];
  if (disposition === 'materialise') return ['package-manager'];
  if (kind === 'automation-projection' || kind === 'runtime-projection' || kind === 'requirement-runbook-projection') return ['renderer'];
  return ['generator'];
}

function equivalence(disposition, kind, artifactKey) {
  if (disposition === 'remove' || disposition === 'exclude') return { primaryClass: 'none', gates: [{ gateKey: `removal-${artifactKey}`, mechanism: 'absence-and-reference-closure' }] };
  if (disposition === 'retain') return { primaryClass: 'exact', gates: [{ gateKey: `digest-${artifactKey}`, mechanism: 'sha256-content-and-mode' }] };
  if (disposition === 'collect') return { primaryClass: 'evidential', gates: [{ gateKey: `evidence-${artifactKey}`, mechanism: 'obligation-schema-freshness-and-ingestion-validation' }] };
  if (kind === 'source-module' || kind === 'validator-test' || kind === 'runtime-projection' || kind === 'automation-projection') return { primaryClass: 'behavioural', gates: [{ gateKey: `behaviour-${artifactKey}`, mechanism: 'contract-test-and-observable-comparison' }] };
  return { primaryClass: 'normalised', gates: [{ gateKey: `normalised-${artifactKey}`, mechanism: 'parsed-canonical-structure-comparison' }] };
}

function semanticPurpose(group, mappings) {
  const resources = sortUnique(mappings.flatMap((mapping) => mapping.matchedResources));
  if (resources.length) return `Produce the canonical projection or realization of ${resources.join(', ')}.`;
  return `Produce the canonical ${group.kind} outcome for ${group.family} with explicit missing semantic ownership.`;
}

function pathRuleFor(kind) {
  return {
    'schema-contract': 'spec/generated/{semantic-key}.{syntax-extension}',
    'source-module': 'generated/source/{domain}/{module}.{language-extension}',
    'validator-test': 'generated/validation/{domain}/{gate}.{test-extension}',
    'proof-executable': 'generated/proof/{obligation}.{executable-extension}',
    'evidence-collector-schema': 'generated/evidence/{evidence-kind}.{schema-extension}',
    'runtime-projection': 'generated/runtime/{environment}/{service}.{format-extension}',
    'automation-projection': 'generated/automation/{platform}/{workflow}.{format-extension}',
    'requirement-runbook-projection': 'generated/requirements/{semantic-key}.md',
    'compiler-support-artifact': 'generated/support/{support-key}.{format-extension}'
  }[kind] ?? 'generated/{artifact-kind}/{semantic-key}.{format-extension}';
}

export function validateReplacementGroup(record, currentKeys, canonicalKeys) {
  const allowed = new Set(['one-to-one', 'many-to-one', 'one-to-many', 'many-to-many', 'one-to-zero', 'zero-to-one']);
  if (!allowed.has(record.cardinality)) throw new Error(`invalid replacement cardinality: ${record.groupKey}`);
  if (record.currentArtifacts.some((key) => !currentKeys.has(key))) throw new Error(`replacement has missing current artifact: ${record.groupKey}`);
  if (record.canonicalArtifacts.some((key) => !canonicalKeys.has(key))) throw new Error(`replacement has missing canonical artifact: ${record.groupKey}`);
  const counts = `${record.currentArtifacts.length}:${record.canonicalArtifacts.length}`;
  const valid = record.cardinality === 'one-to-one' ? counts === '1:1' :
    record.cardinality === 'many-to-one' ? record.currentArtifacts.length > 1 && record.canonicalArtifacts.length === 1 :
    record.cardinality === 'one-to-many' ? record.currentArtifacts.length === 1 && record.canonicalArtifacts.length > 1 :
    record.cardinality === 'many-to-many' ? record.currentArtifacts.length > 1 && record.canonicalArtifacts.length > 1 :
    record.cardinality === 'one-to-zero' ? record.currentArtifacts.length === 1 && record.canonicalArtifacts.length === 0 :
    record.currentArtifacts.length === 0 && record.canonicalArtifacts.length === 1;
  if (!valid) throw new Error(`replacement cardinality mismatch: ${record.groupKey}`);
}

export function buildArtifactPlan(artifacts, parserResults, mappings, missingEntirely, relationships) {
  const parsedByPath = new Map(parserResults.map((record) => [record.path, record]));
  const mappingByKey = new Map(mappings.map((record) => [record.artifactKey, record]));
  const relatedByPath = new Map();
  for (const relation of relationships) {
    if (!relatedByPath.has(relation.source)) relatedByPath.set(relation.source, []);
    relatedByPath.get(relation.source).push(relation);
  }
  const noOutput = [];
  const groups = new Map();
  for (const artifact of artifacts) {
    const mapping = mappingByKey.get(artifact.artifactKey);
    const parsed = parsedByPath.get(artifact.path);
    const kind = artifactKind(artifact, parsed);
    const disposition = outputDisposition(artifact, mapping, kind);
    if (disposition === 'remove' || disposition === 'exclude') {
      noOutput.push({ artifact, mapping, kind, disposition });
      continue;
    }
    const resourceSignature = mapping.matchedResources.join('|') || mapping.missingSemantics.join('|');
    const signature = [kind, artifact.artifactFamily, artifact.authorityStatus, lifecycleContext(artifact.path), artifact.contentDigest, resourceSignature].join('\0');
    if (!groups.has(signature)) groups.set(signature, { kind, family: artifact.artifactFamily, lifecycle: lifecycleContext(artifact.path), entries: [] });
    groups.get(signature).entries.push({ artifact, mapping, parsed, disposition });
  }
  const canonicalArtifacts = [];
  const replacementGroups = [];
  for (const [signature, group] of groups) {
    group.entries.sort((a, b) => a.artifact.path.localeCompare(b.artifact.path));
    const artifactKeys = group.entries.map((entry) => entry.artifact.artifactKey);
    const mappingGroup = group.entries.map((entry) => entry.mapping);
    const canonicalArtifactKey = `artifact-${sha256(`canonical\0${signature}`).slice(0, 24)}`;
    const targetPath = group.entries[0].artifact.path;
    const disposition = group.entries[0].disposition;
    const equivalenceContract = equivalence(disposition, group.kind, canonicalArtifactKey);
    const productionResponsibilities = responsibility(disposition, group.kind);
    const replacementGroup = `replacement-${sha256(`replacement\0${signature}`).slice(0, 24)}`;
    const semanticInputs = sortUnique(mappingGroup.flatMap((mapping) => mapping.matchedResources));
    const requiredLayers = sortUnique(mappingGroup.flatMap((mapping) => mapping.missingSemantics));
    const artifactDependencies = sortUnique(group.entries.flatMap((entry) => (relatedByPath.get(entry.artifact.path) ?? []).filter((relation) => relation.targetKind === 'artifact' && relation.resolved).map((relation) => relation.target)));
    const reuse = reuseStrategy(group.entries[0].artifact, group.entries[0].mapping, group.kind);
    const record = {
      canonicalArtifactKey,
      semanticPurpose: semanticPurpose(group, mappingGroup),
      artifactKind: group.kind,
      mediaType: group.entries[0].artifact.mediaType,
      targetPath,
      pathRule: null,
      authorityStatus: group.entries[0].artifact.authorityStatus,
      mutabilityClass: disposition === 'retain' ? 'retained-static' : disposition === 'derive' ? 'derived' : disposition === 'collect' ? 'collected' : disposition === 'materialise' ? 'materialised' : 'generated',
      semanticInputs,
      requiredSemanticLayers: requiredLayers,
      proofInputs: sortUnique(mappingGroup.flatMap((mapping) => mapping.representedProofEvidence)),
      evidenceInputs: sortUnique(mappingGroup.flatMap((mapping) => mapping.representedProofEvidence)),
      implementationObligations: requiredLayers.filter((layer) => layer === 'implementation-obligations'),
      artifactDependencies,
      productionResponsibilities,
      productionContract: { contractKey: `${productionResponsibilities.join('-')}-${group.kind}`, disposition, implementationStatus: 'required' },
      retainedInputs: disposition === 'retain' ? group.entries.map((entry) => entry.artifact.path) : [],
      materialisationContract: disposition === 'materialise' ? 'materialisation-compiler-dependencies' : null,
      collectorIngestionContract: disposition === 'collect' ? { collector: 'required', normaliser: 'required', ingestion: 'required' } : null,
      normalisationRules: equivalenceContract.primaryClass === 'normalised' ? ['parse', 'canonical-key-order', 'stable-array-order', 'lf-final-newline'] : [],
      integrityPolicy: { algorithm: 'sha256', protectedInputs: sortUnique([...semanticInputs, ...artifactDependencies, ...group.entries.map((entry) => entry.artifact.contentDigest)]) },
      equivalenceContract,
      acceptanceGates: equivalenceContract.gates.map((gate) => ({ ...gate, status: 'required' })),
      currentArtifacts: artifactKeys,
      replacementGroup,
      lifecyclePolicy: { currentLifecycle: group.lifecycle, removalPolicy: artifactKeys.length > 1 ? 'remove-exact-progressive-duplicates-after-equivalence' : 'replace-after-equivalence', reuseStrategy: reuse },
      confidence: { level: mappingGroup.some((mapping) => mapping.mappingConfidence.level === 'medium') ? 'medium' : 'high', score: Math.min(...mappingGroup.map((mapping) => mapping.mappingConfidence.score)), reasons: ['canonical-artifact-input'] },
      reviewStatus: 'machine-reviewed'
    };
    validateCanonicalArtifact(record);
    canonicalArtifacts.push(record);
    replacementGroups.push({
      groupKey: replacementGroup,
      semanticInvariant: record.semanticPurpose,
      currentArtifacts: artifactKeys,
      canonicalArtifacts: [canonicalArtifactKey],
      cardinality: artifactKeys.length > 1 ? 'many-to-one' : 'one-to-one',
      consolidationClass: artifactKeys.length > 1 ? 'compatibility-duplication' : 'necessary-projection',
      safetyEvidence: artifactKeys.length > 1 ? ['exact-content-digest', 'same-semantic-resource-set', 'same-lifecycle-context'] : ['explicit-canonical-mapping'],
      reuseActions: [reuse],
      removedDuplication: artifactKeys.length > 1 ? artifactKeys.slice(1) : [],
      requiredGenerationProjections: [canonicalArtifactKey],
      equivalenceGates: equivalenceContract.gates.map((gate) => gate.gateKey),
      proofEvidenceGates: record.acceptanceGates.map((gate) => gate.gateKey),
      migrationOrdering: ['produce-canonical', 'run-equivalence', 'remove-superseded'],
      reviewStatus: 'machine-reviewed'
    });
  }
  for (const entry of noOutput) {
    const groupKey = `replacement-${sha256(`no-output\0${entry.artifact.artifactKey}`).slice(0, 24)}`;
    replacementGroups.push({ groupKey, semanticInvariant: 'Closed noncanonical or transient artifact disposition.', currentArtifacts: [entry.artifact.artifactKey], canonicalArtifacts: [], cardinality: 'one-to-zero', consolidationClass: 'progressive-or-runtime-output', safetyEvidence: ['closed-no-output-disposition'], reuseActions: ['none'], removedDuplication: [entry.artifact.artifactKey], requiredGenerationProjections: [], equivalenceGates: [`absence-${entry.artifact.artifactKey}`], proofEvidenceGates: [`reference-closure-${entry.artifact.artifactKey}`], migrationOrdering: ['verify-no-consumers', 'remove-or-exclude'], reviewStatus: 'machine-reviewed' });
  }
  const requiredLayers = sortUnique(missingEntirely.flatMap((entry) => entry.requiredSemanticLayers));
  for (const layer of requiredLayers) {
    const canonicalArtifactKey = `artifact-${sha256(`required-layer\0${layer}`).slice(0, 24)}`;
    const replacementGroup = `replacement-${sha256(`required-layer\0${layer}`).slice(0, 24)}`;
    const targetPath = `spec/semantic/${layer}.trig`;
    const record = {
      canonicalArtifactKey,
      semanticPurpose: `Define the missing ${layer} semantic and generation contract required by the census.`,
      artifactKind: 'schema-contract',
      mediaType: 'application/trig',
      targetPath,
      pathRule: pathRuleFor('schema-contract'),
      authorityStatus: 'normative',
      mutabilityClass: 'generated',
      semanticInputs: [],
      requiredSemanticLayers: [layer],
      proofInputs: [],
      evidenceInputs: [],
      implementationObligations: [],
      artifactDependencies: [],
      productionResponsibilities: ['generator'],
      productionContract: { contractKey: `semantic-layer-generator-${layer}`, disposition: 'generate', implementationStatus: 'required' },
      retainedInputs: [],
      materialisationContract: null,
      collectorIngestionContract: null,
      normalisationRules: ['rdf-dataset-canonicalisation'],
      integrityPolicy: { algorithm: 'sha256', protectedInputs: [layer] },
      equivalenceContract: { primaryClass: 'normalised', gates: [{ gateKey: `semantic-layer-${layer}`, mechanism: 'rdf-dataset-and-shape-comparison' }] },
      acceptanceGates: [{ gateKey: `semantic-layer-${layer}`, mechanism: 'rdf-dataset-and-shape-comparison', status: 'required' }],
      currentArtifacts: [],
      replacementGroup,
      lifecyclePolicy: { currentLifecycle: 'shared', removalPolicy: 'not-removable-while-required', reuseStrategy: 'none' },
      confidence: { level: 'high', score: 0.95, reasons: ['no-adequate-semantic-resource', 'canonical-artifact-input'] },
      reviewStatus: 'architect-reviewed'
    };
    validateCanonicalArtifact(record);
    canonicalArtifacts.push(record);
    replacementGroups.push({ groupKey: replacementGroup, semanticInvariant: record.semanticPurpose, currentArtifacts: [], canonicalArtifacts: [canonicalArtifactKey], cardinality: 'zero-to-one', consolidationClass: 'required-new-output', safetyEvidence: ['explicit-unmapped-result', 'required-semantic-layer'], reuseActions: ['none'], removedDuplication: [], requiredGenerationProjections: [canonicalArtifactKey], equivalenceGates: [`semantic-layer-${layer}`], proofEvidenceGates: [`semantic-layer-${layer}`], migrationOrdering: ['define-semantics', 'generate-artifact', 'validate-equivalence'], reviewStatus: 'architect-reviewed' });
  }
  canonicalArtifacts.sort(compareBy(['canonicalArtifactKey']));
  replacementGroups.sort(compareBy(['groupKey']));
  assertUnique(canonicalArtifacts, 'canonicalArtifactKey');
  assertUnique(canonicalArtifacts.filter((record) => record.targetPath !== null), 'targetPath');
  assertUnique(replacementGroups, 'groupKey');
  const currentKeys = new Set(artifacts.map((record) => record.artifactKey));
  const canonicalKeys = new Set(canonicalArtifacts.map((record) => record.canonicalArtifactKey));
  for (const group of replacementGroups) validateReplacementGroup(group, currentKeys, canonicalKeys);
  const currentOwners = replacementGroups.flatMap((group) => group.currentArtifacts);
  if (currentOwners.length !== currentKeys.size || new Set(currentOwners).size !== currentKeys.size) throw new Error('current artifact replacement ownership is not closed');
  const canonicalOwners = replacementGroups.flatMap((group) => group.canonicalArtifacts);
  if (canonicalOwners.length !== canonicalKeys.size || new Set(canonicalOwners).size !== canonicalKeys.size) throw new Error('canonical artifact replacement ownership is not closed');
  return { canonicalArtifacts, replacementGroups };
}

export const artifactPlanInternals = { artifactKind, lifecycleContext, outputDisposition };
