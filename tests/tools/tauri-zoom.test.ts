import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The window's text can be enlarged and shrunk from the keyboard: Ctrl plus,
// Ctrl minus and, on Windows, Ctrl 0 (the fast-lane text-zoom spec). On macOS
// and Linux Tauri's zoom keys call the webview zoom command, which the window's
// capability must allow.
type Window = { label: string; zoomHotkeysEnabled?: boolean };
type Capability = {
  windows: string[];
  permissions: (string | { identifier: string })[];
};

const config = JSON.parse(
  readFileSync('src-tauri/tauri.conf.json', 'utf8'),
) as {
  app: { windows: Window[]; security: { capabilities: string[] } };
};
const capability = (name: string) =>
  JSON.parse(
    readFileSync(`src-tauri/capabilities/${name}.json`, 'utf8'),
  ) as Capability;

const zoomPermission = 'core:webview:allow-set-webview-zoom';

describe('keyboard zoom', () => {
  it('is on for every window the application opens', () => {
    expect(config.app.windows.length).toBeGreaterThan(0);
    for (const window of config.app.windows)
      expect(window.zoomHotkeysEnabled, window.label).toBe(true);
  });

  it('is allowed for every window by a capability the application uses', () => {
    const granted = config.app.security.capabilities
      .map(capability)
      .filter((held) =>
        held.permissions.some(
          (permission) =>
            (typeof permission === 'string'
              ? permission
              : permission.identifier) === zoomPermission,
        ),
      );
    for (const window of config.app.windows)
      expect(
        granted.some((held) => held.windows.includes(window.label)),
        window.label,
      ).toBe(true);
  });
});
