/* global document -- used inside browser.execute, which runs in the webview */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browser } from '@wdio/globals';

const { describe, it } = globalThis;

// Production has only the "en" catalog, so the shell resolves to it on any OS.
const en = JSON.parse(readFileSync('src/locales/en.json', 'utf8'));

// The stub engine's fixed /v1/info document (src-tauri/src/bin/stub_engine.rs).
describe('desktop shell', () => {
  it('shows the product name and pre-release notice', async () => {
    // Nothing is asserted about the start screen: the stub engine serves only /v1/info.
    assert.equal(await browser.$('.product').getText(), en.app.name);
    assert.equal(await browser.$('.notice').getText(), en.app.preReleaseNotice);
  });

  it('sets the window title from the catalog', async () => {
    await browser.waitUntil(
      async () => (await browser.getTitle()) === en.app.name,
      {
        timeout: 20_000,
        timeoutMsg: 'the window title did not come from the catalog',
      },
    );
  });

  it('shows the stub engine /v1/info on the About screen', async () => {
    await browser.$('nav').$(`=${en.nav.about}`).click();
    // One script reads the page, because each driver command is slow here (D76).
    const read = () =>
      browser.execute(() => {
        const list = document.querySelector('dl');
        if (!list) return null;
        const definitions = [...document.querySelectorAll('dd')];
        return {
          heading: document.querySelector('h2')?.textContent ?? '',
          text: list.textContent ?? '',
          listLang: list.getAttribute('lang'),
          lastLang: definitions.at(-1)?.getAttribute('lang') ?? null,
        };
      });
    await browser.waitUntil(async () => (await read()) !== null, {
      timeout: 20_000,
      timeoutMsg: 'the engine information did not appear',
    });
    const page = await read();
    assert.equal(page.heading, en.engine.heading);
    const text = page.text;
    for (const expected of [
      en.engine.labels.version,
      '0.0.0-stub',
      en.engine.labels.apiVersions,
      'v1',
      en.engine.labels.schemaVersion,
      '2',
      en.engine.labels.secIdentity,
      en.engine.secIdentity.configured,
      en.engine.labels.languages,
      'English',
    ])
      assert.ok(text.includes(expected), `${expected} is shown`);
    assert.equal(page.listLang, null);
    assert.equal(page.lastLang, 'en');
  });
});
