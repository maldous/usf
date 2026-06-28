# USF Notifications/Messaging Current Inventory

Run: `20260628T135624Z-d980b1e`

Inventory items: 13.

The starting USF state had a semantic-only notification contract, a thin local tenant notice wrapper, a generic mail provider, and strong reusable substrates from config/secrets, jobs, audit, auth, and PDP. This branch replaces the thin notification wrapper with a controlled communication capability and adds:

- canonical notification classifications, channels, delivery statuses, provider modes, consent/suppression values, feedback event types, and audit events;
- versioned/hashable templates with a fail-closed renderer;
- recipient identity/address_ref model with address hashing in evidence;
- NotificationProvider port and in-memory provider adapter;
- provider config validation through secret references;
- notification.delivery job enqueue with idempotency;
- bounded retry/dead-letter delivery evidence;
- PDP-protected notification actions;
- notification lifecycle audit;
- capability tests, `make notify-proof`, validate-notify, planted defects, source-use, and parity matrix backing.

No UI, Playwright/browser E2E, live provider, SMTP/SMS/push/webhook external integration, or production readiness claim was added.
