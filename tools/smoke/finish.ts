// Starts the application and, when it exits with a failure status, tells the
// contributor in the terminal to mark Step 10 failed. The tool does not touch
// the record once the application has started: an editor may hold the
// contributor's unsaved marks.
export type FinishOptions = {
  // Starts the application and resolves with its exit status.
  start: () => Promise<number>;
  print: (text: string) => void;
};

export const failureExitMessage = (code: number) =>
  `The application exited with status ${code}. In the record, mark Step 10 fail and note this exit status. The tool does not change the record once the application has started.\n`;

export async function startAndFinish(options: FinishOptions): Promise<number> {
  const code = await options.start();
  // A zero exit leaves Step 10 to the contributor to mark.
  if (code !== 0) options.print(failureExitMessage(code));
  return code;
}
