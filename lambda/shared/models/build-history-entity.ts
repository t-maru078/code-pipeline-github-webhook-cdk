import { CodePipelineStatus } from './code-pipeline-status';

export type BuildHistoryStatus = 'QUEUED' | CodePipelineStatus;

export interface BuildHistoryEntity {
  buildId: string;
  executionId?: string;

  headSha: string;
  repo: string;
  owner: string;
  branchName: string;
  status: BuildHistoryStatus;
  githubAppInstallationId: number;
  checkRunId?: number;

  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;

  /**
   * TTL 機能により自動削除するための属性 (unixtime)
   * queue + 1 日 を設定
   */
  expire: number;
}
