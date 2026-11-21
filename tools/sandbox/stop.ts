// The tool stops with a plain message instead of guessing. `step` names the
// stage of the setup it stopped at.
export class SandboxStop extends Error {
  readonly step: string;

  constructor(step: string, message: string) {
    super(message);
    this.name = 'SandboxStop';
    this.step = step;
  }
}
