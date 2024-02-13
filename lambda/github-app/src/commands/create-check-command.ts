import { DateTime } from 'luxon';
import { CIEvent } from '../../../shared/models/ci-event';
import { BaseCommand } from './base-command';
import { Command } from '../models/command';
import { JST_DATE_FORMAT, TIME_ZONE } from '../../../shared/configurations/config';
import { BuildHistoryEntity } from '../../../shared/models/build-history-entity';

export class CreateCheckCommand extends BaseCommand implements Command {
  async execute(event: CIEvent): Promise<void> {
    const { buildId: baseBuildId, headSha, owner, repo, installationId, branchName } = event;

    const buildId = baseBuildId.includes(':') ? baseBuildId.split(':')[1] : baseBuildId;
    console.log(`baseBuildId: ${baseBuildId}, buildId: ${buildId}`);
    const now = DateTime.now().setZone(TIME_ZONE);
    const expire = now.plus({ day: 1 }).toUnixInteger();

    const checkRunId = await this.githubAppUtil.createCheck({
      owner,
      repo,
      headSha,
      installationId,
    });

    const entity: BuildHistoryEntity = {
      buildId,
      checkRunId,
      githubAppInstallationId: installationId,
      owner,
      repo,
      branchName,
      headSha,
      status: 'QUEUED',
      queuedAt: now.toFormat(JST_DATE_FORMAT),
      expire,
    };
    console.log(`createCheckHandle entity: ${JSON.stringify(entity, null, 2)}`);

    const result = await this.dynamodb.put({
      TableName: this.buildHistoryTableName,
      Item: entity,
    });

    console.log(`createCheckHandle dynamodb put result: ${JSON.stringify(result, null, 2)}`);

    return Promise.resolve();
  }
}
