import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { AttributeType, BillingMode, ITable, Table } from 'aws-cdk-lib/aws-dynamodb';

export class DataStore extends Construct {
  public readonly sourceCodeStoreBucket: IBucket;
  public readonly buildHistoryTable: ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.sourceCodeStoreBucket = new Bucket(this, 'SourceCodeBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const table = new Table(this, 'BuildHistoryTable', {
      tableName: 'BuildHistoryTable',
      partitionKey: {
        name: 'buildId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expire',
    });
    table.addGlobalSecondaryIndex({
      indexName: 'executionIdIndex',
      partitionKey: {
        type: AttributeType.STRING,
        name: 'executionId',
      },
    });

    this.buildHistoryTable = table;
  }
}
