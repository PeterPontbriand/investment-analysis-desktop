import { describe, expect, it } from 'vitest';
import {
  collectFlaky,
  parseJobResults,
  planMainReport,
  type MainReportInput,
} from '../../tools/ci/main-status.ts';

const base: MainReportInput = {
  jobs: [
    { name: 'windows', result: 'success' },
    { name: 'macos', result: 'success' },
    { name: 'linux', result: 'success' },
    { name: 'web', result: 'skipped' },
  ],
  flaky: [],
  runUrl: 'https://github.com/o/r/actions/runs/1',
  sha: '1234567890abcdef',
  commitTitle: 'feat: add a thing (#1)',
  openIssue: null,
};

const failedMacos = [
  { name: 'windows', result: 'success' },
  { name: 'macos', result: 'failure' },
];

describe('planMainReport', () => {
  it('reports nothing when every job succeeded or was skipped and nothing is flaky', () => {
    expect(planMainReport(base)).toEqual({ action: 'none' });
  });

  it('creates an issue for a failed job when none is open', () => {
    const plan = planMainReport({ ...base, jobs: failedMacos });
    expect(plan).toMatchObject({ action: 'create', title: 'main is red' });
    if (plan.action !== 'create') throw new Error('expected create');
    expect(plan.body).toContain('1234567 feat: add a thing (#1)');
    expect(plan.body).toContain('https://github.com/o/r/actions/runs/1');
    expect(plan.body).toContain('- macos: failure');
    expect(plan.body).not.toContain('- windows');
  });

  it('comments on the open issue for a failed job', () => {
    const plan = planMainReport({ ...base, jobs: failedMacos, openIssue: 12 });
    expect(plan).toMatchObject({ action: 'comment', issue: 12 });
    if (plan.action !== 'comment') throw new Error('expected comment');
    expect(plan.body).toContain('- macos: failure');
  });

  it('counts a cancelled job as failed', () => {
    const plan = planMainReport({
      ...base,
      jobs: [{ name: 'linux', result: 'cancelled' }],
    });
    expect(plan).toMatchObject({ action: 'create', title: 'main is red' });
  });

  it('titles a flaky-only report and lists the tests', () => {
    const plan = planMainReport({
      ...base,
      flaky: ['shows a busy database (chromium, macos)'],
    });
    expect(plan).toMatchObject({
      action: 'create',
      title: 'Flaky tests on main',
    });
    if (plan.action !== 'create') throw new Error('expected create');
    expect(plan.body).toContain('- shows a busy database (chromium, macos)');
    expect(plan.body).toContain('Failed jobs:\n- none');
  });

  it('lists failed jobs and flaky tests together', () => {
    const plan = planMainReport({
      ...base,
      jobs: failedMacos,
      flaky: ['a test (webkit, linux)'],
      openIssue: 3,
    });
    expect(plan).toMatchObject({ action: 'comment', issue: 3 });
    if (plan.action !== 'comment') throw new Error('expected comment');
    expect(plan.body).toContain('- macos: failure');
    expect(plan.body).toContain('- a test (webkit, linux)');
  });
});

describe('collectFlaky', () => {
  it('finds flaky tests in nested suites only', () => {
    const report = {
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  title: 'flaky one',
                  tests: [
                    { projectName: 'webkit', status: 'flaky' },
                    { projectName: 'chromium', status: 'expected' },
                  ],
                },
                { title: 'failing', tests: [{ status: 'unexpected' }] },
              ],
            },
          ],
        },
      ],
    };
    expect(collectFlaky(report, 'macos')).toEqual([
      'flaky one (webkit, macos)',
    ]);
  });
});

describe('parseJobResults', () => {
  it('parses name=result pairs', () => {
    expect(
      parseJobResults('web=skipped, macos=failure\nlinux=success'),
    ).toEqual([
      { name: 'web', result: 'skipped' },
      { name: 'macos', result: 'failure' },
      { name: 'linux', result: 'success' },
    ]);
  });
});
