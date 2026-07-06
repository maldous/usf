import {
  sourceRuntimeImportAllowed,
  sourcePathMirroringAllowed,
  sourceUseTreatments,
} from "@foundation/source";
import { describe, expect, it } from "vitest";

describe("source-use package", () => {
  it("exposes the allowed bootstrap source-use treatments and runtime-copy guardrails", () => {
    expect(sourceUseTreatments).toEqual([
      "source-derived-adapt",
      "source-derived-rewrite",
      "new-with-rationale",
      "evidence-only-support",
    ]);
    expect(sourceRuntimeImportAllowed).toBe(false);
    expect(sourcePathMirroringAllowed).toBe(false);
  });
});
