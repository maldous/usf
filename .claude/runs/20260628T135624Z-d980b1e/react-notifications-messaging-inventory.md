# React Notifications/Messaging Inventory

Run: `20260628T135624Z-d980b1e`

Inventory items: 24.

React notification/messaging tests/proofs found: 13 direct or cross-domain test files, 17 runtime proof scripts/evidence records, including 10 registered proof commands.

Key findings:

- React notification runtime covers notification dispatch, local/email/webhook transports, per-user preferences, preference-derived suppression, email sender configuration, webhook delivery queues, bounded retry, redrive, audit, and secret-looking payload rejection.
- React does not provide a controlled template model with version/hash/immutable-used-template behaviour.
- React does not provide explicit consent, unsubscribe, bounce, complaint, do-not-contact, or mature suppression-list governance.
- SMS, push, real in-app inbox, composed notification providers, production SMTP/Brevo, and live external provider readiness are not proven.
- UI tests for admin email/webhooks are foundation behaviour evidence only; they are not UI implementation authority for USF.

No React runtime/application code was imported. `../react` was used only as historical lineage and behaviour evidence.
