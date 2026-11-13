import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../src/api/client.ts';
import { createTerms } from '../../src/api/terms.ts';
import { respond } from '../fixtures/api/server.ts';

function setup(locale = () => 'en') {
  const fetchStub = vi.fn((input: string | URL | Request) => {
    const reply = respond(new URL(String(input)));
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

describe('term names', () => {
  it('names a code by its term, with the term id and language', async () => {
    const { terms } = setup();

    expect(await terms.term('RunOutcome', 'not_applicable')).toEqual({
      text: 'Not Applicable',
      termId: 'outcome-not-applicable',
      lang: 'en',
    });
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
