// Runs once before the real-engine suite: finds `ian` the way the sandbox does,
// checks that it is at the vendored commit, and chooses a folder under .tmp/
// for this run's throwaway databases. It never switches the engine checkout.
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { EngineProblem, locateEngine } from '../../../tools/engine/engine.ts';
import { fileSystem, run } from '../../../tools/engine/process.ts';
import { readVendoredCommit } from '../../../tools/engine/source.ts';

const root = resolve(import.meta.dirname, '..', '..', '..');

const pad = (value: number) => String(value).padStart(2, '0');

export default async function globalSetup(): Promise<void> {
  const wanted = readVendoredCommit(
    readFileSync(join(root, 'vendor', 'ian', 'SOURCE.md'), 'utf8'),
  );
  let found;
  try {
    found = await locateEngine({
      run,
      fs: fileSystem,
      env: process.env,
      platform: process.platform,
    });
  } catch (error) {
    if (error instanceof EngineProblem)
      throw new Error(`The real-engine tests cannot start: ${error.message}`, {
        cause: error,
      });
    throw error;
  }
  if (found.about.commit !== wanted)
    throw new Error(
      `The real-engine tests need the engine at the vendored commit ${wanted}, but \`ian\` runs the engine at ${found.about.commit}. Switch your engine checkout to the vendored commit yourself; these tests never switch it.`,
    );
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const folder = join(root, '.tmp', 'engine-tests', stamp);
  mkdirSync(folder, { recursive: true });
  process.env.IAD_ENGINE_TEST_IAN = found.ian.path;
  process.env.IAD_ENGINE_TEST_FOLDER = folder;
  process.env.IAD_ENGINE_TEST_COMMIT = wanted;
}
