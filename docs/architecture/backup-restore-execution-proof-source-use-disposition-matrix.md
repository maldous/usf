# Backup Restore Execution Proof Source-Use Disposition Matrix

This matrix records source-use treatment for the USF-223 backup/restore DR,
PITR, and RPO/RTO execution proof. It uses existing USF backup/restore service
catalogue, provider registry, pgBackRest proof boundary, enterprise evidence,
and validator patterns as authority. Historical source-lineage artefacts remain lineage
only and are not copied, imported, mirrored, or treated as live authority.

Linear source issue: USF-223.

Related issues: USF-219, USF-211, USF-202, USF-177, USF-139, USF-147,
USF-193, USF-184, USF-192, USF-133.

## Target Files

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `packages/proof/src/backup-restore-operations-execution-proof.ts` | new-with-rationale | Existing USF pgBackRest configured proof boundary, backup/restore operational depth artefact, Compose service catalogue rows for Postgres and pgBackRest, provider registry backup/restore entries, and enterprise evidence model | Adds a proof-only bounded local Compose command for USF-223. It executes online pgBackRest backup, local WAL archive observation, deterministic scheduled backup dispatch, source failure rehearsal, PITR restore into an isolated volume, local RPO/RTO observation buckets, fail-closed repository behaviour, redaction, and teardown evidence. |
| `packages/proof/src/index.ts` | evidence-only-support | Existing proof package export pattern | Exports the USF-223 proof function without changing runtime provider semantics. |
| `package.json` | new-with-rationale | Existing proof command and verify wiring pattern | Adds proof:backup:operations and includes it in verify so the execution proof cannot drift out of the repository validation gate. |
| `Makefile` | new-with-rationale | Existing proof target pattern | Adds backup-operations-proof as a command alias for the USF-223 proof. |
| `tests/packages/proof.test.ts` | evidence-only-support | Existing proof export smoke-test pattern | Confirms the USF-223 proof function is exported without running Docker in the unit test suite. |
| `docs/architecture/backup-restore-dr-pitr-rpo-rto-execution-proof.json` | issue-owned-evidence | USF-223 acceptance criteria, USF-219 operational depth boundary, USF-211 pgBackRest configured proof boundary, service catalogue, and enterprise evidence model | Records machine-readable execution proof scope, service/provider linkage, claim boundaries, deferred boundaries, evidence freshness, validation commands, and explicit non-claims. |
| `docs/architecture/backup-restore-dr-pitr-rpo-rto-execution-proof.md` | evidence-only-support | Machine-readable USF-223 proof artefact | Provides concise human-readable architecture notes for the proof boundary and non-claims. |
| `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` | issue-owned-append | Lane 1 enterprise evidence model and USF-223 evidence requirements | Appends SoA, evidence register, threat, resilience, incident, privacy, and proof-command rows for USF-223. |
| `tools/validate-runtime/validate-runtime.py` | issue-scoped-validator-extension | Existing runtime proof validator pattern and USF-223 proof artefact | Adds USF-RUNTIME-035 to fail closed when the USF-223 proof artefact, command wiring, proof source markers, deferred boundaries, non-claims, or redaction/fail-closed markers are missing or overclaimed. |
| `tools/validate-enterprise/validate-enterprise.py` | issue-scoped-validator-extension | Existing enterprise evidence validator pattern and USF-223 proof artefact | Adds USF-ENTERPRISE-031 to fail closed when USF-223 enterprise evidence, SoA support, proof rows, deferred boundaries, or non-claims are incomplete or overclaimed. |
| `tools/validate-runtime/planted-defects/usf-223-backup-execution-proof-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-RUNTIME-035 rejects a missing USF-223 proof artefact. |
| `tools/validate-runtime/planted-defects/usf-223-backup-execution-proof-command-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-RUNTIME-035 rejects missing package-script command wiring. |
| `tools/validate-runtime/planted-defects/usf-223-backup-execution-proof-source-marker-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-RUNTIME-035 rejects missing proof-source execution markers. |
| `tools/validate-runtime/planted-defects/usf-223-backup-execution-deferred-boundary-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-RUNTIME-035 rejects missing deferred boundary evidence. |
| `tools/validate-runtime/planted-defects/usf-223-backup-execution-readiness-overclaim.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-RUNTIME-035 rejects backup/restore readiness overclaim markers. |
| `tools/validate-enterprise/planted-defects/031-backup-restore-execution-proof-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-ENTERPRISE-031 rejects a missing USF-223 proof artefact. |
| `tools/validate-enterprise/planted-defects/031-backup-restore-execution-enterprise-evidence-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-ENTERPRISE-031 rejects missing enterprise evidence rows. |
| `tools/validate-enterprise/planted-defects/031-backup-restore-execution-deferred-boundary-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-ENTERPRISE-031 rejects missing deferred boundary rows. |
| `tools/validate-enterprise/planted-defects/031-backup-restore-execution-readiness-overclaim.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves USF-ENTERPRISE-031 rejects backup/restore readiness overclaim markers. |

## Boundary Confirmation

USF-223 proves only bounded local profile-gated execution evidence for the
selected pgBackRest/Postgres backup/restore operation path. It does not prove
backup readiness, restore readiness, disaster recovery readiness, PITR
readiness, RPO/RTO target achievement, environment promotion backup gates,
provider-managed backup service operation, test readiness, staging readiness,
production readiness, deployment readiness, live-provider readiness, SOC
readiness, ISO/IEC 27001 certification, enterprise production readiness, full
dev readiness, full product readiness, or USF-133 closure.
