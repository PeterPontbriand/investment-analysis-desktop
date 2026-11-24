# Spec GUI.4c1: venue help

- **Owning plan:** [GUI.4c1 in the GUI.4 slice plan](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c1--venue-help), decisions in [Appendix A, GUI.4c](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started).
- **Branch:** `feat/gui-4c1-venue-help`, from `origin/main` at `7f6e7c9` (or the newer `origin/main` when the branch is made, if `main` has moved; the implementer reports which).
- **Decisions approved:** 2026-11-24.
- **Lane:** normal.

## Goal

The application reads engine API.22's listing venues: a venue shows by its glossary name, with the provider's wording when it differs, and the venue and kind lines of the ticker details panel open their terms' help, with a Back step to the ticker's details. IAD issue #39 closes.

## Decisions

- D356: GUI.4c is split; this unit is GUI.4c1 and closes #39.
- D357: this unit records D356 to D377 in the slice plan (step 2).
- D358: the re-vendor is the first change after the spec and plan commits; `AGENTS.md`'s re-vendor rule says so (step 2).
- D359: re-vendor to `6f5da703e1a2711439ea4db6357e1288bd67234a`; only `openapi.json`, `SOURCE.md` and `src/api/schema.ts` change in `vendor/` and the generated types.
- D360: how a venue reads.
- D361: venue and kind triggers in the ticker details panel; the preview stays plain.
- D362: panel history with a Back button.
- D363: the tests.
- D376: `pnpm test:engine` summary and "Try it" in the report.
- D377: what stays out.

Each is recorded in [Appendix A, GUI.4c](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started) of the GUI.4 slice plan after step 2.

## Out of scope

- Everything of GUI.4c2 (D364 to D375): the term's full entry from `/v1/help/terms/{term_id}`, the group line, any Markdown rendering, links inside help text, external links, the Help screen, "Getting started", and the v0.1 implementation plan's GUI.4 scope and status. The term panel keeps showing the definition only (D320) in this unit.
- Any new dependency, any `pnpm-lock.yaml` or Cargo change, and any change under `src-tauri/`.
- Term triggers anywhere else inside the ticker details panel: the name, the currency and the "Checked"/"Identified" line stay plain text.
- The ticker preview's content beyond the venue text: it stays plain text with no triggers (D284).
- Venue text in the strategy documents' JSON tab or in the engine's own run text, which the application shows as served.
- Issues #42, #37, #34, #24, #25 and #4 (D377), and `docs/project/SMOKE_TESTING.md`.
- `docs/design/preview-mockups.html`.

## Allowed files

- `docs/project/milestones/v0.1/gui-4/specs/gui-4c1.md` (this spec; changed only by the spec author's corrections and by step 9's change-log line when the spec author sends one)
- `docs/project/milestones/v0.1/gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md` (step 2's patch, and the GUI.4c1 row's status in step 9)
- `docs/project/milestones/v0.1/IMPLEMENTATION_PLAN.md` (the GUI.4 section's Branch line only, in step 2's patch)
- `AGENTS.md` (the re-vendor rule only, in step 2's patch)
- `docs/project/SPEC_WORKFLOW.md` and `docs/project/SPEC_TEMPLATE.md` (the example spec path only, in step 2's patch)
- `vendor/ian/openapi.json`, `vendor/ian/SOURCE.md`, `src/api/schema.ts` (written by `pnpm vendor-ian` only)
- `src/api/tickerIdentities.ts`, `src/api/terms.ts` (only where the regenerated types require a change, or to add a venue-name lookup to `Terms` if step 4 needs one)
- `src/views/RunDetailView.vue` (only where the regenerated types require a change)
- `src/composables/tickerDetailLines.ts`
- `src/composables/useDetailsPanel.ts`
- `src/components/DetailsPanel.vue`, `src/components/TermTrigger.vue`, `src/components/TickerDetailLines.vue`, `src/components/TickerPreview.vue`
- `src/components/VenueName.vue` (new)
- `src/components/panelScope.ts` (new)
- `src/locales/en.json`, `tests/fixtures/locales/ar-XB.json`
- `tests/fixtures/api/` (every file in the folder, for the new types and the venue fixtures)
- `tests/browser/engine-mock.ts`, `tests/browser/ticker-details.spec.ts`
- `tests/browser/engine/real-engine.ts`, `tests/browser/engine/ticker-details.spec.ts`, `tests/browser/engine/term-popups.spec.ts` (only where the new types require a change)
- `tests/unit/ticker-detail-lines.test.ts`, `tests/unit/fixture-formats.test.ts`, `tests/unit/terms.test.ts`
- `tests/unit/details-panel.test.ts` (new)

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`: `git fetch origin`, then `git switch -c feat/gui-4c1-venue-help origin/main`. This spec is already in the working tree as an untracked file at `docs/project/milestones/v0.1/gui-4/specs/gui-4c1.md`; commit it alone: `git add docs/project/milestones/v0.1/gui-4/specs/gui-4c1.md`, `git commit -m "docs(spec): GUI.4c1 venue help spec"`. No check runs for this commit (its links resolve after step 2).

2. **Plan records (D357, D358).** Apply the spec author's patch: `git apply --check .tmp/specs/gui-4c1-records.patch`, then `git apply .tmp/specs/gui-4c1-records.patch`. It changes exactly `AGENTS.md`, `docs/project/SPEC_TEMPLATE.md`, `docs/project/SPEC_WORKFLOW.md`, `docs/project/milestones/v0.1/IMPLEMENTATION_PLAN.md` and `docs/project/milestones/v0.1/gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md`: the decision records D356 to D377, the GUI.4c1 and GUI.4c2 sections and rows (GUI.4c1 Next, GUI.4c2 Planned), the re-vendor rule's wording, the example spec path and the GUI.4 branch line. If `--check` fails, stop and escalate (row: the spec contradicts the code or a current document). Check: `pnpm docs:check` and `pnpm format:check`. Commit: `docs(plan): GUI.4c decisions D356 to D377`.

3. **Re-vendor (D359).** The engine checkout must contain commit `6f5da703e1a2711439ea4db6357e1288bd67234a` (run `git -C E:\Source\investment-analysis-engine fetch origin` first if `git -C E:\Source\investment-analysis-engine cat-file -e 6f5da703e1a2711439ea4db6357e1288bd67234a` fails). Run `pnpm vendor-ian 6f5da703e1a2711439ea4db6357e1288bd67234a`. Commit the three files it changes, and nothing else, as `chore(vendor): re-vendor engine API.22 (6f5da70)`. Then run `pnpm gate:slice` and note which type errors and test failures the new types cause; they are fixed in steps 4 and 5, not in this commit. If `vendor-ian` stops, or changes a file other than the three, stop and escalate.

4. **Venue text (D360).** In `src/composables/tickerDetailLines.ts`, `DetailLines.venue` becomes the API's part type (`ListingVenuePart`, from `src/api/schema.ts`, or `null`), filled from `profile.listing_venue` and `identity.listing_venue` as served. Add one pure function there, `venueText(part, name, wordingWithName)`, where `name` is the venue term's name or `null`, and `wordingWithName` formats the catalog message: it returns `part.provider_value` when `name` is `null`; `name` when `part.provider_value === name`; otherwise `wordingWithName(name, part.provider_value)`. `name` is `null` when `part.code` is `null`, when `/v1/help/references` maps no term for the code under the `ListingVenue` code set, or when the help index does not list that term. Add the catalog message `tickerDetails.venueWithWording`: `"{name} ({wording})"` to `en.json`, and its `ar-XB` entry to `tests/fixtures/locales/ar-XB.json` in that catalog's form. Add `src/components/VenueName.vue`: given a `ListingVenuePart` and a `plain` flag, it resolves the term through the existing `engine.terms` (the `ListingVenue` code set; `term()` already answers `termId: null` for a code it cannot map, and `entry()` answers `null` for a term the index does not list), shows `venueText(…)`, and, when not `plain`, wraps it in a `TermTrigger` whose term id is the code's term, or `listing-venue` when the name is `null` (D361). `TickerPreview.vue` shows the venue part through `VenueName` with `plain`; `previewParts` passes the part through instead of text. Update the fixtures and the mock engine so they type-check with the new schema: the instrument profile fixtures at `schema_version` 2 and the run overview at 4 with part-shaped venues; the references fixture gains the `ListingVenue` code set with every code the vendored description lists, each mapped to its `listing-venue-…` term id as the engine serves it at `6f5da70` (`nyse_group` → `listing-venue-nyse-group`, and so on); the help index fixture gains `listing-venue` and the venue terms used by the fixtures, with the names and definitions the engine serves at `6f5da70`. Fixtures that need a venue use `{ code: 'nasdaq', provider_value: 'NMS' }` (wording differs from the name), `{ code: 'nyse', provider_value: 'New York Stock Exchange' }` (wording equals the name), `{ code: null, provider_value: 'PNK' }` and one code the references do not map, `{ code: 'xetra', provider_value: 'XETRA' }`, typed with a cast only in that one fixture and commented as an open-vocabulary code. Add the Vitest cases of D363 for `venueText` to `tests/unit/ticker-detail-lines.test.ts`. Check: `pnpm gate:slice`. Commit: `feat(details): venue text from the listing venue part`.

5. **Kind and venue triggers in the panel (D361) and panel history (D362).** In `src/composables/useDetailsPanel.ts`, the open content keeps a history: a new `stepPanel(content)` pushes the current content and shows the new one; `backPanel()` restores the previous content; `closePanel()` clears the history and returns focus to the trigger of the first content in the history (the trigger outside the panel), as `closePanel` does today; `togglePanel()` and `openPanel()` from a trigger outside the panel clear the history first, as today. Export a computed `previousTitle` (the title Back returns to, or `null`). Add `src/components/panelScope.ts` with an injection key that `DetailsPanel.vue` provides to its body, so a `TermTrigger` inside the panel calls `stepPanel` instead of `togglePanel`; outside the panel nothing changes. In `DetailsPanel.vue`, when `previousTitle` is not `null`, a button above the heading reads `detailsPanel.back` (add `"back": "Back to {title}"` to `en.json` and its `ar-XB` entry), calls `backPanel()`; after a step and after Back, focus moves to the heading (the existing heading-focus watch keyed on the content's owner must also fire when the owner is the same as two steps ago, so key it on the serial number). Escape and × close the whole panel (D304 unchanged). In `TickerDetailLines.vue`, the venue line uses `VenueName` without `plain`, and the kind line's `TermName` drops `plain`, so both are triggers in the panel; the preview (`TickerPreview.vue`) keeps both plain. Add `tests/unit/details-panel.test.ts` with the D362 Vitest cases. Add the D363 Playwright cases to `tests/browser/ticker-details.spec.ts`. Check: `pnpm gate:slice`. Commit: `feat(details): venue and kind help in the ticker panel, with a back step`.

6. **Real-engine tests (D363).** In `tests/browser/engine/ticker-details.spec.ts` (and `real-engine.ts` if a helper is needed), the expected venue is computed from what the engine serves: the part from the profile or the run overview, the term id from `GET /v1/help/references` under `ListingVenue`, the term name from `GET /v1/help`, and the message from `en.json`, using the same rule as step 4; no exchange name or code is hard-coded. Add one test that opens a looked-up ticker's panel and, when the engine served a venue, checks the venue line's text and that activating it shows the venue term's name as the panel heading with a Back button; when the engine served no venue (the SEC EDGAR case without one), the test checks that the panel has no venue line and says so in its title. Check: `pnpm gate:slice`, then run the suite as in step 7. Commit: `test(engine): venue text and venue help against a real engine`.

7. **Real-engine run.** `pnpm test:engine` needs the engine checkout at the vendored commit. If `E:\Source\investment-analysis-engine` has uncommitted changes, stop and escalate. Otherwise note its current branch, run `git -C E:\Source\investment-analysis-engine switch --detach 6f5da703e1a2711439ea4db6357e1288bd67234a`, run `pnpm test:engine` to completion, and switch the engine checkout back to the noted branch whatever the result. Fix failures in the allowed files as the escalation table says.

8. **Push.** Run `pnpm gate:slice` once more, then `git push -u origin feat/gui-4c1-venue-help`. Report (see Report) and wait for the spec author's review. Fix review findings as told, then push again.

9. **Pull request.** After the spec author's clean review: change the GUI.4c1 row of the slice plan's sequence table to `Complete` with today's date and move GUI.4c2 to `Next` (keeping the table's order), run `pnpm docs:check`, commit as `docs(plan): GUI.4c1 complete`, push, and open the pull request with `gh pr create --base main --head feat/gui-4c1-venue-help --title "<the PR text's title>" --body-file <a file holding the PR text's description>`. Report the pull request's URL. Watch its CI; a failure goes back to the spec author with the job log's failing lines.

## Norms and safeguards

- Escalate by the table in [`AGENTS.md`](../../../../../../AGENTS.md#escalation-in-a-spec-driven-unit). Particular to this unit:
  - Any change to `pnpm-lock.yaml`, `package.json` or `src-tauri/` is an escalation: this unit adds no dependency.
  - If the regenerated types change anything besides the venue part and the schema versions named in D359 in a way that needs a screen change, stop and escalate (the spec author checks it against the engine's API.22 change list).
  - If a venue code in the vendored `ListingVenue` enum has no entry in the engine's references at `6f5da70`, stop and escalate.
- Every user-facing string is a catalog message in `en.json` and in the `ar-XB` test catalog; tests read expected text from the catalog, never literal English.
- The application derives nothing: the venue name, its term, the wording and the kind's name come from the engine (D360). No financial calculation.
- Styles use logical properties.
- No AI or tool attribution in commits, the branch name, the pull request or anywhere in the repository (`AGENTS.md`, GitHub changes).
- Run only `pnpm gate:slice` after a step; no full gate (D348).

## Acceptance checks

1. `pnpm gate:slice` passes on the pushed commit, and the Rust and Tauri steps show `SKIP` (no shell path changed).
2. `pnpm docs:check` and `pnpm format:check` pass.
3. `git --no-pager diff --stat origin/main...HEAD` lists only allowed files.
4. `git --no-pager log --oneline origin/main..HEAD` shows the spec commit first, the plan records second and the re-vendor third, and `vendor/ian/SOURCE.md` names `6f5da703e1a2711439ea4db6357e1288bd67234a`.
5. `pnpm test` runs the D363 Vitest cases, and they pass.
6. `pnpm test:browser` (the mocked Playwright suite, as the gate runs it) passes on Chromium and WebKit in both text directions, including the D363 cases.
7. `pnpm test:engine` completes, with its summary and every skipped test's reason in the report.
8. In `pnpm sandbox`, the `Sandbox` watchlist's ticker details panel shows its venue line (when the engine serves one) as a dotted-underlined term; clicking it shows the venue term with "Back to Details for <ticker>"; Back returns to the details with focus on its heading.

## Report

- The branch's commit hashes with their titles, and the `main` commit it started from.
- `git --no-pager diff --stat origin/main...HEAD`.
- The last `pnpm gate:slice` result: its summary lines from `gate-output.txt`.
- The result of each acceptance check, numbered as above.
- The `pnpm test:engine` summary, with each skipped test and its reason, and whether an SEC identity was set.
- Every escalation, with the table row that triggered it.
- Pilot measures: one value for each measure in the engine's spec workflow §7 (owner copies by hand, extra owner actions, unescalated out-of-scope changes, escalations, review rounds, spec-versus-build differences, defects found after merge, PR CI wall time, CI runs failed for unrelated reasons), with "not yet known" for those that are known only after the pull request.
- **Try it:** the venue now reads by its exchange's name (for example in a watchlist's ticker details panel), and the venue and the kind in the panel open their help with a Back button to the ticker. Command: `pnpm sandbox`.

## PR text

Title: `feat(details): venue help and engine API.22 re-vendor (GUI.4c1)`

Description:

```markdown
## Summary

GUI.4c1 of the GUI.4 slice plan: the application reads engine API.22's listing venues and explains them.

- Re-vendors the engine's API description to `6f5da703e1a2711439ea4db6357e1288bd67234a`, the merge commit of engine slice API.22 (D359). Only `vendor/ian/openapi.json`, `vendor/ian/SOURCE.md` and the generated `src/api/schema.ts` change: the application vendors no JSON Schema and no help bundle, because it bundles no explanation of the engine's (charter Appendix A.4), so issue #39's first bullet needs nothing more.
- A listing venue shows by its glossary term's name, followed by the provider's wording in parentheses when the two differ; a null or unknown code shows the provider's wording alone (D360).
- In the ticker details panel the venue and the kind open their terms' help; the panel gains a Back step to the ticker's details (D361, D362). The ticker preview stays plain text.
- Records the GUI.4c decisions D356 to D377 in the GUI.4 slice plan, and rewords the re-vendor rule in `AGENTS.md` for spec-driven branches (D357, D358).

## Tests

- Vitest: the venue text rule and the panel history (D363).
- Playwright with the mock engine, Chromium and WebKit, both text directions: the venue in the preview and the panel, the venue and kind triggers, Back, and focus on close.
- Real-engine suite (`pnpm test:engine`): the venue text and venue help compared with what the engine serves.

Closes #39
```

## Change log

None yet.
