import { describe, expect, it } from "vitest";

// @ts-expect-error server.mjs is a runtime ESM module without a TypeScript declaration file.
import {
  buildData,
  buildReviewItems,
  finalSignoffState,
  reviewItemDecision,
} from "../../apps/staging-proof-cockpit/src/server.mjs";

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
});
