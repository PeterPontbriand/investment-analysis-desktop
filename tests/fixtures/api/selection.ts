// Typed selection forms, option terms and failures for adding entries (GUI.3b),
// shared by Vitest and Playwright. The five declared strategies' forms follow
// the engine at f238779: the field order the model serves, the engine's
// titles, descriptions, defaults and `x-term`s. The last two strategies are
// made up: no GUI code names them.
import type { components } from '../../../src/api/schema.ts';
import * as data from './data.ts';
import { coreId } from './data.ts';
import { failure, ok, type Reply } from './server.ts';

type Schemas = components['schemas'];
type Form = Schemas['SelectionFormDocument'];

const form = (
  schema: Record<string, unknown>,
  defaults: Record<string, unknown> = {},
): Form => ({
  schema_version: 1,
  schema: schema as unknown as Form['schema'],
  defaults: defaults as Form['defaults'],
});

const asOf = {
  anyOf: [
    { format: 'date', type: 'string' },
    { format: 'date-time', type: 'string' },
    { type: 'null' },
  ],
  default: null,
  description:
    'Run the analysis as of this date (the end of that day, UTC) or this moment, which needs a timezone offset; leave empty for the latest data.',
  title: 'As of',
  'x-term': 'as-of-date',
};

const useCache = {
  default: true,
  description:
    'Whether the analysis may read and write the local cache of fetched data.',
  title: 'Use cached data',
  type: 'boolean',
  'x-term': 'cache',
};

const optional = (title: string, description: string, term = 'override') => ({
  anyOf: [{ type: 'number' }, { type: 'null' }],
  default: null,
  description,
  title,
  'x-term': term,
});

const epsOverride = optional(
  'Earnings per share override',
  'Earnings per share to use instead of the reported figure; leave empty to use it.',
);
const quoteOverride = optional(
  'Share price override',
  'Share price to use instead of the current quote; leave empty to use the quote.',
);

export const momentumForm = form(
  {
    additionalProperties: false,
    description: 'Immutable snapshot of the effective Momentum configuration.',
    properties: {
      short_window: {
        description: 'Number of trading days in the short moving average.',
        exclusiveMinimum: 0,
        title: 'Short window',
        type: 'integer',
        'x-term': 'sma-windows',
      },
      long_window: {
        description:
          'Number of trading days in the long moving average; it must be larger than the short one.',
        exclusiveMinimum: 0,
        title: 'Long window',
        type: 'integer',
        'x-term': 'sma-windows',
      },
      rsi_period: {
        description:
          'Number of trading days the relative strength index looks back over.',
        exclusiveMinimum: 0,
        title: 'RSI period',
        type: 'integer',
        'x-term': 'rsi',
      },
      as_of: asOf,
      use_cache: useCache,
    },
    title: 'MomentumSelection',
    type: 'object',
  },
  { short_window: 50, long_window: 200, rsi_period: 14 },
);

export const grahamNumberForm = form({
  additionalProperties: false,
  description:
    'Immutable Graham Number selection with an optional book-value override.',
  properties: {
    eps_override: epsOverride,
    quote_override: quoteOverride,
    bvps_override: optional(
      'Book value per share override',
      'Book value per share to use instead of the reported figure; leave empty to use it.',
    ),
    as_of: asOf,
    use_cache: useCache,
  },
  title: 'GrahamNumberSelection',
  type: 'object',
});

export const grahamGrowthForm = form({
  $defs: {
    GrahamGrowthSelectionEPSBasis: {
      enum: ['three_year_average', 'fiscal_year'],
      type: 'string',
    },
  },
  additionalProperties: false,
  description:
    'Graham growth-value selection requiring explicit growth and AAA yield percentages.',
  properties: {
    eps_basis: {
      $ref: '#/$defs/GrahamGrowthSelectionEPSBasis',
      default: 'three_year_average',
      description:
        'Which earnings figure to use: the three-year average, or one completed fiscal year.',
      title: 'EPS basis',
      'x-term': 'eps-basis',
    },
    eps_override: epsOverride,
    quote_override: quoteOverride,
    expected_growth: {
      description: 'Expected annual earnings growth, in percentage points.',
      title: 'Expected growth rate',
      type: 'number',
      'x-term': 'expected-growth-rate',
    },
    aaa_yield_override: {
      description: 'Current AAA corporate-bond yield, in percentage points.',
      title: 'AAA corporate bond yield',
      type: 'number',
      'x-term': 'override',
    },
    as_of: asOf,
    use_cache: useCache,
  },
  required: ['expected_growth', 'aaa_yield_override'],
  title: 'GrahamGrowthSelection',
  type: 'object',
});

const policyField = (
  title: string,
  ref: string,
  fallback: string,
  term: string,
  description: string,
) => ({
  $ref: `#/$defs/${ref}`,
  default: fallback,
  description,
  title,
  'x-term': term,
});

export const fcfGrowthForm = form({
  $defs: {
    FCFClassificationBasis: {
      enum: ['total_fcf', 'fcf_per_share'],
      type: 'string',
    },
    FCFPolicySnapshot: {
      additionalProperties: false,
      properties: {
        historical_horizon: policyField(
          'Historical horizon',
          'HistoricalHorizon',
          'longest_available',
          'historical-horizon',
          'How many elapsed years of history to require; the default picks the longest available up to five.',
        ),
        classification_basis: policyField(
          'Classification basis',
          'FCFClassificationBasis',
          'total_fcf',
          'classification-basis',
          'Whether growth is classified on total free cash flow or on free cash flow per share.',
        ),
        forward_policy: policyField(
          'Forward policy',
          'ForwardPolicy',
          'display_only',
          'forward-policy',
          'How forward-looking evidence affects the result: shown only, required to confirm, or a hard gate.',
        ),
      },
      type: 'object',
    },
    ForwardPolicy: {
      enum: ['display_only', 'confirmation', 'hard_gate'],
      type: 'string',
    },
    HistoricalHorizon: {
      enum: ['longest_available', '3', '4', '5'],
      type: 'string',
    },
  },
  additionalProperties: false,
  description:
    'Historical FCF/Earnings Growth request options, independent of Graham configs.',
  properties: {
    policy: {
      $ref: '#/$defs/FCFPolicySnapshot',
      description:
        'The growth horizon, classification and forward-evidence rules.',
      title: 'Growth policy',
      'x-term': 'fcf-growth-strategy',
    },
    currency: {
      default: 'USD',
      description:
        'Three-letter ISO 4217 code of the reporting currency the annual facts must use.',
      title: 'Reporting currency',
      type: 'string',
      'x-term': 'reporting-currency',
    },
    as_of: asOf,
    use_cache: useCache,
  },
  title: 'FCFGrowthSelection',
  type: 'object',
});

export const piotroskiForm = form({
  additionalProperties: false,
  description:
    'The Piotroski F-Score selection: the shared point-in-time and cache fields.',
  properties: { as_of: asOf, use_cache: useCache },
  title: 'PiotroskiSelection',
  type: 'object',
});

// A made-up strategy whose form uses every construct the form supports: a
// checkbox, a whole number, a number with every kind of bound, text, a closed
// set through `$ref` and inline, "this or null", a required field and a
// nested group with a starting value of its own in `defaults`.
export const madeUpForm = form(
  {
    $defs: {
      Tilt: { enum: ['value', 'growth'], type: 'string' },
      Limits: {
        properties: {
          ceiling: {
            description: 'The most to pay, in percentage points.',
            exclusiveMaximum: 100,
            maximum: 99,
            title: 'Price ceiling',
            type: 'number',
            'x-term': 'ceiling',
          },
          note: {
            description: 'A reminder kept with the entry.',
            title: 'Note',
            type: 'string',
            'x-term': 'note',
          },
        },
        required: ['ceiling'],
        type: 'object',
      },
    },
    properties: {
      min_score: {
        description: 'The lowest score to accept.',
        minimum: 1,
        maximum: 9,
        title: 'Lowest score',
        type: 'integer',
        'x-term': 'score',
      },
      weight: {
        description: 'How much the screen counts.',
        exclusiveMinimum: 0,
        title: 'Screen weight',
        type: 'number',
        'x-term': 'weight',
      },
      tilt: {
        $ref: '#/$defs/Tilt',
        default: 'value',
        description: 'Which style to lean to.',
        title: 'Style tilt',
        'x-term': 'tilt',
      },
      sector: {
        description: 'The sector to keep.',
        enum: ['energy', 'health'],
        title: 'Sector',
        type: 'string',
        'x-term': 'sector',
      },
      target: optional('Target price', 'A price to compare with.', 'target'),
      strict: {
        default: false,
        description: 'Whether to refuse a partial result.',
        title: 'Strict mode',
        type: 'boolean',
        'x-term': 'strict',
      },
      limits: {
        $ref: '#/$defs/Limits',
        description: 'Limits kept together.',
        title: 'Limits',
        'x-term': 'limits',
      },
      as_of: asOf,
      use_cache: useCache,
    },
    required: ['weight'],
    title: 'QualityScreenSelection',
    type: 'object',
  },
  { limits: { ceiling: 80 } },
);

// A made-up strategy with a construct the form does not support. Its required
// field blocks only this strategy (D190).
export const unsupportedForm = form({
  properties: {
    ratios: {
      description: 'A list of ratios.',
      items: { type: 'number' },
      title: 'Ratios',
      type: 'array',
      'x-term': 'ratios',
    },
    use_cache: useCache,
  },
  required: ['ratios'],
  title: 'ExoticSelection',
  type: 'object',
});

// A made-up strategy whose only unsupported field is optional.
export const unsupportedOptionalForm = form({
  properties: {
    ratios: {
      description: 'A list of ratios.',
      items: { type: 'number' },
      title: 'Ratios',
      type: 'array',
      'x-term': 'ratios',
    },
    use_cache: useCache,
  },
  title: 'OddSelection',
  type: 'object',
});

export const forms: Record<string, Form> = {
  sma_crossover: momentumForm,
  graham_number: grahamNumberForm,
  graham_growth_value: grahamGrowthForm,
  reported_fcf_eps_cagr: fcfGrowthForm,
  piotroski: piotroskiForm,
  quality_screen: madeUpForm,
  exotic_screen: unsupportedForm,
  odd_screen: unsupportedOptionalForm,
};

// The engine's strategies in its order, then the made-up ones.
const item = (
  analysis: string,
  method: string,
  label: string,
  term: string,
): Schemas['StrategiesDocument']['items'][number] => ({
  analysis,
  method: method as 'sma_crossover',
  label,
  term,
});

export const allStrategies: Schemas['StrategiesDocument'] = {
  schema_version: 2,
  items: [
    item('momentum', 'sma_crossover', 'Momentum', 'strategy-momentum'),
    item(
      'graham-number',
      'graham_number',
      'Graham Number',
      'strategy-graham-number',
    ),
    item(
      'graham-growth',
      'graham_growth_value',
      'Graham Growth',
      'strategy-graham-growth',
    ),
    item(
      'fcf-growth',
      'reported_fcf_eps_cagr',
      'FCF Growth',
      'strategy-fcf-growth',
    ),
    item('piotroski', 'piotroski', 'Piotroski F-Score', 'strategy-piotroski'),
    item(
      'quality-screen',
      'quality_screen',
      'Quality Screen',
      'strategy-quality-screen',
    ),
  ],
};

export const exoticStrategies: Schemas['StrategiesDocument'] = {
  schema_version: 2,
  items: [
    item(
      'graham-number',
      'graham_number',
      'Graham Number',
      'strategy-graham-number',
    ),
    item('exotic', 'exotic_screen', 'Exotic Screen', 'strategy-exotic'),
    item('odd', 'odd_screen', 'Odd Screen', 'strategy-odd'),
  ],
};

// The terms of the options of every closed set the forms use: the engine's
// names at f238779, and the made-up strategy's.
const optionTerms: Record<string, Record<string, string>> = {
  GrahamGrowthSelectionEPSBasis: {
    three_year_average: 'three-year-average-eps',
    fiscal_year: 'fiscal-year-eps',
  },
  FCFClassificationBasis: {
    total_fcf: 'classification-basis-total-fcf',
    fcf_per_share: 'classification-basis-fcf-per-share',
  },
  ForwardPolicy: {
    display_only: 'forward-policy-display-only',
    confirmation: 'forward-policy-confirmation',
    hard_gate: 'forward-policy-hard-gate',
  },
  HistoricalHorizon: {
    longest_available: 'historical-horizon-longest-available',
    '3': 'historical-horizon-three-years',
    '4': 'historical-horizon-four-years',
    '5': 'historical-horizon-five-years',
  },
  Tilt: { value: 'tilt-value', growth: 'tilt-growth' },
};

const termNames: Record<string, string> = {
  'three-year-average-eps': 'Three-Year-Average EPS',
  'fiscal-year-eps': 'Fiscal-Year EPS',
  'classification-basis-total-fcf': 'Total FCF Basis',
  'classification-basis-fcf-per-share': 'FCF-per-Share Basis',
  'forward-policy-display-only': 'Display-Only Policy',
  'forward-policy-confirmation': 'Confirmation Policy',
  'forward-policy-hard-gate': 'Hard-Gate Policy',
  'historical-horizon-longest-available': 'Longest Available Horizon',
  'historical-horizon-three-years': 'Three-Year Horizon',
  'historical-horizon-four-years': 'Four-Year Horizon',
  'historical-horizon-five-years': 'Five-Year Horizon',
  'tilt-value': 'Value Tilt',
  'tilt-growth': 'Growth Tilt',
};

export function withOptionTerms(
  help: Schemas['HelpIndexDocument'],
  references: Schemas['HelpReferencesDocument'],
): {
  help: Schemas['HelpIndexDocument'];
  references: Schemas['HelpReferencesDocument'];
} {
  return {
    help: {
      ...help,
      groups: [
        ...help.groups,
        {
          id: 'options',
          title: 'Options',
          terms: Object.entries(termNames).map(([id, name]) => ({
            id,
            name,
            definition: `${name}.`,
          })),
        },
      ],
    },
    references: {
      ...references,
      code_sets: { ...references.code_sets, ...optionTerms },
    },
  };
}

const watchlistFor = (
  entries: Schemas['WatchlistDocument']['entries'],
): Schemas['WatchlistDocument'] => ({
  schema_version: 2,
  watchlist_id: coreId,
  display_name: 'Core',
  created_at: '2026-10-30T17:00:00+00:00',
  updated_at: null,
  entries,
});

// The watchlist after `count` entries were added to an empty one.
export const watchlistWith = (count: number): Schemas['WatchlistDocument'] =>
  watchlistFor(
    Array.from({ length: count }, (_unused, i) => ({
      index: i + 1,
      ticker: 'KO',
      selection: {
        method_id: 'piotroski',
        as_of: null,
        use_cache: true,
      } as Schemas['PiotroskiSelection'],
    })),
  );

type RuleErrors = NonNullable<Schemas['FailureEnvelope']['errors']>;

export const ruleError = (
  rule: string,
  parameters: string[],
  template: string,
  message: string,
  args: Record<string, unknown> = {},
): RuleErrors[number] => ({
  rule,
  parameters,
  arguments: args as RuleErrors[number]['arguments'],
  message,
  template,
});

// An `invalid_parameter` failure that lists rule errors.
export const invalid = (errors: RuleErrors): Reply => {
  const reply = failure(400, 'invalid_parameter', errors[0]?.message ?? '');
  const body = reply.body as Schemas['FailureEnvelope'];
  body.errors = errors;
  body.parameters = errors[0]?.parameters ?? null;
  return reply;
};

export const failures = {
  // The window-order rule names two fields.
  windowOrder: invalid([
    ruleError(
      'momentum.window_order',
      ['selection.short_window', 'selection.long_window'],
      'Invalid momentum windows: {selection.short_window} ({short_window_value}) must be smaller than {selection.long_window} ({long_window_value}).',
      'Invalid momentum windows: selection.short_window (200) must be smaller than selection.long_window (50).',
      { short_window_value: 200, long_window_value: 50 },
    ),
  ]),
  duplicate: invalid([
    ruleError(
      'entries.duplicate',
      ['tickers'],
      '{tickers} must not duplicate an entry: {ticker} is already listed for {strategy} with an equal selection in the watchlist.',
      'tickers must not duplicate an entry: KO is already listed for Momentum with an equal selection in the watchlist.',
      { ticker: 'KO', strategy: 'Momentum' },
    ),
  ]),
  twinInRequest: invalid([
    ruleError(
      'entries.duplicate',
      ['tickers'],
      '{tickers} must not duplicate an entry: {ticker} is listed twice for {strategy} with an equal selection in this request.',
      'tickers must not duplicate an entry: KO is listed twice for Momentum with an equal selection in this request.',
      { ticker: 'KO', strategy: 'Momentum' },
    ),
  ]),
  tickerAt: invalid([
    ruleError(
      'watchlist.blank_ticker',
      ['tickers[1]'],
      '{tickers[1]} must not be empty.',
      'tickers[1] must not be empty.',
    ),
  ]),
  asOf: invalid([
    ruleError(
      'pydantic.datetime_from_date_parsing',
      ['selection.as_of'],
      'Invalid {selection.as_of}: {pydantic_message}',
      'Invalid selection.as_of: Input should be a valid datetime',
      { pydantic_message: 'Input should be a valid datetime' },
    ),
  ]),
  // Two errors, one naming a nested field of the growth strategy's group.
  nested: invalid([
    ruleError(
      'pydantic.enum',
      ['selection.policy.forward_policy'],
      'Invalid {selection.policy.forward_policy}: {pydantic_message}',
      'Invalid selection.policy.forward_policy: Input should be a valid value',
      { pydantic_message: 'Input should be a valid value' },
    ),
  ]),
  // An error that names a field the form does not show.
  methodId: invalid([
    ruleError(
      'request.method_id',
      ['method_id'],
      'The {method_id} is not a declared method.',
      'The method_id is not a declared method.',
    ),
  ]),
  // An error whose parameters name no field and whose argument is a number.
  unrecognised: invalid([
    ruleError(
      'request.body',
      ['body.extra'],
      '{body.extra} was not expected ({count_value}).',
      'body.extra was not expected (1234.5).',
      { count_value: 1234.5 },
    ),
  ]),
  // An error with two fields in the form's own order, named in reverse.
  twoFields: invalid([
    ruleError(
      'momentum.window_order',
      ['selection.long_window', 'selection.short_window'],
      '{selection.long_window} ({long_window_value}) must exceed {selection.short_window} ({short_window_value}).',
      'selection.long_window (50) must exceed selection.short_window (200).',
      { long_window_value: 50, short_window_value: 200 },
    ),
  ]),
  // A request failure with no list of errors.
  shape: failure(400, 'invalid_parameter', 'The body is not valid JSON.'),
};

// A fresh failure each time: the body is changed here.
export function unreadableFailure(): Reply {
  const reply = failure(
    409,
    'stored_selection_unreadable',
    'Entry 2 was saved by a different version and cannot be read.',
  );
  (reply.body as Schemas['FailureEnvelope']).unreadable = {
    entry_number: 2,
    ticker: 'ACME',
    method_id: 'retired_method',
    reason: 'Entry 2 was saved by a different version and cannot be read.',
  };
  return reply;
}

// What the engine mock answers for a strategy's selection form.
export function formReply(methodId: string): Reply {
  const document = forms[methodId];
  return document
    ? ok(document)
    : failure(400, 'invalid_parameter', 'Not a declared method.');
}

// What the engine mock answers for the strategies, the help documents with the
// option terms, and each strategy's selection form.
export function selectionHandler(
  strategies: Schemas['StrategiesDocument'] = allStrategies,
): (url: URL) => Reply | undefined {
  const served = withOptionTerms(data.helpIndex, data.references);
  return (url) => {
    switch (url.pathname) {
      case '/v1/strategies':
        return ok(strategies);
      case '/v1/help':
        return ok(served.help);
      case '/v1/help/references':
        return ok(served.references);
    }
    const match = /^\/v1\/strategies\/([^/]+)\/selection$/.exec(url.pathname);
    return match ? formReply(match[1] ?? '') : undefined;
  };
}
