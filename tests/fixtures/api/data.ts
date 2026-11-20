// Typed API documents shared by Vitest and Playwright. The types come from the
// vendored API description, so a shape change fails the type check.
import type { components } from '../../../src/api/schema.ts';

type Schemas = components['schemas'];

export const coreId = '11111111-1111-4111-8111-111111111111';
export const dividendsId = '22222222-2222-4222-8222-222222222222';
export const emptyId = '33333333-3333-4333-8333-333333333333';

export const info: Schemas['InfoDocument'] = {
  api_versions: ['v1'],
  engine_version: '4.5.6',
  locales: [{ tag: 'en', name: 'English' }],
  providers: [{ id: 'yahoo', name: 'Yahoo Finance' }],
  schema_version: 3,
  sec_identity_configured: false,
};

// The last strategy is made up: no GUI code names it.
export const strategies: Schemas['StrategiesDocument'] = {
  schema_version: 2,
  items: [
    {
      analysis: 'momentum',
      method: 'sma_crossover',
      label: 'Momentum',
      term: 'strategy-momentum',
    },
    {
      analysis: 'graham-number',
      method: 'graham_number',
      label: 'Graham Number',
      term: 'strategy-graham-number',
    },
    {
      analysis: 'quality-screen',
      method: 'quality_screen',
      label: 'Quality Screen',
      term: 'strategy-quality-screen',
    },
  ],
};

export const helpIndex: Schemas['HelpIndexDocument'] = {
  schema_version: 1,
  documents: [],
  groups: [
    {
      id: 'outcomes',
      title: 'Outcomes',
      terms: [
        {
          id: 'outcome-completed',
          name: 'Completed',
          definition: 'The analysis finished.',
        },
        {
          id: 'outcome-unavailable',
          name: 'Unavailable',
          definition: 'An input was unavailable.',
        },
        {
          id: 'outcome-not-applicable',
          name: 'Not Applicable',
          definition: 'The strategy does not apply.',
        },
        {
          id: 'outcome-failed',
          name: 'Failed',
          definition: 'The analysis failed.',
        },
      ],
    },
    {
      id: 'statuses',
      title: 'Statuses and reasons',
      terms: [
        { id: 'status-ok', name: 'Calculated', definition: 'A value.' },
        {
          id: 'status-unavailable',
          name: 'Not available',
          definition: 'No value.',
        },
        {
          id: 'status-not-applicable',
          name: 'Does not apply',
          definition: 'The strategy does not apply.',
        },
        {
          id: 'status-input-unavailable',
          name: 'Input not available',
          definition: 'An input was missing.',
        },
        {
          id: 'reason-insufficient-history',
          name: 'Not enough history',
          definition: 'Too few observations.',
        },
        {
          id: 'reason-instrument-kind',
          name: 'Instrument kind does not apply',
          definition: 'The kind of instrument is not covered.',
        },
        {
          id: 'headline-no-result',
          name: 'No result was stored',
          definition: 'The run stored no result.',
        },
        {
          id: 'headline-not-declared',
          name: 'Strategy no longer available',
          definition: 'The engine no longer declares the strategy.',
        },
      ],
    },
    {
      id: 'failures',
      title: 'Failures and provider checks',
      terms: [
        {
          id: 'failure-execution-error',
          name: 'Execution error',
          definition: 'The analysis stopped.',
        },
        {
          id: 'failure-historical-quality',
          name: 'Failure historical quality',
          definition: 'Made-up definition of failure-historical-quality.',
        },
        {
          id: 'status-provider-error',
          name: 'Provider error',
          definition: 'A data provider failed.',
        },
        {
          id: 'provider-unreachable',
          name: 'Provider unreachable',
          definition: 'Made-up definition of provider-unreachable.',
        },
        {
          id: 'provider-rate-limited',
          name: 'Provider rate limited',
          definition: 'Made-up definition of provider-rate-limited.',
        },
        {
          id: 'provider-unexpected-response',
          name: 'Provider unexpected response',
          definition: 'Made-up definition of provider-unexpected-response.',
        },
        {
          id: 'provider-no-data',
          name: 'Provider no data',
          definition: 'Made-up definition of provider-no-data.',
        },
        {
          id: 'failure-configuration-error',
          name: 'Failure configuration error',
          definition: 'Made-up definition of failure-configuration-error.',
        },
        {
          id: 'failure-no-eligible-observations',
          name: 'Failure no eligible observations',
          definition: 'Made-up definition of failure-no-eligible-observations.',
        },
        {
          id: 'status-invalid-input',
          name: 'Status invalid input',
          definition: 'Made-up definition of status-invalid-input.',
        },
        {
          id: 'failure-invalid-parameter',
          name: 'Failure invalid parameter',
          definition: 'Made-up definition of failure-invalid-parameter.',
        },
        {
          id: 'failure-database',
          name: 'Failure database',
          definition: 'Made-up definition of failure-database.',
        },
        {
          id: 'failure-stored-data-unreadable',
          name: 'Failure stored data unreadable',
          definition: 'Made-up definition of failure-stored-data-unreadable.',
        },
        {
          id: 'failure-unsupported-run-version',
          name: 'Failure unsupported run version',
          definition: 'Made-up definition of failure-unsupported-run-version.',
        },
        {
          id: 'failure-not-found',
          name: 'Failure not found',
          definition: 'Made-up definition of failure-not-found.',
        },
        {
          id: 'failure-watchlist-empty',
          name: 'Failure watchlist empty',
          definition: 'Made-up definition of failure-watchlist-empty.',
        },
        {
          id: 'failure-name-conflict',
          name: 'Failure name conflict',
          definition: 'Made-up definition of failure-name-conflict.',
        },
        {
          id: 'failure-request-refused',
          name: 'Failure request refused',
          definition: 'Made-up definition of failure-request-refused.',
        },
        {
          id: 'failure-refresh-running',
          name: 'Failure refresh running',
          definition: 'Made-up definition of failure-refresh-running.',
        },
        {
          id: 'failure-port-unavailable',
          name: 'Failure port unavailable',
          definition: 'Made-up definition of failure-port-unavailable.',
        },
        {
          id: 'failure-instrument-profile-not-found',
          name: 'Instrument Profile Not Found',
          definition:
            'No instrument profile is stored for the ticker, so there are no details to show.',
        },
        {
          id: 'entry-warning-ticker-not-recognized',
          name: 'Ticker Not Recognized',
          definition:
            'When an entry was added, the data providers answered and none of them identified the ticker. The entry was still added.',
        },
        {
          id: 'entry-warning-ticker-not-checked',
          name: 'Ticker Not Checked',
          definition:
            "When an entry was added, the ticker could not be checked, because a data provider or the engine's database was not available. The entry was still added.",
        },
        {
          id: 'verdict-healthy',
          name: 'Healthy',
          definition: 'The provider answered.',
        },
        {
          id: 'verdict-unreachable',
          name: 'Unreachable',
          definition: 'The provider did not answer.',
        },
      ],
    },
    {
      id: 'instruments',
      title: 'Instruments',
      terms: [
        {
          id: 'instrument-kind-equity',
          name: 'Equity',
          definition:
            'A share of ownership in a company, such as a common stock.',
        },
        {
          id: 'instrument-kind-etf',
          name: 'ETF',
          definition: 'A fund that trades on an exchange.',
        },
        {
          id: 'instrument-kind-cryptocurrency',
          name: 'Cryptocurrency',
          definition: 'A digital currency.',
        },
      ],
    },
    {
      id: 'strategies',
      title: 'Strategies',
      terms: [
        {
          id: 'strategy-momentum',
          name: 'Momentum',
          definition: 'A trend strategy.',
        },
        {
          id: 'strategy-graham-number',
          name: 'Graham Number',
          definition: 'A value strategy.',
        },
        {
          id: 'strategy-quality-screen',
          name: 'Quality Screen',
          definition: 'A made-up strategy.',
        },
      ],
    },
  ],
};

export const references: Schemas['HelpReferencesDocument'] = {
  schema_version: 1,
  code_sets: {
    RunOutcome: {
      completed: 'outcome-completed',
      unavailable: 'outcome-unavailable',
      not_applicable: 'outcome-not-applicable',
      failed: 'outcome-failed',
    },
    CellStatusValue: {
      ok: 'status-ok',
      unavailable: 'status-unavailable',
      not_applicable: 'status-not-applicable',
      input_unavailable: 'status-input-unavailable',
    },
    ReasonCode: {
      insufficient_history: 'reason-insufficient-history',
      instrument_kind_not_applicable: 'reason-instrument-kind',
    },
    // The engine's FAILURE_REASON_CODE_TERMS at the vendored engine commit
    // (D262).
    FailureReasonCode: {
      execution_error: 'failure-execution-error',
      historical_quality: 'failure-historical-quality',
      provider_error: 'status-provider-error',
      provider_unreachable: 'provider-unreachable',
      provider_rate_limited: 'provider-rate-limited',
      provider_unexpected_response: 'provider-unexpected-response',
      provider_no_data: 'provider-no-data',
      configuration_error: 'failure-configuration-error',
      no_eligible_observations: 'failure-no-eligible-observations',
      invalid_input: 'status-invalid-input',
      invalid_parameter: 'failure-invalid-parameter',
      database_upgrade_required: 'failure-database',
      database_incompatible_schema: 'failure-database',
      database_busy: 'failure-database',
      database_permission_denied: 'failure-database',
      database_invalid_file: 'failure-database',
      database_io_error: 'failure-database',
      database_resources_unavailable: 'failure-database',
      database_initialization_failed: 'failure-database',
      database_migration_failed: 'failure-database',
      invalid_stored_run: 'failure-stored-data-unreadable',
      unsupported_run_version: 'failure-unsupported-run-version',
      watchlist_not_found: 'failure-not-found',
      watchlist_entry_not_found: 'failure-not-found',
      watchlist_empty: 'failure-watchlist-empty',
      watchlist_name_conflict: 'failure-name-conflict',
      analysis_run_not_found: 'failure-not-found',
      stored_selection_unreadable: 'failure-stored-data-unreadable',
      unsupported_projection: 'failure-stored-data-unreadable',
      not_authenticated: 'failure-request-refused',
      host_not_allowed: 'failure-request-refused',
      origin_not_allowed: 'failure-request-refused',
      endpoint_not_found: 'failure-not-found',
      refresh_job_not_found: 'failure-not-found',
      refresh_job_running: 'failure-refresh-running',
      port_unavailable: 'failure-port-unavailable',
      help_term_not_found: 'failure-not-found',
      help_document_not_found: 'failure-not-found',
      instrument_profile_not_found: 'failure-instrument-profile-not-found',
    },
    // The engine's ENTRY_WARNING_CODE_TERMS and INSTRUMENT_KIND_TERMS at the
    // vendored engine commit (D262, D282).
    EntryWarningCode: {
      ticker_not_recognized: 'entry-warning-ticker-not-recognized',
      ticker_not_checked: 'entry-warning-ticker-not-checked',
    },
    InstrumentKind: {
      equity: 'instrument-kind-equity',
      etf: 'instrument-kind-etf',
      cryptocurrency: 'instrument-kind-cryptocurrency',
    },
    ProviderCheckVerdict: {
      healthy: 'verdict-healthy',
      unreachable: 'verdict-unreachable',
    },
    HeadlineUnavailable: {
      no_result_stored: 'headline-no-result',
      strategy_not_declared: 'headline-not-declared',
    },
  },
};

export const watchlists: Schemas['WatchlistListDocument'] = {
  schema_version: 1,
  items: [
    {
      watchlist_id: coreId,
      display_name: 'Core',
      entry_count: 3,
      created_at: '2026-10-30T17:00:00+00:00',
      updated_at: '2026-11-02T15:00:00+00:00',
    },
    {
      watchlist_id: dividendsId,
      display_name: 'Dividends',
      entry_count: 1,
      created_at: '2026-11-01T16:00:00+00:00',
      updated_at: null,
    },
    {
      watchlist_id: emptyId,
      display_name: 'Empty',
      entry_count: 0,
      created_at: '2026-11-03T16:00:00+00:00',
      updated_at: null,
    },
  ],
};

const momentum = {
  method_id: 'sma_crossover',
  as_of: null,
  use_cache: true,
} as const;

export const watchlistDocuments: Record<string, Schemas['WatchlistDocument']> =
  {
    [coreId]: {
      schema_version: 2,
      watchlist_id: coreId,
      display_name: 'Core',
      created_at: '2026-10-30T17:00:00+00:00',
      updated_at: '2026-11-02T15:00:00+00:00',
      entries: [
        { index: 1, ticker: 'ACME', selection: momentum },
        {
          index: 2,
          ticker: 'ACME',
          selection: {
            method_id: 'graham_number',
            as_of: '2025-12-31',
            bvps_override: null,
            eps_override: null,
            quote_override: null,
            use_cache: true,
          },
        },
        {
          index: 3,
          ticker: 'ZED',
          // A strategy with no GUI code: the type allows only the five known
          // methods, so the made-up one is cast.
          selection: {
            method_id: 'quality_screen',
            as_of: '2026-10-30T18:02:00+00:00',
            use_cache: true,
          } as unknown as Schemas['PiotroskiSelection'],
        },
      ],
    },
    [dividendsId]: {
      schema_version: 2,
      watchlist_id: dividendsId,
      display_name: 'Dividends',
      created_at: '2026-11-01T16:00:00+00:00',
      updated_at: null,
      entries: [{ index: 1, ticker: 'DIVI', selection: momentum }],
    },
    [emptyId]: {
      schema_version: 2,
      watchlist_id: emptyId,
      display_name: 'Empty',
      created_at: '2026-11-03T16:00:00+00:00',
      updated_at: null,
      entries: [],
    },
  };

const counts = (
  completed: number,
  unavailable: number,
  notApplicable: number,
  failed: number,
): Schemas['RefreshOutcomeCountsDocument'] => ({
  completed,
  unavailable,
  not_applicable: notApplicable,
  failed,
});

export const refreshes: Schemas['RefreshSummaryItemDocument'][] = [
  {
    refresh_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    watchlist_id: coreId,
    watchlist_name: 'Core (as it was)',
    first_completed_at: '2026-10-30T17:58:00+00:00',
    last_completed_at: '2026-10-30T18:02:00+00:00',
    run_count: 12,
    outcome_counts: counts(9, 2, 0, 1),
  },
  {
    refresh_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    watchlist_id: null,
    watchlist_name: null,
    first_completed_at: '2026-10-29T13:15:00+00:00',
    last_completed_at: '2026-10-29T13:15:30+00:00',
    run_count: 3,
    outcome_counts: counts(3, 0, 0, 0),
  },
];

const run = (
  n: number,
  ticker: string,
  method: string,
  outcome: Schemas['RunOutcome'],
  completed: string,
  refreshId: string | null = null,
): Schemas['RunSummaryDocument'] => ({
  analysis_run_id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  ticker,
  method_id: method,
  outcome,
  completed_at: completed,
  refresh_id: refreshId,
});

// Newest first. The first four are distinct; the rest fill a second page.
export const runs: Schemas['RunSummaryDocument'][] = [
  run(1, 'MSFT', 'graham_number', 'completed', '2026-11-02T14:41:00+00:00'),
  run(2, 'MSFT', 'sma_crossover', 'unavailable', '2026-10-30T18:02:00+00:00'),
  run(
    3,
    'ZED',
    'quality_screen',
    'completed',
    '2026-10-29T18:02:00+00:00',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ),
  run(4, 'OLD', 'retired_method', 'failed', '2026-10-28T18:02:00+00:00'),
  ...Array.from({ length: 51 }, (_unused, index) =>
    run(
      5 + index,
      'ACME',
      'sma_crossover',
      'completed',
      `2026-10-${String(27 - (index % 20)).padStart(2, '0')}T12:00:00+00:00`,
    ),
  ),
];
