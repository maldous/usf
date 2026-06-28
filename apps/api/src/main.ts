import { pathToFileURL } from "node:url";
import { DEV_PROVIDER_MODE_LABEL } from "./runtime.ts";
import { buildApi } from "./server.ts";

export async function main(): Promise<void> {
  const app = buildApi();
  const host = process.env.HOST ?? "127.0.0.1";
  const address = await app.listen({ host, port: Number(process.env.PORT ?? 3001) });
  const baseUrl = address.replace("0.0.0.0", "127.0.0.1");
  console.log("USF V2 dev runtime started");
  console.log(`API: ${baseUrl}`);
  console.log(`Health: ${baseUrl}/healthz`);
  console.log(`OpenAPI: ${baseUrl}/openapi.json`);
  console.log(`Provider mode: ${DEV_PROVIDER_MODE_LABEL}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
