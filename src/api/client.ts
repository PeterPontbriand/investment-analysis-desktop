import type { components, paths } from './schema.ts';
import type { EngineStatus } from '../platform/index.ts';

// The request methods the adapter sends, each as the API description names it.
export type Method = 'get' | 'post' | 'patch' | 'delete';

type Operation<M extends Method, P extends keyof paths> = paths[P] extends {
  [K in M]: infer O;
}
  ? O
  : never;

// The JSON document of an operation's success responses, whatever 2xx status
// it answers with.
type SuccessBody<Responses> = {
  [S in keyof Responses]: S extends 200 | 201 | 202
    ? Responses[S] extends { content: { 'application/json': infer T } }
      ? T
      : never
    : never;
}[keyof Responses];

type ResponseOf<M extends Method, P extends keyof paths> =
  Operation<M, P> extends { responses: infer R } ? SuccessBody<R> : never;

// Paths that have the method and answer a JSON document on success.
export type MethodPath<M extends Method> = {
  [P in keyof paths]: [ResponseOf<M, P>] extends [never] ? never : P;
}[keyof paths];

export type GetPath = MethodPath<'get'>;
export type GetResponse<P extends GetPath> = ResponseOf<'get', P>;

type OperationParameters<M extends Method, P extends keyof paths> =
  Operation<M, P> extends { parameters: infer X } ? X : never;

// The path and query parameters an operation declares, typed from the API
// description. An operation with none of a kind has `never` for it.
export type PathParameters<M extends Method, P extends keyof paths> =
  OperationParameters<M, P> extends { path?: infer A }
    ? Exclude<A, undefined>
    : never;
export type QueryParameters<M extends Method, P extends keyof paths> =
  OperationParameters<M, P> extends { query?: infer Q }
    ? Exclude<Q, undefined>
    : never;

type BodyOf<M extends Method, P extends keyof paths> =
  Operation<M, P> extends {
    requestBody: { content: { 'application/json': infer B } };
  }
    ? { body: B }
    : { body?: undefined };

export type RequestOptions<M extends Method, P extends keyof paths> = ([
  PathParameters<M, P>,
] extends [never]
  ? { path?: undefined }
  : { path: PathParameters<M, P> }) &
  ([QueryParameters<M, P>] extends [never]
    ? { query?: undefined }
    : { query?: QueryParameters<M, P> }) &
  BodyOf<M, P>;

// The options argument is required when the operation needs a path parameter
// or a body.
type OptionsArgument<M extends Method, P extends keyof paths> =
  Record<string, never> extends RequestOptions<M, P>
    ? [options?: RequestOptions<M, P>]
    : [options: RequestOptions<M, P>];

export type FailureEnvelope = components['schemas']['FailureEnvelope'];

export type ApiResult<T> = {
  data: T;
  // The tag of the locale the engine's text is in, from Content-Language.
  contentLanguage: string | null;
  // The HTTP status of the success answer (200, 201 and so on).
  status: number;
};

export type ApiErrorDetails = {
  status?: number | null;
  reasonCode?: string | null;
  // The failure envelope's message for a person, written in the response's language.
  reason?: string | null;
  contentLanguage?: string | null;
  // The failure envelope's list of rule errors, kept as served.
  errors?: FailureEnvelope['errors'];
};

// Why a request failed: the engine process has exited, the engine could not be
// reached, or it answered with a failure envelope.
export class ApiError extends Error {
  readonly kind: 'engine_exited' | 'unreachable' | 'failure';
  readonly status: number | null;
  readonly reasonCode: string | null;
  readonly reason: string | null;
  readonly contentLanguage: string | null;
  readonly errors: FailureEnvelope['errors'];

  constructor(kind: ApiError['kind'], details: ApiErrorDetails = {}) {
    super(`API request failed: ${kind}`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = details.status ?? null;
    this.reasonCode = details.reasonCode ?? null;
    this.reason = details.reason ?? null;
    this.contentLanguage = details.contentLanguage ?? null;
    this.errors = details.errors ?? null;
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
  [M in Method]: <P extends MethodPath<M>>(
    path: P,
    ...options: OptionsArgument<M, P>
  ) => Promise<ApiResult<ResponseOf<M, P>>>;
};

async function failureOf(response: Response): Promise<{
  reasonCode: string | null;
  reason: string | null;
  errors: FailureEnvelope['errors'];
}> {
  try {
    const body = (await response.json()) as {
      reason_code?: unknown;
      reason?: unknown;
      errors?: unknown;
    };
    return {
      reasonCode:
        typeof body.reason_code === 'string' ? body.reason_code : null,
      reason: typeof body.reason === 'string' ? body.reason : null,
      errors: Array.isArray(body.errors)
        ? (body.errors as FailureEnvelope['errors'])
        : null,
    };
  } catch {
    return { reasonCode: null, reason: null, errors: null };
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

const methods: Method[] = ['get', 'post', 'patch', 'delete'];

export function createApiClient(options: ApiClientOptions): ApiClient {
  const send = options.fetch ?? ((...args) => fetch(...args));

  function request(method: Method) {
    return async (
      path: string,
      requestOptions?: {
        path?: Record<string, unknown>;
        query?: Record<string, unknown>;
        body?: unknown;
      },
    ): Promise<ApiResult<unknown>> => {
      const hasBody = requestOptions?.body !== undefined;
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
            method: method.toUpperCase(),
            headers: {
              Authorization: `Bearer ${options.token}`,
              'Accept-Language': options.locale(),
              ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(hasBody ? { body: JSON.stringify(requestOptions?.body) } : {}),
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
        data: await response.json(),
        contentLanguage,
        status: response.status,
      };
    };
  }

  return Object.fromEntries(
    methods.map((method) => [method, request(method)]),
  ) as ApiClient;
}
