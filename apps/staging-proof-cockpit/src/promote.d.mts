export type MachineRunReport = {
  qaRun: string;
  sourceSha: string;
  deploymentSha?: string;
  environment?: string;
  completedAt?: string;
  startedAt?: string;
  counts?: Record<string, number>;
  [key: string]: unknown;
};

export type MachineRunRecord = {
  runId: string;
  sourceSha: string;
  artifactDir: string;
  routeCount?: number;
  passCount?: number;
  warnCount?: number;
  gapCount?: number;
  failCount?: number;
  payloadPruned?: boolean;
  [key: string]: unknown;
};

export type EvidenceStore = {
  sourceSha?: string;
  deploymentSha?: string;
  latestMachineRun?: Record<string, unknown>;
  machineRunHistory?: Array<Record<string, unknown>>;
  supersessionHistory?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type PromotedStore = {
  sourceSha: string;
  deploymentSha: string;
  latestMachineRun: MachineRunRecord;
  machineRunHistory: MachineRunRecord[];
  supersessionHistory: Array<{ toRunId: string; fromRunId?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export function computePromotion(
  store: EvidenceStore,
  report: MachineRunReport,
  artifactDir: string,
): PromotedStore;
