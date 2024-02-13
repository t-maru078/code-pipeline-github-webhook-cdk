import { AppDynamoDbClient } from '../../../shared/utils/dynamo-db-client';
import { GithubAppUtil } from '../utils/github-util';
import { CommandConstructorParams } from '../models/command';

export abstract class BaseCommand {
  protected githubAppUtil: GithubAppUtil;
  protected dynamodb: AppDynamoDbClient;
  protected buildHistoryTableName: string;

  constructor(params: CommandConstructorParams) {
    this.githubAppUtil = new GithubAppUtil({
      appId: params.githubAppId,
      privateKey: atob(params.githubAppPrivateKeyBase64),
    });
    this.dynamodb = new AppDynamoDbClient();
    this.buildHistoryTableName = params.buildHistoryTableName;
  }
}
