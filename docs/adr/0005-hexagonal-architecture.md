# 0005 Hexagonal Architecture

## Status

Accepted.

## Description

Records USF's decision to adopt a hexagonal (ports-and-adapters) architecture as an explicit, binding architecture constraint for future implementation, and names the port/adapter boundaries and dependency-direction rules the implementation MUST satisfy. It defines requirements only; it creates no implementation code or directories.

## Context

This decision is made under the readiness-acceleration directive recorded in Linear USF-113, with the human decision delegated to the agent for the most complete, ready-to-build foundation.

USF adopts hexagonal architecture as its own binding structural decision. The foundation-completeness audit (`docs/architecture/foundation-completeness-audit.md` section 7.1) records the supporting evidence for this structure — explicit `ports/` and `adapters/` boundaries, usecases depending on ports rather than adapters, dependency-direction enforcement, public-export-only imports, and a contracts/domain/adapter/runtime package split. That evidence is USF-internal historical lineage, not future live authority.

The USF ontology already defines the relevant concepts: Port (section 5.15), Adapter (section 5.16), Interface (section 5.17), Application (section 5.12), Package / Module (section 5.13), and Service (section 5.14). The implementation language and runtime are an **open decision** deferred to a future implementation directive; this ADR carries only the **language-agnostic** ports/adapters architecture as semantic information. No external source code is imported and no external source path is mirrored.

## Decision

USF MUST treat hexagonal architecture as a binding implementation constraint. The future extracted implementation MUST:

- separate a framework-agnostic domain core from inbound and outbound ports;
- implement every external dependency (identity provider, persistence, event bus, secret store, observability, configuration/provider-mode selection) as an adapter behind a port;
- keep the dependency direction acyclic: domain depends on ports; adapters depend on ports and contracts; domain MUST NOT depend on adapters; the UI layer MUST depend only on contract artefacts, never on domain or adapters;
- isolate frameworks at the edges, so no UI framework appears in domain, ports, or adapters and no server runtime is imported into the UI;
- expose modules through public exports only, with no deep imports across package boundaries.

These are requirements on a future implementation. This ADR creates no implementation code, no implementation directory, and no schema activation. Concrete port and adapter semantic instances are authored under USF-97; their enforcement is validator/directive work under USF-98 and USF-100.

## Rationale

Hexagonal structure is the load-bearing property that keeps the foundation testable in isolation, swappable across provider modes (hermetic, composed-local, sandbox, live), and proof-honest. Building the foundation while preserving proof honesty and the hermetic-first ceiling requires these boundaries. The alternative (leaving architecture implicit and inferring it later from generated code) would violate the semantic-first principle and risk drift, so it is rejected.

## Semantic References

- `docs/architecture/foundation-completeness-audit.md`
- `docs/architecture/charter.md`
- `docs/architecture/ontology.md`
- `docs/architecture/target-implementation-topology-plan.md`

## Source References

- `../react/.dependency-cruiser.cjs`
- `../react/docs/v2-foundation/v2-directory-contracts.json`

## Proof References

- None. This ADR records an architecture constraint; runtime proof of boundary enforcement is exercised during and after implementation extraction under USF-99.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- The domain core MUST remain framework-agnostic.
- The dependency direction MUST remain acyclic: domain depends on ports; adapters implement ports; domain MUST NOT import adapters.
- Every external dependency MUST be reached through a port and an adapter, never directly from the domain.
- The UI layer MUST depend only on contract artefacts, never on domain or adapter code.

## Permitted Changes

- Author concrete port and adapter semantic instances under USF-97.
- Add validator or directive checks that enforce ports, adapters, and dependency direction under USF-98 and USF-100.
- Choose specific adapter implementations per provider mode, provided the port contract is preserved.

## Forbidden Drift

- Do not introduce a domain dependency on an adapter or a framework.
- Do not let the UI layer import domain or adapter code.
- Do not infer architecture from generated implementation instead of this decision and the semantic contracts.
- Do not create implementation directories on the basis of this ADR alone; extraction requires a separate implementation directive and a final GO.

## Consequences

- USF-113 has a recorded, binding architecture decision.
- Future port and adapter semantic authoring (USF-97) and boundary enforcement (USF-98) have an accepted constraint to satisfy.
- The implementation directive (USF-100) must cite this ADR as a binding constraint, and extraction (USF-39) must conform to it.

## AI Alignment Rules

- Agents MUST read this ADR before authoring any port, adapter, or implementation-topology artefact.
- Agents MUST NOT weaken the dependency-direction or framework-isolation invariants to make a change pass.
- Agents MUST stop and propose a superseding ADR rather than silently introducing a domain-to-adapter or UI-to-domain dependency.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0005-hexagonal-architecture.json`
