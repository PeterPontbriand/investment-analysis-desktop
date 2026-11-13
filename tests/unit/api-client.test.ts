import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '../../src/api/client.ts';
import type { components } from '../../src/api/schema.ts';

const info: components['schemas']['InfoDocument'] = {
  api_versions: ['v1'],
  engine_version: '1.2.3',
  locales: [{ tag: 'en', name: 'English' }],
  schema_version: 2,
  sec_identity_configured: false,
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...init.headers },
    status: init.status ?? 200,
  });
}

function client(fetchStub: typeof fetch, status = vi.fn()) {
  return createApiClient({
    baseUrl: 'http://127.0.0.1:5000',
    token: 'secret',
    locale: () => 'pt-BR',
    engineStatus: status.mockResolvedValue('running'),
    fetch: fetchStub,
  });
}

describe('API adapter', () => {
  it('sends the bearer token and Accept-Language from the locale state', async () => {
    const fetchStub = vi.fn().mockResolvedValue(json(info));

    await client(fetchStub).get('/v1/info');

    const [url, init] = fetchStub.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:5000/v1/info');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({
      Authorization: 'Bearer secret',
      'Accept-Language': 'pt-BR',
    });
  });

  it('returns the data with the response Content-Language', async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(json(info, { headers: { 'Content-Language': 'en' } }));

    const result = await client(fetchStub).get('/v1/info');

    expect(result).toEqual({ data: info, contentLanguage: 'en' });
  });

  it('returns no language when the response has no Content-Language', async () => {
    const result = await client(vi.fn().mockResolvedValue(json(info))).get(
      '/v1/info',
    );

    expect(result.contentLanguage).toBeNull();
  });

  it('maps a network error to engine_exited when the engine has exited', async () => {
    const status = vi.fn().mockResolvedValue('exited');
    const failing = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const api = createApiClient({
      baseUrl: 'http://127.0.0.1:5000',
      token: 't',
      locale: () => 'en',
      engineStatus: status,
      fetch: failing,
    });

    await expect(api.get('/v1/info')).rejects.toMatchObject({
      kind: 'engine_exited',
    });
    expect(status).toHaveBeenCalledTimes(1);
  });

  it('maps a network error to unreachable when the engine is still running', async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(client(failing).get('/v1/info')).rejects.toMatchObject({
      kind: 'unreachable',
    });
  });

  it('does not ask for the engine status after an HTTP failure', async () => {
    const status = vi.fn().mockResolvedValue('running');
    const fetchStub = vi
      .fn()
      .mockResolvedValue(
        json({ reason_code: 'not_authenticated' }, { status: 401 }),
      );

    const error = await client(fetchStub, status)
      .get('/v1/info')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: 'failure',
      status: 401,
      reasonCode: 'not_authenticated',
    });
    expect(status).not.toHaveBeenCalled();
  });
});
