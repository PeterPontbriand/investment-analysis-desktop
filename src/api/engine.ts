import { inject, shallowRef, type InjectionKey, type Ref } from 'vue';
import type { MessageKey } from '../i18n/index.ts';
import type { Platform } from '../platform/index.ts';
import { ApiError, createApiClient, type ApiClient } from './client.ts';
import { connectionMessage } from './engineState.ts';
import { createTerms, type Terms } from './terms.ts';

export type EngineState =
  | { kind: 'pending' }
  | { kind: 'ready' }
  // The engine is not usable: an engine state, or no engine in a browser build.
  | { kind: 'not_ready'; key: MessageKey };

export type Engine = {
  state: Ref<EngineState>;
  // The shared client, once the connection is ready; rejects when it is not.
  client(): Promise<ApiClient>;
  terms: Terms;
};

export const engineKey: InjectionKey<Engine> = Symbol('engine');

// The engine connection and API client are made once, when the application
// starts, and shared by every screen.
export function createEngine(platform: Platform, locale: () => string): Engine {
  const state = shallowRef<EngineState>({ kind: 'pending' });
  const connected = platform.engineConnection().then((connection) => {
    if (connection.state !== 'ready') {
      state.value = { kind: 'not_ready', key: connectionMessage(connection) };
      throw new ApiError('unreachable');
    }
    state.value = { kind: 'ready' };
    return createApiClient({
      baseUrl: connection.baseUrl,
      token: connection.token,
      locale,
      engineStatus: () => platform.engineStatus(),
    });
  });
  // Callers handle a rejection; this keeps an unused connection quiet.
  connected.catch(() => {});
  const client = () => connected;
  return { state, client, terms: createTerms(client, locale) };
}

export function useEngine(): Engine {
  const engine = inject(engineKey, null);
  if (!engine) throw new Error('The engine was not provided to the app.');
  return engine;
}

// The shared client, once the connection is ready.
export function useApi(): () => Promise<ApiClient> {
  return useEngine().client;
}
