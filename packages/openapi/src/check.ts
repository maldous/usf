import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildOpenApiDocument } from "./index.ts";

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortJson(item)]),
    );
  }
  return value;
}

export function checkOpenApiContract(): void {
  const committed = JSON.parse(readFileSync(new URL("../openapi.json", import.meta.url), "utf8"));
  const generated = buildOpenApiDocument();
  if (JSON.stringify(sortJson(committed)) !== JSON.stringify(sortJson(generated))) {
    throw new Error("Committed OpenAPI contract is stale");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkOpenApiContract();
  console.log(JSON.stringify({ status: "pass", check: "openapi-contract" }));
}
