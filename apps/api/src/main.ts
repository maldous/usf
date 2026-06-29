import { pathToFileURL } from "node:url";
import { createDevRuntime } from "./runtime.ts";
import { buildApi } from "./server.ts";

export async function main(): Promise<void> {
  const runtime = createDevRuntime();
  const app = buildApi({ runtime });
  const host = process.env.HOST ?? "127.0.0.1";
  const address = await app.listen({ host, port: Number(process.env.PORT ?? 3001) });
  const baseUrl = address.replace("0.0.0.0", "127.0.0.1");
  console.log("USF V2 dev runtime started");
  console.log(`API: ${baseUrl}`);
  console.log(`Health: ${baseUrl}/healthz`);
  console.log(`OpenAPI: ${baseUrl}/openapi.json`);
  console.log(`Runtime mode: ${runtime.runtimeMode}`);
  console.log(`Provider mode: ${runtime.providerModeLabel}`);
  if (runtime.deferredBoundaries.length > 0) {
    console.log(`Deferred boundaries: ${runtime.deferredBoundaries.join("; ")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
