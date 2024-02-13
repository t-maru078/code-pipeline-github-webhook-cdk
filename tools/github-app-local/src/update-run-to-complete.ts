import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { App } from 'octokit';
import { DateTime } from 'luxon';
dotenv.config({ path: path.join(__dirname, `../.env.local`) });

const GITHUB_APP_PRIVATE_KEY_FILE_NAME = 'github-app-private-key.pem';

const GITHUB_APP_ID = process.env['GITHUB_APP_ID'];
const GITHUB_OWNER = process.env['GITHUB_OWNER'];
const GITHUB_REPO = process.env['GITHUB_REPO'];
const TARGET_RUN_ID = process.env['TARGET_RUN_ID'];

if (!GITHUB_APP_ID) throw new Error('GITHUB_APP_ID undefined');
if (!GITHUB_OWNER) throw new Error('GITHUB_OWNER undefined');
if (!GITHUB_REPO) throw new Error('GITHUB_REPO undefined');
if (!TARGET_RUN_ID) throw new Error('TARGET_RUN_ID undefined');

console.log(`GITHUB_APP_ID: ${GITHUB_APP_ID}`);
console.log(`GITHUB_OWNER: ${GITHUB_OWNER}`);
console.log(`GITHUB_REPO: ${GITHUB_REPO}`);
console.log(`TARGET_RUN_ID: ${TARGET_RUN_ID}`);

const privateKeyBuffer = fs.readFileSync(path.join(__dirname, `../${GITHUB_APP_PRIVATE_KEY_FILE_NAME}`));

const app = new App({
  appId: GITHUB_APP_ID,
  privateKey: privateKeyBuffer.toString(),
});

const getInstallationId = async (params: { owner: string; repo: string }): Promise<number> => {
  const { owner, repo } = params;

  const res = await app.octokit.request({
    url: `https://api.github.com/repos/${owner}/${repo}/installation`,
    method: 'get',
  });

  const data = res.data as { id: number };
  return data.id;
};

const updateToComplete = async (params: {
  owner: string;
  repo: string;
  checkRunId: number;
  installationId: number;
  completedAt: string;
}) => {
  const { owner, repo, checkRunId, installationId, completedAt } = params;

  const octokit = await app.getInstallationOctokit(installationId);

  const data = {
    status: 'completed',
    conclusion: 'success',
    completed_at: completedAt,
  };

  const res = await octokit.request({
    url: `https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`,
    method: 'patch',
    data,
  });

  console.log(`patch to complete success: ${JSON.stringify(res, null, 2)}`);
};

const main = async () => {
  const installationId = await getInstallationId({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  });

  console.log(`\ninstallation id for (${GITHUB_OWNER}/${GITHUB_REPO}): ${installationId}`);

  await updateToComplete({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    checkRunId: Number(TARGET_RUN_ID),
    installationId,
    completedAt: DateTime.now().toISO(),
  });
};

main();
