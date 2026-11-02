import assert from 'node:assert/strict';
import { browser } from '@wdio/globals';

const { describe, it } = globalThis;

describe('desktop shell', () => {
  it('opens the expected static screen', async () => {
    assert.equal(await browser.getTitle(), 'Investment Analysis Desktop');
    assert.equal(
      await browser.$('h1').getText(),
      'Investment Analysis Desktop',
    );
    assert.match(
      await browser.$('main p').getText(),
      /Pre-release: this application is under development and does not yet show any analysis\./,
    );
  });
});
