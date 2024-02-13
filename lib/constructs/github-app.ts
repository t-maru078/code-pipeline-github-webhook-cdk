import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { FunctionUrl, FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Duration, ScopedAws } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

interface GithubAppProps {
  githubAppId: string;
  githubAppInfoSecretName: string;
  buildHistoryTable: ITable;
}

export class GithubApp extends Construct {
  public readonly githubAppFuncUrl: FunctionUrl;

  constructor(scope: Construct, id: string, props: GithubAppProps) {
    super(scope, id);

    const { region, accountId } = new ScopedAws(this);

    const lambda = new NodejsFunction(this, 'GithubAppFunc', {
      functionName: 'GithubAppFunc',
      entry: path.join(__dirname, '../../lambda/github-app/src/index.ts'),
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        BUILD_HISTORY_TABLE_NAME: props.buildHistoryTable.tableName,
        GITHUB_APP_ID: props.githubAppId,
        GITHUB_APP_INFO_SECRET_NAME: props.githubAppInfoSecretName,
      },
      timeout: Duration.seconds(30),
      memorySize: 512,
    });

    props.buildHistoryTable.grantReadWriteData(lambda);

    lambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'secretsmanager:GetResourcePolicy',
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
          'secretsmanager:ListSecretVersionIds',
        ],
        resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:${props.githubAppInfoSecretName}*`],
      })
    );

    this.githubAppFuncUrl = lambda.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
    });
  }
}
