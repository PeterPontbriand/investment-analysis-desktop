import type { EngineConnection, EngineStatus, Platform } from './types.ts';

type Host = {
  location: Pick<Location, 'hash' | 'pathname' | 'search'>;
  history: Pick<History, 'replaceState'>;
  document: Pick<Document, 'title'>;
};

// The fragment is #engine=<base URL>&token=<token> (D58).
export function parseEngineFragment(
  hash: string,
): { baseUrl: string; token: string } | null {
  const parameters = new URLSearchParams(hash.replace(/^#/, ''));
  const engine = parameters.get('engine');
  const token = parameters.get('token');
  if (!engine || !token) return null;
  try {
    const url = new URL(engine);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return { baseUrl: url.origin, token };
  } catch {
    return null;
  }
}

// Reads the connection once and clears the fragment, so the token does not
// stay in the address bar or history.
export function createBrowserPlatform(host: Host = window): Platform {
  const parsed = parseEngineFragment(host.location.hash);
  if (host.location.hash !== '') {
    host.history.replaceState(
      null,
      '',
      `${host.location.pathname}${host.location.search}`,
    );
  }
  const connection: EngineConnection = parsed
    ? { state: 'ready', ...parsed }
    : { state: 'no_engine' };
  return {
    engineConnection: () => Promise.resolve(connection),
    // A browser cannot see the engine's process.
    engineStatus: (): Promise<EngineStatus> => Promise.resolve('running'),
    setWindowTitle: (title) => {
      host.document.title = title;
      return Promise.resolve();
    },
  };
}
