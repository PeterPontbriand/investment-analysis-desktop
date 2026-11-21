// What the tools that run `ian` need from the machine, so tests can fake it.

export type RunResult = {
  // null when the process could not be started.
  code: number | null;
  stdout: string;
  stderr: string;
};

export type RunOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
  // Ends the command's process when it aborts.
  signal?: AbortSignal;
};

export type Runner = (
  file: string,
  args: string[],
  options?: RunOptions,
) => Promise<RunResult>;

export type FileSystem = {
  exists(path: string): boolean;
  readText(path: string): string;
  makeFolder(path: string): void;
  writeText(path: string, text: string): void;
};
