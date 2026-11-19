import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { listChangedPaths, shellPathsChanged } from './gate-scope.ts';

type Step = {
  name: string;
  command: string;
  args: string[];
  forbidOutput?: string;
  shell?: true;
};
type Program = { file: string; args: string[] };
type Result = {
  name: string;
  passed: boolean;
  duration: number;
  skipped?: true;
};

const packageManager = 'pnpm';
const node = 'node';
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
    name: 'Stylelint logical properties',
    command: packageManager,
    args: ['lint:css'],
  },
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
  {
    name: 'OpenAPI types drift check',
    command: node,
    args: ['tools/check-openapi-types.ts'],
  },
  { name: 'Vitest', command: packageManager, args: ['test'] },
  { name: 'Vite production build', command: packageManager, args: ['build'] },
  {
    name: 'Production build excludes test locales',
    command: node,
    args: ['tools/check-production-locales.ts'],
  },
  {
    name: 'Playwright Chromium and WebKit',
    command: packageManager,
    args: ['test:browser'],
  },
  {
    name: 'Rust formatting check',
    shell: true,
    command: 'cargo',
    args: ['fmt', '--check', '--manifest-path', 'src-tauri/Cargo.toml'],
  },
  {
    name: 'Rust Clippy with warnings denied',
    shell: true,
    command: 'cargo',
    args: [
      'clippy',
      '--locked',
      '--manifest-path',
      'src-tauri/Cargo.toml',
      '--all-targets',
      '--all-features',
      '--',
      '-D',
      'warnings',
    ],
  },
  {
    name: 'Rust unit tests',
    shell: true,
    command: 'cargo',
    args: ['test', '--locked', '--manifest-path', 'src-tauri/Cargo.toml'],
  },
  {
    name: 'Cargo release dependency tree excludes WebDriver',
    shell: true,
    command: 'cargo',
    args: ['tree', '--manifest-path', 'src-tauri/Cargo.toml', '--locked'],
    forbidOutput: 'tauri-plugin-wdio-webdriver',
  },
  {
    name: 'Tauri end-to-end build with WebDriver feature',
    shell: true,
    command: packageManager,
    args: ['build:shell:e2e'],
  },
  {
    name: 'Tauri shell smoke test',
    shell: true,
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

function describeScope(slice: boolean): { runShell: boolean; line: string } {
  if (!slice) return { runShell: true, line: 'Full gate: every step runs.' };
  const listed = listChangedPaths();
  if ('error' in listed)
    return {
      runShell: true,
      line: `Slice check: shell steps run; could not list changed files: ${listed.error}.`,
    };
  const matched = shellPathsChanged(listed.paths);
  if (matched.length === 0)
    return {
      runShell: false,
      line: 'Slice check: shell steps skipped; no change under src-tauri/, src/platform/, tests/shell/, wdio.conf.js, rust-toolchain.toml or pnpm-lock.yaml.',
    };
  const shown = matched.slice(0, 5).join(', ');
  const more = matched.length > 5 ? `, and ${matched.length - 5} more` : '';
  return {
    runShell: true,
    line: `Slice check: shell steps run; changed: ${shown}${more}.`,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--slice')) {
    process.stderr.write('Usage: pnpm gate | pnpm gate:slice\n');
    process.exitCode = 2;
    return;
  }
  if (!process.env.npm_execpath) {
    process.stderr.write(
      'Run the gate with `pnpm gate`; npm_execpath is not set.\n',
    );
    process.exitCode = 1;
    return;
  }
  const scope = describeScope(args.length === 1);
  log(`${scope.line}\n`);
  const results: Result[] = [];
  const totalStarted = Date.now();
  const expectedRuns = steps.filter(
    (step) => scope.runShell || !step.shell,
  ).length;
  for (const [index, step] of steps.entries()) {
    const header = `\n[${index + 1}/${steps.length}] ${step.name}\n`;
    if (step.shell && !scope.runShell) {
      log(`${header}SKIP: shell paths unchanged\n`);
      results.push({
        name: step.name,
        passed: true,
        duration: 0,
        skipped: true,
      });
      continue;
    }
    log(`${header}$ ${step.command} ${step.args.join(' ')}\n`);
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
    if (result.skipped) {
      log(`| ${result.name} | SKIP | - |\n`);
      continue;
    }
    log(
      `| ${result.name} | ${result.passed ? 'PASS' : 'FAIL'} | ${(result.duration / 1000).toFixed(1)}s |\n`,
    );
  }
  log(`\nTotal duration: ${(totalDuration / 1000).toFixed(1)}s\n`);
  output.end();
  await once(output, 'finish');
  const ran = results.filter((result) => !result.skipped);
  if (ran.some((result) => !result.passed) || ran.length !== expectedRuns)
    process.exitCode = 1;
}

await main();
