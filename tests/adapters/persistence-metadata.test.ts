import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql0001 = readFileSync("adapters/db/migrations/0001-bootstrap.sql", "utf8");
const sql0002 = readFileSync(
  "adapters/db/migrations/0002-enterprise-persistence-metadata.sql",
  "utf8",
);
const sql = `${sql0001}\n${sql0002}`;
const registry = JSON.parse(
  readFileSync("docs/architecture/persistent-object-classification-registry.json", "utf8"),
) as {
  classes: Record<string, { requiredFields: string[] }>;
  objects: Record<string, { class: string }>;
};

const EXPECTED_CLASSES = [
  "append-only-ledger",
  "audit-evidence",
  "cross-tenant-aggregate",
  "ephemeral-runtime-state",
  "global-reference",
  "migration-control-plane",
  "system-internal",
  "tenant-scoped",
];

describe("enterprise persistence metadata and classification standard", () => {
  it("classifies every created table in the registry", () => {
    const tables = [...sql.matchAll(/CREATE TABLE (\w+)/g)].map((match) => match[1] ?? "");
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(Object.keys(registry.objects)).toContain(table);
    }
  });

  it("defines all eight persistent-object classifications", () => {
    expect(Object.keys(registry.classes).sort()).toEqual([...EXPECTED_CLASSES].sort());
  });

  it("adds the required tenant-scoped metadata columns to tenant_memberships", () => {
    const required = registry.classes["tenant-scoped"]?.requiredFields ?? [];
    expect(required.length).toBeGreaterThan(0);
    for (const column of required) {
      if (column === "tenant_id") {
        continue; // present in the 0001 baseline
      }
      expect(sql).toContain(`ALTER TABLE tenant_memberships ADD COLUMN ${column} `);
    }
  });

  it("installs the integrity guardrail triggers", () => {
    for (const fn of [
      "enforce_row_lifecycle",
      "enforce_legal_hold",
      "audit_ledger_append_only",
      "audit_ledger_hash_chain",
    ]) {
      expect(sql0002).toContain(fn);
    }
  });

  it("adds the migration-control-plane table", () => {
    expect(sql0002).toContain("CREATE TABLE schema_migrations");
  });

  it("uses no SECURITY DEFINER in any migration", () => {
    expect(/SECURITY DEFINER/i.test(sql)).toBe(false);
  });
});
