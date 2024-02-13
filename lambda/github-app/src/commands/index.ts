import { CommandClass } from '../models/command';
import { CompleteCheckCommand } from './complete-check-command';
import { CreateCheckCommand } from './create-check-command';
import { StartCheckCommand } from './start-check-command';

/** key は CIEventStatus を設 */
export const commandMap: { [key: string]: CommandClass } = {
  QUEUED: CreateCheckCommand,
  STARTED: StartCheckCommand,
  SUCCEEDED: CompleteCheckCommand,
  FAILED: CompleteCheckCommand,
  CANCELED: CompleteCheckCommand,
  SUPERSEDED: CompleteCheckCommand,
};
