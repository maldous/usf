# Adversarial Import/Export/Bulk Parity Review

Did we inventory all React import/export/bulk behaviour?
Yes for the authorised foundation slice. Portable export/import, data governance, storage safety, retention, legal hold, route lineage, runtime proofs, and UI/API test lineage were inventoried.

Did we migrate all authorised behaviours?
Yes for local/dev/test foundation behaviour: semantic model, file-backed safety, job execution posture, guardrails, PDP, audit, telemetry, idempotency, validation, preview, evidence package, and source-use proof.

Did any React tests/proofs disappear silently?
No. React data portability, Postgres import applier, storage, data governance, retention/legal hold, API route, and UI/Playwright behaviours are classified.

Is every gap classified?
Yes. Deferred depth is tracked in USF-163.

Are bulk operations tenant-scoped?
Yes. Store, service, tests, and proof are tenant-scoped.

Are bulk operations PDP-protected?
Yes. create/read/list/validate/preview/approve/start/cancel paths call PDP.

Are bulk operations guardrail-protected or explicitly excepted?
Yes. Guardrail policy posture is represented and one concrete bulk guardrail path is tested/proven.

Are import/export files governed by file controls?
Yes. File_id, checksum, scan/quarantine, classification, retention, legal hold, and object-key non-leakage are represented.

Are jobs tenant-scoped?
Yes. Operation start enqueues tenant-scoped import-export jobs with concrete service actors.

Are validation errors safe?
Yes. Field-scoped safe errors redact secret-looking values and hash record refs.

Are dry-run and preview non-mutating and deterministic?
Yes for preview/dry-run posture. Full dry-run impact engine remains deferred in USF-163.

Is idempotency proven?
Yes. Missing idempotency fails closed and duplicate submission is deduped.

Is audit value-free?
Yes. Lifecycle audit metadata excludes raw rows, payloads, object keys, provider internals, and secrets.

Are observability signals tenant-safe?
Yes. Signals carry tenant-safe context and safe attributes.

Is source-use honest?
Yes. Runtime/code/test/proof files have source-use disposition and no React runtime copy/path mirroring.

Does make parity pass?
Pending final full validation after formatting.

Does make verify pass?
Pending final full validation after formatting.

Any production/live/regulatory import-export readiness overclaim?
No. The implementation and proof explicitly deny those claims.
