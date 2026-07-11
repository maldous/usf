# Git object mirror: safe provisioning path (USF-1085)

The optional trusted-runner git object mirror (USF-1063, under USF-1062) is a
transport accelerator only. It is opt-in and inert by default: unless the runner
host operator provisions `vars.USF_GIT_OBJECT_MIRROR`, the priming step in
`.github/workflows/validate-spec.yml` is a no-op. Runner-local state is never
authority, and correctness is guaranteed by the fail-closed event-SHA gate, not by
the mirror.

This note hardens *where* a configured mirror may live so that it cannot be removed
by runner workspace or temp cleanup mid-run.

## Constraint (fail closed)

A configured `USF_GIT_OBJECT_MIRROR` MUST:

- be an **absolute** host path;
- live **outside** `$GITHUB_WORKSPACE` (the checkout / workspace root that runner
  cleanup wipes between runs); and
- live **outside** `$RUNNER_TEMP` (the per-run temp root that runner cleanup
  removes).

If the variable is set but violates any of these, the priming step prints an error
and exits non-zero (`exit 1`) **before** exporting
`GIT_ALTERNATE_OBJECT_DIRECTORIES`. If the variable is unset, the step is a no-op
(`exit 0`). The mirror is therefore never sourced from cleanup-controlled storage.

## Documented safe path

Provision the mirror on durable host storage that the runner lifecycle never
removes, for example:

```
/opt/usf-runner/git-object-mirror
```

with a populated `objects/` directory (`/opt/usf-runner/git-object-mirror/objects`).
This lives outside both `$GITHUB_WORKSPACE` (typically under the runner
`_work/<repo>` tree) and `$RUNNER_TEMP` (typically under `_work/_temp`), so it
survives `tools/github-runner/cleanup-workspace.sh` and per-run temp cleanup.

Provisioning is performed out of band by the runner host operator and is not
authoritative for validation; the workflow only *consumes* the alternate read-only
and never prunes, garbage-collects, or writes tokens into it.

## Machine-checkable enforcement

- Workflow: the fail-closed guard in the "Prime local git object mirror" step.
- Artifact: `docs/architecture/repository-git-object-mirror-transport-optimisation.json`
  → `mirrorLocationSafety` (`requiredAbsolutePath`, `requiredOutsideWorkspace`,
  `requiredOutsideRunnerTemp`, `failClosedOnUnsafePath` all `true`;
  `removableByRunnerCleanup` `false`; `documentedSafePath`).
- Validator: `tools/validate-repository-optimisation/validate-repository-optimisation.py`
  rule `USF-OPT-MIRROR-006` (location safety) and rule `USF-OPT-MIRROR-004`
  (structural, fail-closed event-SHA gate). Both are exercised by planted-defect
  selftest cases (`... selftest`).
