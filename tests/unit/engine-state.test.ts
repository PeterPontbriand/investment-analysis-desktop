import { describe, expect, it } from 'vitest';
import { ApiError } from '../../src/api/client.ts';
import {
  connectionMessage,
  requestFailureMessage,
} from '../../src/api/engineState.ts';

describe('engine state messages', () => {
  it.each([
    ['database_upgrade_required', 'engine.state.databaseSetup'],
    ['database_incompatible_schema', 'engine.state.databaseSetup'],
    ['database_initialization_failed', 'engine.state.databaseSetup'],
    ['database_migration_failed', 'engine.state.databaseSetup'],
    ['database_busy', 'engine.state.databaseBusy'],
    ['database_something_new', 'engine.state.databaseOther'],
    ['port_unavailable', 'engine.state.launchFailed'],
    [null, 'engine.state.launchFailed'],
  ])('maps the launch failure code %s to %s', (reasonCode, key) => {
    expect(connectionMessage({ state: 'launch_failed', reasonCode })).toBe(key);
  });

  it('maps the other states to their messages', () => {
    expect(connectionMessage({ state: 'not_found' })).toBe(
      'engine.state.notFound',
    );
    expect(connectionMessage({ state: 'timed_out' })).toBe(
      'engine.state.timedOut',
    );
    expect(connectionMessage({ state: 'no_engine' })).toBe('engine.noEngine');
  });

  it('shows the exited message only for an exited engine', () => {
    expect(requestFailureMessage(new ApiError('engine_exited'))).toBe(
      'engine.state.exited',
    );
    expect(requestFailureMessage(new ApiError('unreachable'))).toBe(
      'engine.unreachable',
    );
    expect(requestFailureMessage(new ApiError('failure', 401))).toBe(
      'engine.unreachable',
    );
  });
});
