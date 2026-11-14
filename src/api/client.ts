import type { components, paths } from './schema.ts';
import type { EngineStatus } from '../platform/index.ts';

// GET endpoints that answer 200 with JSON.
export type GetPath = {
  [P in keyof paths]: paths[P] extends {
    get: {
      responses: { 200: { content: { 'application/json': unknown } } };
    };
  }
    ? P
    : never;
}[keyof paths];

export type GetResponse<P extends GetPath> = paths[P] extends {
  get: {
    responses: { 200: { content: { 'application/json': infer T } } };
  };
}
  ? T
  : never;

type OperationParameters<P extends GetPath> = paths[P] extends {
  get: { parameters: infer X };
}
  ? X
  : never;

// The path and query parameters an operation declares, typed from the API
// description. An operation with none of a kind has `never` for it.
export type PathParameters<P extends GetPath> =
  OperationParameters<P> extends { path?: infer A }
    ? Exclude<A, undefined>
    : never;
export type QueryParameters<P extends GetPath> =
  OperationParameters<P> extends { query?: infer Q }
    ? Exclude<Q, undefined>
    : never;

export type RequestOptions<P extends GetPath> = ([PathParameters<P>] extends [
  never,
]
  ? { path?: undefined }
  : { path: PathParameters<P> }) &
  ([QueryParameters<P>] extends [never]
    ? { query?: undefined }
    : { query?: QueryParameters<P> });

type OptionsArgument<P extends GetPath> = [PathParameters<P>] extends [never]
  ? [options?: RequestOptions<P>]
  : [options: RequestOptions<P>];

export type FailureEnvelope = components['schemas']['FailureEnvelope'];

export type ApiResult<T> = {
  data: T;
  // The tag of the locale the engine's text is in, from Content-Language.
  contentLanguage: string | null;
};

export type ApiErrorDetails = {
  status?: number | null;
  reasonCode?: string | null;
  // The failure envelope's message for a person, written in the response's language.
  reason?: string | null;
  contentLanguage?: string | null;
};

// Why a request failed: the engine process has exited, the engine could not be
// reached, or it answered with a failure envelope.
export class ApiError extends Error {
  readonly kind: 'engine_exited' | 'unreachable' | 'failure';
  readonly status: number | null;
  readonly reasonCode: string | null;
  readonly reason: string | null;
  readonly contentLanguage: string | null;

  constructor(kind: ApiError['kind'], details: ApiErrorDetails = {}) {
    super(`API request failed: ${kind}`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = details.status ?? null;
    this.reasonCode = details.reasonCode ?? null;
    this.reason = details.reason ?? null;
    this.contentLanguage = details.contentLanguage ?? null;
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  token: string;
  // The active locale tag, read for every request.
  locale: () => string;
  engineStatus: () => Promise<EngineStatus>;
  fetch?: typeof fetch;
};

export type ApiClient = {
  get<P extends GetPath>(
    path: P,
    ...options: OptionsArgument<P>
  ): Promise<ApiResult<GetResponse<P>>>;
};

async function failureOf(
  response: Response,
): Promise<{ reasonCode: string | null; reason: string | null }> {
  try {
    const body = (await response.json()) as {
      reason_code?: unknown;
      reason?: unknown;
    };
    return {
      reasonCode:
        typeof body.reason_code === 'string' ? body.reason_code : null,
      reason: typeof body.reason === 'string' ? body.reason : null,
    };
  } catch {
    return { reasonCode: null, reason: null };
  }
}

function urlOf(
  baseUrl: string,
  template: string,
  pathParameters: Record<string, unknown> | undefined,
  query: Record<string, unknown> | undefined,
): string {
  const path = template.replace(/\{([^}]+)\}/g, (_match, name: string) =>
    encodeURIComponent(String(pathParameters?.[name])),
  );
  const parameters = new URLSearchParams();
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined) parameters.append(name, String(value));
  }
  const text = parameters.toString();
  return `${baseUrl}${path}${text === '' ? '' : `?${text}`}`;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const send = options.fetch ?? ((...args) => fetch(...args));
  return {
    async get<P extends GetPath>(path: P, ...rest: OptionsArgument<P>) {
      const requestOptions = rest[0] as
        | {
            path?: Record<string, unknown>;
            query?: Record<string, unknown>;
          }
        | undefined;
      let response: Response;
      try {
        response = await send(
          urlOf(
            options.baseUrl,
            path,
            requestOptions?.path,
            requestOptions?.query,
          ),
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${options.token}`,
              'Accept-Language': options.locale(),
            },
          },
        );
      } catch {
        const status = await options.engineStatus().catch(() => 'running');
        throw new ApiError(
          status === 'exited' ? 'engine_exited' : 'unreachable',
        );
      }
      const contentLanguage = response.headers.get('Content-Language');
      if (!response.ok) {
        throw new ApiError('failure', {
          status: response.status,
          contentLanguage,
          ...(await failureOf(response)),
        });
      }
      return {
        data: (await response.json()) as GetResponse<P>,
        contentLanguage,
      };
    },
  };
}
