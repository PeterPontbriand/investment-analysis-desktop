// Shared by the Add entries specs (GUI.3b): opening the screen against the
// engine mock and finding its controls.
import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures.ts';
import {
  engineUrl,
  mockEngine,
  type Handler,
  type RecordedRequest,
} from './engine-mock.ts';
import { coreId, watchlistDocuments } from '../fixtures/api/data.ts';
import { ok, type Reply } from '../fixtures/api/server.ts';
import * as selection from '../fixtures/api/selection.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

export const core = watchlistDocuments[coreId]!;
export const addPath = `/v1/watchlists/${coreId}/entries`;

// Core after `count` entries: its three, then more of one strategy.
export const coreWith = (count: number) => ({
  ...core,
  entries: [
    ...core.entries,
    ...selection
      .watchlistWith(Math.max(count - core.entries.length, 0))
      .entries.map((entry) => ({
        ...entry,
        index: entry.index + core.entries.length,
      })),
  ],
});

export type Options = {
  strategies?: Parameters<typeof selection.selectionHandler>[0];
  // A failure to answer one strategy's request with, by method; consulted at
  // every request.
  fail?: (
    method: string,
    request: Record<string, unknown>,
  ) => Reply | undefined;
  extra?: Handler;
  // Holds each add request open until it settles.
  hold?: Promise<void>;
};

export async function openAdd(page: Page, options: Options = {}) {
  let count = core.entries.length;
  const served = selection.selectionHandler(options.strategies);
  const engine = await mockEngine(page, async (url, request) => {
    const extra = await options.extra?.(url, request);
    if (extra !== undefined) return extra;
    if (request.method === 'POST' && url.pathname === addPath) {
      const body = request.body as { method_id: string; tickers: string[] };
      const forced = options.fail?.(body.method_id, body);
      if (forced !== undefined) return forced;
      await options.hold;
      count += body.tickers.length;
      return ok(coreWith(count));
    }
    if (request.method === 'GET' && url.pathname === `/v1/watchlists/${coreId}`)
      return ok(coreWith(count));
    return served(url);
  });
  await page.goto(engineUrl);
  await page.getByRole('link', { name: 'Core' }).click();
  await page.getByRole('button', { name: en.watchlist.addEntries }).click();
  await expect(heading(page)).toHaveText(
    en.addEntries.heading.replace('{name}', 'Core'),
  );
  return engine;
}

export const heading = (page: Page) => page.getByRole('heading', { level: 1 });
export const tickers = (page: Page) => page.getByLabel(en.addEntries.tickers);
export const asOf = (page: Page) => page.getByLabel(en.addEntries.asOf).first();
export const add = (page: Page) =>
  page.getByRole('button', { name: en.addEntries.add, exact: true });
export const strategy = (page: Page, name: string) =>
  page.locator('.strategy').filter({ hasText: name }).first();
export const checkbox = (page: Page, name: string) =>
  page.getByRole('checkbox', { name, exact: true });
export const choose = (page: Page, name: string) =>
  checkbox(page, name).check();
export const uncheck = (page: Page, name: string) =>
  checkbox(page, name).uncheck();
// Whether a strategy's options are open, by its button's aria-expanded.
export const expanded = (page: Page, name: string) =>
  page
    .locator('.strategy')
    .filter({ hasText: name })
    .first()
    .locator('.row button')
    .getAttribute('aria-expanded');
export const showOptions = (page: Page, name: string) =>
  page
    .getByRole('button', {
      name: en.selection.showOptions.replace('{strategy}', name),
    })
    .click();
export const field = (box: Locator, label: string) => box.getByLabel(label);

export const posts = (engine: Awaited<ReturnType<typeof mockEngine>>) =>
  engine.actions('POST', addPath);
export const bodies = (requests: RecordedRequest[]) =>
  requests.map((request) => request.body);

// The catalog's "Added n entries." in its singular or plural form.
export const added = (count: number) =>
  en.watchlist.added
    .split(' | ')
    [count === 1 ? 0 : 1]!.replace('{count}', String(count));

export const status = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text });

// The control is invalid and described by the message.
export async function describedBy(control: Locator, message: Locator) {
  const id = await message.getAttribute('id');
  expect(id).toBeTruthy();
  expect(await control.getAttribute('aria-describedby')).toContain(id ?? '');
  await expect(control).toHaveAttribute('aria-invalid', 'true');
}
