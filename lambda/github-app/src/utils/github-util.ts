// import * as crypto from 'crypto';
import { App } from 'octokit';
import { CreateCheckRunResponseData, RunConclusion, RunStatus, UpdateCheckRunResponseData } from '../models/octkit';
import { GITHUB_CHECK_NAME } from '../../../shared/configurations/config';

interface CreateCheckData {
  name: string;
  head_sha: string;
  status: RunStatus;
}

interface UpdateCheckRunData {
  status: RunStatus;
  conclusion?: RunConclusion;
  started_at?: string;
  completed_at?: string;
}

export class GithubAppUtil {
  private app: App;

  constructor(props: { appId: string | number; privateKey: string }) {
    this.app = new App(props);
  }

  async createCheck(params: { owner: string; repo: string; headSha: string; installationId: number }): Promise<number> {
    const { owner, repo, headSha, installationId } = params;

    const data: CreateCheckData = {
      name: GITHUB_CHECK_NAME,
      head_sha: headSha,
      status: 'queued',
    };

    const octokit = await this.app.getInstallationOctokit(installationId);

    const res = await octokit.request<CreateCheckRunResponseData>({
      url: `https://api.github.com/repos/${owner}/${repo}/check-runs`,
      method: 'post',
      data,
    });

    console.log(`create check response: ${JSON.stringify(res, null, 2)}`);

    // check_run_id を返却
    return res.data.id;
  }

  private async updateCheck(params: {
    owner: string;
    repo: string;
    installationId: number;
    checkRunId: number;
    data: UpdateCheckRunData;
  }): Promise<UpdateCheckRunResponseData> {
    const { owner, repo, installationId, checkRunId, data } = params;

    const octokit = await this.app.getInstallationOctokit(installationId);

    const res = await octokit.request<UpdateCheckRunResponseData>({
      url: `https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`,
      method: 'patch',
      data,
    });

    return res.data;
  }

  async startCheck(params: {
    owner: string;
    repo: string;
    startedAt: string;
    installationId: number;
    checkRunId: number;
  }): Promise<void> {
    const { owner, repo, startedAt, installationId, checkRunId } = params;

    const data: UpdateCheckRunData = {
      status: 'in_progress',
      started_at: startedAt,
    };

    const resData = await this.updateCheck({ owner, repo, installationId, checkRunId, data });

    console.log(`start check response: ${JSON.stringify(resData, null, 2)}`);
  }

  async completeCheck(params: {
    owner: string;
    repo: string;
    completedAt: string;
    installationId: number;
    checkRunId: number;
    conclusion: RunConclusion;
  }): Promise<void> {
    const { owner, repo, completedAt, installationId, checkRunId, conclusion } = params;

    const data: UpdateCheckRunData = {
      status: 'completed',
      conclusion,
      completed_at: completedAt,
    };
    console.log(`complete check request: ${JSON.stringify(data, null, 2)}`);

    const resData = await this.updateCheck({ owner, repo, installationId, checkRunId, data });

    console.log(`complete (${conclusion}) check response: ${JSON.stringify(resData, null, 2)}`);
  }

  // NOTE: GitHub からのリクエストを受け取る場合に使用
  // static validateSignature(params: { secret: string; signature: string; body: any }): void {
  //   const { secret, signature, body } = params;
  //   const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
  //   const checksum = `sha256=${digest}`;
  //   if (signature !== checksum) throw new Error('signature invalid');
  // }
}
