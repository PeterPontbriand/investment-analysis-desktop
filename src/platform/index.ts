import { isTauri } from '@tauri-apps/api/core';
import { createBrowserPlatform } from './browser.ts';
import { createTauriPlatform } from './tauri.ts';
import type { Platform } from './types.ts';

export type { EngineConnection, EngineStatus, Platform } from './types.ts';

let current: Platform | undefined;

// One instance: the browser implementation consumes the URL fragment on creation.
export function getPlatform(): Platform {
  current ??= isTauri() ? createTauriPlatform() : createBrowserPlatform();
  return current;
}
