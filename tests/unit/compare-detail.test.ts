import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';
import { createEngine, engineKey } from '../../src/api/engine.ts';
import { createAppI18n } from '../../src/i18n/index.ts';
import { applyLocale } from '../../src/i18n/locale.ts';
import type { Platform } from '../../src/platform/index.ts';
import { createAppRouter } from '../../src/router.ts';
import {
  compareCrumbs,
  filtersFromQuery,
  filtersToQuery,
  runCrumbs,
} from '../../src/views/navigation.ts';
import { outcomeCountsOf } from '../../src/views/compareModel.ts';
import { coreComparison, coreRefreshId } from '../fixtures/api/compare.ts';
import { respond } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json';

const host: Platform = {
  engineConnection: () =>
    Promise.resolve({
      state: 'ready',
      baseUrl: 'http://127.0.0.1:1',
      token: 't',
    }),
  engineStatus: () => Promise.resolve('running'),
  setWindowTitle: () => Promise.resolve(),
};

async function mountAt(path: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request) => {
      const reply = respond(new URL(String(input)));
      return Promise.resolve(
        new Response(JSON.stringify(reply.body), {
          status: reply.status,
          headers: { 'Content-Language': 'en' },
        }),
      );
    }),
  );
  const i18n = createAppI18n();
  applyLocale(i18n, 'en');
  const router = createAppRouter();
  await router.push(path);
  await router.isReady();
  const engine = createEngine(host, () => i18n.global.locale.value);
  const wrapper = mount(App, {
    global: {
      plugins: [i18n, router],
      provide: { [engineKey as symbol]: engine },
    },
  });
  await flushPromises();
  return wrapper;
}

afterEach(() => vi.unstubAllGlobals());

const labels = {
  runs: en.nav.runs,
  refreshes: en.nav.refreshes,
  refreshComparison: en.compare.refreshComparison,
};
const title = 'KO — Graham Number';
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('breadcrumbs', () => {
  it('shows Refreshes and the heading on the comparison', () => {
    expect(compareCrumbs(en.nav.refreshes, 'Core · Oct 30')).toEqual([
      { label: en.nav.refreshes, to: { name: 'refreshes' } },
      { label: 'Core · Oct 30' },
    ]);
    expect(compareCrumbs(en.nav.refreshes, null)).toEqual([
      { label: en.nav.refreshes },
    ]);
  });

  it('starts at Saved runs, with its filters, for a run opened from the list', () => {
    const crumbs = runCrumbs(labels, title, {
      fromRuns: true,
      // Even a run saved by a refresh keeps the route it was opened from.
      refreshId: coreRefreshId,
      query: { from: 'runs', ticker: 'KO', method: 'graham_number' },
    });
    expect(crumbs).toEqual([
      {
        label: en.nav.runs,
        to: { name: 'runs', query: { ticker: 'KO', method: 'graham_number' } },
      },
      { label: title },
    ]);
  });

  it('goes through the refresh comparison for a run opened from a comparison', () => {
    expect(
      runCrumbs(labels, title, {
        fromRuns: false,
        refreshId: coreRefreshId,
        query: {},
      }),
    ).toEqual([
      { label: en.nav.refreshes, to: { name: 'refreshes' } },
      {
        label: en.compare.refreshComparison,
        to: { name: 'refresh', params: { refreshId: coreRefreshId } },
      },
      { label: title },
    ]);
  });

  it('starts at Saved runs for a run saved by a direct analysis', () => {
    expect(
      runCrumbs(labels, title, { fromRuns: false, refreshId: null, query: {} }),
    ).toEqual([
      { label: en.nav.runs, to: { name: 'runs', query: {} } },
      { label: title },
    ]);
  });

  it('carries only the filters that are set in the query', () => {
    const filters = filtersFromQuery({
      ticker: ['KO', 'X'],
      outcome: 'failed',
    });
    expect(filters).toEqual({ ticker: 'KO', method: '', outcome: 'failed' });
    expect(filtersToQuery(filters)).toEqual({
      ticker: 'KO',
      outcome: 'failed',
    });
  });
});

describe('comparison counts line', () => {
  it('counts the outcomes the document counts, in the engine order, and skips zeros', () => {
    expect(
      outcomeCountsOf(coreComparison, [
        'completed',
        'unavailable',
        'not_applicable',
        'failed',
      ]),
    ).toEqual([
      { code: 'completed', count: 3 },
      { code: 'unavailable', count: 1 },
      { code: 'not_applicable', count: 1 },
    ]);
  });

  it('shows the run count and each outcome with its term name', async () => {
    const wrapper = await mountAt(`/refreshes/${coreRefreshId}`);
    const runs = en.compare.runCount
      .split(' | ')[1]!
      .replace('{runs}', String(coreComparison.run_count));
    const items = wrapper
      .findAll('.counts li')
      .map((item) => squash(item.text()));
    const separated = (text: string) => `${en.common.separator}${text}`;
    expect(items).toEqual([
      runs,
      separated('Completed 3'),
      separated('Unavailable 1'),
      separated('Not Applicable 1'),
    ]);
  });
});

describe('run detail meta line', () => {
  const instant = (value: string) =>
    new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  const day = (value: string) =>
    new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
  const parts = (text: string) => squash(text);

  it('shows the outcome, when it was saved, the as-of, the period end and a direct analysis', async () => {
    const wrapper = await mountAt('/runs/00000000-0000-4000-8000-000000000001');
    expect(
      wrapper.findAll('.meta li').map((item) => parts(item.text())),
    ).toEqual([
      'Completed',
      en.runDetail.saved.replace(
        '{date}',
        instant('2026-11-02T14:41:00+00:00'),
      ),
      en.runDetail.asOf.replace('{date}', day('2025-12-31')),
      `fiscal year-end ${day('2025-12-31')}`,
      en.runDetail.savedByDirect,
    ]);
    expect(wrapper.get('h1').text()).toBe(
      en.runDetail.title
        .replace('{name}', 'Microsoft Corp')
        .replace('{ticker}', 'MSFT')
        .replace('{strategy}', 'Graham Number'),
    );
  });

  it('links to the comparison for a run saved by a refresh, with no period end', async () => {
    const wrapper = await mountAt('/runs/00000000-0000-4000-8000-000000000003');
    const meta = wrapper.get('.meta');
    expect(meta.find('a').text()).toBe(en.runDetail.savedByRefresh);
    expect(parts(meta.text())).not.toContain('fiscal year-end');
  });

  it('drops the company name and the as-of when the document is unavailable', async () => {
    const wrapper = await mountAt('/runs/00000000-0000-4000-8000-000000000004');
    expect(wrapper.get('h1').text()).toBe(
      en.runDetail.titleNoName
        .replace('{ticker}', 'OLD')
        .replace('{strategy}', 'retired_method'),
    );
    expect(wrapper.get('.meta').text()).not.toContain(
      en.runDetail.asOf.replace('{date}', ''),
    );
  });
});
