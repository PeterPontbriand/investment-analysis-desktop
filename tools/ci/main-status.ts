import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type JobResult = { name: string; result: string };

export type MainReportInput = {
  jobs: readonly JobResult[];
  flaky: readonly string[];
  runUrl: string;
  sha: string;
  commitTitle: string;
  openIssue: number | null;
};

export type MainReportPlan =
  | { action: 'none' }
  | { action: 'create'; title: string; body: string }
  | { action: 'comment'; issue: number; body: string };

// A job result that needs no report.
const quietResults: readonly string[] = ['success', 'skipped'];

// Decides whether a run on main needs a report, and what it says.
export function planMainReport(input: MainReportInput): MainReportPlan {
  const failed = input.jobs.filter((job) => !quietResults.includes(job.result));
  if (failed.length === 0 && input.flaky.length === 0)
    return { action: 'none' };
  const lines = [
    `Commit: ${input.sha.slice(0, 7)} ${input.commitTitle}`,
    `Run: ${input.runUrl}`,
    '',
    'Failed jobs:',
    ...(failed.length === 0
      ? ['- none']
      : failed.map((job) => `- ${job.name}: ${job.result}`)),
    '',
    'Flaky tests (failed, then passed on retry):',
    ...(input.flaky.length === 0
      ? ['- none']
      : input.flaky.map((title) => `- ${title}`)),
  ];
  const body = `${lines.join('\n')}\n`;
  if (input.openIssue !== null)
    return { action: 'comment', issue: input.openIssue, body };
  return {
    action: 'create',
    title: failed.length > 0 ? 'main is red' : 'Flaky tests on main',
    body,
  };
}

type PlaywrightSuite = {
  title?: string;
  suites?: PlaywrightSuite[];
  specs?: {
    title: string;
    tests?: { projectName?: string; status?: string }[];
  }[];
};

// Collects the titles of tests that Playwright's JSON report marks flaky.
export function collectFlaky(report: unknown, label: string): string[] {
  const titles: string[] = [];
  const walk = (suite: PlaywrightSuite): void => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? [])
        if (test.status === 'flaky')
          titles.push(
            `${spec.title} (${[test.projectName, label].filter(Boolean).join(', ')})`,
          );
    for (const child of suite.suites ?? []) walk(child);
  };
  walk(report as PlaywrightSuite);
  return titles;
}

// Parses "name=result" pairs separated by commas or whitespace.
export function parseJobResults(text: string): JobResult[] {
  return text
    .split(/[\s,]+/)
    .filter((pair) => pair.includes('='))
    .map((pair) => {
      const at = pair.indexOf('=');
      return { name: pair.slice(0, at), result: pair.slice(at + 1) };
    });
}

function findReports(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findReports(path));
    else if (entry.name === 'playwright-results.json') found.push(path);
  }
  return found;
}

function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  const env = process.env;
  const jobs = parseJobResults(env.JOB_RESULTS ?? '');
  const flaky: string[] = [];
  for (const file of findReports(env.RESULTS_DIR ?? 'playwright-results')) {
    // The directory holding the report is named playwright-results-<platform>.
    const parent = file.split(/[\\/]/).slice(-2, -1)[0] ?? '';
    const label = parent.replace(/^playwright-results-?/, '');
    try {
      flaky.push(
        ...collectFlaky(JSON.parse(readFileSync(file, 'utf8')), label),
      );
    } catch (error) {
      process.stderr.write(
        `Could not read ${file}: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }
  let openIssue: number | null = null;
  if (!dryRun) {
    const listed = JSON.parse(
      gh([
        'issue',
        'list',
        '--label',
        'main-red',
        '--state',
        'open',
        '--json',
        'number',
      ]),
    ) as { number: number }[];
    openIssue = listed[0]?.number ?? null;
  }
  const plan = planMainReport({
    jobs,
    flaky,
    runUrl: env.RUN_URL ?? '',
    sha: env.COMMIT_SHA ?? '',
    commitTitle: env.COMMIT_TITLE ?? '',
    openIssue,
  });
  if (dryRun) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }
  if (plan.action === 'none') {
    process.stdout.write('Nothing to report.\n');
    return;
  }
  gh([
    'label',
    'create',
    'main-red',
    '--color',
    'B60205',
    '--description',
    'A run on main failed or found a flaky test',
    '--force',
  ]);
  if (plan.action === 'create')
    gh([
      'issue',
      'create',
      '--title',
      plan.title,
      '--body',
      plan.body,
      '--label',
      'main-red',
    ]);
  else gh(['issue', 'comment', String(plan.issue), '--body', plan.body]);
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url
)
  main();
