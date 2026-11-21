# GUI.4 — Help in place slice plan

## At a glance

- **What GUI.4 is:** explanations in place. Every ticker, term, label, status, acronym and code the application shows explains itself where it stands: a short preview on hover or keyboard focus, and a details panel on click. Ticker details come first (GUI.4a), then term popups (GUI.4b), then the help panel's full content (GUI.4c).
- **What GUI.4 is not:** the first-run screen or the installer (GUI.5), a language picker, a sector for a ticker (the engine does not serve one; engine decision I9), a check of a ticker before the engine analyzes it, or any financial calculation.
- **Rules:** [AGENTS.md](../../../../../AGENTS.md) and the [project charter](../../../CHARTER.md) govern the work. The decisions of the [GUI.3 slice plan](../gui-3/GUI_3_ACTIONS_AND_REFRESH_PROGRESS_SLICE_PLAN.md#appendix-a-2026-11-16-decision-record) and the [GUI.2 slice plan](../gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record) still apply unless a decision in [Appendix A](#appendix-a-2026-11-20-decision-record) amends one by number.
- **Needs from the engine:** the engine's API.6 (help endpoints), API.15 (instrument profiles) and API.16 (the ticker check on adding entries), all merged. GUI.4a vendors the engine at commit `965e279`.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.4a | [Ticker details](#gui4a--ticker-details) | Next | |
| GUI.4b | [Term popups](#gui4b--term-popups) | Planned | |
| GUI.4c | [Help panel content](#gui4c--help-panel-content) | Planned | |

## Sub-slices

### GUI.4a — Ticker details

- **Problem:** A ticker on a screen is only letters. A reader cannot tell what company it names, and a ticker reused by another company since a run was saved looks the same as before.
- **Decision:** Build the shared preview popup and details panel, and use them to give every ticker a preview and a details panel from the engine's instrument profiles (D279 to D299).
- **Scope:** the re-vendor to engine commit `965e279` and the "Add entries" warnings of API.16 (D282); the interaction model, the preview popup, the details panel and the ticker trigger (D283 to D287); where tickers get details and which identity each shows (D288 to D290); looking up a ticker with no stored profile, and older profiles (D291, D292); the run detail heading (D293); the profile cache (D294); the headings that name a ticker (D299); tests and smoke checks (D295, D296).
- **Branch:** `feat/gui-4a-ticker-details`, from main; its own pull request, which closes IAD issue #19.
- **Detail:** [GUI.4a detail](#gui4a-detail) in this plan.

### GUI.4b — Term popups

- **Problem:** Every element that shows an engine term keeps its term id and explains nothing yet.
- **Decision:** Give each of them the preview and the details panel of GUI.4a, with the term's definition from `/v1/help/terms/{term_id}`.
- **Scope:** the preview and the panel on every element that keeps a term id; the explicit control touch screens need where hover does not exist; the decision on the application's own labels, below.
- **Branch:** `feat/gui-4b-term-popups`, from main after GUI.4a merges; its own pull request.
- **Detail:** no slice plan exists; the sub-slice records its decisions in its own pull request.

### GUI.4c — Help panel content

- **Problem:** A short definition is not always enough, and a term links to other terms and to longer guides.
- **Decision:** Put the full entry, its linked terms and the guides from `/v1/help/documents/{id}` in the same details panel, with links that stay inside the application.
- **Scope:** the help content in the generic panel of GUI.4a; in-application links between terms and documents; optional further-reading links that may open externally.
- **Branch:** `feat/gui-4c-help-panel`, from main after GUI.4b merges; its own pull request.
- **Detail:** no slice plan exists; the sub-slice records its decisions in its own pull request.

### Decision to approve before GUI.4b

| Decision | Recommendation and trade-off |
| :--- | :--- |
| Whether the application's own labels that the comparison and run detail show with no term id ("Saved", "As of", "Saved by", "Warnings", "Limitations", "Not run", "Refresh comparison" and "Ad hoc entries") get help (D165 in the [GUI.2 slice plan](../gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record)). | Open; the project owner decides it before GUI.4b starts. The engine's glossary has an "As-of Date" term, for example, so some labels could take a term id. Help for the others would be the application's own text ("how to use this application", AGENTS.md), which needs its own catalog entries and would show in the same panel. Giving none of them help leaves the rule "every term explains itself" true only for engine content. |

## Interaction model

These decisions apply to tickers now and to terms in GUI.4b and GUI.4c. Their wording is in [Appendix A](#appendix-a-2026-11-20-decision-record).

| Part | Behaviour |
| :--- | :--- |
| Preview (D283, D284) | Hover or keyboard focus shows a short, read-only popup. It opens after about 500 ms of hover, or at once on keyboard focus, and stays open while the pointer is over the trigger or the popup. Escape, blur or the pointer leaving both close it. |
| Details panel (D283, D285) | Click, tap or Enter opens a non-modal panel on the inline-end side, with the content behind it still usable. One panel at a time; another trigger replaces its content. Focus moves to its heading; Escape or the × button closes it and returns focus to the trigger. |
| Trigger (D286) | A `<button type="button">` styled as text, with `aria-expanded` and `aria-controls`. Each trigger is a tab stop. |
| Positioning (D287) | `@floating-ui/dom` flips and shifts the popup at the window edges and mirrors it for right-to-left text. |

## Screen sketches

These are layouts to review, not final wording. Every name, venue, kind and currency in them is served by the engine; the application's own words are the lines marked *app*.

### Preview and details panel on the Watchlist screen (GUI.4a)

```text
#   Ticker   Strategy
1   ACME     Momentum          +-----------------------------------+
2   ACME     Graham Number     | Acme Corp                         |
3   BOLT     Momentum          | NASDAQ · Equity · USD             |
                               +-----------------------------------+
                                    preview: read-only, no controls

                                                  +---------------------------+
#   Ticker   Strategy                             | Details for ACME     [ × ] | <- heading, focused
1   ACME     Momentum                             | Acme Corp                 |
2   ACME     Graham Number                        | NASDAQ                    |
3   BOLT     Momentum                             | Equity                    |
                                                  | USD                       |
                                                  | Checked Nov 2, 2026, 9:41 |
                                                  | AM with Yahoo Finance     |
                                                  |             *app*         |
                                                  | [ Look up again ]         |
                                                  +---------------------------+
                                                   overlays the inline-end side
```

### A ticker with no stored profile (GUI.4a)

```text
preview:   No details stored for BOLT yet.                     *app*

panel:     Details for BOLT                              [ × ]
           No details stored for BOLT yet.                     *app*
           [ Look up ]            pending: [ Looking up… ]     *app*
```

## Scope limits

- Details come from the engine's instrument profiles and the run overview's identity snapshot only; the application derives nothing (D289, D290).
- A lookup happens only when the user asks for it, never on hover or focus (D291).
- No staleness rule: the application does not decide that a profile is too old (D292).
- No ticker details in form fields, dialogs, status messages or announcements (D288).
- No sector, no identifier shown for the issuer or the instrument (D290).
- No separate details route (D283).
- No change to the Refreshes table, which has no ticker column (D298).
- The only new dependency is `@floating-ui/dom` (D287). If a part of the work needs another, it stops and asks.
- No release build or bundle, as [AGENTS.md](../../../../../AGENTS.md) requires before GUI.5.
- [docs/design/preview-mockups.html](../../../../design/preview-mockups.html) is not edited.

## GUI.4a detail

### File scope

- `vendor/ian/` and `src/api/schema.ts`, re-vendored as the branch's first change (D282); `package.json` and `pnpm-lock.yaml` for `@floating-ui/dom` (D287).
- The adapter side under `src/api/`: the identity-source rule (D289), the profile and run-identity cache (D294) and its wiring in the engine object, and the follower's refresh-ended hook.
- The shared interaction parts: the preview popup and its trigger logic, the details panel and its state, and the ticker trigger and the ticker details content, under `src/components/` and `src/composables/`; `src/App.vue` mounts the panel.
- The screens that show tickers (D288): the watchlist, saved runs, run detail, refresh comparison and refresh progress screens, and the "Add entries" screen for the warnings (D282).
- Catalog entries in `src/locales/en.json` and the `ar-XB` test catalog (D295).
- Typed fixtures, the mock engine, Vitest and Playwright tests (D295); `docs/project/SMOKE_TESTING.md` (D296).
- This plan, the [GUI.3 slice plan](../gui-3/GUI_3_ACTIONS_AND_REFRESH_PROGRESS_SLICE_PLAN.md)'s GUI.3d row and the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md)'s GUI.3 and GUI.4 rows and GUI.4 section (D279, D280).
- Documents that describe the changed screens.

### How IAD issue #19's points were settled (D297)

Issue #19 needs no edit. Its "to decide" points were settled as follows.

| Point | Settled by |
| :--- | :--- |
| Popup or link | D283: a preview on hover or focus, the details panel on click; no separate route. |
| Which details | D290: name, listing venue, kind, quote currency and when and by which provider it was checked; a run shows the identity it kept. |
| Where the details come from | API.15's instrument profiles (the engine's `GET` and `POST .../lookup`), and D291 for a ticker with no stored profile. |
| Fit with GUI.4 | D283 to D286: tickers and terms share one interaction model, one preview popup and one panel. |
| Placement in the plan | D281: GUI.4a, before term popups. |
| Sector | Out of the engine's scope (engine decision I9). |

### Refreshes table

The Refreshes table has no ticker column, because the list document carries no tickers (D274), so GUI.4a does not change it (D298).

### Acceptance criteria

- A ticker in a watchlist entry, a saved runs row, a comparison row or a refresh progress row is a button. Hovering it for about half a second, or focusing it with the keyboard, shows a read-only preview; clicking it, tapping it or pressing Enter opens the details panel.
- The headings that name a ticker (run detail; the progress heading and its ended forms; the one-ticker comparison heading) make that ticker a button the same way. No ticker in a form field, dialog, status message or announcement does.
- The preview closes on Escape, blur or the pointer leaving both the ticker and the preview, and stays open while the pointer is over either. It mirrors for right-to-left text and stays inside the window.
- The panel is non-modal and overlays the inline-end side. One panel is open at a time; another ticker replaces its content. Opening it moves focus to its heading; Escape or × closes it and returns focus to the ticker.
- A ticker shown as part of a saved run shows that run's identity; a ticker in a comparison row shows its first saved run's, in the comparison's strategy order, or the current profile when the row has none; every other ticker shows the current profile (D289).
- Kind shows as the engine's term name with its term id kept. The preview and the panel never show the issuer identifier or the instrument identifier. A null field's line is omitted.
- A ticker with no stored profile says so. "Look up" asks the engine only when the user chooses it, also while a refresh runs; a failure shows in the panel. A current profile offers "Look up again".
- The run detail heading shows the company name from the run overview even when the full document cannot be read.
- The one-ticker comparison heading reads "<name> (<ticker>)", or the ticker alone when no run kept a name.
- "Add entries" shows a status line for each warning the engine answers with, naming the ticker and the warning code's term name, and reads the watchlist from the entries-added document.
- Every failure status the vendored description documents is read as a failure document.
- The pull request closes issue #19 and records the targeted run D296 names.
- `pnpm gate` passes on Windows, macOS and Linux.

## Background

GUI.3 finished on 2026-11-20 with every action screen in place. Two engine slices merged since: API.15 serves a ticker's instrument profile (`GET /v1/instrument-profiles/{ticker}` from storage, and a lookup that resolves it), and API.16 answers adding entries with a document that carries a warning for each ticker no data provider confirms, and gives each failure a status that matches its cause (a provider failure no longer answers 500).

A run keeps the identity its company had when it ran. A ticker can later name another company, so a ticker tied to a saved run must show that run's identity, never the ticker's current profile (engine decision I8; D289).

## Appendix A: 2026-11-20 decision record

Approved by the project owner on 2026-11-20. The numbering continues [Appendix A of the GUI.3 slice plan](../gui-3/GUI_3_ACTIONS_AND_REFRESH_PROGRESS_SLICE_PLAN.md#appendix-a-2026-11-16-decision-record), D180 to D278. Later sub-slices record their decisions in their own pull requests.

### Plan and engine

| # | Decision |
| :--- | :--- |
| D279 | Plan. This plan holds the sub-slice table (D281), the GUI.4-wide interaction decisions (D283 to D286), GUI.4a's detail with file scope and acceptance criteria, and this appendix. Later sub-slices record their decisions in their own pull requests. In the v0.1 implementation plan, the GUI.4 section names engine prerequisites API.15 and API.16 (both merged), adds headings to the ticker-details scope, and links this plan as its Detail, replacing "no slice plan yet". |
| D280 | Missed GUI.3 status updates (D278 was not applied on main). In the first commit: the GUI.3 slice plan's GUI.3d row becomes Complete, 2026-11-20; in the implementation plan GUI.3 becomes Complete, 2026-11-20, and GUI.4 Next. GUI.4a's own row is Next; it becomes Complete with the date the pull request is opened. |
| D281 | Sub-slices. GUI.4a: ticker details, building the shared preview popup and details panel. GUI.4b: term popups on every element that keeps a term id. GUI.4c: help panel content (the full entry, linked terms, guides from `/v1/help/documents/{id}`). The D165 question (help for the application's own labels) is recorded as an open decision to settle before GUI.4b. |
| D282 | Re-vendor and API.16. The branch's first commit is `pnpm vendor-ian 965e279` with a decision row naming the commit. "Add entries" reads the watchlist from `EntriesAddedDocument.watchlist`. Each warning shows as a status line naming the ticker and the warning code's term name (through the existing term-name element, term id kept). The D262 fixture and test gain every new `FailureReasonCode` and warning code, filled from the engine at 965e279. Check that the adapter treats every failure status the vendored description now documents as a failure document; stop if one is not covered. |

### Interaction model

| # | Decision |
| :--- | :--- |
| D283 | Interaction model, for tickers now and for terms in GUI.4b and GUI.4c. Hover or keyboard focus shows a short, read-only preview. Click, tap or Enter opens the details panel. No separate details route. |
| D284 | Preview popup. `role="tooltip"`, linked by `aria-describedby` while open, no controls inside. Opens after about 500 ms of hover, or at once on keyboard focus (`:focus-visible`), not on focus from a mouse click. Stays open while the pointer is over the trigger or the popup. Closes on Escape, blur or the pointer leaving both (WCAG 1.4.13). Placement mirrors for right-to-left text. |
| D285 | Details panel. Non-modal, overlaying the inline-end side so wide tables do not reflow, with the content behind it still usable. One at a time: another trigger replaces its content. Opening it moves focus to its heading. Escape or the × button closes it and returns focus to the trigger. Build it generically, because GUI.4c puts help content in the same panel. |
| D286 | Trigger. A ticker becomes a `<button type="button">` styled as text, with `aria-expanded` and `aria-controls` for the panel. Each ticker is a tab stop; accepted. |
| D287 | Positioning. Add `@floating-ui/dom` (current release, within the repository's pnpm release-age rules) for flipping and shifting at the window edges and right-to-left placement. No CSS anchor positioning. |

### Ticker details

| # | Decision |
| :--- | :--- |
| D288 | Where tickers get details. Ticker cells in Watchlist entries, Saved runs, the comparison rows and the refresh progress rows. The headings that name a ticker: run detail; the progress heading and its ended forms ("Refreshing ACME", "Refresh of ACME finished/stopped/failed"); the one-ticker comparison heading. Not in form fields, dialogs, status messages or announcements. The pull request closes issue #19. |
| D289 | Which identity (engine decision I8). A ticker shown as part of a saved run shows that run's identity: Saved runs rows and run detail, from the run overview's `security_identity`. A comparison row uses its first saved run in the comparison's strategy order, and the current profile when the row has no saved run. Everywhere else (watchlist entries, the progress screen and its headings) shows the current profile. The rule is in one module, named for what it does. |
| D290 | Fields. Current profile: name; listing venue; kind as its term name (resolved through the term references, term id kept); quote currency; "Checked <date and time> with <provider name>", the provider name from `/v1/info`'s providers (the existing engine-information cache). Run identity: name; listing venue; "Identified for this run <date> with <provider name>". Never shown: `issuer_identifier`, `instrument_identifier`. A null field's line is omitted. The preview shows the name, then the venue, kind and currency joined by " · ". |
| D291 | No stored profile. On 404 `instrument_profile_not_found` the preview says "No details stored for ACME yet." and the panel offers "Look up" (primary style, pending text "Looking up…" per D218). A lookup only ever happens when the user asks, never on hover or focus. It is allowed while a refresh runs. A failure shows in the panel through the existing catalog messages for its code (`ActionFailure`). Run identities have no lookup. |
| D292 | Older profiles. The checked date always shows, and the panel always offers "Look up again" for a current profile. No staleness rule in the application. |
| D293 | Run detail heading. The company name comes from the overview's `security_identity` instead of the full document, so it shows even when the full document cannot be read. The ticker in the heading gets details per D289. |
| D294 | Cache. Current profiles are cached per ticker for the session. A lookup replaces the cached entry. The whole profile cache is cleared when the refresh follower sees a refresh end and after entries are added. Run identities are cached per run id. A failed request is not cached. |

### Tests, smoke test and documents

| # | Decision |
| :--- | :--- |
| D295 | Tests. Vitest: the D289 identity-source rule (including the comparison fallback) and the D294 cache rules. Playwright, Chromium and WebKit, both text directions: preview on hover (with the delay) and on keyboard focus, Escape and pointer-leave dismissal, hovering the popup keeps it open; panel open and close with focus moving and returning; tap with touch emulation opens the panel; Look up from a 404, including while a refresh runs; a lookup failure shown in the panel; a fixture where a run's identity differs from the current profile (a reused ticker), checked on Saved runs, the comparison and run detail; the D299 heading forms; the D282 warnings in "Add entries". Every fixture typed from the generated schema types; the mock engine serves the new endpoints. |
| D296 | Smoke tests. `docs/project/SMOKE_TESTING.md` gains group T, "Ticker details", with its letter in the document's list of groups: T1 preview and panel on a watchlist entry; T2 Look up for a ticker with no stored profile; T3 a Saved runs row shows the run's identity. Group W gains W18: adding a mistyped ticker shows the not-recognized warning. If `pnpm smoke`'s setup cannot produce a ticker with no stored profile for T2 without changing its setup steps, stop and report the options. Targeted run: `pnpm smoke --checks T1-T3,W18`, Windows only. Under D170, give the owner the exact command and the pull request description first. |
| D297 | Issue #19 needs no edit. This plan records how each of its "to decide" points was settled: popup or link (D283), the details (D290), the source (API.15, D291), fit with GUI.4 (D283 to D286), placement in the plan (D281). Sector is out of the engine's scope (engine decision I9). |
| D298 | Refreshes table. No change: it has no ticker column, because the list document carries no tickers (D274). This plan says so. |
| D299 | Names in headings. Run detail keeps "<name> (<ticker>) — <strategy>". The one-ticker comparison heading becomes "<name> (<ticker>)", the name from the row's first saved run (D289), and the ticker alone when no run kept a name. The progress heading and its ended forms stay ticker only, because they are live and announced. Amends D274's comparison heading. |
| D300 | Provider failures show the engine's message. Amends D291's "existing catalog messages". `provider_no_data`, `provider_unreachable`, `provider_rate_limited` and `provider_unexpected_response` join the codes whose reason message is shown as served, in the response's language. Checked in the engine at `965e279`: only the instrument profile lookup documents these codes (404, 429 and 502), and it serves one message per kind, worded for a person and naming the provider by its display name, such as "Unable to look up ZZZZQ: Yahoo Finance returned no data for it." The analysis and refresh messages for the same codes name the raw provider identifier, but they reach the application inside job and analysis documents, never as a failed request. `provider_error` is not added: no endpoint serves it as a failed request, and its only message in the engine is for an unclassified failure inside an analysis. |
| D301 | The panel closes on a route change, without returning focus, because the trigger it would return to is no longer on screen. This was a choice made in GUI.4a that D283 does not state. |
