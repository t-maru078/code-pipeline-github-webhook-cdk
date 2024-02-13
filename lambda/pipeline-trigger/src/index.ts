import { S3Event } from 'aws-lambda';
import { DateTime } from 'luxon';
import { PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { AppDynamoDbClient } from '../../shared/utils/dynamo-db-client';
import { BuildHistoryEntity } from '../../shared/models/build-history-entity';
import { AppPipelineClient } from '../../shared/utils/pipeline-client';
import { CIEvent } from '../../shared/models/ci-event';
import { JST_DATE_FORMAT, TIME_ZONE } from '../../shared/configurations/config';
import { AppHttpClient } from '../../shared/utils/http-client';

export const handler = async (event: S3Event, context: any): Promise<string> => {
  console.log(`event: ${JSON.stringify(event, null, 2)}`);

  const buildHistoryTableName = process.env['BUILD_HISTORY_TABLE_NAME'];
  const ciPipelineName = process.env['CI_PIPELINE_NAME'];
  const githubAppFuncUrl = process.env['GITHUB_APP_FUNC_URL'];
  const awsRegion = process.env['AWS_REGION'];

  if (!buildHistoryTableName) throw new Error('missing BUILD_HISTORY_TABLE_NAME');
  if (!ciPipelineName) throw new Error('missing CI_PIPELINE_NAME');
  if (!githubAppFuncUrl) throw new Error('missing GITHUB_APP_FUNC_URL');
  if (!awsRegion) throw new Error('missing AWS_REGION');

  const dynamodb = new AppDynamoDbClient();
  const pipeline = new AppPipelineClient();
  const appHttpClient = new AppHttpClient({ awsRegion });

  if (event.Records.length !== 1) {
    throw new Error(`予期しない Record の件数です: ${event.Records.length} 件`);
  }

  const record = event.Records[0];
  const now = DateTime.now();

  // principalId に BuildId が含まれているので取り出し
  const splitPrincipalData = record.userIdentity.principalId.split('AWSCodeBuild-');
  if (splitPrincipalData.length !== 2) {
    throw new Error('buildId の取得に失敗しました');
  }
  const buildId = splitPrincipalData[1];

  const entity = await dynamodb.get<BuildHistoryEntity | undefined>({
    TableName: buildHistoryTableName,
    Key: { buildId },
  });
  if (!entity) {
    throw new Error(`buildId: ${buildId} に対する buildHistory がありません`);
  }

  const executionId = await pipeline.startPipeline({ pipelineName: ciPipelineName });
  if (!executionId) {
    throw new Error('executionId が空です');
  }
  console.log(`buildId: ${buildId}, executionId: ${executionId}`);

  const nextEntity: BuildHistoryEntity = {
    ...entity,
    executionId,
    status: 'STARTED',
    startedAt: now.setZone(TIME_ZONE).toFormat(JST_DATE_FORMAT),
  };
  console.log(`build start を登録: ${JSON.stringify(nextEntity, null, 2)}`);

  const putCommandInput: PutCommandInput = {
    TableName: buildHistoryTableName,
    Item: nextEntity,
  };

  await dynamodb.put(putCommandInput);

  // GitHubApp に start したことを通知
  console.log(`GitHubApp に build 開始を通知します`);
  const ciEvent: CIEvent = {
    buildId,
    eventTime: now.toISO(),
    headSha: entity.headSha,
    status: 'STARTED',
    installationId: entity.githubAppInstallationId,
    owner: entity.owner,
    repo: entity.repo,
    branchName: entity.branchName,
  };

  const reqResult = await appHttpClient.postWithAwsSignV4({
    url: githubAppFuncUrl,
    body: ciEvent,
  });

  console.log(`req result: ${JSON.stringify(reqResult)}`);

  console.log(`pipeline trigger success`);

  return executionId;
};
