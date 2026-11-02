import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';

type Step = {
  name: string;
  command: string;
  args: string[];
  forbidOutput?: string;
};
type Program = { file: string; args: string[] };
type Result = { name: string; passed: boolean; duration: number };

const packageManager = 'pnpm';
const node = 'node';
const steps: Step[] = [
  {
    name: 'Install frozen dependencies',
    command: packageManager,
    args: ['install', '--frozen-lockfile', '--config.strict-dep-builds=false'],
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
    command: node,
    args: ['tools/docs/check-doc-links.ts'],
  },
  {
    name: 'Sequence table check',
    command: node,
    args: ['tools/docs/check-sequence-tables.ts'],
  },
  { name: 'Vitest', command: packageManager, args: ['test'] },
  { name: 'Vite production build', command: packageManager, args: ['build'] },
  {
    name: 'Playwright Chromium and WebKit',
    command: packageManager,
    args: ['test:browser'],
  },
  {
    name: 'Rust formatting check',
    command: 'cargo',
    args: ['fmt', '--check', '--manifest-path', 'src-tauri/Cargo.toml'],
  },
  {
    name: 'Rust Clippy with warnings denied',
    command: 'cargo',
    args: [
      'clippy',
      '--locked',
      '--manifest-path',
      'src-tauri/Cargo.toml',
      '--all-targets',
      '--',
      '-D',
      'warnings',
    ],
  },
  {
    name: 'Cargo release dependency tree excludes WebDriver',
    command: 'cargo',
    args: ['tree', '--manifest-path', 'src-tauri/Cargo.toml', '--locked'],
    forbidOutput: 'tauri-plugin-wdio-webdriver',
  },
  {
    name: 'Tauri end-to-end build with WebDriver feature',
    command: packageManager,
    args: ['build:shell:e2e'],
  },
  {
    name: 'Tauri shell smoke test',
    command: packageManager,
    args: ['test:shell'],
  },
];

const output = createWriteStream('gate-output.txt', { flags: 'w' });
function log(message: string): void {
  process.stdout.write(message);
  output.write(message);
}

function resolveProgram(step: Step): Program {
  if (step.command === node) return { file: process.execPath, args: step.args };
  if (step.command !== packageManager)
    return { file: step.command, args: step.args };
  const execPath = process.env.npm_execpath as string;
  if (/\.(js|cjs|mjs)$/.test(execPath))
    return { file: process.execPath, args: [execPath, ...step.args] };
  return { file: execPath, args: step.args };
}

function run(step: Step): Promise<{ passed: boolean; duration: number }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const program = resolveProgram(step);
    const child = spawn(program.file, program.args, {
      cwd: process.cwd(),
      shell: false,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let capturedOutput = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      const message = chunk.toString();
      capturedOutput += message;
      log(message);
    });
    child.stderr?.on('data', (chunk: Buffer) => log(chunk.toString()));
    child.on('error', (error: Error) => {
      log(`${error.message}\n`);
      resolve({ passed: false, duration: Date.now() - started });
    });
    child.on('close', (code) => {
      const containsForbiddenOutput =
        step.forbidOutput !== undefined &&
        capturedOutput.includes(step.forbidOutput);
      if (containsForbiddenOutput)
        log(
          `Forbidden dependency found in command output: ${step.forbidOutput}\n`,
        );
      resolve({
        passed: code === 0 && !containsForbiddenOutput,
        duration: Date.now() - started,
      });
    });
  });
}

async function main(): Promise<void> {
  if (!process.env.npm_execpath) {
    process.stderr.write(
      'Run the gate with `pnpm gate`; npm_execpath is not set.\n',
    );
    process.exitCode = 1;
    return;
  }
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
