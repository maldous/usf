import { describe, expect, it } from "vitest";

import {
  buildData,
  buildReviewItems,
  finalSignoffState,
  reviewItemDecision,
  reviewItemFingerprint,
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
    const kept = next.machineRunHistory.filter((r) => r.payloadPruned === false).map((r) => r.runId);
    const pruned = next.machineRunHistory.filter((r) => r.payloadPruned === true).map((r) => r.runId);
    expect(kept.sort()).toEqual(["qa-run-new", "qa-run-prior"]);
    expect(pruned).toContain("qa-run-old");
  });
});
