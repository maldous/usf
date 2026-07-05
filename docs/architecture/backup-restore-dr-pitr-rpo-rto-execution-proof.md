# USF-223 backup restore DR PITR and RPO/RTO execution proof

This note is the human-readable companion to docs/architecture/backup-restore-dr-pitr-rpo-rto-execution-proof.json. The JSON artefact is the machine-checkable source for the USF-223 bounded local execution proof overlay.

USF-223 follows USF-219 and USF-211. USF-219 records the selected backup/restore operational-depth disposition and keeps stronger boundaries assigned to follow-up work. USF-211 proves a bounded profile-gated local pgBackRest cold backup and restore readback. USF-223 adds bounded local execution proof for online backup, WAL archive observation, PITR restore, deterministic scheduled-backup dispatch, source-failure restore rehearsal, and local RPO/RTO observation buckets.

The proof command is corepack pnpm proof:backup:operations. It uses the canonical test Compose target with the backup-restore profile, a temporary Compose override, synthetic Postgres data, the official pgBackRest CLI boundary, bounded readiness retry, timeouts, isolated Compose project names, isolated volumes, and guaranteed teardown.

The proof remains local and bounded. It does not prove backup readiness, restore readiness, disaster recovery readiness, PITR readiness, RPO or RTO target achievement, environment-promotion backup gates, provider-managed backup operation, live-provider readiness, staging readiness, production readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, full dev readiness, full product readiness, or USF-133 closure.

Enterprise evidence posture is recorded in spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json. The SoA-support and evidence rows organize future assurance evidence only; they do not claim compliance or certification.

Remaining deferred boundaries are explicit: environment promotion backup gates remain tied to USF-193 or later source issues, and provider-managed backup/supplier operation remains outside this local Compose proof.
