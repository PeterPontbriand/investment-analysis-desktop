// What the rest of the application may ask of the host it runs in: the desktop
// shell, or a plain browser. Only this module imports @tauri-apps/*.

export type EngineConnection =
  | { state: 'ready'; baseUrl: string; token: string }
  | { state: 'not_found' }
  | { state: 'launch_failed'; reasonCode: string | null }
  | { state: 'timed_out' }
  // A browser build opened without an engine fragment (D70); not an engine state.
  | { state: 'no_engine' };

export type EngineStatus = 'running' | 'exited';

export interface Platform {
  engineConnection(): Promise<EngineConnection>;
  engineStatus(): Promise<EngineStatus>;
  setWindowTitle(title: string): Promise<void>;
}
