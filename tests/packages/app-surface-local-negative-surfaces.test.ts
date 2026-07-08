import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const loadJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;

interface AdsPlaceholderSurface {
  ownerIssueId: "USF-1028";
  placeholderMappings: Array<{
    consentRef: string;
    privacyClassificationRef: string;
    thirdPartySdkRefs: string[];
    liveAdServingAllowed: boolean;
    adSdkAllowed: boolean;
    consentManagementPlatformAllowed: boolean;
    monetisationProviderAllowed: boolean;
    externalProviderAllowed: boolean;
  }>;
  nonClaims: Record<string, boolean>;
}

interface StoreMetadataSurface {
  ownerIssueId: "USF-1029";
  metadataSurface: {
    semanticAuthorityRef: string;
    versionAuthorityRef: string;
    releaseEvidenceRef: string;
    storeAssetRefs: string[];
    privacyInputRefs: string[];
    matchesCurrentSemantics: boolean;
    localOnly: boolean;
    appStoreRecordCreated: boolean;
    playStoreRecordCreated: boolean;
    storeSubmissionCreated: boolean;
  };
  nonClaims: Record<string, boolean>;
}

interface DeploymentEvidenceSurface {
  ownerIssueId: "USF-1030";
  deploymentEvidenceSurface: {
    targetCommitRef: string;
    commitBinding: string;
    artifactHashRef: string;
    provenanceRefs: string[];
    freshnessRef: string;
    semanticVersionAuthorityRef: string;
    localOnly: boolean;
    deploymentPerformed: boolean;
    stagingProofCreated: boolean;
    providerSetupCreated: boolean;
    productionEvidenceCreated: boolean;
  };
  nonClaims: Record<string, boolean>;
}

describe("app-surface local negative and fixture-only surfaces", () => {
  it("keeps ads and monetisation as no-live placeholders with consent and privacy mapping", () => {
    const surface = loadJson<AdsPlaceholderSurface>(
      "docs/architecture/app-surface-ads-monetisation-placeholder-surface.json",
    );
    const conforming = loadJson<{ mapping: Record<string, unknown> }>(
      "tools/validate-app-surface/fixtures/conforming/006-ad-placement-with-consent-privacy.json",
    );
    const planted = loadJson<{ expectedFailureRuleId: string; mapping: Record<string, unknown> }>(
      "tools/validate-app-surface/planted-defects/006-ad-placement-without-consent-privacy.json",
    );
    const mapping = surface.placeholderMappings[0];
    expect(mapping).toBeDefined();
    if (!mapping) {
      throw new Error("ads placeholder mapping is missing");
    }
    expect(surface.ownerIssueId).toBe("USF-1028");
    expect(mapping.consentRef).toBe(conforming.mapping.consentRef);
    expect(mapping.privacyClassificationRef).toBe(conforming.mapping.privacyClassificationRef);
    expect(mapping.thirdPartySdkRefs).toEqual(["no-ad-sdk-adopted-currently"]);
    expect(mapping.liveAdServingAllowed).toBe(false);
    expect(mapping.adSdkAllowed).toBe(false);
    expect(mapping.consentManagementPlatformAllowed).toBe(false);
    expect(mapping.monetisationProviderAllowed).toBe(false);
    expect(mapping.externalProviderAllowed).toBe(false);
    expect(planted.expectedFailureRuleId).toBe("USF-APP-SURFACE-VALIDATOR-006");
    expect(planted.mapping.privacyClassificationRef).toBeUndefined();
    expect(Object.values(surface.nonClaims).every((value) => value === false)).toBe(true);
  });

  it("keeps store metadata local and catches mismatch semantics through USF-935 fixtures", () => {
    const surface = loadJson<StoreMetadataSurface>(
      "docs/architecture/app-surface-store-metadata-semantic-surface.json",
    );
    const conforming = loadJson<{ metadata: Record<string, unknown> }>(
      "tools/validate-app-surface/fixtures/conforming/007-store-metadata-matches-semantics.json",
    );
    const planted = loadJson<{ expectedFailureRuleId: string; metadata: Record<string, unknown> }>(
      "tools/validate-app-surface/planted-defects/007-store-metadata-mismatch.json",
    );
    expect(surface.ownerIssueId).toBe("USF-1029");
    expect(surface.metadataSurface.semanticAuthorityRef).toBe(conforming.metadata.semanticAuthorityRef);
    expect(surface.metadataSurface.versionAuthorityRef).toBe(conforming.metadata.versionAuthorityRef);
    expect(surface.metadataSurface.releaseEvidenceRef).toBe(conforming.metadata.releaseEvidenceRef);
    expect(surface.metadataSurface.matchesCurrentSemantics).toBe(true);
    expect(surface.metadataSurface.localOnly).toBe(true);
    expect(surface.metadataSurface.appStoreRecordCreated).toBe(false);
    expect(surface.metadataSurface.playStoreRecordCreated).toBe(false);
    expect(surface.metadataSurface.storeSubmissionCreated).toBe(false);
    expect(planted.expectedFailureRuleId).toBe("USF-APP-SURFACE-VALIDATOR-007");
    expect(planted.metadata.matchesCurrentSemantics).toBe(false);
    expect(Object.values(surface.nonClaims).every((value) => value === false)).toBe(true);
  });

  it("keeps deployment evidence local and pinned to the current-head binding without deployment", () => {
    const surface = loadJson<DeploymentEvidenceSurface>(
      "docs/architecture/app-surface-deployment-evidence-pinning-surface.json",
    );
    const conforming = loadJson<{ deployment: Record<string, unknown> }>(
      "tools/validate-app-surface/fixtures/conforming/012-deployment-evidence-current-commit.json",
    );
    const planted = loadJson<{ expectedFailureRuleId: string; deployment: Record<string, unknown> }>(
      "tools/validate-app-surface/planted-defects/012-deployment-evidence-wrong-commit.json",
    );
    expect(surface.ownerIssueId).toBe("USF-1030");
    expect(surface.deploymentEvidenceSurface.targetCommitRef).toBe("__CURRENT_GIT_HEAD__");
    expect(surface.deploymentEvidenceSurface.commitBinding).toBe("current-git-head");
    expect(surface.deploymentEvidenceSurface.artifactHashRef).toBe(conforming.deployment.artifactHashRef);
    expect(surface.deploymentEvidenceSurface.freshnessRef).toBe(conforming.deployment.freshnessRef);
    expect(surface.deploymentEvidenceSurface.localOnly).toBe(true);
    expect(surface.deploymentEvidenceSurface.deploymentPerformed).toBe(false);
    expect(surface.deploymentEvidenceSurface.stagingProofCreated).toBe(false);
    expect(surface.deploymentEvidenceSurface.providerSetupCreated).toBe(false);
    expect(surface.deploymentEvidenceSurface.productionEvidenceCreated).toBe(false);
    expect(planted.expectedFailureRuleId).toBe("USF-APP-SURFACE-VALIDATOR-012");
    expect(planted.deployment.targetCommitRef).toBe("0000000000000000000000000000000000000000");
    expect(Object.values(surface.nonClaims).every((value) => value === false)).toBe(true);
  });
});
