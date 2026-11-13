// What the smoke-test tool needs from the machine, so tests can fake it.

export type RunResult = {
  // null when the process could not be started.
  code: number | null;
  stdout: string;
  stderr: string;
};

export type RunOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
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
};

// The tool stops with a plain message instead of guessing. `step` names the
// step of docs/project/SMOKE_TESTING.md it stopped at.
export class SmokeStop extends Error {
  readonly step: string;

  constructor(step: string, message: string) {
    super(message);
    this.name = 'SmokeStop';
    this.step = step;
  }
}

export type StepOutcome = {
  // A short fact worth showing beside the step in the record.
  fact?: string;
};
