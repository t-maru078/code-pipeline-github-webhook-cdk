import { CIEvent } from '../../../shared/models/ci-event';

export interface Command {
  execute(event: CIEvent): Promise<void>;
}

export interface CommandConstructorParams {
  githubAppId: string;
  githubAppPrivateKeyBase64: string;
  buildHistoryTableName: string;
}

export type CommandClass = new (params: CommandConstructorParams) => Command;
