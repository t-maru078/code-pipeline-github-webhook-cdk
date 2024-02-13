import * as path from 'path';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { EventType, IBucket } from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { FunctionUrl, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IPipeline } from 'aws-cdk-lib/aws-codepipeline';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import {
  BuildEnvironmentVariableType,
  BuildSpec,
  Cache,
  ComputeType,
  EventAction,
  FilterGroup,
  LinuxBuildImage,
  LocalCacheMode,
  Project,
  Source,
} from 'aws-cdk-lib/aws-codebuild';

interface PipelineEventHandlerProps {
  githubOwner: string;
  githubRepo: string;
  githubAppFunctionUrl: FunctionUrl;
  githubAppInstallationId: string;
  sourceCodeStoreBucket: IBucket;
  buildHistoryTable: ITable;
  ciPipeline: IPipeline;
}

export class PipelineEventHandler extends Construct {
  constructor(scope: Construct, id: string, props: PipelineEventHandlerProps) {
    super(scope, id);

    const githubSource = Source.gitHub({
      owner: props.githubOwner,
      repo: props.githubRepo,
      webhookFilters: [
        FilterGroup.inEventOf(
          EventAction.PUSH,
          EventAction.PULL_REQUEST_CREATED,
          EventAction.PULL_REQUEST_UPDATED,
          EventAction.PULL_REQUEST_REOPENED
        )
          .andBranchIsNot('main')
          .andBranchIsNot('develop')
          .andTagIsNot('.*'),
      ],
    });

    const logGroup = new LogGroup(this, 'SourceCodeUploaderLogGroup', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const project = new Project(this, 'SourceCodeUploaderProject', {
      source: githubSource,
      buildSpec: BuildSpec.fromSourceFilename('build-specs/trigger/buildspec.yml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        computeType: ComputeType.SMALL,
        privileged: true,
      },
      environmentVariables: {
        GITHUB_APP_FUNCTION_URL: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: props.githubAppFunctionUrl.url,
        },
        SOURCE_CODE_STORE_BUCKET_NAME: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: props.sourceCodeStoreBucket.bucketName,
        },
        BUILD_HISTORY_TABLE_NAME: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: props.buildHistoryTable.tableName,
        },
        GITHUB_OWNER: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: props.githubOwner,
        },
        GITHUB_REPO: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: props.githubRepo,
        },
        GITHUB_APP_INSTALLATION_ID: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: props.githubAppInstallationId,
        },
      },
      cache: Cache.local(LocalCacheMode.DOCKER_LAYER),
      logging: {
        cloudWatch: { enabled: true, logGroup },
      },
      timeout: Duration.minutes(5),
    });

    props.sourceCodeStoreBucket.grantReadWrite(project);
    props.githubAppFunctionUrl.grantInvokeUrl(project);

    const pipelineTriggerFunc = new NodejsFunction(this, 'PipelineTriggerFunc', {
      functionName: 'PipelineTriggerFunc',
      entry: path.join(__dirname, '../../lambda/pipeline-trigger/src/index.ts'),
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        BUILD_HISTORY_TABLE_NAME: props.buildHistoryTable.tableName,
        CI_PIPELINE_NAME: props.ciPipeline.pipelineName,
        GITHUB_APP_FUNC_URL: props.githubAppFunctionUrl.url,
      },
      timeout: Duration.seconds(30),
      memorySize: 512,
      retryAttempts: 0,
    });

    pipelineTriggerFunc.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['codepipeline:StartPipelineExecution'],
        resources: [props.ciPipeline.pipelineArn],
      })
    );

    props.buildHistoryTable.grantReadWriteData(pipelineTriggerFunc);
    props.githubAppFunctionUrl.grantInvokeUrl(pipelineTriggerFunc);

    // S3 event 通知を使うパターン
    // CloudTrail の場合と event 自体の内容が異なるので注意
    props.sourceCodeStoreBucket.addEventNotification(
      EventType.OBJECT_CREATED_PUT,
      new LambdaDestination(pipelineTriggerFunc)
    );

    // CloudTrail を使うパターン
    // const s3EventTrail = new Trail(this, 'S3EventTrail');
    // s3EventTrail.addS3EventSelector([
    //   {
    //     bucket: props.sourceCodeStoreBucket,
    //   },
    // ]);
    // const rule = props.sourceCodeStoreBucket.onCloudTrailPutObject('SourceCodeStoreOnPutTrailEvent');
    // rule.addTarget(new targets.LambdaFunction(pipelineTriggerFunc));

    const pipelineFinTriggerFunc = new NodejsFunction(this, 'PipelineFinTriggerFunc', {
      functionName: 'PipelineFinishTriggerFunc',
      entry: path.join(__dirname, '../../lambda/pipeline-fin-trigger/src/index.ts'),
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        BUILD_HISTORY_TABLE_NAME: props.buildHistoryTable.tableName,
        GITHUB_APP_FUNC_URL: props.githubAppFunctionUrl.url,
      },
      timeout: Duration.seconds(15),
      memorySize: 512,
    });

    props.buildHistoryTable.grantReadWriteData(pipelineFinTriggerFunc);
    props.githubAppFunctionUrl.grantInvokeUrl(pipelineFinTriggerFunc);

    props.ciPipeline.onEvent('PipelineEvent', {
      eventPattern: {
        source: ['aws.codepipeline'],
        detailType: ['CodePipeline Pipeline Execution State Change'],
        detail: {
          state: ['SUCCEEDED', 'FAILED', 'CANCELED', 'SUPERSEDED'],
          pipeline: [props.ciPipeline.pipelineName],
        },
      },
      target: new targets.LambdaFunction(pipelineFinTriggerFunc),
    });
  }
}
