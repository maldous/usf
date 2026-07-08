# App-Surface Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Architecture / source-use disposition matrix |
| **Status** | Draft / USF-1021 bounded command/form coverage |
| **Authority level** | Reviewable source-use matrix; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the app-surface implementation realisation plan |
| **Issue scope** | USF-1014, USF-1015, USF-1016, USF-1017, USF-1018, USF-1020, USF-1021 |
| **Source row basis** | `docs/architecture/app-surface-implementation-realisation-plan.json`, `docs/architecture/app-surface-workspace-package-boundaries.json`, `docs/architecture/target-implementation-topology-plan.md` |

This matrix records target-file treatment for bounded app-surface workspace/package boundary work, the USF-1015 local shared-client consumption path, the USF-1016 local in-memory app-surface runtime, the USF-1017 bounded local web scaffold, the USF-1018 bounded local mobile scaffold, the USF-1020 route-capability implementation, and the USF-1021 bounded local command/form implementation. It does not authorise external provider setup, deployment, staging, store setup, live-provider integration, production readiness, monetisation readiness, package publication readiness, generated SDK readiness, or direct runtime/application code import from source lineage.

## Treatment Rules

- `source-derived-adapt`: freshly authored implementation informed by cited historical behaviour or provider inventory. No source code or configuration is copied.
- `source-derived-rewrite`: freshly authored implementation that rewrites semantic intent from lineage. No source code or configuration is copied.
- `new-with-rationale`: freshly authored file required by USF app-surface local package-boundary work, with no direct source row driving implementation.
- `evidence-only-support`: non-runtime validation, proof, test, documentation, or configuration support. It cannot import runtime code from evidence-only rows.

## App-Surface Package-Boundary and Runtime Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `packages/ui/package.json` | new-with-rationale | USF-1014 workspace/package boundary acceptance criteria and `docs/architecture/app-surface-workspace-package-boundaries.json` | Defines a dependency-free private workspace boundary for future app-surface UI primitives without runtime implementation, external packages, global install state, provider setup, deployment, staging, store setup, or production readiness claims. |
| `packages/client/package.json` | new-with-rationale | USF-1015 shared-client consumption acceptance criteria and `docs/architecture/app-surface-shared-client-consumption-path.json` | Defines a dependency-free private workspace boundary for the bounded local shared-client consumption adapter without package publication, external packages, global install state, provider setup, deployment, staging, store setup, or production readiness claims. |
| `packages/client/src/index.ts` | new-with-rationale | USF-1015 shared-client consumption acceptance criteria, `docs/adr/0018-shared-client-sdk-adapter-strategy.md`, `docs/architecture/shared-client-sdk-semantic-surface.json`, `docs/architecture/shared-client-interaction-contract-semantics.json`, and `docs/architecture/generated-client-contract-validation-semantics.json` | Implements a local fail-closed adapter validator over repository-owned shared-client mappings. It rejects stale generated-client inputs, missing semantic inputs, missing permission or audit semantics, and UI-only invented behaviour. It imports no external provider, creates no credentials, performs no network call, publishes no SDK, and claims no generated-client readiness. |
| `tests/packages/app-surface-shared-client-consumption.test.ts` | new-with-rationale | USF-1015 Test contract proof requirements and `docs/architecture/app-surface-shared-client-consumption-path.json` | Provides local contract tests proving the shared-client consumption mapping passes when governed and fails closed for stale generated-client input, missing semantic input, missing permission or audit semantics, and UI-only invented behaviour. |
| `packages/app-surface/package.json` | new-with-rationale | USF-1016 local in-memory runtime acceptance criteria and `docs/architecture/app-surface-local-in-memory-runtime.json` | Defines a dependency-free private workspace package for bounded local app-surface runtime proof without external packages, provider setup, credentials, deployment, staging, or production readiness claims. |
| `packages/app-surface/src/index.ts` | new-with-rationale | USF-1016 local in-memory runtime acceptance criteria, `docs/architecture/app-surface-local-in-memory-runtime.json`, and `docs/architecture/app-surface-shared-client-consumption-path.json` | Implements a local in-memory component-fixture runtime validator and runner. It fails closed on missing capability or permission semantics, rejects external provider or credential-shaped configuration, performs no network calls, and claims no web, mobile, staging, deployment, production, or live-provider readiness. |
| `tests/packages/app-surface-local-in-memory-runtime.test.ts` | new-with-rationale | USF-1016 Dev local runtime proof requirements and `docs/architecture/app-surface-local-in-memory-runtime.json` | Provides local unit tests proving governed component fixtures exercise in memory only, missing capability or permission semantics fail closed, external provider configuration is rejected, and non-claims are preserved. |

## App-Surface Authority and Validator Support Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `docs/architecture/app-surface-workspace-package-boundaries.json` | evidence-only-support | USF-1014 package-boundary acceptance criteria | Machine-readable repository artefact classifying app-surface package boundaries, owner issues, package/dependency policy, external-service restrictions, proof level, and future-to-create paths. |
| `docs/architecture/app-surface-shared-client-consumption-path.json` | evidence-only-support | USF-1015 shared-client consumption acceptance criteria | Machine-readable repository artefact mapping the bounded local shared-client adapter to semantic contracts, generated-client currentness, capability, command, query, validation, permission, audit, privacy, telemetry, proof references, fail-closed behaviour, and non-claims. |
| `docs/architecture/app-surface-local-in-memory-runtime.json` | evidence-only-support | USF-1016 local in-memory runtime acceptance criteria | Machine-readable repository artefact mapping local component fixtures to capability, tenant, permission, command, query, validation, error, and audit semantics, with explicit in-memory adapter boundaries and non-claims. |
| `docs/architecture/app-surface-source-use-disposition-matrix.md` | evidence-only-support | USF-1014 package-boundary acceptance criteria | Records source-use disposition coverage for app-surface package-boundary files. |
| `docs/architecture/target-implementation-topology-plan.md` | evidence-only-support | USF implementation topology guardrail | Adds narrow app-surface topology authority for `packages/ui/package.json`, the USF-1015 local shared-client consumption files, and the USF-1016 local in-memory runtime files only; later app/runtime paths remain blocked until their owner issues update topology and source-use coverage. |
| `tools/validate-parity/validate-observability.py` | evidence-only-support | USF-225 browser telemetry guardrail and USF-1014 app-surface package-boundary authority | Preserves the product UI/browser path prohibition while allowing only the dependency-free `packages/ui/package.json` metadata boundary authorised by USF-1014. |
| `tools/validate-spec/validate-spec.py` | evidence-only-support | USF implementation path validator | Extends validator-enforced authorised implementation roots to include only the `packages/ui` app-surface boundary authorised by USF-1014, the `packages/client` shared-client adapter boundary authorised by USF-1015, and the `packages/app-surface` local in-memory runtime boundary authorised by USF-1016. |

## Non-Claims Preserved

- Only the USF-1016 dependency-free local in-memory app-surface runtime is authorised by this matrix.
- Only the USF-1017 bounded local web scaffold is authorised for `apps/web`.
- Only the USF-1018 bounded local mobile scaffold is authorised for `apps/mobile`.
- No external provider, credential, deployment, staging, store, live push, ads, CMP, analytics, monetisation, production, compliance, or human-acceptance readiness is claimed.
- `apps/web` and `apps/mobile` exist only as bounded local scaffolds owned by their separate Linear issues and do not authorise broader route, command, query, state, auth, i18n, accessibility, notification, monetisation, store, deployment, Compose, staging, production, provider, compliance, or human-acceptance readiness.
- `packages/client` exists only as the USF-1015 bounded local shared-client consumption adapter and does not create generated SDK readiness, package publication readiness, product UI readiness, public API readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, compliance readiness, monetisation readiness, or human acceptance.
- `packages/app-surface` exists only as the USF-1016 bounded local in-memory runtime and does not create web readiness, mobile readiness, route scaffold readiness, product UI readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, compliance readiness, monetisation readiness, or human acceptance.

## USF-1017 web bounded local scaffold source-use disposition

| Path | Status | Disposition | Non-claim boundary |
| --- | --- | --- | --- |
| `apps/web/package.json` | USF-authored | Bounded local web workspace package manifest for USF-1017. External dependencies remain pinned at the root package manifest. | Does not claim web readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, or human acceptance. |
| `apps/web/tsconfig.json` | USF-authored | Local typecheck configuration for the bounded Next.js scaffold. | Does not claim full browser, accessibility, internationalisation, SEO, provider, deployment, or production proof. |
| `apps/web/next-env.d.ts` | USF-authored | Next.js local TypeScript ambient reference for the bounded scaffold. | Does not define product semantics or deployment readiness. |
| `apps/web/next.config.mjs` | USF-authored | Empty provider-neutral Next.js config for local scaffold execution. | Does not configure provider, CDN, DNS, redirects, headers, deployment, staging, or production. |
| `apps/web/app/layout.tsx` | USF-authored | Minimal local App Router layout for bounded scaffold proof. | Does not define product semantics from framework shape. |
| `apps/web/app/page.tsx` | USF-authored | Minimal local route component consuming the governed route registry. | Does not invent UI-only product behaviour. |
| `apps/web/src/route-registry.ts` | USF-authored | Route-to-capability and permission mapping plus fail-closed validator for USF-1017. | Does not claim public route, provider, deployment, staging, production, or human-acceptance readiness. |
| `docs/architecture/app-surface-web-bounded-local-scaffold.json` | USF-authored | Repository-owned web scaffold authority map, package pins, route mapping, validation guard, proof ladder, and non-claims. | Does not select a provider or claim readiness beyond dev-local route proof. |
| `tests/apps/app-surface-web-bounded-local-scaffold.test.ts` | USF-authored | Unit tests for web posture verification, route authority mapping, unknown-route fail-closed behavior, and non-claim preservation. | Does not require external providers, credentials, Compose, staging, deployment, or human acceptance. |

USF-1017 adds a bounded local Next.js scaffold only. This is the bounded local web scaffold authority marker for the parity and observability validators. It does not change the status of mobile, command/form, query/list/detail, state/cache, auth/session, i18n, accessibility, notifications, ads, store metadata, deployment evidence, Compose, staging, or parent closure work.

## USF-1018 mobile bounded local scaffold source-use disposition

| Path | Status | Disposition | Non-claim boundary |
| --- | --- | --- | --- |
| `apps/mobile/package.json` | USF-authored | Bounded local Expo workspace package manifest for USF-1018. External dependencies remain pinned at the root package manifest by USF-1019. | Does not claim Expo readiness, mobile readiness, native readiness, store readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, or human acceptance. |
| `apps/mobile/tsconfig.json` | USF-authored | Local typecheck configuration for the bounded Expo scaffold. | Does not claim full native, accessibility, internationalisation, provider, deployment, store, or production proof. |
| `apps/mobile/app.json` | USF-authored | Provider-neutral Expo local configuration for the bounded scaffold. | Does not configure EAS, native signing, providers, credentials, store submission, deployment, staging, or production. |
| `apps/mobile/index.ts` | USF-authored | Local Expo entry point for bounded scaffold proof. | Does not define product semantics, provider behaviour, store readiness, or deployment readiness. |
| `apps/mobile/App.tsx` | USF-authored | Minimal local React Native component consuming the governed mobile screen registry. | Does not invent UI-only product behaviour or claim mobile readiness. |
| `apps/mobile/src/screen-registry.ts` | USF-authored | Screen-to-capability and permission mapping plus fail-closed validator for USF-1018. | Does not claim native, store, provider, deployment, staging, production, or human-acceptance readiness. |
| `apps/mobile/src/screen-registry-check.ts` | USF-authored | Node-only local checker that loads repository authority and validates the mobile screen registry. | Does not run in mobile production, use external services, create credentials, or claim readiness. |
| `docs/architecture/app-surface-mobile-bounded-local-scaffold.json` | USF-authored | Repository-owned mobile scaffold authority map, package authority reference, screen mapping, validation guard, proof ladder, and non-claims. | Does not select a provider or claim readiness beyond dev-local screen proof. |
| `tests/apps/app-surface-mobile-bounded-local-scaffold.test.ts` | USF-authored | Unit tests for mobile posture verification, screen authority mapping, unknown-screen fail-closed behaviour, and non-claim preservation. | Does not require external providers, credentials, Compose, staging, deployment, stores, native signing, EAS, or human acceptance. |

USF-1018 adds a bounded local Expo scaffold only. This is the bounded local mobile scaffold authority marker for implementation topology and source-use validators. It does not change the status of route, command/form, query/list/detail, state/cache, auth/session, i18n, accessibility, notifications, ads, store metadata, deployment evidence, Compose, staging, or parent closure work.

## USF-1020 route and capability implementation source-use disposition

| Path | Status | Disposition | Non-claim boundary |
| --- | --- | --- | --- |
| `docs/architecture/app-surface-route-capability-implementation.json` | USF-authored | Repository-owned route and screen capability implementation map for the bounded local web and mobile targets. | Does not claim product UI, web, mobile, deployment, staging, production, live-provider, store, compliance, monetisation, or human-acceptance readiness. |
| `tests/apps/app-surface-route-capability-implementation.test.ts` | USF-authored | Cross-surface test proving implemented route and screen mappings carry capability, permission, tenant, proof, unknown-target fail-closed, USF-930-style, and non-claim guards. | Does not require external providers, credentials, Compose, staging, deployment, stores, native signing, EAS, or human acceptance. |
| `tools/validate-app-surface/validate-app-surface.py` | USF-authored | Adds a real implementation guard for the USF-1020 route-capability artefact while preserving the existing synthetic fixture suite. | Does not infer product behaviour from framework files or upgrade validator success into readiness. |

USF-1020 consolidates the currently implemented bounded local web route and mobile screen mappings. It does not implement command/form, query/list/detail, state/cache, auth/session, i18n, accessibility, notifications, ads, store metadata, deployment evidence, Compose, staging, deployment, provider setup, or parent closure work.

## USF-1021 command and form implementation source-use disposition

| Path | Status | Disposition | Non-claim boundary |
| --- | --- | --- | --- |
| `packages/app-surface/src/index.ts` | USF-authored | Extends the existing dependency-free local app-surface package with a command/form registry validator and local exercise helper over governed command, validation, permission, error, audit, idempotency, tenant, component-fixture, and proof references. | Does not create a server mutation provider, external form submission, network call, credential use, production command execution, deployment, staging, live-provider readiness, compliance readiness, or human acceptance. |
| `docs/architecture/app-surface-command-form-implementation.json` | USF-authored | Repository-owned command/form implementation map for the bounded local API-key onboarding command form. | Does not claim command execution readiness beyond local mapping proof and does not authorise query/list/detail, state/cache, provider setup, deployment, staging, production, compliance, or human acceptance. |
| `tests/packages/app-surface-command-form-implementation.test.ts` | USF-authored | Unit and contract-style tests proving command/form mappings pass when governed and fail closed for missing command authority, missing validation/audit mappings, UI-only business rules, unknown forms, missing proof refs, and non-claim drift. | Does not require external providers, credentials, Compose, staging, deployment, stores, native signing, EAS, or human acceptance. |
| `tools/validate-app-surface/validate-app-surface.py` | USF-authored | Adds a real implementation guard for the USF-1021 command/form artefact while preserving the existing synthetic fixture suite and USF-1020 route-capability guard. | Does not infer product behaviour from package files or upgrade validator success into provider, deployment, staging, production, compliance, monetisation, or human-acceptance readiness. |

USF-1021 implements a bounded local command/form mapping only. It does not implement query/list/detail, state/cache/query client, auth/session, i18n, accessibility, notifications, ads, store metadata, deployment evidence, Compose, staging, deployment, provider setup, or parent closure work.
