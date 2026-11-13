import {
  inject,
  onMounted,
  ref,
  watch,
  type InjectionKey,
  type Ref,
} from 'vue';
import { getPlatform, type Platform } from '../platform/index.ts';
import { createApiClient, type GetResponse } from './client.ts';
import { connectionMessage, requestFailureMessage } from './engineState.ts';
import { useMessages, type MessageKey } from '../i18n/index.ts';

export type InfoDocument = GetResponse<'/v1/info'>;

export type EngineInfoState =
  | { kind: 'loading' }
  | { kind: 'message'; key: MessageKey }
  | { kind: 'ready'; info: InfoDocument; language: string | null };

export const platformKey: InjectionKey<Platform> = Symbol('platform');

// Loads /v1/info through the adapter, and again when the locale changes so
// that Accept-Language follows the locale state.
export function useEngineInfo(): Ref<EngineInfoState> {
  const platform = inject(platformKey, null) ?? getPlatform();
  const { locale } = useMessages();
  const state = ref<EngineInfoState>({ kind: 'loading' });

  async function load(): Promise<void> {
    const connection = await platform.engineConnection();
    if (connection.state !== 'ready') {
      state.value = { kind: 'message', key: connectionMessage(connection) };
      return;
    }
    const client = createApiClient({
      baseUrl: connection.baseUrl,
      token: connection.token,
      locale: () => locale.value,
      engineStatus: () => platform.engineStatus(),
    });
    try {
      const { data, contentLanguage } = await client.get('/v1/info');
      state.value = { kind: 'ready', info: data, language: contentLanguage };
    } catch (error) {
      state.value = { kind: 'message', key: requestFailureMessage(error) };
    }
  }

  onMounted(load);
  watch(locale, load);
  return state;
}
