import { CodePipelineStatus } from './code-pipeline-status';

export type CIEventStatus = 'QUEUED' | CodePipelineStatus;

export interface CIEvent {
  buildId: string;
  status: CIEventStatus;
  headSha: string;
  owner: string;
  repo: string;
  branchName: string;
  eventTime: string;
  installationId: number;
}
