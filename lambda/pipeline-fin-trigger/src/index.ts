import { CodePipelineCloudWatchPipelineEvent } from 'aws-lambda';
import { DateTime } from 'luxon';
import { AppDynamoDbClient } from '../../shared/utils/dynamo-db-client';
import { BuildHistoryEntity } from '../../shared/models/build-history-entity';
import { CIEvent } from '../../shared/models/ci-event';
import { AppHttpClient } from '../../shared/utils/http-client';

export const handler = async (event: CodePipelineCloudWatchPipelineEvent, context: any): Promise<string> => {
  console.log(`event: ${JSON.stringify(event, null, 2)}`);

  const buildHistoryTableName = process.env['BUILD_HISTORY_TABLE_NAME'];
  const githubAppFuncUrl = process.env['GITHUB_APP_FUNC_URL'];
  const awsRegion = process.env['AWS_REGION'];

  if (!buildHistoryTableName) throw new Error('missing BUILD_HISTORY_TABLE_NAME');
  if (!githubAppFuncUrl) throw new Error('missing GITHUB_APP_FUNC_URL');
  if (!awsRegion) throw new Error('missing AWS_REGION');

  const dynamodb = new AppDynamoDbClient();
  const appHttpClient = new AppHttpClient({ awsRegion });

  const now = DateTime.now().toISO();

  const executionId = event.detail['execution-id'];
  // Pipeline status
  // "STARTED" | "SUCCEEDED" | "RESUMED" | "FAILED" | "CANCELED" | "SUPERSEDED";
  const pipelineStatus = event.detail.state;
  console.log(`pipeline の実行が完了しました executionId: ${executionId}`);

  const buildHistories = await dynamodb.query<BuildHistoryEntity>({
    TableName: buildHistoryTableName,
    IndexName: 'executionIdIndex',
    KeyConditionExpression: 'executionId = :executionId',
    ExpressionAttributeValues: { ':executionId': executionId },
  });
  console.log(`found buildHistories: ${JSON.stringify(buildHistories, null, 2)}`);

  for (const history of buildHistories) {
    const next: BuildHistoryEntity = {
      ...history,
      status: pipelineStatus,
      completedAt: now,
    };

    const result = await dynamodb.put({
      TableName: buildHistoryTableName,
      Item: next,
    });

    console.log(`dynamodb put result: ${JSON.stringify(result, null, 2)}`);

    // GitHubApp に finish したことを通知
    console.log(`GitHubApp に pipeline ワークフロー完了を通知します`);
    const ciEvent: CIEvent = {
      buildId: history.buildId,
      eventTime: now,
      headSha: history.headSha,
      status: pipelineStatus,
      installationId: history.githubAppInstallationId,
      owner: history.owner,
      repo: history.repo,
      branchName: history.branchName,
    };

    const reqResult = await appHttpClient.postWithAwsSignV4({
      url: githubAppFuncUrl,
      body: ciEvent,
    });
    console.log(`req result: ${JSON.stringify(reqResult)}`);

    console.log(`pipeline finish. buildId: ${history.buildId}, result: ${pipelineStatus}`);
  }

  console.log(`handler completed`);

  return executionId;
};
