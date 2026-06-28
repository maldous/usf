import { checkOpenApiContract } from "../../packages/openapi/src/check.ts";
import { describe, expect, it } from "vitest";

describe("openapi contract", () => {
  it("matches the generated route contract", () => {
    expect(() => checkOpenApiContract()).not.toThrow();
  });
});
