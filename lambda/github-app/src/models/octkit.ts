export type RunStatus = 'queued' | 'in_progress' | 'completed';
export type RunConclusion = 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';

interface RunOutput {
  title: string | null;
  summary: string | null;
  text: string | null;
  annotations_count: number;
  annotations_url: string;
}

export interface CreateCheckRunResponseData {
  /** check_run_id */
  id: number;
  name: string;
  node_id: string;
  head_sha: string;
  external_id: string;
  url: string;
  html_url: string;
  details_url: string;
  status: RunStatus;
  conclusion: RunConclusion | null;
  started_at: string;
  completed_at: string | null;
  output: RunOutput;
  check_suite: { id: number };
  // pull_requests: []
}

export interface UpdateCheckRunResponseData {
  /** check_run_id */
  id: number;
  name: string;
  node_id: string;
  head_sha: string;
  external_id: string;
  url: string;
  html_url: string;
  details_url: string;
  status: RunStatus;
  conclusion: RunConclusion | null;
  started_at: string;
  completed_at: string | null;
  output: RunOutput;
  check_suite: { id: number };
  // pull_requests: []
}
