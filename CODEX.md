# Codex Directive for USF

This file is a tool-specific shim for Codex.

Codex MUST read `AGENTS.md` before doing any repository work.

Codex MUST NOT treat this file as an independent policy source. If this file and `AGENTS.md` conflict, `AGENTS.md` governs agent process. If `AGENTS.md` conflicts with the USF Charter or Authority Model, Codex MUST stop and report the conflict.

Before any modifying task, Codex MUST perform the USF bootstrap described in `AGENTS.md`, including reading the current foundational governance artefacts from disk and parsing the JSON catalogues where required.

Codex MUST NOT:
- create implementation/runtime code unless explicitly instructed by an approved directive
- copy application/runtime code from `../react`
- create schemas, ADRs, validators, evidence files, import maps, or implementation directories unless explicitly instructed
- infer semantics from implementation structure
- treat generated reports as canonical
- upgrade hermetic proof to live external proof
- treat production-shaped as production-live
- use forbidden canonical path/name tokens

Codex MUST report:
- files read
- files modified
- files created
- JSON parse results where applicable
- assumptions
- uncertainties
- readiness verdict

Codex MUST stop on unresolved authority conflict.
