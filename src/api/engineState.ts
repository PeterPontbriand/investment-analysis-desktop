import type { MessageKey } from '../i18n/index.ts';
import type { EngineConnection } from '../platform/index.ts';
import { ApiError } from './client.ts';

const databaseSetupCodes = new Set([
  'database_upgrade_required',
  'database_incompatible_schema',
  'database_initialization_failed',
  'database_migration_failed',
]);

// The catalog message for an engine that did not start: chosen by state and,
// for a launch failure, by reason code. The engine's own reason text is never shown.
export function connectionMessage(
  connection: Exclude<EngineConnection, { state: 'ready' }>,
): MessageKey {
  switch (connection.state) {
    case 'no_engine':
      return 'engine.noEngine';
    case 'not_found':
      return 'engine.state.notFound';
    case 'timed_out':
      return 'engine.state.timedOut';
    case 'launch_failed': {
      const code = connection.reasonCode;
      if (code !== null && databaseSetupCodes.has(code))
        return 'engine.state.databaseSetup';
      if (code === 'database_busy') return 'engine.state.databaseBusy';
      if (code !== null && code.startsWith('database_'))
        return 'engine.state.databaseOther';
      return 'engine.state.launchFailed';
    }
  }
}

// The catalog message for a request that failed.
export function requestFailureMessage(error: unknown): MessageKey {
  if (error instanceof ApiError && error.kind === 'engine_exited')
    return 'engine.state.exited';
  return 'engine.unreachable';
}
