import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browser } from '@wdio/globals';

const { describe, it } = globalThis;

// Production has only the "en" catalog, so the shell resolves to it on any OS.
const en = JSON.parse(readFileSync('src/locales/en.json', 'utf8'));

describe('desktop shell', () => {
  it('opens the expected static screen', async () => {
    assert.equal(await browser.getTitle(), en.app.name);
    assert.equal(await browser.$('h1').getText(), en.app.name);
    assert.equal(await browser.$('main p').getText(), en.app.preReleaseNotice);
  });
});
