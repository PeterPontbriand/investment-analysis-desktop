import { describe, expect, it } from 'vitest';
import { ApiError } from '../../src/api/client.ts';
import { connectionMessage, failureView } from '../../src/api/engineState.ts';

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
});

describe('failure views', () => {
  const failure = (reasonCode: string | null, reason: string | null = 'R') =>
    new ApiError('failure', {
      status: 500,
      reasonCode,
      reason,
      contentLanguage: 'en',
    });

  it('shows the exited message only for an exited engine', () => {
    expect(failureView(new ApiError('engine_exited'))).toEqual({
      kind: 'message',
      key: 'engine.state.exited',
      retry: false,
    });
    expect(failureView(new ApiError('unreachable'))).toEqual({
      kind: 'message',
      key: 'engine.unreachable',
      retry: false,
    });
  });

  it.each([
    'watchlist_not_found',
    'analysis_run_not_found',
    'stored_selection_unreadable',
    'unsupported_run_version',
    'invalid_stored_run',
    'unsupported_projection',
    'watchlist_name_conflict',
    'watchlist_empty',
    'watchlist_entry_not_found',
    'provider_no_data',
    'provider_unreachable',
    'provider_rate_limited',
    'provider_unexpected_response',
  ])('shows the API reason as given for %s', (code) => {
    expect(failureView(failure(code, 'Why'))).toEqual({
      kind: 'reason',
      text: 'Why',
      lang: 'en',
    });
  });

  it('uses the catalog for database codes, with retry for database_busy only', () => {
    expect(failureView(failure('database_busy'))).toEqual({
      kind: 'message',
      key: 'state.databaseBusy',
      retry: true,
    });
    expect(failureView(failure('database_migration_failed'))).toMatchObject({
      key: 'engine.state.databaseSetup',
      retry: false,
    });
    expect(failureView(failure('database_io_error'))).toMatchObject({
      key: 'state.databaseOther',
      retry: false,
    });
  });

  it.each([
    'not_authenticated',
    'host_not_allowed',
    'origin_not_allowed',
    'endpoint_not_found',
    'invalid_parameter',
    'execution_error',
    'a_code_from_a_later_engine',
    null,
  ])('shows the defect message for %s', (code) => {
    expect(failureView(failure(code))).toEqual({
      kind: 'message',
      key: 'state.defect',
      retry: false,
    });
  });

  it('shows the catalog message for refresh_job_running, not the engine text', () => {
    expect(
      failureView(failure('refresh_job_running', 'Job 1234 is running.')),
    ).toEqual({
      kind: 'message',
      key: 'actions.refreshRunning',
      retry: false,
    });
  });

  it('offers "Try again" for database_busy from an action', () => {
    expect(failureView(failure('database_busy'))).toMatchObject({
      kind: 'message',
      retry: true,
    });
  });

  it('shows the defect message for a resource state with no reason, and for a non-API error', () => {
    expect(failureView(failure('watchlist_not_found', null))).toMatchObject({
      key: 'state.defect',
    });
    expect(failureView(new Error('x'))).toMatchObject({ key: 'state.defect' });
  });
});
