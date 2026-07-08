# Target Implementation Topology Plan

| | |
|---|---|
| **Document type** | Architecture / implementation topology authorization plan |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and future implementation directive |
| **Issue scope** | USF-63 |
| **Primary inputs** | `docs/architecture/directory-and-file-naming-standard.md`, `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `spec/registries/authentication-slice-source-import-manifest.json`, `spec/instances/` |

This plan defines the only implementation-shaped destination directories that a later USF-61 implementation directive may authorise for the authentication proof-substrate slice. It creates no directories, writes no runtime code, imports no source code, emits no evidence, and does not weaken the current implementation-directory stop rules.

## Whole-Platform Reconciliation Note

The whole-platform implementation directive draft at `docs/architecture/implementation-extraction-directive.md` is broader than this topology plan. This plan currently enumerates only the authentication/identity proof-substrate roots below. Every other semantic slice remains under a pre-file slice gate: before files are created, a reviewed topology update must name that slice's roots and exact target files, the source-use disposition matrix must cover those files, and the validator must enforce the added roots. This plan must not be read as authorising broad platform roots by implication.

## USF-39 Post-Start Local Dev/Test Bootstrap Topology

After the separate USF-39 start action recorded for run `20260627T235923Z-f80da39`, this plan also authorises the local dev/test bootstrap topology listed below. This post-start topology is limited to the active bootstrap goal, the signed USF-100 directive, ADR 0009, and the start record in `docs/architecture/bootstrap-start.json`.

The authorised post-start roots are:

- `apps/api/`
- `apps/work/`
- `capabilities/auth/`
- `capabilities/tenant/`
- `capabilities/audit/`
- `capabilities/notify/`
- `capabilities/files/`
- `capabilities/jobs/`
- `capabilities/config/`
- `adapters/db/`
- `adapters/idp/`
- `adapters/store/`
- `adapters/bus/`
- `adapters/wf/`
- `adapters/mail/`
- `adapters/secrets/`
- `adapters/obs/`
- `packages/core/`
- `packages/ports/`
- `packages/contracts/`
- `packages/openapi/`
- `packages/test/`
- `packages/proof/`
- `packages/source/`
- `tests/apps/`
- `tests/capabilities/`
- `tests/adapters/`
- `tests/packages/`

The exact target files and their source-use treatments are named in `docs/architecture/bootstrap-source-use-disposition-matrix.md`. Any implementation file outside those roots or not named in that matrix remains blocked.

This section does not authorise staging, production, live-external-provider, deployment, or production-live readiness. It does not authorise direct source-lineage runtime/application copy, source-lineage path mirroring, generated-report authority, or schema activation.

## USF-1014 App-Surface Package-Boundary Topology

USF-1014 authorises a narrow app-surface workspace/package boundary for UI primitives metadata only. This authorisation is limited to the following root and target file:

- `packages/ui/`
- `packages/ui/package.json`

The source-use treatment for this file is recorded in `docs/architecture/app-surface-source-use-disposition-matrix.md`. The package is private, dependency-free, and contains no runtime implementation.

This section does not authorise `apps/web/`, `apps/mobile/`, `packages/app-surface/`, route scaffolds, screen scaffolds, forms, queries, state/cache runtime, auth/session runtime, i18n runtime, accessibility runtime, notification provider setup, ads/monetisation provider setup, store setup, deployment, staging, live-provider integration, production readiness, compliance readiness, or human-acceptance readiness. Those paths remain blocked until their owning app-surface child issue records exact target files, source-use disposition coverage, validator support, and proof expectations.

## USF-1015 app-surface shared-client consumption path

USF-1015 authorises a narrow dependency-free local shared-client consumption adapter. This authorisation is limited to the following root and target files:

- `packages/client/`
- `packages/client/package.json`
- `packages/client/src/index.ts`
- `docs/architecture/app-surface-shared-client-consumption-path.json`
- `tests/packages/app-surface-shared-client-consumption.test.ts`

The source-use treatment for these files is recorded in `docs/architecture/app-surface-source-use-disposition-matrix.md`. The package is private, dependency-free, and contains only local adapter validation code over repository-owned semantic and generated-client mapping artefacts.

This section does not authorise `apps/web/`, `apps/mobile/`, `packages/app-surface/`, web routes, mobile screens, route scaffolds, forms, query clients, state/cache runtime, auth/session runtime, i18n runtime, accessibility runtime, notification provider setup, ads/monetisation provider setup, store setup, package publication, generated SDK readiness, external provider setup, credentials, deployment, Compose proof, staging, live-provider integration, production readiness, compliance readiness, monetisation readiness, or human-acceptance readiness. Those paths remain blocked until their owning app-surface child issue records exact target files, source-use disposition coverage, validator support, and proof expectations.

## USF-1016 app-surface local in-memory runtime

USF-1016 authorises a narrow dependency-free local in-memory app-surface runtime. This authorisation is limited to the following root and target files:

- `packages/app-surface/`
- `packages/app-surface/package.json`
- `packages/app-surface/src/index.ts`
- `docs/architecture/app-surface-local-in-memory-runtime.json`
- `tests/packages/app-surface-local-in-memory-runtime.test.ts`

The source-use treatment for these files is recorded in `docs/architecture/app-surface-source-use-disposition-matrix.md`. The package is private, dependency-free, and contains only a local in-memory component-fixture validator and runner over repository-owned capability, tenant, permission, command, query, validation, error, and audit semantics.

This section does not authorise `apps/web/`, `apps/mobile/`, web routes, mobile screens, broad route scaffolds, forms, query clients, state/cache runtime, production auth/session runtime, i18n runtime, accessibility runtime, notification provider setup, ads/monetisation provider setup, store setup, package publication, generated SDK readiness, external provider setup, credentials, network calls, deployment, Compose proof, staging, live-provider integration, production readiness, compliance readiness, monetisation readiness, or human-acceptance readiness. Those paths remain blocked until their owning app-surface child issue records exact target files, source-use disposition coverage, validator support, and proof expectations.

## Decision

USF-39 must not create implementation-shaped directories unless USF-61 explicitly cites this plan and the future implementation PR stays within the allowed topology below.

The allowed topology is conditional. A directory listed here is not created or active now; it becomes creatable only when a later explicit implementation directive names the directory, names the files to be created, cites the governing semantic instances, and reconciles every target file to the source-use matrix or to a new-with-rationale entry.

## Allowed Destination Directories

| Directory | Intended responsibility | Semantic authority | Source-disposition evidence |
|---|---|---|---|
| `apps/authentication-api/` | HTTP/API entrypoint and orchestration for the authentication login slice. | `interface.authentication-login-api`, `workflow.authentication-login`, `workflow.authentication-identity-context`, `semantic-contract.authentication-platform` | Source-use rows for authentication server routes and use cases are adapt/rewrite only; direct copy is not authorised. |
| `packages/authentication-domain/` | Domain rules for login, session, authentication settings, state, validation, and error handling. | `semantic-contract.authentication-platform`, `semantic-contract.user-identity-and-tenant-membership`, `semantic-contract.tenant-host-identity-resolution` | Source-use rows for auth/session/usecase files are adapt/rewrite only; evidence-only rows remain non-runtime. |
| `packages/identity-domain/` | Tenant identity, user identity, membership, and host identity abstractions used by authentication. | `semantic-contract.user-identity-and-tenant-membership`, `semantic-contract.tenant-identity-record-and-fqdn`, `semantic-contract.tenant-host-identity-resolution` | Source-use rows for identity repository and identity data lineage are adapt/evidence-only; data migrations remain evidence-only unless later authorised separately. |
| `packages/authorization-policy/` | RBAC and authorization policy decisions needed by the authentication slice. | `semantic-contract.rbac-roles-and-permissions` | Source-use rows for authorization behaviour are adapt only; package names from USF's own source lineage are lineage, not target names. |
| `packages/identity-provider-adapter/` | Provider-mode-aware identity-provider adapter boundary for mock and later external providers. | `provider-mode.mock-identity-provider`, `configuration.provider-mode-selector`, `semantic-contract.authentication-platform` | Source-use rows for provider and OIDC behaviour are adapt/rewrite only; hermetic mock evidence must not become live-provider evidence. |
| `packages/authentication-observability/` | Audit, event, and observability emission contracts for authentication login. | `audit.authentication-login`, `event.authentication-login-audit`, `observability.authentication-login-audit` | Source-use rows for audit and observability files are adapt/evidence-only; generated reports and proof scripts remain evidence only. |
| `config/authentication/` | Declarative configuration shape for authentication provider selection and environment binding. | `configuration.provider-mode-selector`, `environment.hermetic`, `environment.production-shaped`, `provider-mode.mock-identity-provider` | Configuration-file rows in the source-use matrix are evidence-only unless USF-61 marks a target file as new-with-rationale. |

## Naming Rules

Future files and directories under the allowed topology must use clean final-state names, lowercase kebab-case where USF controls the name, and stable semantic purpose rather than lifecycle, source origin, or migration status.

Target paths must not reuse historical source path structure. In particular, these historical path segments do not become target architecture by themselves:

- `apps/platform-api/src/server/`
- `apps/platform-api/src/usecases/`
- `apps/platform-api/src/db/migrations/`
- `packages/adapters-keycloak/`
- `packages/adapters-postgres/`
- `packages/authorisation-runtime/`
- `infra/modules/`

Those paths may be cited only as source evidence or source-use rows.

## Source-Disposition Rules

Every future implementation file under an allowed directory must use one of the target-file treatments defined by `docs/architecture/authentication-slice-source-use-disposition-matrix.md`:

- source-derived-adapt;
- source-derived-rewrite;
- new-with-rationale;
- evidence-only-support.

No target file may be created solely because a recorded source path exists. No target file may directly copy runtime/application code from USF's own source lineage. Evidence-only rows cannot produce runtime code. Generated-report rows cannot produce runtime code or authority. Data-migration rows remain evidence-only unless a later data/migration directive authorises migration artefacts.

## Directories That Remain Blocked

Any implementation-shaped directory not listed in the allowed topology remains blocked for the implementation proof substrate.

Still blocked examples include:

- `apps/platform-api/`
- `packages/adapters-keycloak/`
- `packages/adapters-postgres/`
- `packages/authorisation-runtime/`
- `services/`
- `src/`
- `infra/`
- `scripts/`
- `deploy/`
- `docker/`
- `k8s/`
- `terraform/`

USF-61 must not cite this plan as authority for any unlisted directory. A later directory may be added only by a reviewed topology-plan update or a more specific accepted implementation directive that preserves the Charter and Authority Model.

## USF-61 Citation Requirement

USF-61 can cite this plan as follows:

> USF-63 conditionally authorises only the proof-substrate implementation directories listed in `docs/architecture/target-implementation-topology-plan.md`. The future USF-39 directive must name each target file, keep source-path mirroring forbidden, reconcile every file to the source-use matrix or a new-with-rationale entry, and treat every unlisted implementation-shaped directory as blocked.

## Validation Expectations

Future implementation PRs must run:

- `python3 tools/validate-spec/validate-spec.py all`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`;
- any later USF-60 implementation-artefact validator mode if added before extraction.

The PR validator must fail closed when:

- an added implementation path is outside the allowed topology;
- an added implementation file has no source-disposition or new-with-rationale coverage;
- a target path mirrors a historical source path;
- an evidence-only row is used as runtime code;
- a generated report is treated as authority;
- a provider or environment claim is upgraded by directory naming or target placement.

## Non-Goals

- No implementation directory is created.
- No implementation/runtime code is created or imported.
- No source file from USF's own source lineage is copied.
- No evidence record is created.
- No generated report is created.
- No schema lifecycle is changed.

## Readiness

This plan closes the USF-63 topology-planning boundary only. It does not start USF-39 and does not authorise implementation by itself. USF-39 remains gated by USF-61, current proof/readiness blockers, validator guards, source-use reconciliation, and a separate explicit implementation directive.

## USF-1017 app-surface web bounded local scaffold

USF-1017 authorises the following bounded local web scaffold paths only:

- `apps/web/`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/next-env.d.ts`
- `apps/web/next.config.mjs`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/src/route-registry.ts`
- `docs/architecture/app-surface-web-bounded-local-scaffold.json`
- `tests/apps/app-surface-web-bounded-local-scaffold.test.ts`

The scaffold is a Next.js adapter over governed USF route, capability, permission, tenant, privacy, validation, error, audit, and component-fixture semantics. It does not create provider setup, credentials, CDN configuration, DNS changes, public route proof, deployment, staging proof, production proof, web readiness, live-provider readiness, compliance readiness, monetisation readiness, store readiness, accessibility compliance, internationalisation readiness, SEO readiness, or human acceptance.

USF-1017 authorises exact root package pins for Next.js and React only where required by the bounded local web scaffold. It does not authorise analytics SDKs, ads SDKs, CMP or UMP SDKs, deployment SDKs, provider SDKs, remote cache tooling, task graph tooling, or Testcontainers.

## USF-1018 app-surface mobile bounded local scaffold

USF-1018 authorises the following bounded local mobile scaffold paths only:

- `apps/mobile/`
- `apps/mobile/package.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/app.json`
- `apps/mobile/index.ts`
- `apps/mobile/App.tsx`
- `apps/mobile/src/screen-registry.ts`
- `apps/mobile/src/screen-registry-check.ts`
- `docs/architecture/app-surface-mobile-bounded-local-scaffold.json`
- `tests/apps/app-surface-mobile-bounded-local-scaffold.test.ts`

The scaffold is an Expo managed adapter over governed USF screen, capability, permission, tenant, privacy, validation, error, audit, and component-fixture semantics. It consumes the package pins recorded by USF-1019 and does not add package dependencies itself.

USF-1018 does not authorise EAS credentials, native signing credentials, native project generation, App Store setup, Play Store setup, store submission, live push provider setup, provider setup, credentials, deployment, staging proof, production proof, Expo readiness, mobile readiness, native readiness, store readiness, live-provider readiness, compliance readiness, monetisation readiness, accessibility compliance, internationalisation readiness, or human acceptance.

USF-1018 adds a bounded local Expo scaffold only. This is the bounded local mobile scaffold authority marker for implementation topology and source-use validators. It does not change the status of route, command/form, query/list/detail, state/cache, auth/session, i18n, accessibility, notifications, ads, store metadata, deployment evidence, Compose, staging, or parent closure work.

## USF-1020 app-surface route and capability implementation

USF-1020 authorises the following bounded local route-capability implementation paths only:

- `docs/architecture/app-surface-route-capability-implementation.json`
- `tests/apps/app-surface-route-capability-implementation.test.ts`
- `tools/validate-app-surface/validate-app-surface.py`

The route-capability implementation consolidates the existing bounded local web route registry and mobile screen registry from USF-1017 and USF-1018. It proves that the implemented targets map to governed capability ownership, permission references, tenant boundaries, proof references, and fail-closed unknown-target behaviour.

USF-1020 does not add package dependencies, create new external provider integrations, introduce credentials, configure deployment, run staging proof, expose public routes, or claim product UI readiness, web readiness, mobile readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, store readiness, compliance readiness, monetisation readiness, or human acceptance.

## USF-1021 app-surface command and form implementation

USF-1021 authorises the following bounded local command/form implementation paths only:

- `packages/app-surface/src/index.ts`
- `docs/architecture/app-surface-command-form-implementation.json`
- `tests/packages/app-surface-command-form-implementation.test.ts`
- `tools/validate-app-surface/validate-app-surface.py`

The command/form implementation maps the local API-key onboarding command form to governed command, validation, permission, error, audit, idempotency, tenant, component-fixture, semantic-source, and proof references. Unknown command forms must fail closed, UI-only business rules are not authorised, and the validator must guard the real repository artefact.

USF-1021 does not add package dependencies, create server mutation providers, submit forms to external services, introduce credentials, configure deployment, run staging proof, execute production commands, or claim product UI readiness, command execution readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, store readiness, compliance readiness, monetisation readiness, or human acceptance.

## USF-1022 app-surface query list and detail implementation

USF-1022 authorises the following bounded local query list/detail implementation paths only:

- `packages/app-surface/src/index.ts`
- `docs/architecture/app-surface-query-list-detail-implementation.json`
- `tests/packages/app-surface-query-list-detail-implementation.test.ts`
- `tools/validate-app-surface/validate-app-surface.py`

The query list/detail implementation maps local developer-profile list and detail query views to governed query, capability, permission, cache freshness, cache policy, privacy classification, tenant, component-fixture, i18n, accessibility, telemetry, proof, and fail-closed references. Unknown query views must fail closed, missing query/cache/privacy authority is not authorised, and the validator must guard the real repository artefact.

USF-1022 does not add package dependencies, create server-state providers, create persistent sensitive storage, introduce credentials, configure deployment, run staging proof, implement live provider queries, or claim product UI readiness, query client readiness, cache readiness, sync readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, store readiness, compliance readiness, monetisation readiness, or human acceptance.

## USF-1023 app-surface state cache and query client setup

The bounded local state/cache/query-client implementation is authorised only for these repository paths:

- `packages/app-surface/src/index.ts`
- `docs/architecture/app-surface-state-cache-query-client-implementation.json`
- `tests/packages/app-surface-state-cache-query-client-implementation.test.ts`
- `tools/validate-app-surface/validate-app-surface.py`

The implementation may create in-memory local state/cache/query-client registry code and tests over existing generated-client and query-view semantics. It must not install packages, adopt a query library, create persistent sensitive storage, create external state services, add credentials, configure deployment, run staging, or claim cache/query-library/sync/offline/provider/staging/production/live-provider/compliance/human-acceptance readiness.

## USF-1024 app-surface auth session dev identity implementation

The bounded local auth/session/dev identity implementation is authorised only for these repository paths:

- `packages/app-surface/src/index.ts`
- `docs/architecture/app-surface-auth-session-dev-identity-implementation.json`
- `tests/packages/app-surface-auth-session-dev-identity-implementation.test.ts`
- `tools/validate-app-surface/validate-app-surface.py`

The implementation may create local in-memory dev identity, tenant, role, permission, and session-context registry code and tests over existing semantic app-surface mappings. It must not install packages, configure production identity providers, create live OAuth or OIDC credentials, configure Keycloak, create secure-storage claims, add external auth services, configure deployment, run staging, or claim auth/provider/credential/staging/production/live-provider/compliance/human-acceptance readiness.

## USF-1025 app-surface i18n baseline implementation

USF-1025 authorises the following bounded local i18n baseline implementation paths only:

- `packages/app-surface/src/index.ts`
- `apps/web/app/page.tsx`
- `apps/mobile/App.tsx`
- `docs/architecture/app-surface-i18n-baseline-implementation.json`
- `tests/packages/app-surface-i18n-baseline-implementation.test.ts`

The implementation may create local translation catalogue and missing-translation fail-closed mappings over existing route, screen, command, query, and USF-937 fixture semantics. It must not install packages, create localisation provider setup, configure deployment, run staging, or claim localisation, internationalisation, store, production, provider, compliance, or human-acceptance readiness.

## USF-1026 app-surface accessibility baseline implementation

USF-1026 authorises the following bounded local accessibility baseline implementation paths only:

- `packages/app-surface/src/index.ts`
- `apps/web/app/page.tsx`
- `apps/mobile/App.tsx`
- `docs/architecture/app-surface-accessibility-baseline-implementation.json`
- `tests/packages/app-surface-accessibility-baseline-implementation.test.ts`

The implementation may create local accessibility metadata and fail-closed lookup mappings over existing route, screen, command, query, i18n, and USF-938 fixture semantics. It must not install packages, create external audit tooling, run device-lab proof, configure deployment, run staging, or claim accessibility compliance, certification, production, provider, or human-acceptance readiness.

## USF-1027 app-surface notification consent and permission surface

USF-1027 authorises the following bounded local notification consent and permission paths only:

- `packages/app-surface/src/index.ts`
- `docs/architecture/app-surface-notification-consent-permission-surface.json`
- `tests/packages/app-surface-notification-consent-permission-surface.test.ts`

The implementation may create local in-app notification consent and permission mappings over existing notification, consent, privacy, i18n, accessibility, and USF-933 fixture semantics. It must not install packages, create push provider setup, create mobile push credentials, create service-worker push setup, configure deployment, run staging, or claim notification, push, privacy-compliance, production, provider, store, or human-acceptance readiness.

## USF-1028 through USF-1030 local negative and fixture-only surfaces

USF-1028 through USF-1030 authorise the following bounded local negative/fixture-only paths only:

- `docs/architecture/app-surface-ads-monetisation-placeholder-surface.json`
- `docs/architecture/app-surface-store-metadata-semantic-surface.json`
- `docs/architecture/app-surface-deployment-evidence-pinning-surface.json`
- `tests/packages/app-surface-local-negative-surfaces.test.ts`
- `tools/validate-app-surface/validate-app-surface.py`

USF-1028 records a no-live ads and monetisation placeholder boundary over existing USF-934 fixture semantics. USF-1029 records local store metadata mismatch detection over existing USF-935 fixture semantics. USF-1030 records local deployment evidence pinning over existing USF-940 fixture semantics.

This batch must not install packages, create runtime provider code, create credentials, integrate ad SDKs, configure CMP or UMP, configure App Store or Play Store records, submit store metadata, deploy anything, create staging proof, configure CDN or provider setup, create production evidence, or claim ads, monetisation, store, deployment, staging, production, provider, compliance, or human-acceptance readiness.
