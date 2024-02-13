import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  PutCommand,
  PutCommandInput,
  PutCommandOutput,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
  UpdateCommandInput,
  UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';

export class AppDynamoDbClient {
  private client: DynamoDBDocumentClient;

  constructor() {
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient());
  }

  async get<T>(getCommandInputParams: GetCommandInput): Promise<T> {
    const getCommand = new GetCommand(getCommandInputParams);
    return (await this.client.send(getCommand)).Item as T;
  }

  async query<T>(queryCommandInputParams: QueryCommandInput): Promise<T[]> {
    const res: T[] = [];

    const execute = async (queryExecuteParams: QueryCommandInput) => {
      const result = await this.client.send(new QueryCommand(queryExecuteParams));
      res.push(...(result.Items as T[]));
      if (result.LastEvaluatedKey) {
        queryExecuteParams.ExclusiveStartKey = result.LastEvaluatedKey;
        await execute(queryExecuteParams);
      }
    };

    await execute(queryCommandInputParams);

    return res;
  }

  async put(putCommandInputParams: PutCommandInput): Promise<PutCommandOutput> {
    const putCommand = new PutCommand(putCommandInputParams);
    const result = await this.client.send(putCommand);
    return result;
  }

  async update(updateCommandInputParams: UpdateCommandInput): Promise<UpdateCommandOutput> {
    const updateCommand = new UpdateCommand(updateCommandInputParams);
    const result = await this.client.send(updateCommand);
    return result;
  }
}
