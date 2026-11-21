import type { Page, Route } from '@playwright/test';
import { failure, respond, type Reply } from '../fixtures/api/server.ts';

export const engineOrigin = 'http://127.0.0.1:4999';
export const appOrigin = 'http://127.0.0.1:4173';
export const engineUrl = `/#engine=${engineOrigin}&token=test-token`;

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept-Language',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
  Vary: 'Origin',
};

export type RequestDetails = { method: string; body: unknown };

// A handler may answer later, so a test can hold a request open.
export type Handler = (
  url: URL,
  request: RequestDetails,
) => Reply | undefined | Promise<Reply | undefined>;

export type RecordedRequest = {
  url: URL;
  method: string;
  // The parsed JSON body; undefined when the request had none.
  body: unknown;
  headers: Record<string, string>;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLookup = (method: string, path: string) =>
  method === 'POST' && /^\/v1\/instrument-profiles\/[^/]+\/lookup$/.test(path);

const hasOnly = (body: unknown, key: string, type: 'string' | 'array') =>
  isObject(body) &&
  Object.keys(body).length === 1 &&
  (type === 'string'
    ? typeof body[key] === 'string'
    : Array.isArray(body[key]) &&
      (body[key] as unknown[]).every((item) => typeof item === 'string'));

// The body each action request must carry, from the vendored API description;
// null when the request is well formed.
export function bodyProblem(
  method: string,
  path: string,
  body: unknown,
): string | null {
  if (method === 'GET') return null;
  if (method === 'DELETE')
    return body === undefined ? null : 'DELETE must have no body';
  // A lookup has no body (D291).
  if (isLookup(method, path))
    return body === undefined ? null : 'a lookup must have no body';
  if (path === '/v1/watchlists' && method === 'POST')
    return hasOnly(body, 'name', 'string') ? null : 'bad create body';
  if (/^\/v1\/watchlists\/[^/]+$/.test(path) && method === 'PATCH')
    return hasOnly(body, 'name', 'string') ? null : 'bad rename body';
  // Starting a refresh names only a watchlist (D197) or only entries (D272).
  if (path === '/v1/refreshes' && method === 'POST')
    return isObject(body) && 'entries' in body
      ? refreshEntriesProblem(body)
      : hasOnly(body, 'watchlist_id', 'string')
        ? null
        : 'bad refresh body';
  if (/\/remove-tickers$/.test(path))
    return hasOnly(body, 'tickers', 'array') ? null : 'bad remove-tickers body';
  if (/\/remove-method$/.test(path))
    return hasOnly(body, 'method_id', 'string')
      ? null
      : 'bad remove-method body';
  if (/^\/v1\/watchlists\/[^/]+\/entries$/.test(path) && method === 'POST')
    return addEntriesProblem(body);
  return null;
}

// The body of a refresh of entries (D272): only `entries`, each with a ticker,
// a method id and a selection.
function refreshEntriesProblem(body: Record<string, unknown>): string | null {
  if (Object.keys(body).length !== 1) return 'bad refresh-entries body';
  const entries = body.entries;
  if (!Array.isArray(entries) || entries.length === 0)
    return 'bad refresh-entries entries';
  for (const entry of entries as unknown[]) {
    if (!isObject(entry)) return 'bad refresh entry';
    if (Object.keys(entry).some((key) => !refreshEntryKeys.includes(key)))
      return 'bad refresh entry keys';
    if (typeof entry.ticker !== 'string' || entry.ticker === '')
      return 'bad refresh entry ticker';
    if (typeof entry.method_id !== 'string') return 'bad refresh entry method';
    if (entry.selection !== undefined && !isObject(entry.selection))
      return 'bad refresh entry selection';
  }
  return null;
}

const refreshEntryKeys = ['ticker', 'method_id', 'selection'];

// The body of adding entries (D193, D194): a strategy, the tickers as typed
// and the selection, which holds only what the strategy's form sends.
function addEntriesProblem(body: unknown): string | null {
  if (!isObject(body)) return 'bad add-entries body';
  const allowed = ['method_id', 'tickers', 'selection'];
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    return 'bad add-entries body';
  if (typeof body.method_id !== 'string') return 'bad add-entries method_id';
  const tickers = body.tickers;
  if (
    !Array.isArray(tickers) ||
    tickers.length === 0 ||
    !tickers.every((item) => typeof item === 'string' && item !== '')
  )
    return 'bad add-entries tickers';
  if (body.selection !== undefined && !isObject(body.selection))
    return 'bad add-entries selection';
  return null;
}

// Stands in for the engine: handles CORS, sets Content-Language and answers
// each path from the fixtures, unless a handler answers it first. Every action
// request's body is checked; a bad one is answered with a 400 and listed in
// `rejected`, which tests expect to stay empty.
export async function mockEngine(
  page: Page,
  handler: Handler = () => undefined,
): Promise<{
  requests: RecordedRequest[];
  rejected: string[];
  paths: (path: string) => URL[];
  actions: (method: string, path: string) => RecordedRequest[];
}> {
  const requests: RecordedRequest[] = [];
  const rejected: string[] = [];
  await page.route(`${engineOrigin}/**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const url = new URL(request.url());
    const method = request.method();
    const text = request.postData();
    const body: unknown = text === null ? undefined : JSON.parse(text);
    requests.push({
      url,
      method,
      body,
      headers: await request.allHeaders(),
    });
    const problem = bodyProblem(method, url.pathname, body);
    if (problem !== null)
      rejected.push(`${method} ${url.pathname}: ${problem}`);
    const reply =
      problem !== null
        ? failure(400, 'invalid_parameter', problem)
        : ((await handler(url, { method, body })) ??
          (method === 'GET' || isLookup(method, url.pathname)
            ? respond(url, method)
            : failure(404, 'endpoint_not_found', 'No such endpoint.')));
    await route.fulfill({
      status: reply.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(reply.language === null
          ? {}
          : { 'Content-Language': reply.language }),
      },
      body: JSON.stringify(reply.body),
    });
  });
  return {
    requests,
    rejected,
    paths: (path) =>
      requests.filter((r) => r.url.pathname === path).map((r) => r.url),
    actions: (method, path) =>
      requests.filter((r) => r.method === method && r.url.pathname === path),
  };
}
