import { describe, expect, it, vi } from 'vitest';
import {
  createBrowserPlatform,
  parseEngineFragment,
} from '../../src/platform/browser.ts';

function host(hash: string) {
  return {
    location: { hash, pathname: '/app', search: '?a=1' },
    history: { replaceState: vi.fn() },
    document: { title: '' },
  };
}

describe('browser platform', () => {
  it('parses the base URL and token from the fragment', () => {
    expect(
      parseEngineFragment('#engine=http%3A%2F%2F127.0.0.1%3A5000&token=abc'),
    ).toEqual({ baseUrl: 'http://127.0.0.1:5000', token: 'abc' });
  });

  it('rejects a fragment with a missing part or a non-HTTP URL', () => {
    expect(parseEngineFragment('')).toBeNull();
    expect(parseEngineFragment('#engine=http://127.0.0.1:5000')).toBeNull();
    expect(parseEngineFragment('#token=abc')).toBeNull();
    expect(parseEngineFragment('#engine=file:///x&token=abc')).toBeNull();
    expect(parseEngineFragment('#engine=nonsense&token=abc')).toBeNull();
  });

  it('connects from the fragment and clears it with replaceState', async () => {
    const page = host('#engine=http://127.0.0.1:5000&token=abc');

    const platform = createBrowserPlatform(page);

    expect(page.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/app?a=1',
    );
    expect(await platform.engineConnection()).toEqual({
      state: 'ready',
      baseUrl: 'http://127.0.0.1:5000',
      token: 'abc',
    });
  });

  it('has no engine without a fragment and leaves the address alone', async () => {
    const page = host('');

    const platform = createBrowserPlatform(page);

    expect(page.history.replaceState).not.toHaveBeenCalled();
    expect(await platform.engineConnection()).toEqual({ state: 'no_engine' });
  });

  it('sets the document title as the window title', async () => {
    const page = host('');

    await createBrowserPlatform(page).setWindowTitle('Title');

    expect(page.document.title).toBe('Title');
  });
});
