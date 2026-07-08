import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildData,
  buildReviewItems,
  finalSignoffState,
  reviewItemDecision,
  reviewItemFingerprint,
  startProofCockpitServer,
} from "../../apps/staging-proof-cockpit/src/server.mjs";
import { computePromotion } from "../../apps/staging-proof-cockpit/src/promote.mjs";

const item = {
  id: "review-claim-example",
  capabilityId: "cap-example",
  serviceId: "service-example",
  sourceUrl: "evidence/proof-evidence/proof-cockpit/example.json",
  acceptanceFingerprint: "fingerprint-current",
};

describe("proof cockpit review action resolution", () => {
  it("uses the newest exact per-item action so a baseline acceptance can supersede stale history", () => {
    const decision = reviewItemDecision(
      {
        actions: [
          {
            id: "old-stale-acceptance",
            evidenceId: item.id,
            outcome: "human-accepted",
            acceptanceFingerprint: "fingerprint-old",
            createdAt: "2026-07-06T00:00:00.000Z",
            updatedAt: "2026-07-06T00:00:00.000Z",
          },
          {
            id: "new-current-acceptance",
            evidenceId: item.id,
            outcome: "human-accepted",
            acceptanceFingerprint: "fingerprint-current",
            createdAt: "2026-07-06T01:00:00.000Z",
            updatedAt: "2026-07-06T01:00:00.000Z",
          },
        ],
      },
      item,
    );

    expect(decision.status).toBe("accepted");
    expect(decision.action?.id).toBe("new-current-acceptance");
  });

  it("still requires re-review when the newest exact acceptance fingerprint is stale", () => {
    const decision = reviewItemDecision(
      {
        actions: [
          {
            id: "old-current-acceptance",
            evidenceId: item.id,
            outcome: "human-accepted",
            acceptanceFingerprint: "fingerprint-current",
            createdAt: "2026-07-06T00:00:00.000Z",
            updatedAt: "2026-07-06T00:00:00.000Z",
          },
          {
            id: "new-stale-acceptance",
            evidenceId: item.id,
            outcome: "human-accepted",
            acceptanceFingerprint: "fingerprint-old",
            createdAt: "2026-07-06T01:00:00.000Z",
            updatedAt: "2026-07-06T01:00:00.000Z",
          },
        ],
      },
      item,
    );

    expect(decision.status).toBe("re-review-required");
    expect(decision.changedSinceAcceptance).toBe(true);
    expect(decision.action?.id).toBe("new-stale-acceptance");
  });

  it("makes final signoff available only after every current review item is accepted", () => {
    const data = buildData();
    const items = buildReviewItems(data);
    const state = {
      actions: items.map((reviewItem, index) => ({
        id: `accepted-${index}`,
        evidenceId: reviewItem.id,
        outcome: "human-accepted",
        acceptanceFingerprint: reviewItem.acceptanceFingerprint,
        createdAt: "2026-07-06T01:00:00.000Z",
        updatedAt: "2026-07-06T01:00:00.000Z",
      })),
    };

    const signoff = finalSignoffState(data, state);

    expect(signoff.counts.accepted).toBe(items.length);
    expect(signoff.openItems).toHaveLength(0);
    expect(signoff.signoffAvailable).toBe(true);
    expect(signoff.signoffRecorded).toBe(false);
  });

  it("detects an explicit final human signoff action separately from item acceptance", () => {
    const data = buildData();
    const items = buildReviewItems(data);
    const state = {
      actions: [
        {
          id: "final-signoff-action",
          actionType: "human-final-decision",
          evidenceId: "usf-290-final-signoff",
          outcome: "human-accepted",
          createdAt: "2026-07-06T02:00:00.000Z",
          updatedAt: "2026-07-06T02:00:00.000Z",
        },
        ...items.map((reviewItem, index) => ({
          id: `accepted-${index}`,
          evidenceId: reviewItem.id,
          outcome: "human-accepted",
          acceptanceFingerprint: reviewItem.acceptanceFingerprint,
          createdAt: "2026-07-06T01:00:00.000Z",
          updatedAt: "2026-07-06T01:00:00.000Z",
        })),
      ],
    };

    const signoff = finalSignoffState(data, state);

    expect(signoff.signoffAvailable).toBe(true);
    expect(signoff.signoffRecorded).toBe(true);
    expect(signoff.signoffAction?.id).toBe("final-signoff-action");
  });

  it("returns human-review-required for a new item with no matching action", () => {
    expect(reviewItemDecision({ actions: [] }, item).status).toBe("human-review-required");
  });

  it("surfaces rejection and retest outcomes from the newest matching action", () => {
    const rejected = reviewItemDecision(
      { actions: [{ id: "r", evidenceId: item.id, outcome: "human-rejected" }] },
      item,
    );
    expect(rejected.status).toBe("rejected");
    const retest = reviewItemDecision(
      { actions: [{ id: "t", evidenceId: item.id, outcome: "retest-requested" }] },
      item,
    );
    expect(retest.status).toBe("retest-requested");
  });
});

describe("proof cockpit evidence fingerprint (delta acceptance)", () => {
  it("is stable for identical item evidence and changes when evidence changes", () => {
    const base = {
      id: "review-x",
      acceptanceFingerprint: "",
      machineQaConclusion: "1278 pass, 0 warn",
      riskPosture: "low",
      evidenceLinks: ["a", "b"],
      screenshots: [{ screenshotHash: "hash-1" }],
      route: "/proof/x",
      sourceUrl: "evidence/x.json",
    };
    expect(reviewItemFingerprint(base)).toBe(reviewItemFingerprint({ ...base }));
    expect(reviewItemFingerprint(base)).not.toBe(
      reviewItemFingerprint({ ...base, machineQaConclusion: "1279 pass, 0 warn" }),
    );
    expect(reviewItemFingerprint(base)).not.toBe(
      reviewItemFingerprint({ ...base, screenshots: [{ screenshotHash: "hash-2" }] }),
    );
    // evidenceLink order must not affect the fingerprint
    expect(reviewItemFingerprint(base)).toBe(
      reviewItemFingerprint({ ...base, evidenceLinks: ["b", "a"] }),
    );
  });
});

describe("automated machine-QA promotion transform", () => {
  const baseStore = {
    sourceSha: "old-sha",
    deploymentSha: "old-sha",
    latestMachineRun: {
      runId: "qa-run-prior",
      sourceSha: "prior-sha",
      artifactDir: "artifacts/proof-cockpit/machine-runs/PRIOR",
    },
    machineRunHistory: [
      { runId: "qa-run-old", artifactDir: "artifacts/proof-cockpit/machine-runs/OLD" },
      { runId: "qa-run-prior", artifactDir: "artifacts/proof-cockpit/machine-runs/PRIOR" },
    ],
    supersessionHistory: [],
  };
  const report = {
    qaRun: "qa-run-new",
    sourceSha: "new-sha",
    deploymentSha: "new-sha",
    environment: "local-machine-qa",
    completedAt: "2026-07-06T05:00:00.000Z",
    counts: {
      testedRoutes: 830,
      capabilities: 75,
      services: 39,
      screenshots: 93,
      serviceEvidenceScreenshots: 39,
      pass: 1300,
      warn: 0,
      gap: 0,
      fail: 0,
      humanDecisionRequired: 1,
    },
  };

  it("maps counts from the run report and records latest/history/supersession", () => {
    const next = computePromotion(baseStore, report, "artifacts/proof-cockpit/machine-runs/NEW");
    expect(next.latestMachineRun.runId).toBe("qa-run-new");
    expect(next.latestMachineRun.sourceSha).toBe("new-sha");
    expect(next.latestMachineRun.routeCount).toBe(830);
    expect(next.latestMachineRun.passCount).toBe(1300);
    expect(next.sourceSha).toBe("new-sha");
    expect(next.supersessionHistory.at(-1)?.toRunId).toBe("qa-run-new");
    expect(next.machineRunHistory.some((r) => r.runId === "qa-run-new")).toBe(true);
  });

  it("retains only current and prior payloads (marks the rest payloadPruned)", () => {
    const next = computePromotion(baseStore, report, "artifacts/proof-cockpit/machine-runs/NEW");
    const kept = next.machineRunHistory
      .filter((r) => r.payloadPruned === false)
      .map((r) => r.runId);
    const pruned = next.machineRunHistory
      .filter((r) => r.payloadPruned === true)
      .map((r) => r.runId);
    expect(kept.sort()).toEqual(["qa-run-new", "qa-run-prior"]);
    expect(pruned).toContain("qa-run-old");
  });
});

describe("proof cockpit single-decision Accept/Reject endpoints (USF-293)", () => {
  const SECRET = "vitest-proof-cockpit-review-secret";
  let server: Awaited<ReturnType<typeof startProofCockpitServer>>;
  let base: string;
  let stateDir: string;
  let statePath: string;

  beforeAll(async () => {
    process.env.USF_PROOF_COCKPIT_ALLOW_WRITES = "yes";
    process.env.USF_PROOF_COCKPIT_REVIEW_SECRET = SECRET;
    process.env.USF_PROOF_COCKPIT_REVIEW_ACTOR = "Vitest Operator";
    stateDir = mkdtempSync(join(tmpdir(), "proof-cockpit-endpoint-"));
    statePath = join(stateDir, "human-review-actions.json");
    server = await startProofCockpitServer({
      host: "127.0.0.1",
      port: 0,
      statePath,
      allowWrites: true,
      reviewSecret: SECRET,
      actor: "Vitest Operator",
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("endpoint-test-address-unavailable");
    }
    base = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (existsSync(stateDir)) {
      rmSync(stateDir, { recursive: true, force: true });
    }
    delete process.env.USF_PROOF_COCKPIT_ALLOW_WRITES;
    delete process.env.USF_PROOF_COCKPIT_REVIEW_SECRET;
    delete process.env.USF_PROOF_COCKPIT_REVIEW_ACTOR;
  });

  async function decisionCredentials(): Promise<{ csrf: string; cookie: string }> {
    const response = await fetch(`${base}/proof`);
    const home = await response.text();
    const csrf = home.match(/name="csrfToken" value="([^"]+)"/)?.[1] ?? "";
    const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
    return { csrf, cookie };
  }

  function readLedger(): { actions: Array<Record<string, unknown>> } {
    return existsSync(statePath)
      ? (JSON.parse(readFileSync(statePath, "utf8")) as { actions: Array<Record<string, unknown>> })
      : { actions: [] };
  }

  it("serves /proof as a single-column decision page with Accept, Reject, and one confirmation", async () => {
    const home = await fetch(`${base}/proof`).then((r) => r.text());
    expect(home).toContain('action="/proof/accept"');
    expect(home).toContain('formaction="/proof/reject"');
    expect(home).toContain('name="operatorAccept"');
    expect(home).toContain("I, the authenticated operator, accept the current proof state");
    // exactly one confirmation checkbox (no four-checkbox set)
    expect([...home.matchAll(/type="checkbox"/g)]).toHaveLength(1);
    // single-column: no sticky bar, no two-column review-shell, no typed phrase
    expect(home).not.toContain("position:sticky");
    expect(home).not.toContain('class="review-shell"');
    expect(home).not.toContain('class="review-decision-form"');
    expect(home).not.toContain("signoffPhrase");
    expect(home).not.toContain("FINAL SIGNOFF USF-290");
  });

  it("denies POST /proof/accept without CSRF", async () => {
    const response = await fetch(`${base}/proof/accept`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ operatorAccept: "yes" }),
    });
    expect(response.status).toBe(403);
  });

  it("denies POST /proof/accept without the confirmation checkbox", async () => {
    const { csrf, cookie } = await decisionCredentials();
    const response = await fetch(`${base}/proof/accept`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
      body: new URLSearchParams({ csrfToken: csrf }),
    });
    expect(response.status).toBe(403);
    expect(readLedger().actions).toHaveLength(0);
  });

  it("records both bulk per-item acceptance and the final human-accepted decision in one guarded action", async () => {
    const { csrf, cookie } = await decisionCredentials();
    const response = await fetch(`${base}/proof/accept`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
      body: new URLSearchParams({
        csrfToken: csrf,
        operatorAccept: "yes",
        returnTo: "/proof",
        notes: "vitest accept",
      }),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/proof");

    const actions = readLedger().actions;
    const finalDecision = actions.find((action) => action.actionType === "human-final-decision");
    const perItem = actions.filter((action) => action.actionType === "machine-evidence-accepted");
    const expectedItems = buildReviewItems(buildData()).length;

    // Final human decision recorded, attributed to the derived operator, not auto-completed,
    // and does not fabricate a final-acceptance claim.
    expect(finalDecision?.outcome).toBe("human-accepted");
    expect(finalDecision?.actor).toBe("Vitest Operator");
    expect(
      (finalDecision?.finalSignoff as Record<string, unknown> | undefined)?.notAutoCompleted,
    ).toBe(true);
    expect(
      (finalDecision?.finalSignoff as Record<string, unknown> | undefined)?.explicitBrowserAction,
    ).toBe(true);
    expect(finalDecision?.finalAcceptanceClaimed).toBe(false);

    // One acceptance per open review item at its current evidence fingerprint (bulk accept-all).
    expect(perItem).toHaveLength(expectedItems);
    expect(
      perItem.every(
        (action) =>
          typeof action.acceptanceFingerprint === "string" &&
          (action.acceptanceFingerprint as string).length > 0,
      ),
    ).toBe(true);
    expect(perItem.every((action) => action.actor === "Vitest Operator")).toBe(true);
    expect(perItem.every((action) => action.outcome === "human-accepted")).toBe(true);
  });

  it("records only a final human-rejected decision for POST /proof/reject (no bulk acceptance)", async () => {
    const rejectDir = mkdtempSync(join(tmpdir(), "proof-cockpit-reject-"));
    const rejectStatePath = join(rejectDir, "human-review-actions.json");
    const rejectServer = await startProofCockpitServer({
      host: "127.0.0.1",
      port: 0,
      statePath: rejectStatePath,
      allowWrites: true,
      reviewSecret: SECRET,
      actor: "Vitest Operator",
    });
    try {
      const address = rejectServer.address();
      if (!address || typeof address === "string") {
        throw new Error("reject-test-address-unavailable");
      }
      const rejectBase = `http://127.0.0.1:${address.port}`;
      const homeResponse = await fetch(`${rejectBase}/proof`);
      const home = await homeResponse.text();
      const csrf = home.match(/name="csrfToken" value="([^"]+)"/)?.[1] ?? "";
      const cookie = homeResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
      const response = await fetch(`${rejectBase}/proof/reject`, {
        method: "POST",
        redirect: "manual",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
        body: new URLSearchParams({ csrfToken: csrf, operatorAccept: "yes", returnTo: "/proof" }),
      });
      expect(response.status).toBe(303);
      const actions = (
        JSON.parse(readFileSync(rejectStatePath, "utf8")) as {
          actions: Array<Record<string, unknown>>;
        }
      ).actions;
      expect(
        actions.filter((action) => action.actionType === "machine-evidence-accepted"),
      ).toHaveLength(0);
      const finalDecision = actions.find((action) => action.actionType === "human-final-decision");
      expect(finalDecision?.outcome).toBe("human-rejected");
      expect(finalDecision?.actor).toBe("Vitest Operator");
    } finally {
      await new Promise<void>((resolve) => rejectServer.close(() => resolve()));
      rmSync(rejectDir, { recursive: true, force: true });
    }
  });
});
