import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';

type Step = { name: string; command: string; args: string[] };
type Result = { name: string; passed: boolean; duration: number };

const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const steps: Step[] = [
  {
    name: 'Install frozen dependencies',
    command: packageManager,
    args: ['install', '--frozen-lockfile'],
  },
  {
    name: 'Install Playwright Chromium and WebKit',
    command: packageManager,
    args: ['exec', 'playwright', 'install', 'chromium', 'webkit'],
  },
  { name: 'Prettier check', command: packageManager, args: ['format:check'] },
  { name: 'ESLint', command: packageManager, args: ['lint'] },
  {
    name: 'Vue and application type check',
    command: packageManager,
    args: ['typecheck'],
  },
  {
    name: 'Tools TypeScript check',
    command: packageManager,
    args: ['exec', 'tsc', '--noEmit', '-p', 'tools/tsconfig.json'],
  },
  {
    name: 'Markdown links, anchors, and Mermaid check',
    command: 'node',
    args: ['tools/check-doc-links.ts'],
  },
  {
    name: 'Sequence table check',
    command: 'node',
    args: ['tools/check-sequence-tables.ts'],
  },
  { name: 'Vitest', command: packageManager, args: ['test'] },
  { name: 'Vite production build', command: packageManager, args: ['build'] },
  {
    name: 'Playwright Chromium and WebKit',
    command: packageManager,
    args: ['test:browser'],
  },
];

const output = createWriteStream('gate-output.txt', { flags: 'w' });
function log(message: string): void {
  process.stdout.write(message);
  output.write(message);
}

function run(step: Step): Promise<{ passed: boolean; duration: number }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      shell: process.platform === 'win32',
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', (chunk: Buffer) => log(chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => log(chunk.toString()));
    child.on('error', (error: Error) => {
      log(`${error.message}\n`);
      resolve({ passed: false, duration: Date.now() - started });
    });
    child.on('close', (code) =>
      resolve({ passed: code === 0, duration: Date.now() - started }),
    );
  });
}

async function main(): Promise<void> {
  const results: Result[] = [];
  const totalStarted = Date.now();
  for (const [index, step] of steps.entries()) {
    log(
      `\n[${index + 1}/${steps.length}] ${step.name}\n$ ${step.command} ${step.args.join(' ')}\n`,
    );
    const result = await run(step);
    results.push({ name: step.name, ...result });
    log(
      `\n${result.passed ? 'PASS' : 'FAIL'} (${(result.duration / 1000).toFixed(1)}s): ${step.name}\n`,
    );
    if (index === 0 && !result.passed) break;
  }

  const totalDuration = Date.now() - totalStarted;
  log('\nGate summary\n');
  log('| Step | Result | Duration |\n| :--- | :--- | ---: |\n');
  for (const result of results) {
    log(
      `| ${result.name} | ${result.passed ? 'PASS' : 'FAIL'} | ${(result.duration / 1000).toFixed(1)}s |\n`,
    );
  }
  log(`\nTotal duration: ${(totalDuration / 1000).toFixed(1)}s\n`);
  output.end();
  await once(output, 'finish');
  if (
    results.some((result) => !result.passed) ||
    results.length !== steps.length
  )
    process.exitCode = 1;
}

await main();
