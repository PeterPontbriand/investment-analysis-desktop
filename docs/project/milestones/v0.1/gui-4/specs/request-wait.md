# Spec request-wait: tests wait for a recorded request before reading it

- **Owning plan:** none; a fast-lane change under the [spec workflow](../../../../SPEC_WORKFLOW.md). It is the record of the flake seen once in CI on pull request 53 (`refresh-progress.spec.ts`, "starts from the comparison of a refresh that has a watchlist"); the owner asked for no separate flake issue.
- **Branch:** `fix/browser-tests-wait-for-requests`, from the newest `origin/main`; the implementer reports its commit.
- **Decisions approved:** none needed; a fast-lane change has no decision in it.
- **Lane:** fast.

## Goal

No browser test reads the engine mock's recorded requests straight after an action. Each waits until the request it expects has been recorded, so a slow runner cannot make the list read as empty.

## Decisions

None. The change is test set-up and waiting only.

## Out of scope

- Any change to application code, to the engine mock's behaviour, to a timeout, a retry count or a test's meaning, and skipping or quarantining any test.
- The other flaky tests (issues 37, 47 and 48).

## Allowed files

- `docs/project/milestones/v0.1/gui-4/specs/request-wait.md` (this spec; changed only by the spec author's corrections)
- `tests/browser/engine-mock.ts` (one new helper only)
- the browser spec files that read recorded requests (`engine.actions(...)`): at least `tests/browser/refresh-progress.spec.ts`, `watchlist-actions.spec.ts`, `ticker-details.spec.ts` and `watchlist-options.spec.ts`; any other `tests/browser/*.spec.ts` that the search in step 2 finds

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`: `git fetch origin`, then `git switch -c fix/browser-tests-wait-for-requests origin/main`. This spec is in the working tree as an untracked file; commit it alone as `docs(spec): request-wait spec`. Check: `pnpm docs:check` and `pnpm format:check`.

2. **Find every read.** Search literally (`engine.actions(`) in `tests/browser/` and list each call with its file and line, and for each whether an assertion or a wait on the page already guarantees the request was recorded before the read (for example it follows an `expect(...)` on text that appears only after the response). Reads that already follow such a wait stay as they are; say which in the report.

3. **The helper.** In `tests/browser/engine-mock.ts` add one helper that waits until the number of recorded requests for a method and path reaches an expected count (default one) and then returns them, built on Playwright's `expect.poll` with its default timeout; no new timeout value. Name and signature follow the file's existing style.

4. **Use it.** Replace each unguarded read found in step 2 by the helper, keeping every assertion exactly as it is. Reads that assert that a request was NOT made (a count of zero) are different: they cannot wait for an absence, so leave them and list them in the report with the reason each is safe (for example a later wait on the page that orders them after the action). Check: the changed spec files with `pnpm exec playwright test` followed by the changed spec files (repeat the run three times), then `pnpm gate:slice`. Commit: `fix(test): wait for a recorded request before reading it`.

5. **Push and report.** `git push -u origin fix/browser-tests-wait-for-requests`, then report (see Report) and wait for the spec author's review. After a clean review, and when the project owner has typed the go-ahead for the pull request in the thread, open it with the PR text below through `gh pr create --base main --head fix/browser-tests-wait-for-requests --title "..." --body-file ...`; if the machine's permission check refuses it, report that and wait. Then watch CI and send the spec author the failing lines of any failed job.

## Norms and safeguards

- Escalate by the table in [`AGENTS.md`](../../../../../../AGENTS.md#escalation-in-a-spec-driven-unit).
- No timeout is raised, no test is skipped or quarantined, no assertion is weakened or removed, no dependency changes, no AI or tool attribution anywhere.
- `pnpm gate:slice` once at the end of the code step, in the foreground; no full gate.

## Acceptance checks

1. `pnpm gate:slice` passes on the pushed commit.
2. `pnpm docs:check` and `pnpm format:check` pass.
3. `git --no-pager diff --stat origin/main...HEAD` lists only allowed files, and the diff changes no assertion's expected value.
4. The changed spec files pass three times in a row on Chromium and WebKit.
5. The report's list from step 2 accounts for every `engine.actions(` call in `tests/browser/`.

## Report

- The branch's commit hashes with their titles, and the `main` commit it started from.
- `git --no-pager diff --stat origin/main...HEAD`.
- The last `pnpm gate:slice` result: its summary lines.
- The step 2 list: each call, file and line, with "waited before" or "already guarded by" and the guard, or "absence check" and why it is safe.
- The result of each acceptance check, numbered as above.
- Every escalation, with the table row that triggered it.
- Pilot measures: one value for each measure in the engine's spec workflow section 7, "not yet known" for those known only after the pull request.

## PR text

Title: `fix(test): wait for a recorded request before reading it`

Description:

```markdown
## Summary

One browser test read the engine mock's recorded requests straight after a click and, on a slow runner, saw none (it failed once in CI on the sidebar pull request). The same read-after-action pattern was in other tests.

- One helper waits until the expected request is recorded and returns it; every unguarded read now uses it. No assertion, timeout or test meaning changes.

## Tests

- The changed browser spec files, three runs in a row on Chromium and WebKit.
```

## Change log

None yet.
