import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../src/api/client.ts';
import { createTickerIdentities } from '../../src/api/tickerIdentities.ts';
import { profiles, lookedUp } from '../fixtures/api/profiles.ts';
import { failure, respond, type Reply } from '../fixtures/api/server.ts';

const runA = '00000000-0000-4000-8000-000000000001';
const runB = '00000000-0000-4000-8000-000000000003';

// A client over the fixture server, whose answers a test may replace one
// request at a time.
function setup(
  override: (url: URL, method: string) => Reply | undefined = () => undefined,
) {
  const calls: string[] = [];
  const fetchStub = vi.fn(
    (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push(`${method} ${url.pathname}`);
      const reply = override(url, method) ?? respond(url, method);
      return Promise.resolve(
        new Response(JSON.stringify(reply.body), {
          status: reply.status,
          headers: reply.language ? { 'Content-Language': reply.language } : {},
        }),
      );
    },
  );
  const api = createApiClient({
    baseUrl: 'http://127.0.0.1:5000',
    token: 't',
    locale: () => 'en',
    engineStatus: () => Promise.resolve('running'),
    fetch: fetchStub as unknown as typeof fetch,
  });
  return {
    identities: createTickerIdentities(() => Promise.resolve(api)),
    calls,
  };
}

const noProfile = () =>
  failure(404, 'instrument_profile_not_found', 'No profile is stored.');

describe('current profile cache (D294)', () => {
  it('asks once per ticker, however the ticker is written', async () => {
    const { identities, calls } = setup();
    const first = await identities.currentProfile('ACME');
    await identities.currentProfile('acme ');
    expect(first).toEqual({ kind: 'stored', profile: profiles.ACME });
    expect(calls).toEqual(['GET /v1/instrument-profiles/ACME']);
    await identities.currentProfile('MSFT');
    expect(calls).toHaveLength(2);
  });

  it('keeps that no profile is stored', async () => {
    const { identities, calls } = setup();
    expect(await identities.currentProfile('OLD')).toEqual({ kind: 'none' });
    expect(await identities.currentProfile('OLD')).toEqual({ kind: 'none' });
    expect(calls).toHaveLength(1);
  });

  it('does not keep a failed request', async () => {
    let failing = true;
    const { identities, calls } = setup((url) =>
      failing && url.pathname.includes('/instrument-profiles/')
        ? failure(503, 'database_busy', 'Busy.')
        : undefined,
    );
    await expect(identities.currentProfile('ACME')).rejects.toThrow();
    failing = false;
    expect(await identities.currentProfile('ACME')).toEqual({
      kind: 'stored',
      profile: profiles.ACME,
    });
    expect(calls).toHaveLength(2);
  });

  it('replaces the entry with the profile a lookup answers with', async () => {
    const { identities, calls } = setup((url, method) =>
      method === 'POST'
        ? { status: 200, body: lookedUp('BOLT'), language: 'en' }
        : url.pathname.endsWith('/BOLT')
          ? noProfile()
          : undefined,
    );
    expect(await identities.currentProfile('BOLT')).toEqual({ kind: 'none' });
    expect(await identities.lookUp('BOLT')).toEqual(lookedUp('BOLT'));
    expect(await identities.currentProfile('BOLT')).toEqual({
      kind: 'stored',
      profile: lookedUp('BOLT'),
    });
    expect(calls).toEqual([
      'GET /v1/instrument-profiles/BOLT',
      'POST /v1/instrument-profiles/BOLT/lookup',
    ]);
  });

  it('keeps the entry when a lookup fails', async () => {
    const { identities, calls } = setup((url, method) =>
      method === 'POST'
        ? failure(404, 'provider_no_data', 'No data.')
        : undefined,
    );
    await identities.currentProfile('ACME');
    await expect(identities.lookUp('ACME')).rejects.toThrow();
    expect(await identities.currentProfile('ACME')).toEqual({
      kind: 'stored',
      profile: profiles.ACME,
    });
    expect(calls).toHaveLength(2);
  });

  it('forgets every profile when cleared, and asks again', async () => {
    const { identities, calls } = setup();
    await identities.currentProfile('ACME');
    await identities.currentProfile('MSFT');
    identities.clearProfiles();
    await identities.currentProfile('ACME');
    await identities.currentProfile('MSFT');
    expect(calls).toHaveLength(4);
  });
});

describe('run identity cache (D294)', () => {
  it('asks once per run id, for the overview', async () => {
    const { identities, calls } = setup();
    const first = await identities.runIdentity(runA);
    await identities.runIdentity(runA);
    expect(first.instrument_name).toBe('Microsoft Corp');
    expect(calls).toEqual([`GET /v1/runs/${runA}/overview`]);
    const other = await identities.runIdentity(runB);
    expect(other.instrument_name).toBe('Zed Holdings');
    expect(calls).toHaveLength(2);
  });

  it('is not cleared with the profiles', async () => {
    const { identities, calls } = setup();
    await identities.runIdentity(runA);
    identities.clearProfiles();
    await identities.runIdentity(runA);
    expect(calls).toHaveLength(1);
  });

  it('does not keep a failed request', async () => {
    let failing = true;
    const { identities, calls } = setup(() =>
      failing ? failure(404, 'analysis_run_not_found', 'No run.') : undefined,
    );
    await expect(identities.runIdentity(runA)).rejects.toThrow();
    failing = false;
    expect((await identities.runIdentity(runA)).instrument_name).toBe(
      'Microsoft Corp',
    );
    expect(calls).toHaveLength(2);
  });
});
