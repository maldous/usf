export const devProviderPlan = Object.freeze({
  config: "in-memory",
  idp: "in-memory",
  bus: "in-memory",
  workflow: "in-memory",
  objectStore: "in-memory",
  secrets: "in-memory",
  mail: "in-memory",
  observability: "captured-local",
});

export const testComposeProviders = Object.freeze([
  "postgres",
  "keycloak",
  "nats",
  "temporal",
  "minio",
  "openbao",
  "otel-collector",
  "prometheus",
  "grafana",
  "loki",
  "tempo",
  "mailpit",
  "webhook-sink",
] as const);

export class InMemoryConfigProvider {
  readonly #values = new Map<string, string>(
    Object.entries(devProviderPlan).map(([key, value]) => [`provider.${key}`, value]),
  );

  read(key: string): string | undefined {
    return this.#values.get(key);
  }

  list(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.#values);
  }
}

export function assertNoInMemoryProviderInTest(providerName: string): void {
  if (providerName.includes("in-memory")) {
    throw new Error(`Test provider must not be in-memory: ${providerName}`);
  }
}
