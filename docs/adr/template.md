# ADR Template

| | |
|---|---|
| **ADR ID** | `0000-short-semantic-title` |
| **Title** | Short semantic decision title |
| **Decision status** | `proposed` |
| **Date** | `YYYY-MM-DD` |
| **Authority level** | `adr` |
| **Lifecycle state** | `draft` |
| **Ontology concepts** | `ADR`, `Semantic Contract` |
| **Taxonomy references** | `authority-classification`, `ai-governance-classification` |
| **Vocabulary references** | `authority-levels`, `artefact-kinds`, `ai-governance-kinds` |

> This template is not a numbered decision ADR. Copy it to `docs/adr/0001-short-semantic-title.md` or the next available zero-padded number when an ADR is explicitly authorised.

## Numbering and Filename Convention

Numbered ADR files use a stable four-digit numeric prefix followed by a lowercase kebab-case semantic title:

```text
docs/adr/0001-short-semantic-title.md
```

The number is the stable ADR identity. The title describes the semantic decision area. Do not encode date, lifecycle state, status, historical source path, or supersession state in the filename.

## Description

State what this ADR decides and the semantic area it governs.

## Context

Describe the problem, the relevant USF semantic definitions, and the USF source-lineage evidence being considered.

## Decision

State the normative decision. Use BCP 14 terms only where the requirement is intended to be binding.

## Rationale

Explain why this decision is selected over the alternatives. Distinguish source evidence from USF authority.

## Semantic References

- `path-or-id`

## Source References

- `source-import-registry-id` (USF's own source-import registry entry)

## Proof References

- `evidence-or-proof-id`

## Validator References

- `validator-or-rule-id`

## Invariants

- State what MUST remain true after this decision.

## Permitted Changes

- State what MAY change without superseding this ADR.

## Forbidden Drift

- State what MUST NOT change without a superseding ADR and coupled semantic, validator, and evidence updates.

## Consequences

- Record accepted tradeoffs and downstream obligations.

## AI Alignment Rules

- State what future agents MUST read, preserve, or stop on when touching this decision area.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

Each ADR MUST have a corresponding JSON instance that validates against `spec/schemas/adr.schema.json`. Until an ADR instance registry is authorised, the JSON instance may be used as a review or validator fixture only; it does not replace the Markdown ADR text and does not create a numbered decision by itself.

The JSON instance fields are:

- `id`
- `kind`
- `title`
- `authorityLevel`
- `decisionStatus`
- `date`
- `context`
- `decision`
- `consequences`
- `invariants`
- `permittedChanges`
- `forbiddenDrift`
- `aiAlignmentRules`
- `semanticRefs`
- `sourceRefs`
- `proofRefs`
- `validatorRefs`
- `rationale`
- `description`
- `lifecycleState`
- `ontologyConcepts`
- `taxonomyRefs`
- `vocabularyRefs`
- `aiGuidance`
