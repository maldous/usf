import type { IncomingMessage, Server, ServerResponse } from "node:http";

export type ProofData = unknown;

export type ProofReviewAction = {
  id?: string;
  actionType?: string;
  evidenceId?: string;
  outcome?: string;
  acceptanceFingerprint?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type ProofState = {
  actions?: ProofReviewAction[];
  [key: string]: unknown;
};

export type ProofReviewItem = {
  id: string;
  acceptanceFingerprint: string;
  [key: string]: unknown;
};

export type ProofReviewDecision = {
  status: string;
  action?: ProofReviewAction;
  changedSinceAcceptance?: boolean;
  [key: string]: unknown;
};

export type FinalSignoffState = {
  counts: {
    accepted: number;
    rejected: number;
    retest: number;
    reReviewRequired: number;
    unreviewed: number;
  };
  finalSignoffAutoCompleted: boolean;
  machineBlockers: string[];
  openItems: ProofReviewItem[];
  signoffAction?: ProofReviewAction;
  signoffAvailable: boolean;
  signoffRecorded: boolean;
};

export function buildData(): ProofData;
export function getProofCockpitManifest(): unknown;
export function finalSignoffState(data: ProofData, state: ProofState): FinalSignoffState;
export function reviewItemDecision(state: ProofState, item: ProofReviewItem): ProofReviewDecision;
export function buildReviewItems(data: ProofData): ProofReviewItem[];
export function reviewItemFingerprint(item: ProofReviewItem): string;
export function renderProofCockpit(
  pathname: string,
  data?: ProofData,
  state?: ProofState,
  url?: URL,
): string;
export function createProofCockpitServer(options?: {
  statePath?: string;
}): Server<typeof IncomingMessage, typeof ServerResponse>;
export function startProofCockpitServer(options?: {
  port?: number;
  host?: string;
  statePath?: string;
  allowWrites?: boolean;
  reviewSecret?: string;
  actor?: string;
}): Server<typeof IncomingMessage, typeof ServerResponse>;
