# Spec GUI.4c3a: fixed sidebar

- **Owning plan:** D379 in [Appendix A, GUI.4c](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started) of the GUI.4 slice plan, added by step 2.
- **Branch:** `feat/gui-4c3a-fixed-sidebar`, from `origin/main` once the import-rule test fix (issue 42) has merged, or the newer `origin/main` when the branch is made; the implementer reports which.
- **Decisions approved:** 2026-11-25.
- **Lane:** normal.

## Goal

The sidebar stays in place while any screen's content scrolls, so the main menu is always in reach. GUI.4 stays complete, and issue 50 closes.

## Decisions

- D379: the fixed sidebar. Its record is added to the GUI.4 slice plan in step 2.

## Out of scope

- The navigation trail and the breadcrumb bar (issue 51, decisions D380 to D384, a later unit).
- Any change to the sidebar's items, order, wording or look, to the content's padding or width, and any change to the shell for narrow windows beyond the sidebar scrolling by itself.
- Any Rust, Tauri or dependency change.
- Issues 37, 47 and 48 (flaky tests).

## Allowed files

- `docs/project/milestones/v0.1/gui-4/specs/gui-4c3a.md` (this spec; changed only by the spec author's corrections)
- `docs/project/milestones/v0.1/gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md` (the introduction of Appendix A, GUI.4c, and the one new row D379 only)
- `src/App.vue` (the sidebar's scoped styles only)
- `tests/browser/sidebar-fixed.spec.ts` (new)

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`: `git fetch origin`. Check with `git --no-pager log --oneline -5 origin/main` that the commit `fix(test): load the ESLint configuration once in the import-rule test (#42)` is on `origin/main`; if it is not, stop and tell the spec author. Then `git switch -c feat/gui-4c3a-fixed-sidebar origin/main`. This spec is in the working tree as an untracked file; commit it alone as `docs(spec): GUI.4c3a fixed sidebar spec`. Check: `pnpm docs:check` and `pnpm format:check`. The earlier local branch of the same name and the local branch `feat/gui-4c-sidebar-guide-trail` hold work to reuse: rename the old local branch first if the name is taken (`git branch -m feat/gui-4c3a-fixed-sidebar feat/gui-4c3a-fixed-sidebar-old`), and delete neither.

2. **Plan record.** In `docs/project/milestones/v0.1/gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md`, in Appendix A, GUI.4c, the introduction's clause "and D378 after the owner's look at GUI.4c1." becomes "D378 after the owner's look at GUI.4c1, and D379 after the owner's look at GUI.4c2." and one row is added directly after the D378 row, in the same two-column form:

    ```markdown
    | D379 | Found in the owner's look at GUI.4c2 (2026-11-25). The sidebar stays in place while the content scrolls, on every screen, at the window's full height; in a window too short for it, it scrolls by itself. Styles only. |
    ```

    No sequence-table row changes. Check: `pnpm docs:check` and `pnpm format:check`. Commit: `docs(plan): fixed sidebar decision (D379)`. The commit of the same content on the old local branch may be cherry-picked if its diff is exactly this.

3. **The sidebar's styles.** In `src/App.vue`, change the scoped `.sidebar` rule only, so that the sidebar is sticky at the top of the window, as tall as the window, and scrolls by itself when its content is taller than the window: `position: sticky`, `inset-block-start: 0`, `block-size: 100vh` (or the project's existing viewport-height convention), `overflow-y: auto` and `align-self: flex-start` so the flex row does not stretch it. Logical properties wherever the stylelint check requires them. Its border, width (`flex: 0 0 var(--sidebar-size)`), padding and everything else stay as they are, and `.shell` and `.content` do not change. The earlier local commit on the old branch has a working version of this; reuse it if it is exactly this. Check: `pnpm gate:slice`.

4. **The test.** New `tests/browser/sidebar-fixed.spec.ts`, Chromium and WebKit, left to right and right to left, using Saved runs (the fixtures list 50 runs) as the long screen and no fixture change: after scrolling the screen to its bottom the sidebar's first and last items are still inside the viewport; in a window too short for the sidebar (for example 300 pixels high) the sidebar itself scrolls (its scroll height exceeds its client height), the last item can be scrolled into view inside it, and the window's own scrolling does not move the sidebar. Expected text comes from the catalog, never literal English. Run the test once with the styles removed, to see it fail, then restore them. Check: `pnpm gate:slice`. Commit steps 3 and 4 together: `feat(shell): keep the sidebar in view on long screens (GUI.4c3a)`.

5. **Push and report.** `pnpm gate:slice` once more (foreground), `pnpm test:engine` (the engine checkout must be clean; note its branch, switch it to the vendored commit `6f5da703e1a2711439ea4db6357e1288bd67234a` for the run if the repository's engine instructions require it, and switch it back), then `git push -u origin feat/gui-4c3a-fixed-sidebar`. Report (see Report) and wait for the spec author's review. After a clean review the implementer opens the pull request with the PR text below through `gh pr create --base main --head feat/gui-4c3a-fixed-sidebar --title "..." --body-file ...` using the PR text's title and description; if the machine's permission check refuses it, report that and wait. Then watch CI and send the spec author the failing lines of any failed job.

## Norms and safeguards

- Escalate by the table in [`AGENTS.md`](../../../../../../AGENTS.md#escalation-in-a-spec-driven-unit).
- Styles use logical properties; no dependency changes; every user-facing string stays in the catalog; no AI or tool attribution anywhere.
- `pnpm gate:slice` after each step that changes code, tests or a file the gate reads, in the foreground; no full gate.

## Acceptance checks

1. `pnpm gate:slice` passes on the pushed commit.
2. `pnpm docs:check` and `pnpm format:check` pass.
3. `git --no-pager diff --stat origin/main...HEAD` lists only allowed files, and `git --no-pager diff origin/main...HEAD -- src/App.vue` shows only the `.sidebar` rule.
4. `tests/browser/sidebar-fixed.spec.ts` passes on Chromium and WebKit in both directions, and fails with the styles removed.
5. `pnpm test:engine` completes; its summary and every skipped test's reason go in the report.
6. In `pnpm sandbox`: scroll Saved runs or any long screen, and the menu stays in place; make the window short, and the menu scrolls by itself.

## Report

- The branch's commit hashes with their titles, and the `main` commit it started from.
- `git --no-pager diff --stat origin/main...HEAD`.
- The last `pnpm gate:slice` result: its summary lines.
- The result of each acceptance check, numbered as above.
- The `pnpm test:engine` summary, with each skipped test and its reason.
- Every escalation, with the table row that triggered it.
- Pilot measures: one value for each measure in the engine's spec workflow section 7, "not yet known" for those known only after the pull request.
- **Try it:** scroll any long screen and the menu stays in view; make the window short and the menu scrolls by itself. Command: `pnpm sandbox`.

## PR text

Title: `feat(shell): keep the sidebar in view on long screens (GUI.4c3a)`

Description:

```markdown
## Summary

Found in the owner's look at GUI.4c2 (D379 in the GUI.4 slice plan): long screens scrolled the main menu out of sight.

- The sidebar stays in place at the window's full height on every screen, and scrolls by itself in a window too short for it. Styles only.

## Tests

- Playwright, Chromium and WebKit, both text directions: the sidebar's first and last items stay in view after scrolling a long screen, and the sidebar scrolls by itself in a short window.

Closes #50
```

## Change log

- 2026-11-26, escalation 1 (step 5): the engine checkout was in use by another session, so the real-engine suite runs after the push and before the pull request opens; this change shows no engine data.
