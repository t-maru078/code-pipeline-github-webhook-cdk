import { LambdaFunctionURLEvent } from 'aws-lambda';
import { CIEvent } from '../../shared/models/ci-event';
import { findSecretValue } from '../../shared/utils/secret-manager-util';
import { commandMap } from './commands';

const GITHUB_APP_ID = process.env['GITHUB_APP_ID'];
const GITHUB_APP_INFO_SECRET_NAME = process.env['GITHUB_APP_INFO_SECRET_NAME'];
const BUILD_HISTORY_TABLE_NAME = process.env['BUILD_HISTORY_TABLE_NAME'];

if (!GITHUB_APP_ID) throw new Error('missing GITHUB_APP_ID');
if (!GITHUB_APP_INFO_SECRET_NAME) throw new Error('missing GITHUB_APP_INFO_SECRET_NAME');
if (!BUILD_HISTORY_TABLE_NAME) throw new Error('missing BUILD_HISTORY_TABLE_NAME');

export const handler = async (event: LambdaFunctionURLEvent, context: any) => {
  console.log(`event: `, event);

  if (!event.body) {
    throw new Error('body が設定されていません');
  }

  const ciEvent = JSON.parse(event.body) as CIEvent;

  const privateKeyBase64 = await findSecretValue({
    secretName: GITHUB_APP_INFO_SECRET_NAME,
    jsonKeyName: 'GITHUB_APP_PRIVATE_KEY',
  });

  const commandClass = commandMap[ciEvent.status];
  if (!commandClass) {
    console.error(`不明な status が指定されたため commandClass が null です`);
    return { process: 'failed' };
  }

  const command = new commandClass({
    githubAppId: GITHUB_APP_ID,
    githubAppPrivateKeyBase64: privateKeyBase64,
    buildHistoryTableName: BUILD_HISTORY_TABLE_NAME,
  });

  await command.execute(ciEvent);

  console.log(`handler completed`);

  return { process: 'succeeded' };
};
