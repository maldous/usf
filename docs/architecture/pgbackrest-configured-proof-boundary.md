# pgBackRest Configured Proof Boundary

Document type: architecture evidence note.
Source issue: USF-211.
Parent: USF-133.
Authority: `spec/instances/compose-service/service-catalogue.json` remains the semantic service catalogue authority.

USF-211 replaces the USF-202 image/configuration blocker with a bounded local Compose proof for pgBackRest. The proof uses the generated test Compose target, the `backup-restore` profile, a digest-pinned pgBackRest image, synthetic Postgres data, a local repository, a stanza, an offline cold full backup, a restore into an isolated volume, value-free readback, fail-closed missing-repository evidence, and teardown in finally paths.

The proof command is `corepack pnpm proof:backup:pgbackrest`.

The machine-readable boundary is `docs/architecture/pgbackrest-configured-proof-boundary.json`.

## Proven Boundary

- Maintained pgBackRest CLI image boundary selected and digest-pinned.
- Local repository, stanza, and Postgres data/socket linkage are configured by proof.
- Synthetic Postgres data is backed up by offline cold full backup after a clean Postgres stop.
- Restore command restores into an isolated volume and a fresh Postgres container reads back the synthetic marker.
- Readiness retry, timeout, cleanup, and missing-repository fail-closed behaviour are exercised.
- Proof evidence is value-free and redacts endpoints, credentials, connection strings, raw provider payloads, raw table values, raw errors, and stack traces.

## Remaining Boundaries

- Online backup, WAL archive, PITR, scheduled backup, RPO/RTO, DR rehearsal, provider-managed operation, live-provider evidence, environment promotion, API runtime binding, and worker runtime binding remain unproven.
- DB/RLS, files, fixture, or documentation evidence remains non-equivalent to pgBackRest backup artifact and restore drill proof.
- USF-202 remains historical blocker evidence; USF-211 is the bounded local proof resolution only.

## Non-Claims

This note does not claim full dev readiness, test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, full React parity, backup readiness, restore readiness, disaster recovery readiness, RPO/RTO readiness, or USF-133 closure.
