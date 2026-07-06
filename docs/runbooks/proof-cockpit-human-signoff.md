# Proof Cockpit Human Signoff Runbook

| | |
|---|---|
| Document type | Runbook / operational procedure |
| Status | Active / procedure |
| Authority level | Operational procedure; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and proof evidence |
| Issue scope | USF-290 (human acceptance decision); USF-293 (acceptance-grade cockpit) |
| Audience | The accountable human operator (Matthew Aldous) |

This runbook records how the accountable human operator reviews the staging proof cockpit and records the final human signoff for USF-290, fully autonomously, with no AI assistance in the loop. The cockpit is served by `apps/staging-proof-cockpit/src/server.mjs`.

The final signoff is a deliberate human browser action. The machine surface never auto-completes it: machine QA reports evidence, but a human decision at `/proof/signoff` is the only thing that records acceptance. This runbook does not itself accept anything and does not upgrade any readiness claim. It makes no staging, production, SOC, ISO, enterprise-production, product UI, browser end-to-end, live-provider, deployment, or full-Foundation-closure claim; recording a signoff preserves those non-claims.

## Prerequisites

Serve the cockpit with writes enabled. The write path requires all three environment variables; without them the browser action controls stay read-only and POST writes are rejected.

Set, in the operator's shell:

- `USF_PROOF_COCKPIT_ALLOW_WRITES=yes` — enables the authenticated write mode.
- `USF_PROOF_COCKPIT_REVIEW_SECRET=<operator secret>` — the operator secret; it seeds the CSRF token derivation and gates writes.
- `USF_PROOF_COCKPIT_REVIEW_ACTOR="Matthew Aldous"` — the configured operator identity. The recorded actor is derived from this authenticated identity, not typed into the form.

Start the server:

```
corepack pnpm proof-cockpit:serve
```

The `proof-cockpit:serve` script (`package.json`) runs `node apps/staging-proof-cockpit/src/server.mjs`. Open the served cockpit in a browser. CSRF protection is a double-submit pair: a form token (`csrfToken` hidden input) and an HttpOnly, `SameSite=Strict` cookie (`proof_cockpit_csrf`, `Path=/proof`). Both are set and validated server-side, so no manual token handling is required — keep cookies enabled in the browser session.

## Step 1 — Review and accept the affected subset at `/proof/review`

Open `/proof/review`. Only changed or new items appear in the review queue. Unchanged items carry their prior acceptance forward automatically through the evidence-fingerprint delta model: each item's material evidence is reduced to a stable fingerprint, and an item returns to the queue only when its fingerprint changes (an evidence, screenshot, report, or route change). Items whose fingerprints already have accepted decisions in the action ledger do not reappear.

Work the queue to empty:

- Use the per-item decision forms to Accept each affected item. Each decision carries explicit human confirmation checkboxes; none are hidden or prefilled.
- To accept the whole open subset in one action, use the **Accept all open review items** control at the top of `/proof/review`. It requires the same four explicit confirmation checkboxes (none hidden or prefilled) and records one human acceptance per currently open item at that item's current evidence fingerprint. It does **not** perform final signoff — signoff remains the separate, deliberate action in Step 2. Accepting all is appropriate when you have reviewed the affected subset and are ready to accept the current known-good state in bulk.
- The gap register (`/proof/review/gaps`), nonconformities (`/proof/review/nonconformities`), and corrective actions (`/proof/review/corrective-actions`) surface any machine-found issues that must be resolved, deferred, or risk-accepted before signoff.
- Final signoff is unavailable while any open review items or machine blockers remain.

## Step 2 — Record the final signoff at `/proof/signoff`

Open `/proof/signoff`. When there are no open review items and no machine blockers, the final signoff controls are enabled. Complete all of the following:

1. Tick the four explicit confirmation checkboxes:
   - `acceptedCurrentEvidence` — accept the current proof baseline (accepted / total current review items, no open items).
   - `qaZeroConfirmed` — confirm the current machine QA result (pass, warnings, unresolved gaps, failures).
   - `deltaReviewAcknowledged` — acknowledge that future proof changes return only affected changed evidence to the review queue.
   - `nonClaimsConfirmed` — acknowledge that this signoff preserves the listed non-claims and does not upgrade readiness beyond the evidence.
2. Type the exact phrase into the signoff field:

   ```
   FINAL SIGNOFF USF-290
   ```

   The server rejects the submission unless the phrase matches exactly.
3. Optionally add a final signoff note for the audit ledger.
4. Submit "Record final signoff".

The server validates the CSRF double-submit (form token plus HttpOnly `SameSite=Strict` cookie) and derives the actor from the authenticated operator identity. If a signoff action already exists, the submission is rejected with a conflict; the signoff is not duplicated.

## What gets recorded

Human actions persist to the file-backed action ledger `human-review-actions.json` (default path `/var/lib/usf-proof-cockpit/human-review-actions.json`, overridable via `USF_PROOF_COCKPIT_STATE_PATH`).

- **Per-item acceptance** — each accepted review item is recorded with its acceptance fingerprint, so the delta model can carry it forward until the evidence changes.
- **The guarded final signoff action** — recorded as an `human-final-decision` action with outcome `human-accepted`, the derived actor, an acceptance fingerprint, the four confirmations, the machine counts observed at signoff time, the preserved non-claims, and markers that this was an explicit browser action and was not auto-completed.

`finalAcceptanceClaimed` stays governed: the recorded action sets it to `false`. Recording a human signoff is the human's acceptance decision; it does not itself flip a final-acceptance claim, and the machine surface never sets that claim automatically.

## Stop conditions

Stop and do not record a signoff if:

- the review queue is not empty or machine blockers remain (the controls stay disabled);
- the three write-mode environment variables are not all set (writes stay read-only);
- the browser cannot present the CSRF cookie (writes are rejected).

The final signoff must always be a deliberate human action taken by the accountable operator.
