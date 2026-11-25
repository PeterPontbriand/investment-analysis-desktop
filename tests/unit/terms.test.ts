import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../src/api/client.ts';
import { createTerms } from '../../src/api/terms.ts';
import { guides, guideId, termDocument } from '../fixtures/api/help.ts';
import { helpIndex } from '../fixtures/api/data.ts';
import { failure, respond, type Reply } from '../fixtures/api/server.ts';

function setup(
  locale = () => 'en',
  answer: (url: URL) => Reply | undefined = () => undefined,
) {
  const fetchStub = vi.fn((input: string | URL | Request) => {
    const url = new URL(String(input));
    const reply = answer(url) ?? respond(url);
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: reply.language ? { 'Content-Language': reply.language } : {},
      }),
    );
  });
  const api = createApiClient({
    baseUrl: 'http://127.0.0.1:5000',
    token: 't',
    locale,
    engineStatus: () => Promise.resolve('running'),
    fetch: fetchStub as unknown as typeof fetch,
  });
  return { terms: createTerms(() => Promise.resolve(api), locale), fetchStub };
}

describe('term definitions', () => {
  it(
    'finds a term' + 's name and definition by its id, in the index language',
    async () => {
      const { terms } = setup();

      expect(await terms.entry('outcome-completed')).toEqual({
        termId: 'outcome-completed',
        name: 'Completed',
        definition: 'The analysis finished.',
        lang: 'en',
      });
    },
  );

  it('answers null for a term the index does not list', async () => {
    const { terms } = setup();

    expect(await terms.entry('a-term-from-a-later-engine')).toBeNull();
  });

  it('asks for the help index once and never for a term', async () => {
    const { terms, fetchStub } = setup();

    await terms.entry('outcome-completed');
    await terms.entry('outcome-failed');
    const paths = fetchStub.mock.calls.map(
      (c) => new URL(String(c[0])).pathname,
    );
    expect(paths).toEqual(['/v1/help']);
  });
});

describe('help documents', () => {
  const pathsOf = (stub: { mock: { calls: unknown[][] } }) =>
    stub.mock.calls.map((call) => new URL(String(call[0])).pathname);

  it('reads a term entry and a guide with their language, once per id and locale', async () => {
    let tag = 'en';
    const { terms, fetchStub } = setup(() => tag);

    expect(await terms.termDocument('ticker')).toMatchObject({
      data: termDocument('ticker'),
      contentLanguage: 'en',
    });
    expect(await terms.helpDocument(guideId)).toMatchObject({
      data: guides[guideId],
      contentLanguage: 'en',
    });
    await terms.termDocument('ticker');
    await terms.helpDocument(guideId);
    await terms.termDocument('entry');
    const first = [
      '/v1/help/terms/ticker',
      `/v1/help/documents/${guideId}`,
      '/v1/help/terms/entry',
    ];
    expect(pathsOf(fetchStub)).toEqual(first);

    tag = 'pt-BR';
    await terms.termDocument('ticker');
    await terms.helpDocument(guideId);
    expect(pathsOf(fetchStub)).toEqual([...first, ...first.slice(0, 2)]);
  });

  it('answers null for an id the engine has no entry or guide for', async () => {
    const { terms } = setup();

    expect(await terms.termDocument('no-such-term')).toBeNull();
    expect(await terms.helpDocument('no-such-guide')).toBeNull();
  });

  it('rejects any other failure, and does not keep it', async () => {
    let failing = true;
    const { terms, fetchStub } = setup(undefined, () =>
      failing ? failure(404, 'endpoint_not_found', 'No endpoint.') : undefined,
    );

    await expect(terms.termDocument('ticker')).rejects.toMatchObject({
      reasonCode: 'endpoint_not_found',
    });
    await expect(terms.helpDocument(guideId)).rejects.toBeTruthy();
    failing = false;
    expect((await terms.termDocument('ticker'))?.data.id).toBe('ticker');
    expect((await terms.helpDocument(guideId))?.data.id).toBe(guideId);
    expect(fetchStub).toHaveBeenCalledTimes(4);
  });

  it('answers the help index it already holds, with its language', async () => {
    const { terms, fetchStub } = setup();

    await terms.entry('ticker');
    expect(await terms.helpIndex()).toMatchObject({
      data: helpIndex,
      contentLanguage: 'en',
    });
    expect(pathsOf(fetchStub)).toEqual(['/v1/help']);
  });
});

describe('term names', () => {
  it('names a code by its term, with the term id and language', async () => {
    const { terms } = setup();

    expect(await terms.term('RunOutcome', 'not_applicable')).toEqual({
      text: 'Not Applicable',
      termId: 'outcome-not-applicable',
      lang: 'en',
    });
  });

  it('names a listing venue by its term, and an unmapped venue code as served', async () => {
    const { terms } = setup();

    expect(await terms.term('ListingVenue', 'nasdaq')).toEqual({
      text: 'Nasdaq Stock Market',
      termId: 'listing-venue-nasdaq',
      lang: 'en',
    });
    // A code the references do not map, and one whose term the help index
    // does not list, have no term (D360).
    expect((await terms.term('ListingVenue', 'xetra')).termId).toBeNull();
    expect((await terms.term('ListingVenue', 'otc')).termId).toBeNull();
  });

  it('asks for the references and the help index once per locale, never for a term', async () => {
    let tag = 'en';
    const { terms, fetchStub } = setup(() => tag);

    await terms.term('RunOutcome', 'completed');
    await terms.term('RunOutcome', 'failed');
    await terms.codeSetValues('RunOutcome');
    const paths = () =>
      fetchStub.mock.calls.map((c) => new URL(String(c[0])).pathname);
    expect(paths().sort()).toEqual(['/v1/help', '/v1/help/references']);

    tag = 'pt-BR';
    await terms.term('RunOutcome', 'completed');
    expect(paths()).toHaveLength(4);
    expect(paths().some((path) => path.startsWith('/v1/help/terms'))).toBe(
      false,
    );
  });

  it('shows a code with no reference as served, with no term id', async () => {
    const { terms } = setup();

    expect(await terms.term('RunOutcome', 'a_new_outcome')).toEqual({
      text: 'a_new_outcome',
      termId: null,
      lang: null,
    });
    expect(await terms.term('NoSuchCodeSet', 'x')).toMatchObject({
      termId: null,
    });
  });

  it('names a strategy by its label and term, in declared order', async () => {
    const { terms } = setup();

    expect(await terms.strategy('quality_screen')).toEqual({
      text: 'Quality Screen',
      termId: 'strategy-quality-screen',
      lang: 'en',
    });
    expect((await terms.strategies()).map((item) => item.method)).toEqual([
      'sma_crossover',
      'graham_number',
      'quality_screen',
    ]);
  });

  it('shows a method the engine does not list as served, with no term id', async () => {
    const { terms } = setup();

    expect(await terms.strategy('retired_method')).toEqual({
      text: 'retired_method',
      termId: null,
      lang: null,
    });
  });

  it('lists a code set in the order the engine serves it', async () => {
    const { terms } = setup();

    expect(await terms.codeSetValues('RunOutcome')).toEqual([
      'completed',
      'unavailable',
      'not_applicable',
      'failed',
    ]);
  });

  it('rejects when a document request fails, instead of showing codes as served', async () => {
    const fetchStub = vi.fn(() => Promise.reject(new TypeError('down')));
    const api = createApiClient({
      baseUrl: 'http://x',
      token: 't',
      locale: () => 'en',
      engineStatus: () => Promise.resolve('running'),
      fetch: fetchStub as unknown as typeof fetch,
    });
    const terms = createTerms(
      () => Promise.resolve(api),
      () => 'en',
    );

    await expect(terms.term('RunOutcome', 'completed')).rejects.toMatchObject({
      kind: 'unreachable',
    });
    await expect(terms.strategy('sma_crossover')).rejects.toMatchObject({
      kind: 'unreachable',
    });
    await expect(terms.preload(['help'])).rejects.toBeTruthy();
  });

  it('does not keep a failed fetch', async () => {
    let failing = true;
    const fetchStub = vi.fn(() =>
      failing
        ? Promise.reject(new TypeError('down'))
        : Promise.resolve(
            new Response(JSON.stringify({ schema_version: 2, items: [] })),
          ),
    );
    const api = createApiClient({
      baseUrl: 'http://x',
      token: 't',
      locale: () => 'en',
      engineStatus: () => Promise.resolve('running'),
      fetch: fetchStub as unknown as typeof fetch,
    });
    const terms = createTerms(
      () => Promise.resolve(api),
      () => 'en',
    );

    await expect(terms.strategies()).rejects.toBeTruthy();
    failing = false;
    await expect(terms.strategies()).resolves.toEqual([]);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});
