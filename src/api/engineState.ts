import type { MessageKey } from '../i18n/index.ts';
import type { EngineConnection } from '../platform/index.ts';
import { ApiError } from './client.ts';

const databaseSetupCodes = new Set([
  'database_upgrade_required',
  'database_incompatible_schema',
  'database_initialization_failed',
  'database_migration_failed',
]);

// The catalog message for a database_* code, or null for any other code.
function databaseMessage(code: string | null): MessageKey | null {
  if (code === null) return null;
  if (databaseSetupCodes.has(code)) return 'engine.state.databaseSetup';
  if (code === 'database_busy') return 'engine.state.databaseBusy';
  if (code.startsWith('database_')) return 'engine.state.databaseOther';
  return null;
}

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
    case 'launch_failed':
      return (
        databaseMessage(connection.reasonCode) ?? 'engine.state.launchFailed'
      );
  }
}

// Failures whose reason message the API words for a person: shown as given.
// They are failures about one stored thing, about an action's request, or about
// a provider that could not answer a lookup (D300).
const reasonShownCodes = new Set([
  'watchlist_not_found',
  'watchlist_name_conflict',
  'watchlist_empty',
  'watchlist_entry_not_found',
  'analysis_run_not_found',
  'stored_selection_unreadable',
  'unsupported_run_version',
  'invalid_stored_run',
  'unsupported_projection',
  // A lookup that no provider could answer; the engine names the provider.
  'provider_no_data',
  'provider_unreachable',
  'provider_rate_limited',
  'provider_unexpected_response',
]);

// What a screen shows for a request that failed.
export type FailureView =
  // The API's reason message, in the language the response says.
  | { kind: 'reason'; text: string; lang: string | null }
  | { kind: 'message'; key: MessageKey; retry: boolean };

export function failureView(error: unknown): FailureView {
  if (error instanceof ApiError) {
    if (error.kind === 'engine_exited')
      return { kind: 'message', key: 'engine.state.exited', retry: false };
    if (error.kind === 'unreachable')
      return { kind: 'message', key: 'engine.unreachable', retry: false };
    const code = error.reasonCode;
    if (code !== null && reasonShownCodes.has(code) && error.reason)
      return {
        kind: 'reason',
        text: error.reason,
        lang: error.contentLanguage,
      };
    // The engine's text for this failure names a raw refresh identifier.
    if (code === 'refresh_job_running')
      return { kind: 'message', key: 'actions.refreshRunning', retry: false };
    // A request that fails on the database has its own messages: the launch
    // messages tell the reader to restart the application (H1).
    if (code !== null && databaseSetupCodes.has(code))
      return {
        kind: 'message',
        key: 'engine.state.databaseSetup',
        retry: false,
      };
    if (code === 'database_busy')
      return { kind: 'message', key: 'state.databaseBusy', retry: true };
    if (code?.startsWith('database_'))
      return { kind: 'message', key: 'state.databaseOther', retry: false };
  }
  return { kind: 'message', key: 'state.defect', retry: false };
}
