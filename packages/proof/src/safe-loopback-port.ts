import { createServer } from "node:net";

const FETCH_FORBIDDEN_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102,
  103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465,
  512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993,
  995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668,
  6669, 6679, 6697, 10080,
]);

function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

function isFetchSafeLoopbackPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535 && !FETCH_FORBIDDEN_PORTS.has(port);
}

function assertFetchSafeLoopbackPort(
  port: number,
  message = "proof-selected-fetch-forbidden-loopback-port",
): void {
  if (!isFetchSafeLoopbackPort(port)) throw new Error(message);
}

async function allocateFetchSafeLoopbackPort(label = "proof"): Promise<number> {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const server = createServer();
    try {
      const port = await new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          if (typeof address === "object" && address !== null) {
            resolve(address.port);
            return;
          }
          reject(new Error(`${label}-safe-port-allocation-failed`));
        });
      });
      await closeServer(server);
      if (isFetchSafeLoopbackPort(port)) return port;
    } catch (error) {
      await closeServer(server);
      if (attempt === 20) throw error;
    }
  }
  throw new Error(`${label}-safe-port-allocation-exhausted`);
}

export { allocateFetchSafeLoopbackPort, assertFetchSafeLoopbackPort };
