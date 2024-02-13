import { DateTime } from 'luxon';
import { JST_DATE_FORMAT, TIME_ZONE } from '../../../shared/configurations/config';
import { BuildHistoryEntity } from '../../../shared/models/build-history-entity';
import { CIEvent } from '../../../shared/models/ci-event';
import { Command } from '../models/command';
import { BaseCommand } from './base-command';

export class StartCheckCommand extends BaseCommand implements Command {
  async execute(event: CIEvent): Promise<void> {
    const { buildId, owner, repo, eventTime, installationId } = event;

    const history = await this.dynamodb.get<BuildHistoryEntity | undefined>({
      TableName: this.buildHistoryTableName,
      Key: { buildId },
    });

    if (!history || !history.checkRunId) {
      console.error(`buildId: ${buildId} に対するレコードが存在しません`);
      return Promise.resolve();
    }

    await this.githubAppUtil.startCheck({
      owner,
      repo,
      checkRunId: history.checkRunId,
      installationId,
      startedAt: eventTime,
    });

    const jstEventTime = DateTime.fromISO(eventTime).setZone(TIME_ZONE).toFormat(JST_DATE_FORMAT);

    const nextHistory: BuildHistoryEntity = {
      ...history,
      status: 'STARTED',
      startedAt: jstEventTime,
    };

    const result = await this.dynamodb.put({
      TableName: this.buildHistoryTableName,
      Item: nextHistory,
    });

    console.log(`startCheckHandle dynamodb put result: ${JSON.stringify(result, null, 2)}`);
    return Promise.resolve();
  }
}
