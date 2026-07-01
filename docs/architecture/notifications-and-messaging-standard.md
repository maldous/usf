# Notifications And Messaging Standard

|                       |                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------- |
| Document type         | Architecture / controlled-communication standard                                      |
| Status                | Draft / parity-notifications-messaging implementation and USF-153 proof-depth authority under USF-133 |
| Authority level       | Semantic implementation standard subordinate to Charter, Authority Model, and ADRs     |
| Linear scope          | USF-152 and USF-153, child of USF-133                                                 |
| Provider posture      | In-memory, local-test, and mock only; live external delivery providers are deferred    |
| Certification posture | ISO 27001-supporting technical control evidence only; no certification claim is made   |

This standard defines notifications as controlled communications. It supports technical control evidence, auditability, tenant isolation, and safe future UI/API use. Do not claim ISO certification, legal compliance certification, deliverability certification, production messaging readiness, production-live readiness, live email provider readiness, live SMS provider readiness, live push provider readiness, live webhook provider readiness, live SMTP readiness, or any other live external delivery provider readiness from this slice.

No live external delivery provider readiness is claimed.

## Controlled Communications

notification: an intent to communicate with one or more recipients.

message: a rendered channel-specific payload prepared for delivery.

delivery: an attempt to transmit a message through a provider/channel.

delivery evidence: a structured, value-free record of a send attempt, provider response, retry, suppression, failure, bounce, complaint, or final outcome.

preference: a recipient-level or tenant-level communication choice.

suppression: a mandatory block preventing delivery for safety, consent, bounce, complaint, abuse, legal, or policy reasons.

Rules:

- No notification sends without classification.
- No delivery without tenant scope.
- No provider credentials in payloads, templates, audit, logs, OpenAPI, tests, or proofs.
- No raw sensitive message body in audit evidence unless explicitly classified and authorised.
- No marketing or bulk send without consent policy.
- No security-critical notification silently disappears without evidence.

## Classification

Every notification is classified as exactly one of:

security, authentication, authorization, transactional, workflow, operational, system, file, identity, configuration, audit, maintenance, marketing, bulk, test.

Unknown classification fails closed. Classification affects template use, consent, suppression, retry, audit, retention, and redaction. Security, authentication, and authorization notifications may bypass ordinary marketing opt-out only when an explicit policy allows it. Marketing and bulk notifications require consent and suppression checks. Test notifications must not target real recipients unless explicitly authorised.

## Channels

Supported channel model:

email, sms, push, in-app, webhook, provider-internal, test.

Each channel has an explicit provider mode, allowed notification classifications, recipient verification rules, payload size/content restrictions, retry/suppression behaviour, and redaction rules. Provider mode distinguishes in-memory, local-test, mock, and live-external-deferred. The live-external-deferred mode records posture only; it is not a live provider implementation or readiness claim.

## Recipient Identity And Address Safety

Recipient identity is distinct from address. Required concepts are recipient_id, recipient_actor_id, recipient_tenant_id, recipient_type, address_ref, address_type, address_verified, address_status, address_source, and address_last_verified_at.

Recipient address is sensitive. Address values must not be exposed in audit, logs, errors, OpenAPI, tests, proofs, or provider evidence except as explicit redacted or hashed values. Unverified address fails closed for privileged or sensitive delivery unless policy explicitly allows. Duplicate recipients must not create duplicate delivery unless explicitly intended. Recipient identity must not rely on mutable email or phone alone.

## Consent, Preferences, Unsubscribe, And Suppression

Required fields include consent_status, preference_scope, preference_source, unsubscribe_status, suppression_status, suppression_reason, suppression_source, suppressed_at, suppressed_by, and expires_at.

Consent statuses: unknown, granted, denied, withdrawn, not-required, system-mandated.

Suppression reasons: recipient-opted-out, tenant-disabled-channel, address-unverified, address-bounced, complaint-received, legal-hold, policy-blocked, rate-limited, provider-blocked, security-blocked, do-not-contact.

Marketing and bulk sends require explicit consent where represented. Suppression fails closed. Complaint or bounce suppression blocks future eligible delivery where represented. Security or mandatory messages require explicit policy if they bypass opt-out. Preference and suppression changes are audit-recorded. No tenant can alter another tenant's preference or suppression state.

## Template Governance

Templates are controlled content. Required fields are template_id, template_key, template_version, template_hash, template_status, template_owner, template_classification, allowed_channels, allowed_notification_classes, render_context_schema, allowed_variables, created_by, approved_by, approved_at, and deprecated_at.

Templates are versioned. Templates become immutable once used. Template changes are privileged and audited. Template rendering must not execute arbitrary code. Missing required variables fail closed. Unknown variables fail closed. Secret-looking variables fail closed or are redacted. Rendered payload classification is at least as sensitive as the highest-classification input. Approval workflow runtime may be deferred, but approval fields and blockers must be recorded.

## Data Minimisation

Payloads should contain references, not full sensitive records. Do not embed secrets, credentials, tokens, cookies, private keys, object keys, provider internals, or connection strings. Do not include more PII than needed for the recipient to understand the notification. Audit records store hashes, IDs, classifications, and safe summaries, not full message bodies by default. Preview/render proof must use synthetic data only.

Blocked patterns include password, secret, token, api_key, authorization, cookie, private_key, connection_string, credential, bearer, jwt, and object_key.

## Delivery Reliability And Evidence

Delivery is a state machine. Required statuses are draft, queued, scheduled, rendering, rendered, suppressed, sending, sent, delivered, failed, retrying, dead-lettered, cancelled, expired, blocked, and provider-unknown.

Every delivery attempt has evidence. Provider response is normalised and redacted. Provider failure does not leak credentials or raw payload. Retries are bounded. Dead-letter preserves value-free evidence. Duplicate notification submissions do not duplicate delivery. Delivery outcome is audit-recorded. Security-critical delivery failure must be visible as evidence.

## Outbox And Jobs

State mutation and notification intent should commit atomically where practical. If delivery is async, there must be durable notification intent or outbox evidence. Delivery jobs consume notification intent idempotently. Provider sends use idempotency keys where represented. The current slice uses the PR #98 operational job substrate for notification.delivery jobs. USF-153 adds a bounded local database-persistence contract and transactional outbox proof in `capabilities/notify/src/enterprise-messaging-controls.ts`, `packages/proof/src/notifications-messaging-proof.ts`, and `docs/architecture/notifications-messaging-enterprise-proof-depth-matrix.json`. That evidence is local and value-free. It is not production database persistence, distributed outbox processing, backup readiness, restore readiness, provider callback replay, or production messaging readiness.

## Provider Configuration And Deliverability Posture

Required provider fields are provider_ref, provider_type, provider_mode, channel, endpoint, allowed_hosts, allowed_schemes, tls_required, credential_ref, sender_identity_ref, rate_limit_policy, retry_policy, timeout_policy, circuit_breaker_policy, and egress_policy.

Provider credentials are secret references only. Sender identities are classified. No arbitrary provider endpoint is allowed by default. TLS is required except explicitly local-only. Deliverability posture may define domain authentication, sender verification, bounce handling, complaint handling, suppression lists, rate limits, and reputation controls, but this slice does not claim live deliverability readiness. USF-153 proves local provider failure redaction and a local provider circuit breaker. It does not prove live provider failover, SLA, provider compatibility, inbox placement, bounce-rate, complaint-rate, unsubscribe-link, carrier certification, or provider-managed operation.

## Feedback, Bounce, Complaint, And Privacy

Feedback event types are delivery.bounced, delivery.complaint.received, delivery.opened, delivery.clicked, delivery.unsubscribed, delivery.provider_failed, and delivery.provider_deferred.

Bounce and complaint feedback is tenant-scoped, audit/evidence recorded, and updates suppression where represented. Open/click tracking is privacy-sensitive and disabled by default unless explicitly authorised. USF-153 proves bounded local bounce feedback ingestion and unsubscribe ingestion against synthetic tenant data. The proof updates suppression or preference state and blocks later eligible delivery without retaining raw recipient address, provider payload, endpoint, credential, token, or stack trace. Live provider webhook handling, provider replay, provider SLA, provider-managed suppression lists, and deliverability analytics remain deferred unless separately authorised.

## Mandatory Security Notifications

Examples include password-or-session-change, identity-link-change, tenant-sso-change, break-glass-used, role-or-permission-change, high-risk-config-change, file-export-created, and audit-export-created.

Security notifications are classified. Suppression/opt-out policy is explicit. Delivery failure creates evidence. Recipient set is determined by policy. Content is redacted and minimal.

## Bulk And Campaign Safety

Bulk send requires explicit classification, consent/suppression evaluation, bounded tenant scope, rate-limit posture, idempotency, cancellation, and audit evidence. USF-153 proves bounded local bulk campaign runtime posture for synthetic notifications: consent and suppression checks must be represented, tenant limits fail closed, and audit evidence is value-free. Distributed campaign management, customer-facing campaign UI, live deliverability, customer bulk-send readiness, production marketing operation readiness, and full distributed rate-limit fairness remain deferred.

## Tenant, Environment, Retention, And Protection

Tenant A cannot read, list, send, retry, cancel, or inspect Tenant B notifications, templates, preferences, suppression, provider config, or delivery evidence. Environment class is represented. Local/test providers cannot be confused with live providers. Test messages are clearly marked and cannot accidentally use live provider mode.

Retention fields include message_body_retention_policy, rendered_payload_retention_policy, delivery_evidence_retention_policy, legal_hold, and purge_allowed_at. Rendered message bodies should be retained only when necessary. Delivery evidence may outlive message body. Legal hold blocks purge where represented. Purge is privileged and audited. Retention policies are classification-aware. USF-153 proves bounded local purge and legal-hold denial posture only. Custom retention, legal hold service readiness, DSR readiness, export/delete readiness, data residency readiness, production retention readiness, and production purge operation remain non-claims.

Provider transport requires TLS except local-only tests. Persisted rendered payloads are classified; sensitive rendered payloads should be encrypted where persisted or not persisted. Live KMS and provider encryption claims are deferred unless separately authorised.

## Rate Limiting, Abuse, Access, And Audit

Control concepts include tenant_send_quota, recipient_send_quota, channel_rate_limit, provider_rate_limit, bulk_send_limit, suppression_threshold, complaint_threshold, and bounce_threshold. Quota failures fail closed. Quota/suppression events are audit-recorded. Repeated denied or suppressed sends may emit security events. USF-153 proves bounded local tenant-counter rate-limit denial and local address-verification denial. Distributed quota fairness, edge enforcement, abuse-management operation, live address/domain/phone/device verification, and production capacity readiness remain deferred.

Privileged actions are notification.create, notification.read, notification.list, notification.render, notification.send, notification.cancel, notification.retry, notification.dead_letter.read, notification.dead_letter.retry, notification.template.create, notification.template.update, notification.template.approve, notification.preference.read, notification.preference.update, notification.suppression.update, notification.provider.configure, and notification.bulk.send. Every privileged action goes through the USF PDP.

Audit event types include notification.created, notification.rendered, notification.queued, notification.scheduled, notification.sent, notification.delivered, notification.failed, notification.retrying, notification.dead_lettered, notification.suppressed, notification.cancelled, notification.denied, notification.read, notification.template.created, notification.template.changed, notification.template.approved, notification.preference.changed, notification.suppression.changed, notification.provider.changed, notification.bulk.started, notification.bulk.completed, and notification.bulk.failed.

Audit includes tenant, actor or service actor, notification_id, channel, classification, outcome, reason, correlation, causation, and trace where represented. Audit does not include raw recipient address, provider credentials, full rendered body, raw provider error, or raw provider internals. Reading restricted/security notification evidence may itself be audited.
