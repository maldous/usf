import { checkOpenApiContract } from "../../packages/openapi/src/check.ts";
import { buildOpenApiDocument } from "@foundation/openapi";
import { API_ROUTE_CLASSIFICATIONS, API_ROUTE_CONTRACTS } from "@foundation/contracts";
import { describe, expect, it } from "vitest";

describe("openapi contract", () => {
  it("matches the generated route contract", () => {
    expect(() => checkOpenApiContract()).not.toThrow();
  });

  it("maps every implemented route contract to one unique OpenAPI operation", () => {
    const openapi = buildOpenApiDocument();
    const operations = new Set<string>();
    for (const route of API_ROUTE_CONTRACTS) {
      const operation = openapi.paths[route.openapiPath]?.[route.method.toLowerCase()];
      expect(operation).toBeTruthy();
      const operationId = String((operation as { operationId: string }).operationId);
      expect(operations.has(operationId)).toBe(false);
      operations.add(operationId);
      expect(operationId).toBe(route.openapiOperationId);
      expect(
        (operation as { "x-usf-route": { routeClassification: string } })["x-usf-route"],
      ).toMatchObject({
        routeClassification: route.routeClassification,
        owningCapability: route.owningCapability,
        lifecycle: route.lifecycle,
      });
      expect(API_ROUTE_CLASSIFICATIONS).toContain(route.routeClassification);
    }
    expect(operations.size).toBe(API_ROUTE_CONTRACTS.length);
  });

  it("documents safe examples and future UI/API metadata without public readiness claims", () => {
    const text = JSON.stringify(buildOpenApiDocument()).toLowerCase();
    for (const forbidden of [
      "client_secret",
      "private_key",
      "api_key",
      "raw stack",
      "live provider url",
      "production ready",
      "public api ready",
    ]) {
      expect(text).not.toContain(forbidden);
    }
    expect(text).toContain("corspolicy");
    expect(text).toContain("csrfpolicy");
    expect(text).toContain("securityheaderspolicy");
    expect(text).toContain("compatibilitypolicy");
    expect(text).toContain('"publicapireadinessclaim":false');
  });
});
