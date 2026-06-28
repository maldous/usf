import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { API_ROUTE_CONTRACTS } from "@foundation/contracts";
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
  checkRouteCoverage(committed);
  checkOperationIds(committed);
  checkMetadataAndSchemas(committed);
  checkSafeExamplesAndClaims(committed);
}

function checkRouteCoverage(document: unknown): void {
  const paths = objectAt(document, "paths");
  const expected = new Set(
    API_ROUTE_CONTRACTS.map((route) => `${route.method} ${route.openapiPath}`),
  );
  const actual = new Set<string>();
  for (const [path, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== "object" || Array.isArray(methods)) continue;
    for (const method of Object.keys(methods)) {
      actual.add(`${method.toUpperCase()} ${path}`);
    }
  }
  for (const route of expected) {
    if (!actual.has(route)) {
      throw new Error(`OpenAPI missing implemented route ${route}`);
    }
  }
  for (const route of actual) {
    if (!expected.has(route)) {
      throw new Error(`OpenAPI contains route without implementation metadata ${route}`);
    }
  }
}

function checkOperationIds(document: unknown): void {
  const seen = new Set<string>();
  for (const operation of operations(document)) {
    const operationId = stringAt(operation, "operationId");
    if (seen.has(operationId)) {
      throw new Error(`Duplicate OpenAPI operationId ${operationId}`);
    }
    seen.add(operationId);
  }
}

function checkMetadataAndSchemas(document: unknown): void {
  for (const operation of operations(document)) {
    const metadata = objectAt(operation, "x-usf-route");
    for (const field of [
      "routeId",
      "routeClassification",
      "owningCapability",
      "pdpPolicy",
      "tenantScope",
      "idempotencyPolicy",
      "paginationPolicy",
      "lifecycle",
      "sourceUseDisposition",
    ]) {
      if (!(field in metadata)) {
        throw new Error(`OpenAPI operation missing x-usf-route.${field}`);
      }
    }
    const responses = objectAt(operation, "responses");
    for (const [status, response] of Object.entries(responses)) {
      const content = objectAt(response, "content");
      const json = objectAt(content, "application/json");
      const schema = objectAt(json, "schema");
      if (!("$ref" in schema) && !("type" in schema)) {
        throw new Error(`OpenAPI response ${status} missing schema ref/type`);
      }
    }
  }
}

function checkSafeExamplesAndClaims(document: unknown): void {
  const text = JSON.stringify(document);
  for (const needle of [
    "client_secret",
    "private_key",
    "Authorization:",
    "cookie",
    "password",
    "api_key",
    "object_key",
    "recipientAddressRef",
    "secret://",
    "-----BEGIN",
    "@example.com",
    "@example.test",
    "production ready",
    "public API readiness",
    "external SDK readiness",
  ]) {
    if (text.toLowerCase().includes(needle.toLowerCase())) {
      throw new Error(`OpenAPI contains forbidden or overclaiming content: ${needle}`);
    }
  }
  if (/Bearer\s+[A-Za-z0-9._-]+/.test(text)) {
    throw new Error("OpenAPI contains forbidden bearer token-shaped content");
  }
}

function operations(document: unknown): unknown[] {
  const paths = objectAt(document, "paths");
  const out: unknown[] = [];
  for (const methods of Object.values(paths)) {
    if (!methods || typeof methods !== "object" || Array.isArray(methods)) continue;
    for (const [method, operation] of Object.entries(methods)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        out.push(operation);
      }
    }
  }
  return out;
}

function objectAt(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`OpenAPI expected object before ${key}`);
  }
  const item = (value as Record<string, unknown>)[key];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`OpenAPI expected object at ${key}`);
  }
  return item as Record<string, unknown>;
}

function stringAt(value: unknown, key: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`OpenAPI expected object before ${key}`);
  }
  const item = (value as Record<string, unknown>)[key];
  if (typeof item !== "string" || !item) {
    throw new Error(`OpenAPI expected string at ${key}`);
  }
  return item;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkOpenApiContract();
  console.log(JSON.stringify({ status: "pass", check: "openapi-contract" }));
}
