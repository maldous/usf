import { pathToFileURL } from "node:url";
import { runWorkerSmoke } from "./worker.ts";

export async function main(): Promise<void> {
  const summary = await runWorkerSmoke();
  console.log("USF V2 dev worker started");
  console.log(`Runtime mode: ${summary.runtimeMode}`);
  console.log(`Provider mode: ${summary.providerMode}`);
  console.log(`Scheduled smoke job: ${summary.jobId}`);
  console.log(`Worker audit events captured: ${summary.auditEvents}`);
  console.log(`Worker proof summary: ${JSON.stringify(summary)}`);
  if (process.env.USF_WORKER_RUN_ONCE === "1") {
    return;
  }
  const keepAlive = setInterval(() => undefined, 60_000);
  await new Promise<void>((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  clearInterval(keepAlive);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
