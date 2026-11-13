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
  schema_version: 2,
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
    CellStatusValue: {},
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
      schema_version: 1,
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
            as_of: '2025-06-30',
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
      schema_version: 1,
      watchlist_id: dividendsId,
      display_name: 'Dividends',
      created_at: '2026-11-01T16:00:00+00:00',
      updated_at: null,
      entries: [{ index: 1, ticker: 'DIVI', selection: momentum }],
    },
    [emptyId]: {
      schema_version: 1,
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
): Schemas['RunSummaryDocument'] => ({
  analysis_run_id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  ticker,
  method_id: method,
  outcome,
  completed_at: completed,
  refresh_id: null,
});

// Newest first. The first four are distinct; the rest fill a second page.
export const runs: Schemas['RunSummaryDocument'][] = [
  run(1, 'MSFT', 'graham_number', 'completed', '2026-11-02T14:41:00+00:00'),
  run(2, 'MSFT', 'sma_crossover', 'unavailable', '2026-10-30T18:02:00+00:00'),
  run(3, 'ZED', 'quality_screen', 'completed', '2026-10-29T18:02:00+00:00'),
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
