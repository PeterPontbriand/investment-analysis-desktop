import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browser } from '@wdio/globals';

const { describe, it } = globalThis;

// Production has only the "en" catalog, so the shell resolves to it on any OS.
const en = JSON.parse(readFileSync('src/locales/en.json', 'utf8'));

// The stub engine's fixed /v1/info document (src-tauri/src/bin/stub_engine.rs).
describe('desktop shell', () => {
  it('opens the expected static screen', async () => {
    assert.equal(await browser.$('h1').getText(), en.app.name);
    assert.equal(await browser.$('main p').getText(), en.app.preReleaseNotice);
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

  it('shows the stub engine /v1/info on the placeholder screen', async () => {
    const list = await browser.$('dl');
    await list.waitForDisplayed({ timeout: 20_000 });
    assert.equal(await browser.$('h2').getText(), en.engine.heading);
    const text = await list.getText();
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
    assert.equal(await list.getAttribute('lang'), 'en');
  });
});
