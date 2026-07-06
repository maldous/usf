# Notifications Messaging Source-Use Disposition Matrix

|                     |                                                                                  |
| ------------------- | -------------------------------------------------------------------------------- |
| Document type       | Architecture / source-use disposition matrix                                     |
| Status              | Draft / USF-152 implementation evidence and USF-153 proof-depth evidence          |
| Authority level     | Reviewable source-use matrix; subordinate to Charter, Authority Model, ADRs, validators, and proof evidence |
| Issue scope         | USF-152, child of USF-133                                                        |
| Source lineage      | USF is self-defined; source paths are held in USF's own source-import registry (rank-5 source lineage), not an external authority |

This matrix records the treatment of files touched for the notifications/messaging domain. USF authors its own runtime; no external runtime/application code is copied and no external source path is mirrored. No live external delivery provider readiness is claimed. No staging, production, deployment, live email, live SMS, live push, live webhook, live SMTP, deliverability certification, ISO certification, legal compliance certification, or production-live readiness is claimed.

## Runtime And Capability Files

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `packages/core/src/index.ts` | source-derived-rewrite | React notification, transport, preference, webhook delivery, email sender, and audit lineage; USF follow-up enterprise controls | Fresh USF notification classifications, channels, delivery statuses, templates, recipients, consent, suppression, provider config, delivery evidence, audit events, and redaction helpers. |
| `packages/ports/src/index.ts` | source-derived-rewrite | React notification transport and email/webhook port lineage | Fresh `NotificationProvider` port with value-free send result and secret-ref-only provider config boundary. |
| `capabilities/notify/src/index.ts` | source-derived-rewrite | React notification dispatch, preferences, suppression, audit, and transport behavior | Fresh tenant-scoped notification service with PDP, audit, safe rendering, job enqueue, idempotency, suppression, consent, delivery evidence, and exported USF-153 enterprise depth controls. |
| `capabilities/notify/src/enterprise-messaging-controls.ts` | new-with-rationale | React notification feedback, unsubscribe, bulk, retention, outbox, and deliverability-control lineage | Fresh provider-agnostic bounded local control plane for USF-153. Proves persistence/outbox, provider feedback, unsubscribe, retention purge, legal hold denial, bulk controls, rate-limit, address verification, and provider circuit posture without live provider readiness. |
| `adapters/mail/src/index.ts` | source-derived-rewrite | React local/in-memory notification transport and email-runtime lineage | Fresh in-memory notification provider that captures hashes/metadata only and makes no live provider claim. |
| `capabilities/tenant/src/authorization-policy.ts` | source-derived-rewrite | React operator/self-service notification permission lineage; USF PDP policy | Adds explicit notification permissions and actions to the default-deny PDP. |
| `capabilities/config/src/registry.ts` | source-derived-rewrite | React notification config lineage; PR #95 config/secrets substrate | Adds notification provider mode and notification credential-ref config keys using secret-reference semantics. |

## Tests, Proofs, Validators, And Commands

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `tests/capabilities/notifications-messaging.test.ts` | source-derived-rewrite | React notification unit tests, email sender tests, webhook tests, transport tests, and UI tests treated as foundation behaviour evidence | Rewrites behaviours as foundation capability tests; no UI/Playwright/E2E is added. |
| `packages/proof/src/notifications-messaging-proof.ts` | source-derived-rewrite | React notification runtime proof lineage plus USF-153 enterprise depth requirement | Fresh hermetic `notify-proof` for USF notification behaviour, enterprise messaging depth, and no-live-provider boundary. |
| `packages/proof/src/index.ts` | new-with-rationale | Proof package export surface | Exports the notification proof function. |
| `package.json` | new-with-rationale | Existing proof/verify command pattern | Adds `proof:notify` and includes it in verify. |
| `Makefile` | new-with-rationale | Existing make proof target pattern | Adds `make notify-proof`. |
| `tools/validate-parity/validate-notify.py` | source-derived-rewrite | Existing parity validator patterns and notification validator expectations | Adds robust notification parity checks and selftest harness. |
| `tools/validate-parity/notify-planted-defects/*.json` | evidence-only-support | Validator planted-defect pattern | Proves high-risk notification validator rules fire. |

## Architecture And Matrix Files

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `docs/architecture/notifications-and-messaging-standard.md` | source-derived-rewrite | React notification semantic contract plus enterprise notification control follow-up | Defines the USF controlled-communication standard for this parity slice. |
| `docs/architecture/notifications-messaging-enterprise-proof-depth-matrix.json` | evidence-only-support | USF-153 enterprise proof-depth requirement | Records machine-checkable bounded-local proof, explicit non-equivalence boundaries, deferred live-provider/API/UI boundaries, enterprise evidence refs, validator refs, and non-claims. |
| `docs/architecture/notifications-messaging-source-use-disposition-matrix.md` | evidence-only-support | USF source-use policy | Records lineage/disposition for this domain. |
| `docs/architecture/bootstrap-source-use-disposition-matrix.md` | evidence-only-support | Existing bootstrap source-use matrix | Updates prior thin notify/mail rows and adds new proof/validator/test/doc rows. |
| `docs/architecture/functional-scope-classification-matrix.json` | evidence-only-support | Existing parity matrix | Marks the notifications domain authorised under USF-152 and backs it with tests/proofs; item rows classify domain subareas. |
| `docs/architecture/functional-scope-classification-matrix.md` | evidence-only-support | Human-readable parity matrix | Mirrors the JSON status truthfully. |

## Historical React Behaviour Disposition

| React behaviour group | Disposition | USF target |
| --------------------- | ----------- | ---------- |
| Notification intent/log/status | rewrite-from-behaviour | `NotificationIntent`, `NotificationDeliveryEvidence`, capability tests, notify proof |
| Email/webhook/in-app channel lineage | rewrite-from-behaviour | channel governance model; in-memory/test provider only |
| Recipient resolver and missing destination fail-closed | rewrite-from-behaviour | recipient identity/address_ref safety and verification policy |
| Preferences and disabled-channel suppression | rewrite-from-behaviour | preference, consent, unsubscribe, and suppression model |
| Notification config and tenant email sender config | rewrite-from-behaviour | provider config with secret references and no raw credential exposure |
| Webhook worker retry/dead-letter/idempotency | rewrite-from-behaviour | operational notification.delivery jobs, idempotency, retry, and evidence |
| Notification audit and redaction | rewrite-from-behaviour | notification lifecycle audit events and value-free evidence |
| Admin email/webhook UI tests | foundation-behaviour-rewritten-from-ui-test | capability tests only; UI remains out of scope |
| Templates and base consent/suppression | rewrite-from-behaviour | controlled template, consent, suppression, and safe render model |
| Bounce, complaint, and unsubscribe ingestion | bounded-local-proof | USF-153 enterprise control plane and notify proof; live provider callback/replay remains deferred |
| Bulk, rate limit, retention purge, and legal hold | bounded-local-proof | USF-153 enterprise control plane and notify proof; distributed guardrails, DSR/export/delete, and production retention remain deferred |
| Deliverability and live providers | deferred-with-owner | posture defined; no live provider, deliverability, carrier/provider certification, or production messaging readiness claim |

## Boundary Confirmation

USF authors its own runtime; no external runtime/application code is copied and no target path mirrors a historical external source path. Runtime files are source-derived rewrites or new-with-rationale. Generated reports are not treated as canonical. No live external delivery provider readiness is claimed.
