import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generatedFromMigrationSha256 } from "./generated-types.ts";

export function migrationSha256(): string {
  const migration = readFileSync(new URL("../migrations/0001-bootstrap.sql", import.meta.url));
  return createHash("sha256").update(migration).digest("hex");
}

export function checkGeneratedTypes(): void {
  const actual = migrationSha256();
  if (actual !== generatedFromMigrationSha256) {
    throw new Error(
      `Generated DB types are stale: expected ${generatedFromMigrationSha256}, observed ${actual}`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkGeneratedTypes();
  console.log(JSON.stringify({ status: "pass", check: "generated-db-types" }));
}
