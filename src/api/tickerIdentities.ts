import { ApiError, type ApiClient } from './client.ts';
import type { components } from './schema.ts';

type Schemas = components['schemas'];

export type InstrumentProfile = Schemas['InstrumentProfileDocument'];
export type SecurityIdentity = Schemas['SecurityIdentityPart'];

// The engine's stored profile of a ticker, or that it stores none.
export type CurrentProfile =
  { kind: 'stored'; profile: InstrumentProfile } | { kind: 'none' };

export type TickerIdentities = {
  // The stored profile, with no provider asked (D291). Cached per ticker.
  currentProfile(ticker: string): Promise<CurrentProfile>;
  // Resolves the profile, live when the stored one is not fresh, and replaces
  // the cached entry. Only ever called when the user asks (D291).
  lookUp(ticker: string): Promise<InstrumentProfile>;
  // The identity a saved run kept, from its overview. Cached per run id.
  runIdentity(runId: string): Promise<SecurityIdentity>;
  // Forgets every current profile: a refresh ended or entries were added, and
  // either can store or change one (D294).
  clearProfiles(): void;
};

// The engine trims and upper-cases a ticker, so one profile has one key.
const keyOf = (ticker: string): string => ticker.trim().toUpperCase();

function isNoProfile(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 404 &&
    error.reasonCode === 'instrument_profile_not_found'
  );
}

// The caches behind ticker details (D294). A failed request is not kept, so the
// next use asks again.
export function createTickerIdentities(
  client: () => Promise<ApiClient>,
): TickerIdentities {
  const profiles = new Map<string, Promise<CurrentProfile>>();
  const runs = new Map<string, Promise<SecurityIdentity>>();

  function forgetOnFailure<T>(
    cache: Map<string, Promise<T>>,
    key: string,
    attempt: Promise<T>,
  ): void {
    attempt.catch(() => {
      if (cache.get(key) === attempt) cache.delete(key);
    });
  }

  return {
    currentProfile(ticker) {
      const key = keyOf(ticker);
      const held = profiles.get(key);
      if (held) return held;
      const attempt = client()
        .then((api) =>
          api.get('/v1/instrument-profiles/{ticker}', {
            path: { ticker: key },
          }),
        )
        .then(
          (result): CurrentProfile => ({
            kind: 'stored',
            profile: result.data,
          }),
          (error: unknown): CurrentProfile => {
            if (isNoProfile(error)) return { kind: 'none' };
            throw error;
          },
        );
      profiles.set(key, attempt);
      forgetOnFailure(profiles, key, attempt);
      return attempt;
    },
    async lookUp(ticker) {
      const key = keyOf(ticker);
      const api = await client();
      const result = await api.post('/v1/instrument-profiles/{ticker}/lookup', {
        path: { ticker: key },
      });
      profiles.set(
        key,
        Promise.resolve({ kind: 'stored', profile: result.data }),
      );
      return result.data;
    },
    runIdentity(runId) {
      const held = runs.get(runId);
      if (held) return held;
      const attempt = client()
        .then((api) =>
          api.get('/v1/runs/{analysis_run_id}/overview', {
            path: { analysis_run_id: runId },
          }),
        )
        .then((result) => result.data.security_identity);
      runs.set(runId, attempt);
      forgetOnFailure(runs, runId, attempt);
      return attempt;
    },
    clearProfiles() {
      profiles.clear();
    },
  };
}
