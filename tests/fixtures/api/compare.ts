// Typed comparison, run overview, run document and text fixtures. The types
// come from the vendored API description, so a shape change fails the type
// check. The strategy documents are typed only where the GUI reads them: it
// shows a document's identity, as-of, warnings and limitations, and otherwise
// prints it as JSON, with no per-strategy rendering (D93).
import type { components } from '../../../src/api/schema.ts';
import { coreId } from './data.ts';

type Schemas = components['schemas'];
type Cell = Schemas['CompareCellDocument'];
type Strategy = Schemas['CompareStrategyDocument'];
type Run = Schemas['CompareRunDocument'];
type Headline = Schemas['CompareHeadlineDocument'];
type Outcome = Schemas['RunOutcome'];
export type RunDocument =
  | Schemas['MomentumDocument']
  | Schemas['GrahamNumberDocument']
  | Schemas['GrahamGrowthDocument']
  | Schemas['FCFDocument']
  | Schemas['PiotroskiDocument'];

export const coreRefreshId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const adHocRefreshId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const retiredRefreshId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
// The refresh of one ticker analyzed under two strategies (GUI.3d).
export const analyzeRefreshId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

export const strategyDocuments = {
  momentum: {
    analysis_id: 'momentum',
    method_id: 'sma_crossover',
    label: 'Momentum',
    term: 'strategy-momentum',
    declared: true,
    alias: 'momentum',
  },
  graham: {
    analysis_id: 'graham-number',
    method_id: 'graham_number',
    label: 'Graham Number',
    term: 'strategy-graham-number',
    declared: true,
    alias: 'graham-number',
  },
  // Made up: no GUI code names it (D94).
  quality: {
    analysis_id: 'quality-screen',
    method_id: 'quality_screen',
    label: 'Quality Screen',
    term: 'strategy-quality-screen',
    declared: true,
    alias: 'quality-screen',
  },
  // No longer declared: its stored label, no term and no alias.
  retired: {
    analysis_id: 'retired',
    method_id: 'retired_method',
    label: 'retired_method',
    term: null,
    declared: false,
    alias: null,
  },
} satisfies Record<string, Strategy>;

const number = (
  key: string,
  label: string,
  value: number | null,
  unit: Schemas['CellUnit'],
  options: {
    currency?: string;
    status?: Schemas['CellStatusValue'];
    reason?: Schemas['ReasonCode'];
  } = {},
): Cell => ({
  key,
  label,
  term: `cell-${key}`,
  kind: 'number',
  value,
  unit,
  currency: options.currency ?? null,
  status: options.status ?? (value === null ? 'unavailable' : 'ok'),
  reason_code: options.reason ?? null,
});

const text = (key: string, label: string, value: string | null): Cell => ({
  key,
  label,
  term: `cell-${key}`,
  kind: 'text',
  value,
  unit: null,
  currency: null,
  status: null,
  reason_code: null,
});

const headline = (
  cells: Cell[],
  periodEnd: string | null = null,
): Headline => ({
  cells,
  period_end: periodEnd,
  period_end_label: periodEnd === null ? null : 'fiscal year-end',
  taxonomy: null,
});

export const momentumCells = (): Cell[] => [
  text('trend', 'Trend', 'Bullish'),
  number('rsi', 'RSI', 58.2, 'points'),
];
export const grahamCells = (): Cell[] => [
  number('max_price', 'Max price', 23.1, 'per_share', { currency: 'USD' }),
  number('current_price', 'Current price', 61.2, 'per_share', {
    currency: 'USD',
  }),
  number('margin', 'Margin', -62.3, 'percent'),
];
export const qualityCells = (): Cell[] => [
  number('score', 'Score', 7, 'points'),
  text('completeness', 'Completeness', 'Complete'),
];
// A run that is not applicable: its number cells carry a status and a reason.
export const grahamNotApplicableCells = (): Cell[] => [
  number('max_price', 'Max price', null, 'per_share', {
    currency: 'USD',
    status: 'not_applicable',
    reason: 'instrument_kind_not_applicable',
  }),
  number('current_price', 'Current price', null, 'per_share', {
    currency: 'USD',
    status: 'not_applicable',
  }),
  number('margin', 'Margin', null, 'percent', { status: 'not_applicable' }),
];

const runId = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const compareRun = (
  n: number,
  outcome: Outcome,
  cells: Cell[] | null,
  unavailable: Schemas['HeadlineUnavailable'] | null = null,
  periodEnd: string | null = null,
): Run => ({
  analysis_run_id: runId(n),
  outcome,
  requested_as_of: null,
  headline: cells === null ? null : headline(cells, periodEnd),
  headline_unavailable: unavailable,
});

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

// A refresh of a watchlist with three strategies, one of them made up: ACME
// has all three runs, ZED has no momentum run, a graham run that is not
// applicable and a quality run with no headline. The momentum group has no
// outcome column; the other two groups have one.
export const coreComparison: Schemas['RunsCompareDocument'] = {
  schema_version: 7,
  refresh_id: coreRefreshId,
  watchlist_id: coreId,
  watchlist_name: 'Core (as it was)',
  first_completed_at: '2026-10-30T17:58:00+00:00',
  last_completed_at: '2026-10-30T18:02:00+00:00',
  run_count: 5,
  outcome_counts: counts(3, 1, 1, 0),
  strategies: [
    strategyDocuments.momentum,
    strategyDocuments.graham,
    strategyDocuments.quality,
  ],
  rows: [
    {
      ticker: 'ACME',
      entries: [
        {
          method_id: 'sma_crossover',
          run: compareRun(1, 'completed', momentumCells()),
        },
        {
          method_id: 'graham_number',
          run: compareRun(
            2,
            'completed',
            grahamCells(),
            null,
            '2025-12-31T00:00:00+00:00',
          ),
        },
        {
          method_id: 'quality_screen',
          run: compareRun(3, 'completed', qualityCells()),
        },
      ],
    },
    {
      ticker: 'ZED',
      entries: [
        { method_id: 'sma_crossover', run: null },
        {
          method_id: 'graham_number',
          run: compareRun(4, 'not_applicable', grahamNotApplicableCells()),
        },
        {
          method_id: 'quality_screen',
          run: compareRun(5, 'unavailable', null, 'no_result_stored'),
        },
      ],
    },
  ],
};

// A refresh with a strategy that is no longer declared.
export const retiredComparison: Schemas['RunsCompareDocument'] = {
  schema_version: 7,
  refresh_id: retiredRefreshId,
  watchlist_id: coreId,
  watchlist_name: 'Core (as it was)',
  first_completed_at: '2026-10-27T12:00:00+00:00',
  last_completed_at: '2026-10-27T12:00:20+00:00',
  run_count: 2,
  outcome_counts: counts(1, 0, 0, 1),
  strategies: [strategyDocuments.momentum, strategyDocuments.retired],
  rows: [
    {
      ticker: 'OLD',
      entries: [
        {
          method_id: 'sma_crossover',
          run: compareRun(11, 'completed', momentumCells()),
        },
        {
          method_id: 'retired_method',
          run: compareRun(12, 'failed', null, 'strategy_not_declared'),
        },
      ],
    },
  ],
};

// A refresh of entries that belong to no watchlist, with every run complete.
export const adHocComparison: Schemas['RunsCompareDocument'] = {
  schema_version: 7,
  refresh_id: adHocRefreshId,
  watchlist_id: null,
  watchlist_name: null,
  first_completed_at: '2026-10-29T13:15:00+00:00',
  last_completed_at: '2026-10-29T13:15:30+00:00',
  run_count: 2,
  outcome_counts: counts(2, 0, 0, 0),
  strategies: [strategyDocuments.momentum],
  rows: [
    {
      ticker: 'ACME',
      entries: [
        {
          method_id: 'sma_crossover',
          run: compareRun(21, 'completed', momentumCells()),
        },
      ],
    },
    {
      ticker: 'DIVI',
      entries: [
        {
          method_id: 'sma_crossover',
          run: compareRun(22, 'completed', momentumCells()),
        },
      ],
    },
  ],
};

// An analysis of one ticker under two strategies: entries of no watchlist whose
// rows all name the same ticker (D274).
export const oneTickerComparison: Schemas['RunsCompareDocument'] = {
  schema_version: 7,
  refresh_id: analyzeRefreshId,
  watchlist_id: null,
  watchlist_name: null,
  first_completed_at: '2026-11-19T13:15:00+00:00',
  last_completed_at: '2026-11-19T13:15:30+00:00',
  run_count: 2,
  outcome_counts: counts(2, 0, 0, 0),
  strategies: [strategyDocuments.momentum, strategyDocuments.graham],
  rows: [
    {
      ticker: 'ACME',
      entries: [
        {
          method_id: 'sma_crossover',
          run: compareRun(31, 'completed', momentumCells()),
        },
        {
          method_id: 'graham_number',
          run: compareRun(32, 'completed', grahamCells()),
        },
      ],
    },
  ],
};

export const comparisons: Record<string, Schemas['RunsCompareDocument']> = {
  [analyzeRefreshId]: oneTickerComparison,
  [coreRefreshId]: coreComparison,
  [retiredRefreshId]: retiredComparison,
  [adHocRefreshId]: adHocComparison,
};

// A run's overview and, when the engine answers it, its full document.
export type RunDetail = {
  overview: Schemas['RunOverviewDocument'];
  // Null: the engine refuses the document (409) though it answers the overview.
  document: RunDocument | null;
};

type DocumentFields = Pick<
  Schemas['MomentumDocument'],
  | 'ticker'
  | 'schema_version'
  | 'effective_as_of'
  | 'requested_as_of'
  | 'warnings'
  | 'limitations'
  | 'security_identity'
  | 'status'
>;

export function documentOf(
  ticker: string,
  name: string | null,
  method: string,
  effectiveAsOf: string,
  warnings: string[] = [],
  limitations: string[] = [],
): RunDocument {
  const fields: DocumentFields = {
    ticker,
    schema_version: 1,
    effective_as_of: effectiveAsOf,
    requested_as_of: null,
    warnings,
    limitations,
    status: 'ok',
    security_identity: {
      ticker,
      instrument_name: name,
      instrument_identifier: null,
      issuer_identifier: null,
      listing_venue: null,
      provider_id: null,
      resolved_at: null,
    },
  };
  // The strategy-specific parts are not rendered, so a fixture names only the
  // method; the made-up strategy's document has no declared type.
  return {
    ...fields,
    method,
    extra: { kept: 'served order' },
  } as unknown as RunDocument;
}

// The identity a run kept when it ran (D289): every descriptive field is null
// when no provider gave a name.
export function identityOf(
  ticker: string,
  name: string | null,
  venue: string | null = null,
): Schemas['SecurityIdentityPart'] {
  return {
    ticker,
    instrument_name: name,
    listing_venue: venue,
    issuer_identifier: null,
    instrument_identifier: null,
    provider_id: name === null ? null : 'yahoo',
    resolved_at: name === null ? null : '2026-10-30T18:00:00+00:00',
  };
}

function overviewOf(
  id: string,
  ticker: string,
  name: string | null,
  strategy: Strategy,
  outcome: Outcome,
  completedAt: string,
  refreshId: string | null,
  cells: Cell[] | null,
  unavailable: Schemas['HeadlineUnavailable'] | null = null,
  periodEnd: string | null = null,
): Schemas['RunOverviewDocument'] {
  return {
    schema_version: 3,
    security_identity: identityOf(ticker, name),
    analysis_run_id: id,
    ticker,
    strategy,
    outcome,
    completed_at: completedAt,
    refresh_id: refreshId,
    requested_as_of: null,
    headline: cells === null ? null : headline(cells, periodEnd),
    headline_unavailable: unavailable,
  };
}

const savedId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const runDetails: Record<string, RunDetail> = {
  // Saved runs 1 to 4 (data.ts): a direct analysis with warnings and
  // limitations, one with null cells that carry a status and a reason code, a
  // made-up strategy saved by the Core refresh, and a strategy no longer
  // declared whose overview answers while its document does not.
  [savedId(1)]: {
    overview: overviewOf(
      savedId(1),
      'MSFT',
      'Microsoft Corp',
      strategyDocuments.graham,
      'completed',
      '2026-11-02T14:41:00+00:00',
      null,
      grahamCells(),
      null,
      '2025-12-31T00:00:00+00:00',
    ),
    document: documentOf(
      'MSFT',
      'Microsoft Corp',
      'graham_number',
      '2025-12-31',
      ['The quote is older than a day.'],
      ['Uses reported earnings only.', 'Ignores later restatements.'],
    ),
  },
  [savedId(2)]: {
    overview: overviewOf(
      savedId(2),
      'MSFT',
      null,
      strategyDocuments.momentum,
      'unavailable',
      '2026-10-30T18:02:00+00:00',
      null,
      [
        text('trend', 'Trend', null),
        number('rsi', 'RSI', null, 'points', {
          status: 'input_unavailable',
          reason: 'insufficient_history',
        }),
      ],
    ),
    document: documentOf(
      'MSFT',
      null,
      'sma_crossover',
      '2026-10-30T18:02:00+00:00',
    ),
  },
  [savedId(3)]: {
    overview: overviewOf(
      savedId(3),
      'ZED',
      'Zed Holdings',
      strategyDocuments.quality,
      'completed',
      '2026-10-29T18:02:00+00:00',
      coreRefreshId,
      qualityCells(),
    ),
    document: documentOf('ZED', 'Zed Holdings', 'quality_screen', '2026-10-29'),
  },
  [savedId(4)]: {
    overview: overviewOf(
      savedId(4),
      'OLD',
      'Old Industries',
      strategyDocuments.retired,
      'failed',
      '2026-10-28T18:02:00+00:00',
      null,
      null,
      'strategy_not_declared',
    ),
    document: null,
  },
  // The runs of the comparisons, saved by their refresh.
  [runId(1)]: {
    overview: overviewOf(
      runId(1),
      'ACME',
      'Acme Corp',
      strategyDocuments.momentum,
      'completed',
      '2026-10-30T18:00:00+00:00',
      coreRefreshId,
      momentumCells(),
    ),
    document: documentOf('ACME', 'Acme Corp', 'sma_crossover', '2026-10-30'),
  },
  [runId(2)]: {
    overview: overviewOf(
      runId(2),
      'ACME',
      'Acme Corp',
      strategyDocuments.graham,
      'completed',
      '2026-10-30T18:00:00+00:00',
      coreRefreshId,
      grahamCells(),
      null,
      '2025-12-31T00:00:00+00:00',
    ),
    document: documentOf('ACME', 'Acme Corp', 'graham_number', '2026-10-30'),
  },
  [runId(4)]: {
    overview: overviewOf(
      runId(4),
      'ZED',
      'Zed Holdings',
      strategyDocuments.graham,
      'not_applicable',
      '2026-10-30T18:01:00+00:00',
      coreRefreshId,
      grahamNotApplicableCells(),
    ),
    document: documentOf('ZED', 'Zed Holdings', 'graham_number', '2026-10-30'),
  },
  [runId(5)]: {
    overview: overviewOf(
      runId(5),
      'ZED',
      'Zed Holdings',
      strategyDocuments.quality,
      'unavailable',
      '2026-10-30T18:02:00+00:00',
      coreRefreshId,
      null,
      'no_result_stored',
    ),
    document: documentOf('ZED', 'Zed Holdings', 'quality_screen', '2026-10-30'),
  },
  [runId(12)]: {
    overview: overviewOf(
      runId(12),
      'OLD',
      'Old Industries',
      strategyDocuments.retired,
      'failed',
      '2026-10-27T12:00:20+00:00',
      retiredRefreshId,
      null,
      'strategy_not_declared',
    ),
    document: null,
  },
  [runId(31)]: {
    overview: overviewOf(
      runId(31),
      'ACME',
      'Acme Corp',
      strategyDocuments.momentum,
      'completed',
      '2026-11-19T13:15:10+00:00',
      analyzeRefreshId,
      momentumCells(),
    ),
    document: documentOf('ACME', 'Acme Corp', 'sma_crossover', '2026-11-19'),
  },
  [runId(32)]: {
    overview: overviewOf(
      runId(32),
      'ACME',
      'Acme Corp',
      strategyDocuments.graham,
      'completed',
      '2026-11-19T13:15:20+00:00',
      analyzeRefreshId,
      grahamCells(),
    ),
    document: documentOf('ACME', 'Acme Corp', 'graham_number', '2026-11-19'),
  },
  [runId(21)]: {
    overview: overviewOf(
      runId(21),
      'ACME',
      'Acme Corp',
      strategyDocuments.momentum,
      'completed',
      '2026-10-29T13:15:10+00:00',
      adHocRefreshId,
      momentumCells(),
    ),
    document: documentOf('ACME', 'Acme Corp', 'sma_crossover', '2026-10-29'),
  },
};

export const textModes = ['concise', 'details', 'diagnostics'] as const;

export function textFor(
  id: string,
  mode: Schemas['TextPresentationMode'],
): Schemas['ReplayTextDocument'] {
  return {
    schema_version: 1,
    mode,
    text: `Run ${id.slice(-4)} in ${mode} mode\n${'A line that is wider than the panel needs. '.repeat(6)}`,
  };
}
