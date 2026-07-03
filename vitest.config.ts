import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage/test-readiness",
      include: [
        "capabilities/audit/src/recorder.ts",
        "capabilities/audit/src/safe-view.ts",
        "capabilities/auth/src/index.ts",
        "capabilities/files/src/index.ts",
        "capabilities/jobs/src/index.ts",
        "capabilities/tenant/src/authorization-policy.ts",
        "capabilities/tenant/src/pdp.ts",
        "packages/contracts/src/index.ts",
        "packages/ports/src/index.ts",
        "packages/source/src/index.ts",
      ],
      exclude: ["**/*.d.ts", "adapters/db/src/generated-types.ts", "packages/proof/src/**"],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
