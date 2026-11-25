# Spec fix-import-rule-timeout: stop the import-boundary test timing out

- **Owning plan:** none; a fast-lane change under the [spec workflow](../../../../SPEC_WORKFLOW.md), tracked by [issue 42](https://github.com/PeterPontbriand/investment-analysis-desktop/issues/42).
- **Branch:** `fix/import-rule-test-timeout`, from `origin/main` at `e140547`, or the newer `origin/main` when the branch is made; the implementer reports which.
- **Decisions approved:** none needed; a fast-lane change has no decision in it.
- **Lane:** fast.

## Goal

The Vitest test "rejects Tauri API imports in src and allows them in src/platform" no longer exceeds its 5 second limit on a cold start, on the owner's machine or in CI, without raising any limit and without weakening any check. Every slice check after it can pass again.

## Decisions

None. The change is a test's set-up, with no decision in it.

## Out of scope

- Raising, removing or overriding any timeout, global or per test other than the warm-up's own, and skipping, quarantining or retrying the test.
- Any other test file, the ESLint configuration, and the other flaky tests (issues 37, 47 and 48).
- Finding why parallel running doubles the cold load. This change keeps the cold load out of any test's own limit; the cause stays open in issue 42's thread.

## Allowed files

- `docs/project/milestones/v0.1/gui-4/specs/fix-import-rule-timeout.md` (this spec; changed only by the spec author's corrections)
- `tests/tools/import-rule.test.ts`

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`: `git fetch origin`, then `git switch -c fix/import-rule-test-timeout origin/main`. This spec is in the working tree as an untracked file; commit it alone as `docs(spec): import-rule test timeout fix spec`. Check: `pnpm docs:check` and `pnpm format:check`.

2. **One warmed ESLint instance.** In `tests/tools/import-rule.test.ts`, create the `ESLint` instance once for the whole file and warm it before any test runs: a module-level `const eslint = new ESLint();`, and a top-level `beforeAll` (imported from `vitest`) that lints an empty string for the file path `resolve('src/warm-up.ts')` with a 30 second limit as its second argument (`beforeAll(async () => { ... }, 30_000)`), under a comment saying that the first lint call loads the ESLint configuration, which is slow on a cold start, and that issue 42 is the record. Every test then uses that one instance: remove each `new ESLint()` in the file, including the one inside the `restricted` helper. Change nothing else: every assertion, source string and path stays as it is, and every test keeps the default 5 second limit. Check: `pnpm exec vitest run tests/tools/import-rule.test.ts`, then `pnpm gate:slice`. Commit: `fix(test): load the ESLint configuration once in the import-rule test (#42)`.

3. **Evidence.** Run the whole Vitest suite, `pnpm test`, five times in a row in the foreground. Record each run's result and the duration of the slowest test in `tests/tools/import-rule.test.ts` (`pnpm exec vitest run --reporter=verbose` shows durations; use it for at least one of the five runs). If any of the five runs fails on a test in this file, stop and escalate; do not raise a limit.

4. **Push and report.** `git push -u origin fix/import-rule-test-timeout`, then report (see Report) and wait for the spec author's review. After a clean review the implementer opens the pull request with the PR text below through `gh pr create --base main --head fix/import-rule-test-timeout --title "<the PR text's title>" --body-file <a file holding the description>`; if the machine's permission check refuses it, report that and wait.

## Norms and safeguards

- Escalate by the table in [`AGENTS.md`](../../../../../../AGENTS.md#escalation-in-a-spec-driven-unit).
- No limit is raised, no test is skipped or quarantined, and no assertion is weakened or removed.
- No dependency changes.
- No AI or tool attribution anywhere.

## Acceptance checks

1. `pnpm gate:slice` passes on the pushed commit.
2. Five consecutive runs of `pnpm test` pass.
3. `git --no-pager diff --stat origin/main...HEAD` lists only the two allowed files.
4. `git --no-pager diff origin/main...HEAD -- tests/tools/import-rule.test.ts` shows only the shared instance, the warm-up and its comment: no assertion, source string, path or timeout other than the warm-up's own differs.

## Report

- The commit hashes with their titles, and the `main` commit the branch started from.
- `git --no-pager diff --stat origin/main...HEAD`.
- The last `pnpm gate:slice` result: its summary lines.
- The result of each acceptance check, numbered as above, with the five runs' results and the duration of the slowest test in the file in the verbose run.
- Every escalation, with the table row that triggered it.
- Pilot measures: one value for each measure in the engine's spec workflow section 7, "not yet known" for those known only after the pull request.

## PR text

Title: `fix(test): load the ESLint configuration once in the import-rule test (#42)`

Description:

```markdown
## Summary

The import-boundary test "rejects Tauri API imports in src and allows them in src/platform" timed out at its 5 second limit on a cold start (issue 42). Its first lint call loads the ESLint configuration, which took 5 to 6 seconds while the whole suite runs in parallel, against about 2.4 seconds for the file alone.

The file now creates one ESLint instance and warms it in a `beforeAll` with its own 30 second limit, so no test pays the cold load. Every test keeps the default 5 second limit and every assertion is unchanged.

## Tests

- `pnpm test` five times in a row on the Windows machine where the test failed in three of three runs on unmodified `main`.

Closes #42
```

## Change log

None yet.
