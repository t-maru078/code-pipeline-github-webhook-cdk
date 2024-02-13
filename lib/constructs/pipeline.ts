import { Construct } from 'constructs';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  BuildSpec,
  Cache,
  ComputeType,
  LinuxBuildImage,
  LocalCacheMode,
  PipelineProject,
} from 'aws-cdk-lib/aws-codebuild';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Artifact, IPipeline, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, ManualApprovalAction, S3SourceAction, S3Trigger } from 'aws-cdk-lib/aws-codepipeline-actions';
import { IBucket } from 'aws-cdk-lib/aws-s3';

interface PipelineProps {
  sourceCodeStoreBucket: IBucket;
  buildHistoryTable: ITable;
}

export class AppPipeline extends Construct {
  public readonly ciPipeline: IPipeline;

  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id);

    const logGroup = new LogGroup(this, 'UnitTestProjectLogGroup', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const unitTestProject = new PipelineProject(this, 'UnitTestProject', {
      buildSpec: BuildSpec.fromSourceFilename('build-specs/unit-test/buildspec.yml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        computeType: ComputeType.SMALL,
        privileged: true,
      },
      cache: Cache.local(LocalCacheMode.DOCKER_LAYER),
      logging: { cloudWatch: { enabled: true, logGroup } },
      timeout: Duration.minutes(5),
    });

    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'GithubChecksPipeline',
    });

    const sourceOutput = new Artifact();

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new S3SourceAction({
          actionName: 'Source',
          bucket: props.sourceCodeStoreBucket,
          bucketKey: 'latest.zip',
          trigger: S3Trigger.NONE,
          output: sourceOutput,
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Tests',
      actions: [
        new CodeBuildAction({
          actionName: 'UnitTests',
          input: sourceOutput,
          project: unitTestProject,
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new ManualApprovalAction({
          actionName: 'Approve',
        }),
      ],
    });

    this.ciPipeline = pipeline;
  }
}
