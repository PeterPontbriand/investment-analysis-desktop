import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import type { ApiClient } from './client.ts';
import type { components } from './schema.ts';

export type InfoDocument = components['schemas']['InfoDocument'];

export type InfoCache = {
  // The engine's information once loaded; null until then.
  info: ShallowRef<InfoDocument | null>;
  // Loads it once per connection. A failed load is not kept, so the next call asks again.
  load(): Promise<InfoDocument>;
  // Whether an SEC identity is configured; null while the answer is unknown (D242).
  secIdentityConfigured: ComputedRef<boolean | null>;
  // A provider's name for a person, by identifier; null when the engine lists none.
  providerName(providerId: string): string | null;
};

// One application-wide copy of GET /v1/info, kept beside the refresh follower
// (D242). About keeps its own load.
export function createInfoCache(client: () => Promise<ApiClient>): InfoCache {
  const info = shallowRef<InfoDocument | null>(null);
  let loading: Promise<InfoDocument> | null = null;

  function load(): Promise<InfoDocument> {
    if (info.value !== null) return Promise.resolve(info.value);
    if (loading === null) {
      const attempt = client()
        .then((api) => api.get('/v1/info'))
        .then((result) => {
          info.value = result.data;
          return result.data;
        });
      loading = attempt;
      attempt.then(
        () => undefined,
        () => {
          if (loading === attempt) loading = null;
        },
      );
    }
    return loading;
  }

  return {
    info,
    load,
    secIdentityConfigured: computed(
      () => info.value?.sec_identity_configured ?? null,
    ),
    providerName: (providerId) =>
      info.value?.providers.find((provider) => provider.id === providerId)
        ?.name ?? null,
  };
}
