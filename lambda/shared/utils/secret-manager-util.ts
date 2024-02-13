import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export const findSecretValue = async (params: { secretName: string; jsonKeyName: string }): Promise<string> => {
  const { secretName, jsonKeyName } = params;

  const client = new SecretsManagerClient();

  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    })
  );

  if (!response.SecretString) {
    throw new Error('secure string が設定されていません');
  }

  const json = JSON.parse(response.SecretString);

  const value = json[jsonKeyName] ?? '';
  return value;
};
