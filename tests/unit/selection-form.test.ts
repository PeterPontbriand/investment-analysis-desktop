import { describe, expect, it } from 'vitest';
import {
  buildSelection,
  initialValues,
  needsInputNow,
  numberProblem,
  validateFields,
} from '../../src/selection/form.ts';
import {
  fieldTarget,
  placeRuleErrors,
  targetOf,
  targetOrder,
  tickersTarget,
  asOfTarget,
} from '../../src/selection/problems.ts';
import {
  readSelectionSchema,
  type NumberField,
  type SchemaNode,
} from '../../src/selection/schema.ts';
import { formatArgument, fillTemplate } from '../../src/selection/templates.ts';
import { splitTickers } from '../../src/selection/tickers.ts';
import {
  formatConjunction,
  readStoredValue,
} from '../../src/selection/format.ts';
import * as selection from '../fixtures/api/selection.ts';

const read = (document: { schema: unknown; defaults: unknown }) =>
  readSelectionSchema(document.schema as SchemaNode, document.defaults);

describe('the request a form builds', () => {
  it('sends the configured and default values and nothing for an empty optional field', () => {
    const { fields } = read(selection.grahamGrowthForm);
    const values = initialValues(fields);
    values.expected_growth = '6.5';
    values.aaa_yield_override = '4.9';
    expect(buildSelection(fields, values)).toEqual({
      eps_basis: 'three_year_average',
      expected_growth: 6.5,
      aaa_yield_override: 4.9,
      use_cache: true,
    });
  });

  it('sends the configured windows as numbers and leaves a cleared one out', () => {
    const { fields } = read(selection.momentumForm);
    const values = initialValues(fields);
    expect(buildSelection(fields, values)).toEqual({
      short_window: 50,
      long_window: 200,
      rsi_period: 14,
      use_cache: true,
    });
    values.rsi_period = '';
    expect(buildSelection(fields, values)).not.toHaveProperty('rsi_period');
  });

  it('sends a nested group as an object, and no group that holds nothing', () => {
    const { fields } = read(selection.fcfGrowthForm);
    const values = initialValues(fields);
    values['policy.historical_horizon'] = '3';
    expect(buildSelection(fields, values)).toEqual({
      policy: {
        historical_horizon: '3',
        classification_basis: 'total_fcf',
        forward_policy: 'display_only',
      },
      currency: 'USD',
      use_cache: true,
    });
    for (const key of [
      'policy.historical_horizon',
      'policy.classification_basis',
      'policy.forward_policy',
    ])
      values[key] = '';
    expect(buildSelection(fields, values)).not.toHaveProperty('policy');
  });

  it('sends text as typed and a checkbox always', () => {
    const { fields } = read(selection.madeUpForm);
    const values = initialValues(fields);
    values.weight = ' 2 ';
    values['limits.note'] = '  keep  ';
    values.strict = true;
    expect(buildSelection(fields, values)).toMatchObject({
      weight: 2,
      strict: true,
      limits: { ceiling: 80, note: '  keep  ' },
    });
  });

  it('omits an unsupported field', () => {
    const { fields } = read(selection.unsupportedForm);
    expect(buildSelection(fields, initialValues(fields))).toEqual({
      use_cache: true,
    });
  });

  it('needs input only while a required option has no value now', () => {
    const { fields } = read(selection.grahamGrowthForm);
    const values = initialValues(fields);
    expect(needsInputNow(fields, values)).toBe(true);
    values.expected_growth = '6.5';
    expect(needsInputNow(fields, values)).toBe(true);
    values.aaa_yield_override = ' 4.9 ';
    expect(needsInputNow(fields, values)).toBe(false);
    // A value cleared again needs input again.
    values.expected_growth = '  ';
    expect(needsInputNow(fields, values)).toBe(true);
    expect(needsInputNow(fields, {})).toBe(true);
    expect(
      needsInputNow(
        read(selection.momentumForm).fields,
        initialValues(read(selection.momentumForm).fields),
      ),
    ).toBe(false);
    const piotroski = read(selection.piotroskiForm).fields;
    expect(needsInputNow(piotroski, initialValues(piotroski))).toBe(false);
    // A required field with a starting value is not empty; a field the form
    // cannot fill is not an empty option.
    const made = read(selection.madeUpForm).fields;
    const madeValues = initialValues(made);
    expect(needsInputNow(made, madeValues)).toBe(true);
    madeValues.weight = '2';
    expect(needsInputNow(made, madeValues)).toBe(false);
    const exotic = read(selection.unsupportedForm).fields;
    expect(needsInputNow(exotic, initialValues(exotic))).toBe(false);
  });
});

describe('the checks before sending', () => {
  const field = (extra: Partial<NumberField>): NumberField => ({
    kind: 'number',
    name: 'n',
    path: ['n'],
    key: 'n',
    label: 'N',
    termId: null,
    description: null,
    required: false,
    integer: false,
    min: null,
    max: null,
    exclusiveMin: null,
    exclusiveMax: null,
    initial: '',
    ...extra,
  });

  it.each([
    [field({ required: true }), '', false, { kind: 'required' }],
    [field({ required: true }), '  ', false, { kind: 'required' }],
    [field({}), '', false, null],
    [field({}), '4.5', false, null],
    [field({}), '', true, { kind: 'number' }],
    [field({ integer: true }), '', true, { kind: 'whole' }],
    [field({ integer: true }), '2.5', false, { kind: 'whole' }],
    [field({ integer: true }), '3', false, null],
    [field({ exclusiveMin: 0 }), '0', false, { kind: 'greater', limit: 0 }],
    [field({ exclusiveMin: 0 }), '0.1', false, null],
    [field({ min: 1 }), '0', false, { kind: 'least', limit: 1 }],
    [field({ min: 1 }), '1', false, null],
    [field({ exclusiveMax: 100 }), '100', false, { kind: 'less', limit: 100 }],
    [field({ max: 9 }), '9.5', false, { kind: 'most', limit: 9 }],
    [field({ max: 9 }), '9', false, null],
  ])('number %#', (numberField, text, bad, expected) => {
    expect(numberProblem(numberField, text, bad)).toEqual(expected);
  });

  it('checks every field in form order, with required text and choices', () => {
    const { fields } = read(selection.madeUpForm);
    const values = initialValues(fields);
    values.min_score = '0';
    values['limits.ceiling'] = '';
    const problems = validateFields(fields, values, new Set(['weight']));
    expect([...problems]).toEqual([
      ['min_score', { kind: 'least', limit: 1 }],
      ['weight', { kind: 'number' }],
      ['limits.ceiling', { kind: 'required' }],
    ]);
  });

  it('reports a required unsupported field so its strategy is blocked', () => {
    const { fields } = read(selection.unsupportedForm);
    expect([...validateFields(fields, initialValues(fields))]).toEqual([
      ['ratios', { kind: 'unsupported' }],
    ]);
  });
});

describe('ticker splitting', () => {
  it.each([
    ['ko, msft', ['ko', 'msft']],
    ['KO MSFT', ['KO', 'MSFT']],
    ['  ko ,, msft\n aapl ', ['ko', 'msft', 'aapl']],
    ['', []],
    [' , ', []],
    ['brk.b', ['brk.b']],
  ])('%j', (text, expected) => {
    expect(splitTickers(text)).toEqual(expected);
  });
});

describe('filling an error template', () => {
  const windowOrder = selection.failures.windowOrder.body as {
    errors: Parameters<typeof fillTemplate>[0][];
  };
  const labels: Record<string, string> = {
    'selection.short_window': 'Short window',
    'selection.long_window': 'Long window',
    'selection.rsi_period': 'RSI period',
    'selection.aaa_yield_override': 'AAA corporate bond yield',
  };

  it('replaces each parameter with its label unchanged and each argument with its value', () => {
    expect(fillTemplate(windowOrder.errors[0]!, (p) => labels[p], 'en')).toBe(
      'Invalid momentum windows: Short window (200) must be smaller than Long window (50).',
    );
  });

  it('keeps the case of a label such as "RSI period"', () => {
    const error = {
      rule: 'x',
      parameters: ['selection.rsi_period', 'selection.aaa_yield_override'],
      arguments: {},
      message: 'm',
      template: '{selection.rsi_period} and {selection.aaa_yield_override}.',
    };
    expect(fillTemplate(error, (p) => labels[p], 'en')).toBe(
      'RSI period and AAA corporate bond yield.',
    );
  });

  it('writes numbers in the locale and other values as text or JSON', () => {
    expect(formatArgument('en', 1234.5)).toBe('1,234.5');
    expect(formatArgument('de', 1234.5)).toBe('1.234,5');
    expect(formatArgument('en', 'KO')).toBe('KO');
    expect(formatArgument('en', true)).toBe('true');
    expect(formatArgument('en', null)).toBe('null');
    expect(formatArgument('en', ['a'])).toBe('["a"]');
  });

  it('shows a parameter as spelled when the form has no label for it', () => {
    const error = selection.ruleError(
      'r',
      ['method_id'],
      'The {method_id} is wrong.',
      'The method_id is wrong.',
    );
    expect(fillTemplate(error, () => undefined, 'en')).toBe(
      'The method_id is wrong.',
    );
  });

  it('shows the engine message when a placeholder is neither a parameter nor an argument', () => {
    const error = selection.ruleError(
      'r',
      ['a'],
      '{a} and {b}',
      'engine words',
    );
    expect(fillTemplate(error, () => 'A', 'en')).toBe('engine words');
  });
});

describe('placing errors', () => {
  const strategy = (
    document: typeof selection.momentumForm,
    method: string,
  ) => ({
    method,
    fields: read(document).fields,
  });
  const momentum = strategy(selection.momentumForm, 'sma_crossover');
  const growth = strategy(selection.fcfGrowthForm, 'reported_fcf_eps_cagr');

  it('names the target of each kind of parameter', () => {
    expect(targetOf('tickers', momentum)).toBe(tickersTarget);
    expect(targetOf('tickers[3]', momentum)).toBe(tickersTarget);
    expect(targetOf('selection.as_of', momentum)).toBe(asOfTarget);
    expect(targetOf('selection.short_window', momentum)).toBe(
      fieldTarget('sma_crossover', 'short_window'),
    );
    expect(targetOf('selection.policy.forward_policy', growth)).toBe(
      fieldTarget('reported_fcf_eps_cagr', 'policy.forward_policy'),
    );
    expect(targetOf('selection.unknown', momentum)).toBeNull();
    expect(targetOf('method_id', momentum)).toBeNull();
    expect(targetOf('body', momentum)).toBeNull();
    expect(targetOf('entries[0].selection.short_window', momentum)).toBeNull();
  });

  const labelOf = (target: string) =>
    target === tickersTarget ? 'Tickers' : target.split(':').pop();

  it('shows an error that names several fields once, at the first in form order', () => {
    const [problem] = placeRuleErrors(
      (selection.failures.twoFields.body as { errors: never[] }).errors,
      momentum,
      targetOrder([momentum]),
      labelOf,
      'en',
      'p',
    );
    const short = fieldTarget('sma_crossover', 'short_window');
    const long = fieldTarget('sma_crossover', 'long_window');
    expect(problem).toMatchObject({ shownAt: short, named: [short, long] });
    expect(problem?.text).toBe(
      'long_window (50) must exceed short_window (200).',
    );
  });

  it('puts an error that names no field above Add', () => {
    const [problem] = placeRuleErrors(
      (selection.failures.methodId.body as { errors: never[] }).errors,
      momentum,
      targetOrder([momentum]),
      labelOf,
      'en',
      'p',
    );
    expect(problem).toMatchObject({ shownAt: null, named: [] });
  });
});

describe('presenting a stored value', () => {
  it('shows each kind of value as the options list does', () => {
    const kind = (kindName: string, value: unknown) =>
      readStoredValue({ kind: kindName }, value, 'en');
    expect(kind('number', null)).toEqual({ kind: 'notSet' });
    expect(kind('number', undefined)).toEqual({ kind: 'notSet' });
    expect(kind('boolean', true)).toEqual({ kind: 'boolean', value: true });
    expect(kind('boolean', false)).toEqual({ kind: 'boolean', value: false });
    expect(kind('number', 6.5)).toEqual({ kind: 'text', text: '6.5' });
    expect(kind('number', 1234.5)).toEqual({ kind: 'text', text: '1,234.5' });
    expect(readStoredValue({ kind: 'number' }, 1234.5, 'de')).toEqual({
      kind: 'text',
      text: '1.234,5',
    });
    expect(kind('choice', 'fiscal_year')).toEqual({
      kind: 'choice',
      value: 'fiscal_year',
    });
    expect(kind('text', 'USD')).toEqual({ kind: 'text', text: 'USD' });
  });

  it('joins names with the locale\'s "and"', () => {
    expect(formatConjunction('en', ['Momentum', 'Graham Number'])).toBe(
      'Momentum and Graham Number',
    );
    expect(formatConjunction('en', ['A', 'B', 'C'])).toBe('A, B, and C');
    expect(formatConjunction('en', ['A'])).toBe('A');
  });
});
