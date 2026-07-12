import { DataFactory } from 'n3';
import {
  USF,
  iriValue,
  literalValue,
  objects,
  oneObject,
  subjectsOfType,
} from './authority-dataset.js';
import { CompilerError } from './compiler.js';

const { namedNode } = DataFactory;
const p = (local) => namedNode(`${USF}${local}`);

const FORBIDDEN_SEGMENTS = new Set(['v2', 'legacy', 'old', 'new', 'temp', 'transitional', 'usf']);

function requiredOne(store, subject, predicate, kind, obligations) {
  const values = objects(store, subject, predicate);
  if (values.length !== 1) {
    obligations.push({ subject: subject.value, predicate: predicate.value, expected: 'exactly-one', observed: values.length, kind });
    return null;
  }
  return values[0];
}

function validatePath(path, subject, obligations) {
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) {
    obligations.push({ subject, predicate: `${USF}canonicalPath`, expected: 'safe-repository-relative-path', observed: path, kind: 'invalid-path' });
    return;
  }
  const forbidden = path.split('/').find((segment) => FORBIDDEN_SEGMENTS.has(segment));
  if (forbidden) obligations.push({ subject, predicate: `${USF}canonicalPath`, expected: 'clean-final-state-path', observed: path, kind: 'forbidden-path-segment' });
}

export function buildGenerationPlan(store) {
  const obligations = [];
  const outputs = [];
  const plans = subjectsOfType(store, `${USF}ArtefactPlan`).sort((a, b) => a.value.localeCompare(b.value));
  if (!plans.length) obligations.push({ subject: 'urn:usf:repository:foundation', predicate: `${USF}hasArtefactPlan`, expected: 'one-or-more', observed: 0, kind: 'missing-artefact-plans' });
  for (const plan of plans) {
    requiredOne(store, plan, p('ownedByRepository'), 'missing-plan-owner', obligations);
    const artefacts = objects(store, plan, p('plansArtefact'));
    if (!artefacts.length) obligations.push({ subject: plan.value, predicate: `${USF}plansArtefact`, expected: 'one-or-more', observed: 0, kind: 'missing-plan-output' });
    for (const artefact of artefacts) {
      const pathTerm = requiredOne(store, artefact, p('canonicalPath'), 'missing-canonical-path', obligations);
      const kindTerm = requiredOne(store, artefact, p('artefactKind'), 'missing-artefact-kind', obligations);
      const pathRule = requiredOne(store, artefact, p('governedByPathRule'), 'missing-path-rule', obligations);
      const component = requiredOne(store, artefact, p('generatedByComponent'), 'missing-generator-owner', obligations);
      const path = literalValue(pathTerm);
      let template = null;
      validatePath(path, artefact.value, obligations);
      if (pathRule) requiredOne(store, pathRule, p('pathPattern'), 'missing-path-pattern', obligations);
      if (component) {
        requiredOne(store, component, p('semanticInputQuery'), 'missing-semantic-input-query', obligations);
        requiredOne(store, component, p('outputSchema'), 'missing-output-schema', obligations);
        requiredOne(store, component, p('outputPathRule'), 'missing-component-path-rule', obligations);
        requiredOne(store, component, p('integrityPolicy'), 'missing-integrity-policy', obligations);
        requiredOne(store, component, p('normalisationPolicy'), 'missing-normalisation-policy', obligations);
        if (!objects(store, component, p('missingSemanticsConstraint')).length) obligations.push({ subject: component.value, predicate: `${USF}missingSemanticsConstraint`, expected: 'one-or-more', observed: 0, kind: 'missing-fail-closed-constraint' });
        if (!objects(store, component, p('requiresEquivalenceKind')).length) obligations.push({ subject: component.value, predicate: `${USF}requiresEquivalenceKind`, expected: 'one-or-more', observed: 0, kind: 'missing-equivalence-contract' });
        const templates = objects(store, component, p('usesTemplate'));
        if (templates.length > 1) obligations.push({ subject: component.value, predicate: `${USF}usesTemplate`, expected: 'zero-or-one', observed: templates.length, kind: 'ambiguous-template-input' });
        if (templates.length === 1) {
          const templatePath = literalValue(requiredOne(store, templates[0], p('canonicalPath'), 'missing-template-path', obligations));
          const checksum = requiredOne(store, templates[0], p('canonicalChecksum'), 'missing-template-checksum', obligations);
          const role = requiredOne(store, templates[0], p('generationInputRole'), 'missing-template-role', obligations);
          const algorithm = checksum ? requiredOne(store, checksum, p('checksumAlgorithm'), 'missing-template-checksum-algorithm', obligations) : null;
          const digest = checksum ? literalValue(requiredOne(store, checksum, p('checksumValue'), 'missing-template-checksum-value', obligations)) : null;
          if (iriValue(role) !== 'urn:usf:generationinputrole:template') obligations.push({ subject: templates[0].value, predicate: `${USF}generationInputRole`, expected: 'urn:usf:generationinputrole:template', observed: iriValue(role), kind: 'invalid-template-role' });
          if (iriValue(algorithm) !== 'urn:usf:checksumalgorithm:sha256') obligations.push({ subject: checksum?.value ?? templates[0].value, predicate: `${USF}checksumAlgorithm`, expected: 'urn:usf:checksumalgorithm:sha256', observed: iriValue(algorithm), kind: 'unsupported-template-checksum' });
          if (!digest || !/^[0-9a-f]{64}$/.test(digest)) obligations.push({ subject: checksum?.value ?? templates[0].value, predicate: `${USF}checksumValue`, expected: 'lowercase-sha256', observed: digest, kind: 'invalid-template-checksum' });
          if (templatePath && digest) template = { artefact: templates[0].value, path: templatePath, sha256: digest };
        }
      }
      if (path && kindTerm && component) outputs.push({ plan: plan.value, artefact: artefact.value, path, artefactKind: iriValue(kindTerm), component: component.value, ...(template ? { template } : {}) });
    }
  }
  const byPath = new Map();
  for (const output of outputs) {
    const prior = byPath.get(output.path);
    if (prior) obligations.push({ subject: output.artefact, predicate: `${USF}canonicalPath`, expected: 'unique-output-path', observed: output.path, conflictsWith: prior.artefact, kind: 'path-collision' });
    else byPath.set(output.path, output);
  }
  const ordered = outputs.sort((a, b) => a.path.localeCompare(b.path) || a.artefact.localeCompare(b.artefact));
  return Object.freeze({ plans: plans.length, outputs: ordered, obligations: obligations.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), complete: obligations.length === 0 });
}

export function requireCompleteGenerationPlan(store) {
  const plan = buildGenerationPlan(store);
  if (!plan.complete) throw new CompilerError('semantic generation plan is incomplete', { phase: 'plan', count: plan.obligations.length, obligations: plan.obligations.slice(0, 100) });
  return plan;
}
