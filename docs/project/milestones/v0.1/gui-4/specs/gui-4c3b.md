# Spec GUI.4c3b: one navigation trail for the whole application

- **Owning plan:** D380 to D384 in [Appendix A, GUI.4c](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started) of the GUI.4 slice plan, added by step 2. They amend D157, D173 and D369.
- **Branch:** `feat/gui-4c3b-navigation-trail`, from the newest `origin/main`; the implementer reports its commit.
- **Decisions approved:** 2026-11-25.
- **Lane:** normal.

## Goal

A reader who follows a link from one screen to another, for example from a saved run to a Help guide, always has a trail of the screens they came through, in one bar above the screen, and can return to the exact place they left. Issue 51 closes. The decision list is `gui-4c3-decision-list.md` (D380 to D384, approved); this spec restates what the unit builds.

## Decisions

- D380: one trail for the whole application; following an in-app link adds the screen being left as a crumb that links back to the exact location (route plus query); opening a screen already in the trail cuts the trail back to before it; a hash-only or filter change on the same screen changes nothing; with an empty trail a screen shows its structural parents as today; the trail is in memory only.
- D381: choosing a sidebar item starts the trail afresh; everything else keeps it (links in text, in the details panel and in guides, Getting started's links, the running-refresh marker, and the application's own screen changes after starting a refresh, creating or cancelling); deleting a watchlist cuts the trail back to before it.
- D382: each screen supplies a short crumb label (a stable name where the heading is one: a watchlist's name, a guide's title, a run's "TICKER — strategy"; a fixed catalog message elsewhere, for example "Refresh comparison", "Refresh progress", "Analyze a ticker"); a screen not yet loaded or failed has its fixed generic name; served parts of a label carry their own language (D370).
- D383: the trail is never shortened; each screen appears at most once; the bar wraps; if the bar would take more than a quarter of the window's height it stops being sticky and scrolls with the page; a crumb restores the location including Saved runs filters; not restored: the Analyze form's text, Saved runs rows past "Show more", the run's tab, the scroll position.
- D384: one sticky bar in `App.vue` above the screen, above the comparison's sticky columns and below the details panel and the preview; it stays when a screen fails to render; a heading a link scrolls to stays clear of it; after a crumb is used, focus moves to the screen's main heading; guides keep D369's focus rule.

## Out of scope

- Application-wide Back and Forward, a Back button, keeping the Analyze form's text, scroll restoration, and keeping a screen alive between visits.
- Any change to the sidebar, to any screen's content beyond its crumb, to the engine API or the vendored openapi, to Rust, Tauri or any dependency.
- Issues 37, 47 and 48 (flaky tests), and the engine's wording of failures.

## Allowed files

- `docs/project/milestones/v0.1/gui-4/specs/gui-4c3b.md` (this spec; changed only by the spec author's corrections)
- `docs/project/milestones/v0.1/gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md` (the introduction of Appendix A, GUI.4c, and the new rows D380 to D384 only)
- `src/App.vue` (the one bar, the sidebar click handling, the keyed RouterView, the focus move; not the sidebar's styles)
- `src/router.ts` (the navigation hook that keeps the trail)
- `src/composables/useTrail.ts` (new: the trail, the current screen's label and structural parents)
- `src/components/AppBreadcrumb.vue`, `src/components/crumbs.ts`
- `src/views/navigation.ts` (the crumb builders D157 and D173 described; replaced by what the trail needs)
- the thirteen screens in `src/views/*.vue` (each: its crumb label and structural parents, and the removal of its own breadcrumb element; nothing else)
- `src/components/RefreshMarker.vue` and `src/components/TermTrigger.vue` only if a link they hold needs a change to keep the trail (state which and why in the report)
- `src/locales/*.json` and the `src/i18n/` catalog files, only for the new crumb messages and the existing test-catalog conventions
- new tests: `tests/unit/trail.test.ts`, `tests/browser/navigation-trail.spec.ts`
- existing tests under `tests/unit/` and `tests/browser/`, only the expectations the trail changes (the report lists each file and why)

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`: `git fetch origin`, then `git switch -c feat/gui-4c3b-navigation-trail origin/main`. This spec is in the working tree as an untracked file; commit it alone as `docs(spec): GUI.4c3b navigation trail spec`. Check: `pnpm docs:check` and `pnpm format:check`. The earlier guides-only trail work is saved as `.tmp/reference/guide-trail.patch` (git-ignored): read it for the fixtures and the findings, reuse nothing that contradicts this spec.

2. **Plan record.** In Appendix A, GUI.4c of the slice plan, add one row per decision D380 to D384 after the D379 row, in the same two-column form, with the wording of the Decisions section above, and extend the introduction's sentence by "and D380 to D384 after the owner's look at GUI.4c2, which amend D157, D173 and D369". No sequence-table row changes. Check: `pnpm docs:check` and `pnpm format:check`. Commit: `docs(plan): navigation trail decisions (D380 to D384)`.

3. **The trail model.** In `src/composables/useTrail.ts`, with the pure rules in plain functions that the unit test exercises directly: the trail (a list of crumbs, each a label and the full location), the current screen's registration (its label and its structural parents), and one function that gives the next trail for a navigation, taking the trail, the screen being left (label and full location), the path being opened, and whether a sidebar item caused it. Rules: the screen is identified by its path without query or hash; the same path changes nothing; a sidebar-caused navigation empties the trail; a path already in the trail cuts the trail back to before it; any other navigation appends the screen being left. Crumbs hold the full location (path, query), not the path alone. The trail is module state in memory and is reset by nothing else. A screen registers with one call from its `script setup`, with a reactive label (fixed generic name until its data has loaded) and its structural parents. Test first: `tests/unit/trail.test.ts` covers each rule, including a revisit that cuts back, a same-path query change, and a sidebar start. Check: the new test, then `pnpm gate:slice`.

4. **The hook and the bar.** In `src/router.ts`, install a `beforeEach` hook that applies the rule of step 3 (the first navigation has nothing to leave). In `src/App.vue`, mark a navigation as sidebar-caused by a click handler on the sidebar's navigation links, which is the only thing that starts the trail afresh; render one `AppBreadcrumb` above the screen showing the trail when it has crumbs and the current screen's structural parents when it has none; key the RouterView by the route's path so a screen with a new parameter is rebuilt. `AppBreadcrumb.vue` and `crumbs.ts` change only as far as the one bar needs. Styles: the bar is sticky at the top of the content with a z-index above the comparison's sticky columns and below the details panel and the preview (read their z-index values in the code and name them in the report); it wraps; when its height exceeds a quarter of the window's height it is not sticky (measure it with a ResizeObserver or the equivalent the project already uses; add no dependency); headings a link scrolls to get a scroll margin equal to the bar's height through one CSS variable the bar sets. After a crumb is used, focus moves to the screen's main heading (give it `tabindex="-1"` if it lacks it); guides keep D369's rule, so the guide's own focus handling is not changed. Check: `pnpm gate:slice`.

5. **The screens.** Each of the thirteen screens registers its label and structural parents and drops its own `AppBreadcrumb` element and its crumb builder import; the parents each screen shows with an empty trail are what it shows today (Run detail's parents depend on where it was reached from, as D157 and D173 describe today: keep that behaviour for the empty-trail case). Labels per D382, from catalog messages, never literal English; served parts carry their `lang` as D370 requires; a label not yet loaded is the screen's fixed generic name. A screen that fails to render keeps the bar, because the bar lives in `App.vue`. The watchlist delete flow needs no code if navigating to Watchlists already cuts the trail back by the rule of step 3; prove it by a test, and add code only if it does not. Check: `pnpm gate:slice`.

6. **Browser tests.** New `tests/browser/navigation-trail.spec.ts`, Chromium and WebKit, left to right and right to left, on the existing fixtures, with expectations from the catalog: (a) from a saved run, following a term link to Help shows the run as a crumb, and using it returns to the run; (b) Saved runs filters survive the round trip; (c) a sidebar item starts the trail afresh; (d) revisiting a screen in the trail cuts the trail back; (e) the running-refresh marker keeps the trail; (f) deleting a watchlist cuts the trail back to before it; (g) a long trail wraps, never drops a crumb, and stops being sticky in a short window, while a short trail stays sticky after scrolling a long screen; (h) the bar stays when a screen fails to render; (i) the details panel and the preview are above the bar and the comparison's sticky column is below it; (j) after a crumb is used, focus is on the screen's main heading, and in a guide D369's rule still holds. Update existing tests only where the trail changes what they assert (the old per-screen breadcrumb elements are gone). Run the new file once with the hook disabled, to see it fail, then restore it. Check: `pnpm gate:slice`.

7. **Commit, push and report.** Commit steps 3 to 6 as logical commits (model and unit test; bar and hook; screens; browser tests), titles of the form `feat(shell): ... (GUI.4c3b)`. `pnpm gate:slice` once more (foreground), `pnpm test:engine` (the engine checkout must be clean; follow the repository's rule for the vendored commit and switch it back), then `git push -u origin feat/gui-4c3b-navigation-trail`. Report (see Report) and wait for the spec author's review. After a clean review, and when the project owner has typed the go-ahead for the pull request in the thread, open it with the PR text below through `gh pr create --base main --head feat/gui-4c3b-navigation-trail --title "..." --body-file ...`; if the machine's permission check refuses it, report that and wait. Then watch CI and send the spec author the failing lines of any failed job.

## Norms and safeguards

- Escalate by the table in [`AGENTS.md`](../../../../../../AGENTS.md#escalation-in-a-spec-driven-unit); a file outside the allowed files, or a behaviour this spec does not settle, is an escalation, never a choice made in code.
- Styles use logical properties; every user-facing string is in the catalog; no dependency changes; no AI or tool attribution anywhere.
- `pnpm gate:slice` after each step that changes code, tests or a file the gate reads, in the foreground; no full gate. Tests read what was recorded or rendered only after waiting for it (an `expect` that retries or `expect.poll`), never straight after an action.

## Acceptance checks

1. `pnpm gate:slice` passes on the pushed commit.
2. `pnpm docs:check` and `pnpm format:check` pass.
3. `git --no-pager diff --stat origin/main...HEAD` lists only allowed files; no `AppBreadcrumb` element remains in any screen.
4. `tests/unit/trail.test.ts` and `tests/browser/navigation-trail.spec.ts` pass, the browser file on both browsers and both directions, and it fails with the hook disabled.
5. `pnpm test:engine` completes; its summary and every skipped test's reason go in the report.
6. In `pnpm sandbox`: from a saved run follow a link to Help, and the run is in the trail and returns to its filters; a sidebar item clears the trail; with ten or more screens in the trail the bar wraps and nothing is dropped.

## Report

- The branch's commit hashes with their titles, and the `main` commit it started from.
- `git --no-pager diff --stat origin/main...HEAD`.
- The last `pnpm gate:slice` result: its summary lines.
- The result of each acceptance check, numbered as above.
- The z-index values found for the panel, the preview and the comparison's sticky columns, and the value given to the bar.
- Each existing test changed, with why.
- The `pnpm test:engine` summary, with each skipped test and its reason.
- Every escalation, with the table row that triggered it.
- Pilot measures: one value for each measure in the engine's spec workflow section 7, "not yet known" for those known only after the pull request.
- **Try it:** from a saved run follow a term link to Help; the run appears in the trail above, and using it brings you back to the same list and filters. Pick any item in the left menu and the trail clears. Command: `pnpm sandbox`.

## PR text

Title: `feat(shell): one navigation trail for the whole application (GUI.4c3b)`

Description:

```markdown
## Summary

Found in the owner's look at GUI.4c2 (D380 to D384 in the GUI.4 slice plan): following a link from a saved run to a Help page left no way back to the run.

- One trail for the whole application, in one bar above the screen: following a link adds the screen you leave, and a crumb returns you to the exact place, including Saved runs filters.
- Choosing an item in the left menu starts the trail afresh; revisiting a screen cuts the trail back to it; the trail is never shortened, it wraps, and it stops being sticky only if it would take more than a quarter of the window.
- After a crumb is used, focus moves to the screen's main heading.

## Tests

- Unit tests for the trail rules, and Playwright on Chromium and WebKit in both text directions for the journeys, the sticky bar and focus.

Closes #51
```

## Change log

- 2026-11-27, spec author's corrections after review: the test catalog `tests/fixtures/locales/ar-XB.json` is an allowed file, as part of the catalog conventions this spec names. Two accepted deviations: a sidebar navigation empties the trail even when it stays on the same path or names the screen already shown (D381 takes precedence over "the same path changes nothing"); and the bar's height reaches the page as `scroll-padding-block-start` on `html`, through one CSS variable set in a constructed stylesheet, instead of a scroll margin on each heading, which meets D384 and keeps the page free of inline style.
