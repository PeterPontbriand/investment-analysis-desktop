// A fake engine: answers a request URL with a fixture document, the way the
// real API does, for both test runners.
import type { components } from '../../../src/api/schema.ts';
import * as compare from './compare.ts';
import * as data from './data.ts';

export type Reply = {
  status: number;
  body: unknown;
  language: string | null;
};

export const ok = (body: unknown): Reply => ({
  status: 200,
  body,
  language: 'en',
});

export function failure(
  status: number,
  reasonCode: components['schemas']['FailureReasonCode'],
  reason: string,
  language: string | null = 'en',
): Reply {
  const envelope: components['schemas']['FailureEnvelope'] = {
    status: 'error',
    reason_code: reasonCode,
    reason,
    analysis: null,
    database: null,
    diagnostics: [],
    errors: null,
    method: null,
    parameters: null,
    provider_check: null,
    provider_failure: null,
    result: null,
    schema_version: 15,
    ticker: null,
    unreadable: null,
  };
  return { status, body: envelope, language };
}

function page<T>(items: T[], parameters: URLSearchParams) {
  const limit = Number(parameters.get('limit') ?? 20);
  const offset = Number(parameters.get('offset') ?? 0);
  return {
    schema_version: 1,
    items: items.slice(offset, offset + limit),
    has_more: offset + limit < items.length,
  };
}

export function respond(url: URL): Reply {
  const parameters = url.searchParams;
  const path = url.pathname;
  switch (path) {
    case '/v1/info':
      return ok(data.info);
    case '/v1/strategies':
      return ok(data.strategies);
    case '/v1/help':
      return ok(data.helpIndex);
    case '/v1/help/references':
      return ok(data.references);
    case '/v1/watchlists':
      return ok(data.watchlists);
    case '/v1/refreshes/job':
      return failure(404, 'refresh_job_not_found', 'No refresh job.');
    case '/v1/refreshes': {
      const id = parameters.get('watchlist_id');
      return ok(
        page(
          data.refreshes.filter(
            (item) => id === null || item.watchlist_id === id,
          ),
          parameters,
        ),
      );
    }
    case '/v1/runs': {
      const ticker = parameters.get('ticker');
      const method = parameters.get('method_id');
      const outcome = parameters.get('outcome');
      return ok(
        page(
          data.runs.filter(
            (item) =>
              (ticker === null ||
                item.ticker.toLowerCase() === ticker.toLowerCase()) &&
              (method === null || item.method_id === method) &&
              (outcome === null || item.outcome === outcome),
          ),
          parameters,
        ),
      );
    }
  }
  const watchlist = /^\/v1\/watchlists\/([^/]+)$/.exec(path);
  if (watchlist) {
    const document = data.watchlistDocuments[watchlist[1] ?? ''];
    return document
      ? ok(document)
      : failure(404, 'watchlist_not_found', 'No such watchlist.');
  }
  const comparison = /^\/v1\/refreshes\/([^/]+)\/compare$/.exec(path);
  if (comparison) {
    const document = compare.comparisons[comparison[1] ?? ''];
    return document
      ? ok(document)
      : failure(404, 'analysis_run_not_found', 'No such refresh.');
  }
  const run = /^\/v1\/runs\/([^/]+)(\/overview|\/text)?$/.exec(path);
  if (run) {
    const id = run[1] ?? '';
    const detail = compare.runDetails[id];
    if (!detail)
      return failure(404, 'analysis_run_not_found', 'No such saved run.');
    if (run[2] === '/overview') return ok(detail.overview);
    if (run[2] === '/text') {
      const mode = parameters.get('mode');
      return compare.textModes.find((item) => item === mode)
        ? ok(compare.textFor(id, mode as (typeof compare.textModes)[number]))
        : failure(400, 'invalid_parameter', 'Unknown mode.');
    }
    return detail.document
      ? ok(detail.document)
      : failure(
          409,
          'unsupported_projection',
          'This run cannot be shown as a document.',
        );
  }
  return failure(404, 'endpoint_not_found', 'No such endpoint.');
}
