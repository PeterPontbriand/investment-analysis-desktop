// Starts the application and, when it exits with a failure status, marks Step 10
// failed in the record.
import type { Session } from './setup.ts';

export type FinishOptions = {
  session: Session;
  // Starts the application and resolves with its exit status.
  start: () => Promise<number>;
  // Writes the record again and returns its path.
  rewrite: () => Promise<string | null>;
  print: (text: string) => void;
};

export async function startAndFinish(options: FinishOptions): Promise<number> {
  const code = await options.start();
  // A zero exit leaves Step 10 to the contributor to mark.
  if (code !== 0) {
    options.session.scripted.set('Step 10', {
      fail: `\`pnpm tauri dev\` exited with status ${code}; see the terminal`,
    });
    const path = await options.rewrite();
    options.print(
      `The application exited with status ${code}. The record was updated, with Step 10 marked fail: ${path}\n`,
    );
  }
  return code;
}
