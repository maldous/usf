# Universal Service Foundation

Universal Service Foundation (USF) is a governed enterprise platform foundation for building, proving, and evolving service-heavy software without letting architecture drift into guesswork.

USF is built around a simple premise: serious platforms should be defined by durable semantics, enforced by validators, supported by evidence, and implemented behind contracts. Source code matters, but it does not get to invent product truth by accident.

## Why USF Exists

Enterprise software teams repeatedly pay for the same foundation: identity, tenant isolation, authorization, audit, configuration, files, workflows, notifications, search, observability, operational proof, provider adapters, and environment policy.

Most platforms assemble those pieces as code first and governance later. That creates a fragile operating model: tests become partial folklore, documentation trails implementation, AI tools copy patterns without understanding authority, and production readiness becomes a mixture of green checks and hope.

USF takes the opposite position.

The foundation is semantic-first. Capabilities, contracts, provider modes, environments, commands, evidence, and decision records are treated as governed assets. Implementation follows those assets. Validators enforce consistency. Proof evidence records what was actually exercised.

## Product Differentiators

### Semantic-First Platform Governance

USF treats platform meaning as a first-class product surface. Capabilities, interfaces, events, workflows, provider modes, environments, commands, configuration, audit, and observability are defined before they are relied on.

This gives teams a stable source of truth for what the platform is supposed to do, not merely a snapshot of what the current code happens to do.

### Evidence-Backed Readiness

USF separates claims from evidence. A proof records the provider mode, environment, observed level, emitted evidence, collected evidence, and freshness assumptions behind a claim.

That distinction matters. A hermetic proof is valuable, but it is not live-provider evidence. A production-shaped environment is useful, but it is not the same as production-live operation. A generated report is helpful, but it never outranks the artefacts it summarizes.

### AI-Safe by Design

USF is designed for a world where AI agents participate in implementation, review, migration, and operations.

The repository gives agents explicit authority order, source-lineage rules, naming constraints, schema rules, validation expectations, and stop conditions. Agents are guided toward semantic contracts and away from implementation resemblance, stale reports, or undocumented source copying.

That makes AI assistance more bounded, auditable, and useful.

### Provider-Portable Architecture

USF distinguishes provider contracts from provider implementations. Ports, adapters, provider modes, and environments are modelled separately, so a capability can be proven on hermetic or composed-local substrates while preserving the boundary required for external-provider readiness.

This makes the foundation adaptable without weakening internal proof.

### Validator-Enforced Drift Control

USF uses validators as enforcement, not decoration. The validator layer is responsible for checking schema validity, reference resolution, vocabulary usage, source disposition, provider-mode honesty, environment honesty, evidence completeness, and readiness overclaiming.

The goal is not just to document architecture. The goal is to make drift detectable.

### Source-Aware Without Being Source-Subordinate

USF carries forward hard-won operational and semantic knowledge from its historical source evidence, but the historical repository is not the future authority.

Source lineage is preserved through references and dispositions. Behaviour is promoted into USF through semantic contracts, decisions, validators, and proof expectations rather than blind copying.

## Strengths

- **Governed by authority order:** semantics, ADRs, validators, proof evidence, source implementation, historical evidence, and generated reports each have a defined role.
- **Built for enterprise foundations:** tenant isolation, authorization, audit, configuration, workflows, provider adapters, observability, evidence, and operational commands are treated as platform concerns.
- **Designed for repeatable proof:** internal correctness is not dependent on live external providers.
- **Hard to copy casually:** the value is not only the code, but the coupled semantic corpus, authority model, validators, evidence posture, and AI operating rules.
- **Built for disciplined extraction and evolution:** implementation can change behind preserved contracts, while semantics, ADRs, validators, and proof expectations keep the platform coherent.

## What Makes USF Unique

USF is not another application scaffold, service template, or framework wrapper.

It is a governed platform foundation where product semantics, implementation boundaries, proof posture, source lineage, and AI-agent behaviour are all part of the architecture.

That combination creates a different kind of asset:

- a foundation that can be reasoned about before reading code;
- a platform whose readiness claims can be checked instead of trusted;
- a system where AI-generated changes are constrained by authority rather than style imitation;
- a migration target that preserves source knowledge without inheriting historical structure;
- an enterprise substrate that can evolve providers, services, and UI without losing behavioural intent.

## Market Position

USF sits at the intersection of enterprise platform engineering, internal developer platforms, regulated software delivery, and AI-assisted engineering governance.

It is especially relevant for organizations that need:

- durable service foundations rather than one-off applications;
- auditable claims about readiness and operational behaviour;
- provider flexibility without provider-mode confusion;
- strong tenancy, authorization, audit, and evidence discipline;
- AI-assisted delivery that remains bounded by explicit rules;
- a clean target architecture derived from proven source evidence.

## Repository Orientation

The repository is organized around governed artefact classes:

- `docs/architecture/` contains the constitutional and architecture governance documents.
- `docs/adr/` contains normative architectural decision records.
- `spec/` contains machine-readable semantic artefacts, schemas, registries, taxonomies, vocabularies, and instances.
- `tools/` contains validators, generators, and supporting enforcement tools.
- `evidence/` contains proof, runtime, validation, import, and generated evidence artefacts.
- `apps/`, `capabilities/`, `adapters/`, and `packages/` contain the extracted implementation surface.

## Operating Principle

USF makes one bet: the future of serious software is not just faster generation. It is governed generation.

The winning foundation is the one that can tell people and machines what is true, why it is true, what proves it, what is allowed to change, and what must stop when the evidence is not enough.

USF is built for that future.
