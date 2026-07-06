import { describe, expect, it } from "vitest";

// @ts-expect-error server.mjs is a runtime ESM module without a TypeScript declaration file.
import { reviewItemDecision } from "../../apps/staging-proof-cockpit/src/server.mjs";

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
});
