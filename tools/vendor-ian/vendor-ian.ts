// `pnpm vendor-ian <commit>`; see vendor.ts.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTypes } from '../openapi-types.ts';
import { EngineProblem } from '../smoke/engine.ts';
import { fileSystem, run } from '../smoke/process.ts';
import { VendorStop, vendorIan, vendorMessages } from './vendor.ts';

const repositoryRoot = resolve(
  fileURLToPath(new URL('../..', import.meta.url)),
);

async function main(): Promise<number> {
  const revision = process.argv[2] ?? '';
  try {
    if (process.argv.length > 3) throw new VendorStop(vendorMessages.usage());
    await vendorIan(
      {
        run,
        fs: fileSystem,
        env: process.env,
        platform: process.platform,
        repositoryRoot,
        generate: generateTypes,
        print: (line) => process.stdout.write(`${line}\n`),
      },
      revision,
    );
    return 0;
  } catch (error) {
    if (!(error instanceof VendorStop || error instanceof EngineProblem))
      throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

process.exitCode = await main();
