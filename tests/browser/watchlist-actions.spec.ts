// The watchlist actions of GUI.3a, driven by keyboard against the engine mock.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { coreId, watchlistDocuments } from '../fixtures/api/data.ts';
import * as actions from '../fixtures/api/actions.ts';
import { failure, ok } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

// The action failures these tests provoke are logged by the browser.
test.use({ allowedHttpStatuses: [404, 409, 503] });

const watchlistPath = `/v1/watchlists/${coreId}`;

// How many times the watchlist document was read (the PATCH shares its path).
const loadsOf = (engine: Awaited<ReturnType<typeof mockEngine>>) =>
  engine.actions('GET', watchlistPath).length;

// With a dialog open: it is modal, the page behind it cannot take focus or
// clicks, and Escape still closes it. The caller checks where focus returns.
async function expectInert(
  page: Page,
  engine: Awaited<ReturnType<typeof mockEngine>>,
) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(
    true,
  );
  const url = page.url();
  const requests = engine.requests.length;
  const rename = page.getByRole('button', { name: en.watchlist.rename });
  const navigation = page
    .getByRole('navigation', { name: en.nav.label })
    .getByRole('link', { name: en.nav.watchlists });
  for (const behind of [rename, navigation]) {
    await behind.evaluate((element) => (element as HTMLElement).focus());
    expect(
      await page.evaluate(
        () => document.activeElement?.closest('dialog') != null,
      ),
      'focus stays in the dialog',
    ).toBe(true);
    // A real click at the centre of the control, not an element click.
    const box = await behind.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + (box?.height ?? 0) / 2,
    );
    await expect(dialog).toBeVisible();
    expect(page.url()).toBe(url);
    await expect(page.getByLabel(en.actions.nameLabel)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
  }
  expect(engine.requests.length).toBe(requests);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
}

async function open(page: Page, handler?: Handler) {
  const engine = await mockEngine(page, handler);
  await page.goto(engineUrl);
  return engine;
}

async function openCore(page: Page, handler?: Handler) {
  const engine = await open(page, handler);
  await page.getByRole('link', { name: 'Core' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
  return engine;
}

// Activates a control the way keyboard use does: focus it, press Enter.
async function press(page: Page, name: string | RegExp) {
  const button = page.getByRole('button', { name });
  await button.focus();
  await page.keyboard.press('Enter');
}

const removeButton = (n: number, ticker: string, strategy: string) =>
  en.watchlist.removeEntry
    .replace('{index}', String(n))
    .replace('{ticker}', ticker)
    .replace('{strategy}', strategy);

test.describe('create', () => {
  test('creates a watchlist and opens it', async ({ page }) => {
    const engine = await open(page, (url, { method }) =>
      method === 'POST' && url.pathname === '/v1/watchlists'
        ? actions.created(actions.createdWatchlist)
        : url.pathname === `/v1/watchlists/${actions.newWatchlistId}`
          ? ok(actions.createdWatchlist)
          : undefined,
    );
    await press(page, en.watchlists.newWatchlist);
    const field = page.getByLabel(en.actions.nameLabel);
    await expect(field).toBeFocused();
    await field.fill('  Growth ');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Growth');
    expect(engine.actions('POST', '/v1/watchlists')[0]?.body).toEqual({
      name: '  Growth ',
    });
    expect(engine.rejected).toEqual([]);
  });

  test('blocks a blank name before sending anything', async ({ page }) => {
    const engine = await open(page);
    await press(page, en.watchlists.newWatchlist);
    await page.getByLabel(en.actions.nameLabel).fill('   ');
    await page.keyboard.press('Enter');
    const field = page.getByLabel(en.actions.nameLabel);
    await expect(page.getByText(en.actions.nameRequired)).toBeVisible();
    await expect(field).toHaveAttribute('aria-describedby', /.+/);
    expect(engine.actions('POST', '/v1/watchlists')).toHaveLength(0);
  });

  test('shows a name conflict at the field and keeps the form', async ({
    page,
  }) => {
    await open(page, (url, { method }) =>
      method === 'POST' && url.pathname === '/v1/watchlists'
        ? actions.failures.nameConflict
        : undefined,
    );
    await press(page, en.watchlists.newWatchlist);
    await page.getByLabel(en.actions.nameLabel).fill('core');
    await page.keyboard.press('Enter');
    const message = page.getByText('A watchlist named Core already exists.');
    await expect(message).toBeVisible();
    const field = page.getByLabel(en.actions.nameLabel);
    await expect(field).toBeFocused();
    const id = await message.locator('xpath=..').getAttribute('id');
    await expect(field).toHaveAttribute('aria-describedby', id ?? '');
  });

  test('Escape cancels and returns focus to the button', async ({ page }) => {
    await open(page);
    await press(page, en.watchlists.newWatchlist);
    await page.keyboard.press('Escape');
    await expect(page.getByLabel(en.actions.nameLabel)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: en.watchlists.newWatchlist }),
    ).toBeFocused();
  });

  test('offers the form when the list is empty', async ({ page }) => {
    await open(page, (url) =>
      url.pathname === '/v1/watchlists'
        ? ok({ schema_version: 1, items: [] })
        : undefined,
    );
    await expect(page.getByText(en.watchlists.empty)).toBeVisible();
    await expect(
      page.getByRole('button', { name: en.watchlists.newWatchlist }),
    ).toBeVisible();
  });
});

test.describe('rename', () => {
  test('renames and shows the answer without another load', async ({
    page,
  }) => {
    const engine = await openCore(page, (url, { method }) =>
      method === 'PATCH' && url.pathname === watchlistPath
        ? ok(actions.renamed)
        : undefined,
    );
    const loads = loadsOf(engine);
    await press(page, en.watchlist.rename);
    const field = page.getByLabel(en.actions.nameLabel);
    await expect(field).toHaveValue('Core');
    await field.fill('Core renamed');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Core renamed',
    );
    expect(engine.actions('PATCH', watchlistPath)[0]?.body).toEqual({
      name: 'Core renamed',
    });
    expect(loadsOf(engine)).toBe(loads);
    expect(engine.rejected).toEqual([]);
  });

  test('loads the screen again when the answer holds an unreadable entry', async ({
    page,
  }) => {
    let renamed = false;
    const engine = await openCore(page, (url, { method }) => {
      if (method === 'PATCH') {
        renamed = true;
        return ok(actions.renamedUnreadable);
      }
      return renamed && url.pathname === watchlistPath
        ? failure(
            409,
            'stored_selection_unreadable',
            actions.unreadableEntry.reason,
          )
        : undefined;
    });
    const loads = loadsOf(engine);
    await press(page, en.watchlist.rename);
    await page.getByLabel(en.actions.nameLabel).fill('X');
    await page.keyboard.press('Enter');
    await expect(page.getByText(actions.unreadableEntry.reason)).toBeVisible();
    expect(loadsOf(engine)).toBe(loads + 1);
  });

  test('Escape cancels and returns focus to Rename', async ({ page }) => {
    await openCore(page);
    await press(page, en.watchlist.rename);
    await expect(page.getByLabel(en.actions.nameLabel)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
    await expect(
      page.getByRole('button', { name: en.watchlist.rename }),
    ).toBeFocused();
  });
});

test.describe('remove entries', () => {
  const removalHandler =
    (reply = ok(actions.removal(1))): Handler =>
    (_url, { method }) =>
      method !== 'GET' ? reply : undefined;

  test('removes one entry from a dialog with three options', async ({
    page,
  }) => {
    const engine = await openCore(page, removalHandler());
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('radio', {
        name: en.watchlist.optionEntry
          .replace('{index}', '1')
          .replace('{ticker}', 'ACME')
          .replace('{strategy}', 'Momentum'),
      }),
    ).toBeChecked();
    await expect(
      dialog.getByRole('radio', { name: /ACME \(2\)/ }),
    ).toBeVisible();
    await expect(dialog.getByText(en.actions.runsKept)).toBeVisible();
    await dialog
      .getByRole('button', { name: en.watchlist.removeAction })
      .focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole('status').filter({ hasText: 'Removed 1 entry.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    expect(engine.actions('DELETE', `${watchlistPath}/entries/1`)).toHaveLength(
      1,
    );
    expect(engine.rejected).toEqual([]);
  });

  test('removes every entry for a ticker', async ({ page }) => {
    const engine = await openCore(page, removalHandler(ok(actions.removal(2))));
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    await page.getByRole('radio', { name: /ACME \(2\)/ }).check();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(page.getByText('Removed 2 entries.')).toBeVisible();
    expect(
      engine.actions('POST', `${watchlistPath}/remove-tickers`)[0]?.body,
    ).toEqual({ tickers: ['ACME'] });
  });

  test('removes every entry of a strategy', async ({ page }) => {
    const core = watchlistDocuments[coreId]!;
    const twoMomentum = {
      ...core,
      entries: [
        core.entries[0]!,
        { ...core.entries[0]!, index: 2, ticker: 'BOLT' },
        { ...core.entries[2]!, index: 3 },
      ],
    };
    const engine = await openCore(page, (url, { method }) =>
      method === 'GET'
        ? url.pathname === watchlistPath
          ? ok(twoMomentum)
          : undefined
        : ok(actions.removal(2)),
    );
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio')).toHaveCount(2);
    await dialog
      .getByRole('radio', { name: 'Every Momentum entry (2)' })
      .check();
    await dialog
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(page.getByText('Removed 2 entries.')).toBeVisible();
    expect(
      engine.actions('POST', `${watchlistPath}/remove-method`)[0]?.body,
    ).toEqual({ method_id: 'sma_crossover' });
    expect(engine.rejected).toEqual([]);
  });

  test('is a plain confirmation when only the entry is left', async ({
    page,
  }) => {
    await openCore(page, removalHandler());
    await press(page, removeButton(3, 'ZED', 'Quality Screen'));
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', {
        name: en.watchlist.confirmEntry
          .replace('{index}', '3')
          .replace('{ticker}', 'ZED')
          .replace('{strategy}', 'Quality Screen'),
      }),
    ).toBeVisible();
    await expect(dialog.getByRole('radio')).toHaveCount(0);
    await expect(dialog.getByText(en.actions.runsKept)).toBeVisible();
  });

  test('says when nothing was removed', async ({ page }) => {
    await openCore(page, removalHandler(ok(actions.removal(0))));
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    await page
      .getByRole('dialog')
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(page.getByText(en.watchlist.removedNone)).toBeVisible();
  });

  // macOS WebKit's Tab skips buttons by default; Option+Tab reaches every control.
  const tabKeys = (browserName: string) =>
    browserName === 'webkit' && process.platform === 'darwin'
      ? { forward: 'Alt+Tab', backward: 'Alt+Shift+Tab' }
      : { forward: 'Tab', backward: 'Shift+Tab' };

  test('traps focus, closes on Escape and returns focus to the row button', async ({
    page,
    browserName,
  }) => {
    await openCore(page);
    const name = removeButton(1, 'ACME', 'Momentum');
    await press(page, name);
    const dialog = page.getByRole('dialog');
    const controls = ['radio', en.actions.cancel, en.watchlist.removeAction];
    // Two full cycles each way: every control is reached at least twice. A
    // step where the document has no focus means the browser handed focus to
    // its own window; it is the only exception and it is not a stop. WebKit
    // also stops once per cycle on the dialog element itself, which is inside
    // the dialog; any other element, or the body with the document focused,
    // fails.
    const keys = tabKeys(browserName);
    for (const direction of [keys.forward, keys.backward]) {
      const reached = new Map<string, number>();
      for (let presses = 0; ; presses += 1) {
        if (controls.every((control) => (reached.get(control) ?? 0) >= 2))
          break;
        expect(presses, `${direction} never completed two cycles`).toBeLessThan(
          20,
        );
        await page.keyboard.press(direction);
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          const dialog = document.querySelector('dialog');
          const inside = element !== null && dialog?.contains(element) === true;
          return {
            documentFocused: document.hasFocus(),
            inside,
            stop:
              element === dialog
                ? 'dialog'
                : element instanceof HTMLInputElement &&
                    element.type === 'radio'
                  ? 'radio'
                  : (element?.textContent?.trim() ?? ''),
          };
        });
        if (!focus.documentFocused) continue;
        expect(focus.inside, `${direction}: focus left the dialog`).toBe(true);
        reached.set(focus.stop, (reached.get(focus.stop) ?? 0) + 1);
      }
      expect(
        [...reached.keys()].filter((stop) => stop !== 'dialog').sort(),
        direction,
      ).toEqual([...controls].sort());
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name })).toBeFocused();
  });

  test('keeps the page behind the remove dialog inert', async ({ page }) => {
    const engine = await openCore(page);
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    await expectInert(page, engine);
    await expect(
      page.getByRole('button', { name: removeButton(1, 'ACME', 'Momentum') }),
    ).toBeFocused();
  });

  test('shows an action failure inside the dialog and keeps it open', async ({
    page,
  }) => {
    await openCore(page, (_url, { method }) =>
      method !== 'GET' ? actions.failures.entryNotFound : undefined,
    );
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(
      dialog.getByRole('alert').getByText('The watchlist has no entry 9.'),
    ).toBeVisible();
  });

  test('shows the busy message with Try again', async ({ page }) => {
    let busy = true;
    await openCore(page, (_url, { method }) => {
      if (method === 'GET') return undefined;
      if (busy) {
        busy = false;
        return actions.failures.busy;
      }
      return ok(actions.removal(1));
    });
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(dialog.getByRole('alert')).toContainText(
      en.state.databaseBusy,
    );
    await dialog.getByRole('button', { name: en.common.tryAgain }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('shows a refresh-running refusal as the catalog message', async ({
    page,
  }) => {
    await openCore(page, (_url, { method }) =>
      method !== 'GET' ? actions.failures.refreshRunning : undefined,
    );
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(dialog.getByRole('alert')).toHaveText(
      en.actions.refreshRunning,
    );
  });

  test('a watchlist that is gone shows its failure, then the not-found state', async ({
    page,
  }) => {
    let gone = false;
    await openCore(page, (url, { method }) => {
      if (method !== 'GET') {
        gone = true;
        return actions.failures.notFound;
      }
      return gone && url.pathname === watchlistPath
        ? actions.failures.notFound
        : undefined;
    });
    await press(page, removeButton(1, 'ACME', 'Momentum'));
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(dialog.getByRole('alert')).toContainText('No such watchlist.');
    await page.keyboard.press('Escape');
    await expect(page.getByText('No such watchlist.')).toBeVisible();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('delete', () => {
  test('deletes after confirmation and returns to Watchlists', async ({
    page,
  }) => {
    const engine = await openCore(page, (_url, { method }) =>
      method === 'DELETE' ? ok(actions.deleted) : undefined,
    );
    await press(page, en.watchlist.delete);
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', {
        name: en.watchlist.deleteTitle.replace('{name}', 'Core'),
      }),
    ).toBeVisible();
    await expect(dialog.getByText(en.actions.runsKept)).toBeVisible();
    await dialog.getByRole('button', { name: en.watchlist.delete }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.nav.watchlists,
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(
      page.getByRole('status').filter({ hasText: 'Deleted Core.' }),
    ).toBeVisible();
    expect(engine.actions('DELETE', watchlistPath)).toHaveLength(1);
  });

  test('keeps the page behind the delete dialog inert', async ({ page }) => {
    const engine = await openCore(page);
    await press(page, en.watchlist.delete);
    await expectInert(page, engine);
    await expect(
      page.getByRole('button', { name: en.watchlist.delete }),
    ).toBeFocused();
  });

  test('Escape closes the dialog and returns focus to Delete', async ({
    page,
  }) => {
    await openCore(page);
    await press(page, en.watchlist.delete);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: en.watchlist.delete }),
    ).toBeFocused();
  });

  test('deletes an unreadable watchlist, naming it from the list', async ({
    page,
  }) => {
    await open(page, (url, { method }) => {
      if (method === 'DELETE') return ok(actions.deletedUnreadable);
      return url.pathname === watchlistPath
        ? failure(
            409,
            'stored_selection_unreadable',
            actions.unreadableEntry.reason,
          )
        : undefined;
    });
    await page.getByRole('link', { name: 'Core' }).click();
    await expect(page.getByText(actions.unreadableEntry.reason)).toBeVisible();
    await press(page, en.watchlist.deleteThis);
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', {
        name: en.watchlist.deleteTitle.replace('{name}', 'Core'),
      }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: en.watchlist.delete }).click();
    await expect(page.getByText('Deleted Core.')).toBeVisible();
  });

  test('says "Delete this watchlist?" when the name cannot be found', async ({
    page,
  }) => {
    await open(page, (url) =>
      url.pathname === watchlistPath
        ? failure(
            409,
            'stored_selection_unreadable',
            actions.unreadableEntry.reason,
          )
        : undefined,
    );
    await page.getByRole('link', { name: 'Core' }).click();
    // The list no longer holds it by the time the dialog asks.
    await page.route('**/v1/watchlists', (route) =>
      route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema_version: 1, items: [] }),
      }),
    );
    await press(page, en.watchlist.deleteThis);
    await expect(
      page
        .getByRole('dialog')
        .getByRole('heading', { name: en.watchlist.deleteTitleNoName }),
    ).toBeVisible();
  });
});

test.describe('both text directions', () => {
  test('the dialog and the forms follow the pseudo-locale direction', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ar-XB'],
        configurable: true,
      });
      Object.defineProperty(navigator, 'language', {
        get: () => 'ar-XB',
        configurable: true,
      });
    });
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await press(page, ar.watchlists.newWatchlist);
    const create = page.getByRole('button', { name: ar.watchlists.create });
    const cancel = page.getByRole('button', { name: ar.actions.cancel });
    const createBox = await create.boundingBox();
    const cancelBox = await cancel.boundingBox();
    // In right-to-left text the first button sits at the inline start: the right.
    expect((createBox?.x ?? 0) > (cancelBox?.x ?? 0)).toBe(true);
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: /Core/ }).click();
    await press(page, ar.watchlist.delete);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect((box?.x ?? -1) >= 0).toBe(true);
    expect((box?.x ?? 0) + (box?.width ?? 0) <= (viewport?.width ?? 0)).toBe(
      true,
    );
    const alignment = await dialog.evaluate(
      (element) => getComputedStyle(element).direction,
    );
    expect(alignment).toBe('rtl');
  });
});
