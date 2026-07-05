import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

interface EnterpriseSuite {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly sourceAuthorities: {
    readonly enterpriseEvidenceModel: string;
    readonly obligationManifest: string;
  };
  readonly scope: {
    readonly semanticContractEnterpriseObligationCount: number;
    readonly serviceEnterpriseObligationCount: number;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly isoCertificationClaimAllowed: boolean;
    readonly socReadinessClaimAllowed: boolean;
    readonly productionReadinessClaimAllowed: boolean;
    readonly liveProviderReadinessClaimAllowed: boolean;
    readonly enterpriseProductionReadinessClaimAllowed: boolean;
    readonly finalTestReadinessClaimAllowed: boolean;
  };
  readonly requiredEnterpriseSections: readonly {
    readonly sectionId: string;
    readonly expectedRowCount: number;
    readonly requiredFields: readonly string[];
  }[];
  readonly semanticServiceMapping: {
    readonly semanticContractIds: readonly string[];
    readonly requiredObligationClass: string;
    readonly ownerIssueId: string;
  };
  readonly serviceBackedTestMapping: {
    readonly serviceIds: readonly string[];
    readonly requiredObligationClass: string;
    readonly ownerIssueId: string;
    readonly serviceBackedClaimsRequireComposedEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
  };
  readonly ciaEvidenceTests: Record<string, readonly string[]>;
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

interface ObligationManifest {
  readonly semanticContractObligations: readonly {
    readonly contractId: string;
    readonly obligationClassIds: readonly string[];
    readonly ownerIssueIds: readonly string[];
  }[];
  readonly serviceObligations: readonly {
    readonly serviceId: string;
    readonly obligationClassIds: readonly string[];
    readonly ownerIssueIds: readonly string[];
    readonly inMemoryServiceSubstituteAllowed: boolean;
  }[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function asRows(value: unknown): readonly JsonObject[] {
  if (Array.isArray(value)) {
    return value as readonly JsonObject[];
  }
  return [value as JsonObject];
}

const suite = readJson<EnterpriseSuite>(
  "docs/architecture/enterprise-control-evidence-test-suite.json",
);
const manifest = readJson<ObligationManifest>(suite.sourceAuthorities.obligationManifest);
const enterprise = readJson<JsonObject>(suite.sourceAuthorities.enterpriseEvidenceModel);

const prohibitedClaims = [
  "test-readiness",
  "staging-readiness",
  "production-readiness",
  "deployment-readiness",
  "live-provider-readiness",
  "soc-readiness",
  "iso27001-certification",
  "enterprise-production-readiness",
  "product-ui-readiness",
  "browser-e2e-readiness",
  "full-product-readiness",
  "full-product-readiness",
];

describe("enterprise control evidence test suite", () => {
  it("maps USF-243 to the semantic and service-backed obligation manifest", () => {
    expect(suite.issueId).toBe("USF-243");
    expect(suite.parentIssueId).toBe("USF-234");

    const semanticRows = manifest.semanticContractObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-243"),
    );
    const serviceRows = manifest.serviceObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-243"),
    );

    expect(semanticRows).toHaveLength(suite.scope.semanticContractEnterpriseObligationCount);
    expect(serviceRows).toHaveLength(suite.scope.serviceEnterpriseObligationCount);
    expect(suite.semanticServiceMapping.semanticContractIds).toEqual(
      semanticRows.map((row) => row.contractId),
    );
    expect(suite.serviceBackedTestMapping.serviceIds).toEqual(
      serviceRows.map((row) => row.serviceId),
    );

    expect(
      semanticRows.every((row) => row.obligationClassIds.includes("enterprise-evidence")),
    ).toBe(true);
    expect(serviceRows.every((row) => row.obligationClassIds.includes("enterprise-evidence"))).toBe(
      true,
    );
    expect(serviceRows.some((row) => row.inMemoryServiceSubstituteAllowed)).toBe(false);
    expect(suite.serviceBackedTestMapping.inMemoryServiceSubstituteAllowed).toBe(false);
  });

  it("keeps every required enterprise evidence section present and shaped", () => {
    for (const section of suite.requiredEnterpriseSections) {
      const rows = asRows(enterprise[section.sectionId]);
      expect(rows).toHaveLength(section.expectedRowCount);
      for (const field of section.requiredFields) {
        expect(
          rows.every((row) => row[field] !== undefined),
          `${section.sectionId}.${field}`,
        ).toBe(true);
      }
    }
  });

  it("requires pinned evidence and ownership for control-support rows", () => {
    const soaRows = asRows(enterprise.soaSupportMappings);
    const evidenceRows = asRows(enterprise.evidenceRegister);
    const usf243SoaRow = soaRows.find(
      (row) => row.id === "soa-usf-243-enterprise-control-evidence-test-suite",
    );

    expect(
      soaRows.every(
        (row) =>
          row.owner !== undefined &&
          row.riskOwner !== undefined &&
          row.controlOwner !== undefined &&
          Array.isArray(row.nonClaims),
      ),
    ).toBe(true);
    expect(String(usf243SoaRow?.deferredReason ?? "")).toContain("followUpIssue");

    expect(
      evidenceRows.every(
        (row) =>
          row.validationCommand !== undefined &&
          row.commandPin !== undefined &&
          row.commitPin !== undefined &&
          Array.isArray(row.issueLinks) &&
          row.prOrMergeSha !== undefined &&
          row.retentionPosture !== undefined,
      ),
    ).toBe(true);
  });

  it("tests confidentiality integrity and availability control posture", () => {
    expect(Object.keys(suite.ciaEvidenceTests).sort()).toEqual([
      "availability",
      "confidentiality",
      "integrity",
    ]);
    for (const rows of Object.values(suite.ciaEvidenceTests)) {
      expect(rows.length).toBeGreaterThanOrEqual(4);
    }

    const observability = enterprise.observabilityEvidenceStandard as {
      prohibitedFields: readonly string[];
    };
    expect(observability.prohibitedFields).toEqual(
      expect.arrayContaining([
        "secret",
        "token",
        "rawEndpoint",
        "connectionString",
        "stackTrace",
        "rawSdkError",
        "providerPayload",
      ]),
    );
  });

  it("preserves ISO SOC production live-provider and final acceptance non-claims", () => {
    expect(suite.scope.isoCertificationClaimAllowed).toBe(false);
    expect(suite.scope.socReadinessClaimAllowed).toBe(false);
    expect(suite.scope.productionReadinessClaimAllowed).toBe(false);
    expect(suite.scope.liveProviderReadinessClaimAllowed).toBe(false);
    expect(suite.scope.enterpriseProductionReadinessClaimAllowed).toBe(false);
    expect(suite.scope.finalTestReadinessClaimAllowed).toBe(false);
    expect(suite.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);

    for (const claim of prohibitedClaims) {
      expect(suite.nonClaims).toContain(claim);
      expect(suite.allowedClaims).not.toContain(claim);
    }
  });
});
