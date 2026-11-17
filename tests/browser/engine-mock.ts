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

export type Handler = (url: URL, request: RequestDetails) => Reply | undefined;

export type RecordedRequest = {
  url: URL;
  method: string;
  // The parsed JSON body; undefined when the request had none.
  body: unknown;
  headers: Record<string, string>;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  if (path === '/v1/watchlists' && method === 'POST')
    return hasOnly(body, 'name', 'string') ? null : 'bad create body';
  if (/^\/v1\/watchlists\/[^/]+$/.test(path) && method === 'PATCH')
    return hasOnly(body, 'name', 'string') ? null : 'bad rename body';
  if (/\/remove-tickers$/.test(path))
    return hasOnly(body, 'tickers', 'array') ? null : 'bad remove-tickers body';
  if (/\/remove-method$/.test(path))
    return hasOnly(body, 'method_id', 'string')
      ? null
      : 'bad remove-method body';
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
        : (handler(url, { method, body }) ??
          (method === 'GET'
            ? respond(url)
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
