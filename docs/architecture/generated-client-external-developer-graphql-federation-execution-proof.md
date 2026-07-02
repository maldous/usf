# Generated Client External Developer GraphQL Federation Execution Proof

This note summarizes the USF-224 execution proof. The machine-readable authority for this issue is `docs/architecture/generated-client-external-developer-graphql-federation-execution-proof.json`; Linear tracks work only.

## Scope

USF-224 adds a bounded local proof for generated SDK/client, external developer surface, public documentation operation, API-key onboarding/support workflow, GraphQL execution, federation-style stitching, persisted queries, subscriptions, and GraphQL client compatibility.

The proof command is `corepack pnpm proof:api:graphql-generated-client`. The Make target is `make api-graphql-generated-client-proof`.

## SDK Boundary

The proof uses the official GraphQL JavaScript reference implementation, package `graphql` pinned exactly to version `17.0.1`. SDK imports are restricted to `packages/proof/src/graphql-generated-client-execution-proof.ts`; validator rule USF-API-033 fails if the package is unpinned or imported outside the proof boundary.

## Evidence

The proof creates a temporary generated TypeScript client package, compiles it, runs the generated client against a hermetic in-process GraphQL executor, checks resolver authorization and tenant denial, exercises a federation-style gateway field, executes persisted-query and subscription paths, records value-free audit evidence, verifies redaction, and removes temporary artifacts in a finally path.

Enterprise evidence rows are recorded in `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` with SoA-support, evidence-register, threat/abuse-case, SDK governance, access, resilience, incident, and privacy posture rows.

## Deferred Boundaries

USF-224 does not prove public package registry publication, customer distribution, deployed public documentation hosting, live API-key support operation, deployed GraphQL HTTP service, Apollo federation gateway operation, live subscription transport, provider-managed schema registry, environment promotion, or USF-133 closure.

The machine-readable deferred boundaries keep owner, risk owner, control owner, risk treatment, review date, promotion impact, follow-up issue, non-equivalence boundary, and non-claim boundary.

## Non-Claims

This proof does not claim generated SDK readiness, generated client readiness, external developer platform readiness, public API readiness, GraphQL runtime readiness, federation readiness, test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, full dev readiness, full React parity, or USF-133 closure.
