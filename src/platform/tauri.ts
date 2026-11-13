import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { EngineConnection, EngineStatus, Platform } from './types.ts';

type RawConnection =
  | { state: 'ready'; base_url: string; token: string }
  | { state: 'launch_failed'; reason_code: string | null }
  | { state: 'not_found' | 'timed_out' };

export function createTauriPlatform(): Platform {
  return {
    async engineConnection(): Promise<EngineConnection> {
      const raw = await invoke<RawConnection>('engine_connection');
      switch (raw.state) {
        case 'ready':
          return { state: 'ready', baseUrl: raw.base_url, token: raw.token };
        case 'launch_failed':
          return { state: 'launch_failed', reasonCode: raw.reason_code };
        default:
          return { state: raw.state };
      }
    },
    engineStatus: () => invoke<EngineStatus>('engine_status'),
    setWindowTitle: (title) => getCurrentWindow().setTitle(title),
  };
}
