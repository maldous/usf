declare module "clamscan" {
  import type { Readable } from "node:stream";

  export interface ClamScanOptions {
    readonly removeInfected: boolean;
    readonly quarantineInfected: false | string;
    readonly scanLog: null | string;
    readonly debugMode: boolean;
    readonly clamscan: {
      readonly active: boolean;
    };
    readonly clamdscan: {
      readonly socket: null | string;
      readonly host: string;
      readonly port: number;
      readonly timeout: number;
      readonly localFallback: boolean;
      readonly active: boolean;
      readonly bypassTest: boolean;
      readonly tls: boolean;
    };
    readonly preference: "clamdscan";
  }

  export interface ClamScanResult {
    readonly file?: string;
    readonly isInfected: boolean | null;
    readonly viruses?: readonly string[];
  }

  export interface ClamScanClient {
    ping(): Promise<unknown>;
    getVersion(): Promise<string>;
    scanStream(stream: Readable): Promise<ClamScanResult>;
  }

  export default class NodeClam {
    init(options: ClamScanOptions): Promise<ClamScanClient>;
  }
}
