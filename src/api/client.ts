import type { components, paths } from './schema.ts';
import type { EngineStatus } from '../platform/index.ts';

// GET endpoints with no path parameters that answer 200 with JSON.
export type GetPath = {
  [P in keyof paths]: P extends `${string}{${string}`
    ? never
    : paths[P] extends {
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

export type FailureEnvelope = components['schemas']['FailureEnvelope'];

export type ApiResult<T> = {
  data: T;
  // The tag of the locale the engine's text is in, from Content-Language.
  contentLanguage: string | null;
};

// Why a request failed: the engine process has exited, the engine could not be
// reached, or it answered with a failure envelope.
export class ApiError extends Error {
  readonly kind: 'engine_exited' | 'unreachable' | 'failure';
  readonly status: number | null;
  readonly reasonCode: string | null;

  constructor(
    kind: ApiError['kind'],
    status: number | null = null,
    reasonCode: string | null = null,
  ) {
    super(`API request failed: ${kind}`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.reasonCode = reasonCode;
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
  get<P extends GetPath>(path: P): Promise<ApiResult<GetResponse<P>>>;
};

async function reasonCodeOf(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const code = (body as { reason_code?: unknown }).reason_code;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const send = options.fetch ?? ((...args) => fetch(...args));
  return {
    async get<P extends GetPath>(path: P) {
      let response: Response;
      try {
        response = await send(`${options.baseUrl}${path}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${options.token}`,
            'Accept-Language': options.locale(),
          },
        });
      } catch {
        const status = await options.engineStatus().catch(() => 'running');
        throw new ApiError(
          status === 'exited' ? 'engine_exited' : 'unreachable',
        );
      }
      if (!response.ok) {
        throw new ApiError(
          'failure',
          response.status,
          await reasonCodeOf(response),
        );
      }
      return {
        data: (await response.json()) as GetResponse<P>,
        contentLanguage: response.headers.get('Content-Language'),
      };
    },
  };
}
