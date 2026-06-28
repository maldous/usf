# Adversarial Notifications/Messaging Parity Review

Run ID: 20260628T135624Z-d980b1e

## Result

No blocking finding remains after remediation.

## Prior Findings Resolved

1. Lint blocker resolved.
   `capabilities/notify/src/index.ts` no longer performs the useless initial assignment that caused `make verify` to fail.

2. Compatibility notification exposure blocker resolved.
   `sendTenantNotice` now uses an opaque compatibility recipient reference, and `MailProviderCompat` forwards only a recipient address hash plus redacted subject/body to the older `MailProvider` compatibility surface. The auxiliary capability test now asserts that the raw message body and raw synthetic address do not appear in captured compatibility mail output.

## Review Questions

- Did we inventory all React notification/messaging behaviour?
  Yes. Agent A produced the React notifications/messaging inventory with 24 classified items and no silent UI/Playwright notification behaviour gap.

- Did we migrate all authorised notification/messaging behaviours?
  Yes for this bounded foundation slice. Deferred depth is explicitly tracked in USF-153.

- Did any React notification/messaging test/proof disappear silently?
  No. React tests/proofs were classified and rewritten as foundation capability/proof/validator coverage where relevant.

- Is every notification/messaging gap classified?
  Yes. The gap map classifies migrated, partial, deferred, deprecated, and non-applicable items.

- Are notifications tenant-scoped?
  Yes. Notification intents, reads, lists, sends, retry, cancel, preferences, suppressions, templates, provider config, and evidence are tenant-bound.

- Are notification actions PDP-protected?
  Yes. Privileged notification actions route through PDP actions added for notification create/read/list/send/cancel/retry/render/template/preference/suppression/provider/bulk paths.

- Are provider credentials secret_refs only?
  Yes. Provider config validation requires credential references and rejects embedded credential-like values.

- Are templates versioned and safe?
  Yes. Templates carry version/hash/classification/schema/allowed variables and rendering rejects missing, unknown, and secret-like values.

- Are recipient addresses protected?
  Yes. Recipient addresses are represented as references and hashes; audit, provider evidence, and compatibility output avoid raw address disclosure.

- Are preferences/consent/suppression fail-closed where represented?
  Yes. Marketing/bulk consent and suppression rules fail closed; mandatory security bypass policy is explicit.

- Are delivery jobs idempotent?
  Yes. Delivery jobs use notification/channel/recipient/template-version idempotency keys.

- Are retries bounded?
  Yes. Retry count is bounded and dead-letters with safe evidence.

- Is dead-letter evidence preserved?
  Yes. Dead-letter state records value-free delivery evidence.

- Are delivery failures redacted?
  Yes. Provider failure evidence uses safe failure codes/messages and strips raw provider responses and secrets.

- Are notification lifecycle events audited?
  Yes. Created, rendered, queued, sent, failed, retrying, dead-lettered, suppressed, cancelled, denied, read, template, preference, suppression, provider, and bulk events are represented where used in this slice.

- Is source-use honest?
  Yes. The source-use and parity matrices classify notifications/messaging lineage and deferred depth without React path mirroring or runtime copy claims.

- Does make parity pass?
  Yes.

- Does make verify pass?
  Yes.

- Any live external delivery provider overclaim?
  No. Live external provider mode is represented only as deferred, and proof output explicitly denies live email, SMS, push, SMTP, deliverability certification, ISO certification, and production-live claims.

## Validation Evidence

Post-remediation full validation log: `.claude/runs/20260628T135624Z-d980b1e/final-validation-after-adversarial-fix.log`

The post-remediation run completed successfully through install, make parity, make db-proof, make authz-proof, make audit-proof, make config-proof, make files-proof, make auth-proof, make jobs-proof, make notify-proof, make dev-smoke, make verify, validate-spec modes, validate-bootstrap modes, validate-parity modes, and git diff check.
