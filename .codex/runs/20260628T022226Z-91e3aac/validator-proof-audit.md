# Validator And Proof Audit

Run: 20260628T022226Z-91e3aac

## Baseline Failure

make verify failed on merged main after PR 88 because validate-spec all invoked validate-bootstrap all, and the bootstrap validator rejected implementation-shaped roots after v2-bootstrap was moved from the recorded USF-39 start commit to the accepted PR 88 merge commit.

The failing invariant required bootstrap-start.json v2BootstrapTarget to exactly equal the current peeled v2-bootstrap target. That invariant was correct before marker movement, but became too strict after the documented post-merge tag move.

## Fix

tools/validate-bootstrap/validate-bootstrap.py now keeps the historical start record strict:

- startCommit must match the recorded v2BootstrapTarget.
- HEAD must descend from startCommit.
- the current git v2-bootstrap target must be available.
- if the current v2-bootstrap target differs from the recorded start target, it must descend from the recorded start target.

A planted defect was added at tools/validate-bootstrap/planted-defects/moved-bootstrap-marker-outside-start-ancestry.json to prove an invalid moved marker still fails closed.

## Validation

- python3 -m py_compile tools/validate-bootstrap/validate-bootstrap.py tools/validate-spec/validate-spec.py passed.
- python3 tools/validate-bootstrap/validate-bootstrap.py all --json passed.
- python3 tools/validate-bootstrap/validate-bootstrap.py selftest --json passed.
- make dev-smoke passed.
- make verify passed.
- validate-spec all, imports, instances, evidence, real-instances, implementation, selftest, and pr modes passed.
- git diff --check passed.
- strict JSON parse outside node_modules passed.

## GitHub Workflow Note

GitHub run 28308481170 failed on the v2-bootstrap tag push for the same pre-fix invariant. Main validate-spec and proof-anchor workflows for merge commit 91e3aac passed. A PR for this branch should cause the updated validator to pass and remove that outstanding tag-workflow failure mode for future marker moves.

## Boundary Verdict

The fix does not weaken the implementation root gate. It only changes the marker relation from equality to ancestry after the authorised start record, preserving fail-closed behavior for missing, unrelated, or regressed marker targets.

