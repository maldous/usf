# Notifications/Messaging Parity Gap Map

Run: `20260628T135624Z-d980b1e`

Gap map items: 25.

Counts:

- Migrated: 15
- Covered: 0
- Partial: 3
- Missing: 0
- Deferred: 6
- Deprecated: 1
- Requires human decision: 0

Migrated in this slice:

- notification intent/message/delivery evidence model;
- template version/hash/classification and fail-closed renderer;
- recipient identity/address_ref safety and address hashing;
- NotificationProvider port and in-memory/test provider;
- provider config through secret references;
- notification.delivery jobs with idempotency;
- bounded retry and dead-letter evidence;
- preferences, consent, unsubscribe status, suppression status/reason/source;
- mandatory security classification and explicit opt-out bypass policy;
- lifecycle audit and value-free delivery evidence;
- foundation tests, notify proof, source-use, parity matrix, and validator with planted defects.

Partial/deferred:

- richer channel runtime beyond in-memory/local-test provider;
- sender identity verification/readiness depth;
- unsubscribe routes/feedback ingestion;
- bounce/complaint inbound provider feedback handling;
- live external providers and deliverability controls;
- bulk/campaign execution, rate limits, retention purge, and DB-backed outbox/persistence;
- future redacted PDP-protected notification HTTP/OpenAPI/UI surfaces.

No silent gaps remain for the bounded foundation slice; deferred depth is explicitly recorded in the parity matrix and Linear follow-up USF-153.
