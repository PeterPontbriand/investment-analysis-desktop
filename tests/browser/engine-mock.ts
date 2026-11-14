import type { Page, Route } from '@playwright/test';
import { respond, type Reply } from '../fixtures/api/server.ts';

export const engineOrigin = 'http://127.0.0.1:4999';
export const appOrigin = 'http://127.0.0.1:4173';
export const engineUrl = `/#engine=${engineOrigin}&token=test-token`;

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept-Language',
  'Access-Control-Allow-Methods': 'GET',
  Vary: 'Origin',
};

export type Handler = (url: URL) => Reply | undefined;

export type RecordedRequest = {
  url: URL;
  headers: Record<string, string>;
};

// Stands in for the engine: handles CORS, sets Content-Language and answers
// each path from the fixtures, unless a handler answers it first.
export async function mockEngine(
  page: Page,
  handler: Handler = () => undefined,
): Promise<{ requests: RecordedRequest[]; paths: (path: string) => URL[] }> {
  const requests: RecordedRequest[] = [];
  await page.route(`${engineOrigin}/**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const url = new URL(request.url());
    requests.push({ url, headers: await request.allHeaders() });
    const reply = handler(url) ?? respond(url);
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
    paths: (path) =>
      requests.filter((r) => r.url.pathname === path).map((r) => r.url),
  };
}
