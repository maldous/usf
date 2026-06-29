# React Import/Export/Bulk Inventory

Run: 20260629T014914Z-193ce55

Inventory count: 16
React tests/proofs count: 8

Key historical behaviours inventoried:

- Portable tenant export archive, manifest, entry hashes, tenant binding, and tamper rejection.
- Portable tenant import applier with transaction/rollback and resumable progress.
- Data governance and portability fulfillment evidence.
- Storage file safety: classification, scan/quarantine, checksum, tenant isolation, legal hold.
- Retention and legal hold posture for exported/staged data.
- Admin export/import route lineage, classified as deferred for broad HTTP surfaces.
- Runtime proof lineage for data portability and Postgres import applier.
- UI/Playwright import/export lineage classified; foundation behaviours rewritten without adding Playwright.

Source-use result: rewrite from behaviour for implemented safety, proof, and evidence concepts; lineage only for encrypted portable archive runtime, transactional import applier, and broad HTTP route surface.
