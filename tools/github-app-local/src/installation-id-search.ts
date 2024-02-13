import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { App } from 'octokit';
dotenv.config({ path: path.join(__dirname, `../.env.local`) });

const GITHUB_APP_PRIVATE_KEY_FILE_NAME = 'github-app-private-key.pem';

const GITHUB_APP_ID = process.env['GITHUB_APP_ID'];
const GITHUB_OWNER = process.env['GITHUB_OWNER'];
const GITHUB_REPO = process.env['GITHUB_REPO'];

if (!GITHUB_APP_ID) throw new Error('GITHUB_APP_ID undefined');
if (!GITHUB_OWNER) throw new Error('GITHUB_OWNER undefined');
if (!GITHUB_REPO) throw new Error('GITHUB_REPO undefined');

console.log(`GITHUB_APP_ID: ${GITHUB_APP_ID}`);
console.log(`GITHUB_OWNER: ${GITHUB_OWNER}`);
console.log(`GITHUB_REPO: ${GITHUB_REPO}`);

const privateKeyBuffer = fs.readFileSync(path.join(__dirname, `../${GITHUB_APP_PRIVATE_KEY_FILE_NAME}`));

const app = new App({
  appId: GITHUB_APP_ID,
  privateKey: privateKeyBuffer.toString(),
});

export const getInstallationId = async (params: { owner: string; repo: string }): Promise<string> => {
  const { owner, repo } = params;

  const res = await app.octokit.request({
    url: `https://api.github.com/repos/${owner}/${repo}/installation`,
    method: 'get',
  });

  const data = res.data as { id: string };
  return data.id;
};

const main = async () => {
  const installationId = await getInstallationId({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  });

  console.log(`\ninstallation id for (${GITHUB_OWNER}/${GITHUB_REPO}): ${installationId}`);
};

main();
