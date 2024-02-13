import { DateTime } from 'luxon';
import { JST_DATE_FORMAT, TIME_ZONE } from '../../../shared/configurations/config';
import { BuildHistoryEntity } from '../../../shared/models/build-history-entity';
import { CIEvent } from '../../../shared/models/ci-event';
import { Command } from '../models/command';
import { RunConclusion } from '../models/octkit';
import { BaseCommand } from './base-command';

export class CompleteCheckCommand extends BaseCommand implements Command {
  async execute(event: CIEvent): Promise<void> {
    const { buildId, status, owner, repo, eventTime, installationId } = event;

    const conclusion: RunConclusion | null =
      status === 'SUCCEEDED' ? 'success' : status === 'CANCELED' ? 'cancelled' : 'failure';

    if (!conclusion) {
      console.error(`conclusion を指定できません`);
      return Promise.resolve();
    }

    const history = await this.dynamodb.get<BuildHistoryEntity | undefined>({
      TableName: this.buildHistoryTableName,
      Key: { buildId },
    });

    if (!history || !history.checkRunId) {
      console.error(`buildId: ${buildId} に対するレコードが存在しません`);
      return Promise.resolve();
    }

    await this.githubAppUtil.completeCheck({
      owner,
      repo,
      checkRunId: history.checkRunId,
      completedAt: eventTime,
      conclusion,
      installationId,
    });

    const jstEventTime = DateTime.fromISO(eventTime).setZone(TIME_ZONE).toFormat(JST_DATE_FORMAT);

    const nextHistory: BuildHistoryEntity = {
      ...history,
      status,
      completedAt: jstEventTime,
    };

    const result = await this.dynamodb.put({
      TableName: this.buildHistoryTableName,
      Item: nextHistory,
    });

    console.log(`completeCheckHandle dynamodb put result: ${JSON.stringify(result, null, 2)}`);
    return Promise.resolve();
  }
}
