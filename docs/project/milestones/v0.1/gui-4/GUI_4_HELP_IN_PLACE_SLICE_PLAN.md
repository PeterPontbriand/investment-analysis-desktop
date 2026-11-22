# GUI.4 — Help in place slice plan

## At a glance

- **What GUI.4 is:** explanations in place. Every ticker, term, label, status, acronym and code the application shows explains itself where it stands: a short preview on hover or keyboard focus, and a details panel on click. Ticker details come first (GUI.4a), then term popups (GUI.4b), then the help panel's full content (GUI.4c).
- **What GUI.4 is not:** the first-run screen or the installer (GUI.5), a language picker, a sector for a ticker (the engine does not serve one; engine decision I9), a check of a ticker before the engine analyzes it, or any financial calculation.
- **Rules:** [AGENTS.md](../../../../../AGENTS.md) and the [project charter](../../../CHARTER.md) govern the work. The decisions of the [GUI.3 slice plan](../gui-3/GUI_3_ACTIONS_AND_REFRESH_PROGRESS_SLICE_PLAN.md#appendix-a-2026-11-16-decision-record) and the [GUI.2 slice plan](../gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record) still apply unless a decision in [Appendix A](#appendix-a-2026-11-20-decision-record) amends one by number.
- **Needs from the engine:** the engine's API.6 (help endpoints), API.15 (instrument profiles) and API.16 (the ticker check on adding entries), all merged. GUI.4a vendors the engine at commit `965e279`.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.4a | [Ticker details](#gui4a--ticker-details) | Complete | 2026-11-21 |
| GUI.4b | [Term popups](#gui4b--term-popups) | Next | |
| GUI.4c | [Help panel content](#gui4c--help-panel-content) | Planned | |

## Sub-slices

### GUI.4a — Ticker details

- **Problem:** A ticker on a screen is only letters. A reader cannot tell what company it names, and a ticker reused by another company since a run was saved looks the same as before.
- **Decision:** Build the shared preview popup and details panel, and use them to give every ticker a preview and a details panel from the engine's instrument profiles (D279 to D299).
- **Scope:** the re-vendor to engine commit `965e279` and the "Add entries" warnings of API.16 (D282); the interaction model, the preview popup, the details panel and the ticker trigger (D283 to D287); where tickers get details and which identity each shows (D288 to D290); looking up a ticker with no stored profile, and older profiles (D291, D292); the run detail heading (D293); the profile cache (D294); the headings that name a ticker (D299); tests, the real-engine tests and the owner's look (D295, D308 to D312).
- **Branch:** `feat/gui-4a-ticker-details`, from main; its own pull request, which closes IAD issue #19.
- **Detail:** [GUI.4a detail](#gui4a-detail) in this plan.

### GUI.4b — Term popups

- **Problem:** Every element that shows an engine term keeps its term id and explains nothing yet.
- **Decision:** Give each of them the preview and the details panel of GUI.4a, with the term's definition from the cached `/v1/help` index (D320). The single-term request `/v1/help/terms/{term_id}` and the full entry come in GUI.4c.
- **Scope:** the preview and the panel on every element that keeps a term id (D315); the small help button for form controls (D316); the application's own labels (D314); the re-vendor and the separate messages for request-time database failures (D313, D325 to D327).
- **Branch:** `feat/gui-4b-term-popups`, from main after GUI.4a merges; its own pull request, which closes IAD issue #31.
- **Detail:** [GUI.4b decisions](#gui4b-term-popups) in Appendix A of this plan.

### GUI.4c — Help panel content

- **Problem:** A short definition is not always enough, and a term links to other terms and to longer guides.
- **Decision:** Put the full entry, its linked terms and the guides from `/v1/help/documents/{id}` in the same details panel, with links that stay inside the application.
- **Scope:** the help content in the generic panel of GUI.4a; in-application links between terms and documents; optional further-reading links that may open externally.
- **Branch:** `feat/gui-4c-help-panel`, from main after GUI.4b merges; its own pull request.
- **Detail:** no slice plan exists; the sub-slice records its decisions in its own pull request.

### Application labels and help (settled)

The question left open by D281, whether the application's own labels get help (D165 in the [GUI.2 slice plan](../gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record)), is settled by D314.

## Interaction model

These decisions apply to tickers now and to terms in GUI.4b and GUI.4c. Their wording is in [Appendix A](#appendix-a-2026-11-20-decision-record).

| Part | Behaviour |
| :--- | :--- |
| Preview (D283, D284) | Hover or keyboard focus shows a short, read-only popup. It opens after about 500 ms of hover, or at once on keyboard focus, and stays open while the pointer is over the trigger or the popup. Escape, blur or the pointer leaving both close it. |
| Details panel (D283, D285) | Click, tap or Enter opens a non-modal panel on the inline-end side, with the content behind it still usable. One panel at a time; another trigger replaces its content. Focus moves to its heading; Escape (wherever focus is, unless a modal dialog is open) or the × button closes it and returns focus to the trigger (D304). |
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
- Typed fixtures, the mock engine, Vitest and Playwright tests (D295); the real-engine suite `tests/browser/engine/` with `playwright.engine.config.ts` and the `test:engine` script (D308); the `pnpm sandbox` tool under `tools/sandbox/`, which replaces `tools/smoke/`, and the engine-finding code it shares with `pnpm vendor-ian`, moved to `tools/engine/` (D311); `AGENTS.md`, and the note at the top of `docs/project/SMOKE_TESTING.md` (D307, D310).
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
- The panel is non-modal and overlays the inline-end side. One panel is open at a time; another ticker replaces its content. Opening it moves focus to its heading; Escape, wherever focus is and unless a modal dialog is open, or × closes it and returns focus to the ticker; an open preview takes the first Escape (D304).
- A ticker shown as part of a saved run shows that run's identity; a ticker in a comparison row shows its first saved run's, in the comparison's strategy order, or the current profile when the row has none; every other ticker shows the current profile (D289).
- Kind shows as the engine's term name with its term id kept. The preview and the panel never show the issuer identifier or the instrument identifier. A null field's line is omitted.
- A ticker with no stored profile says so. "Look up" asks the engine only when the user chooses it, also while a refresh runs; a failure shows in the panel. A stored profile offers no lookup (D303).
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
| D281 | Sub-slices. GUI.4a: ticker details, building the shared preview popup and details panel. GUI.4b: term popups on every element that keeps a term id. GUI.4c: help panel content (the full entry, linked terms, guides from `/v1/help/documents/{id}`). The D165 question (help for the application's own labels) was recorded as an open decision; D314 settles it. |
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

### Tests, the real-engine suite and documents

| # | Decision |
| :--- | :--- |
| D295 | Tests. Vitest: the D289 identity-source rule (including the comparison fallback) and the D294 cache rules. Playwright, Chromium and WebKit, both text directions: preview on hover (with the delay) and on keyboard focus, Escape and pointer-leave dismissal, hovering the popup keeps it open; panel open and close with focus moving and returning; tap with touch emulation opens the panel; Look up from a 404, including while a refresh runs; a lookup failure shown in the panel; a fixture where a run's identity differs from the current profile (a reused ticker), checked on Saved runs, the comparison and run detail; the D299 heading forms; the D282 warnings in "Add entries". Every fixture typed from the generated schema types; the mock engine serves the new endpoints. |
| D296 | Smoke tests. `docs/project/SMOKE_TESTING.md` gains group T, "Ticker details", with its letter in the document's list of groups: T1 preview and panel on a watchlist entry; T2 Look up for a ticker with no stored profile; T3 a Saved runs row shows the run's identity. Group W gains W18: adding a mistyped ticker shows the not-recognized warning. If `pnpm smoke`'s setup cannot produce a ticker with no stored profile for T2 without changing its setup steps, stop and report the options. Targeted run: `pnpm smoke --checks T1-T3,W18`, Windows only. Under D170, give the owner the exact command and the pull request description first. |
| D297 | Issue #19 needs no edit. This plan records how each of its "to decide" points was settled: popup or link (D283), the details (D290), the source (API.15, D291), fit with GUI.4 (D283 to D286), placement in the plan (D281). Sector is out of the engine's scope (engine decision I9). |
| D298 | Refreshes table. No change: it has no ticker column, because the list document carries no tickers (D274). This plan says so. |
| D299 | Names in headings. Run detail keeps "<name> (<ticker>) — <strategy>". The one-ticker comparison heading becomes "<name> (<ticker>)", the name from the row's first saved run (D289), and the ticker alone when no run kept a name. The progress heading and its ended forms stay ticker only, because they are live and announced. Amends D274's comparison heading. |
| D300 | Provider failures show the engine's message. Amends D291's "existing catalog messages". `provider_no_data`, `provider_unreachable`, `provider_rate_limited` and `provider_unexpected_response` join the codes whose reason message is shown as served, in the response's language. Checked in the engine at `965e279`: only the instrument profile lookup documents these codes (404, 429 and 502), and it serves one message per kind, worded for a person and naming the provider by its display name, such as "Unable to look up ZZZZQ: Yahoo Finance returned no data for it." The analysis and refresh messages for the same codes name the raw provider identifier, but they reach the application inside job and analysis documents, never as a failed request. `provider_error` is not added: no endpoint serves it as a failed request, and its only message in the engine is for an unclassified failure inside an analysis. |
| D301 | The panel closes on a route change, without returning focus, because the trigger it would return to is no longer on screen. This was a choice made in GUI.4a that D283 does not state. |
| D302 | Smoke data for targeted runs. A targeted command also names every earlier check whose data its checks use, and the checks are done in the order of docs/project/SMOKE_TESTING.md. GUI.4a's command is `pnpm smoke --checks W14,W18,T1-T3`: W14 creates `Smoke Test Add`, which W18 and T2 use. Full-run order is unchanged. Rejected: check text that depends on which checks ran; a fourth watchlist created by setup, which would change W1's and Step 9's counts. `pnpm smoke` runs no check, so it runs no prerequisite either; the order named in `--checks` changes only the label in the record, which lists the checks in the document's order. |
| D303 | Amends D292. "Look up again" is removed. "Look up" is offered only when no profile is stored (D291). A stored profile shows its checked date and no lookup button. The catalog message and the tests that only served "Look up again" are removed. |
| D304 | Amends D285. Escape closes the panel wherever focus is, unless a modal dialog is open; the dialog then closes and the panel stays. While a preview popup is open, Escape closes the popup first and leaves the panel open. Focus returns to the trigger when it is still on screen. Before the change, a Playwright test confirmed that the panel ignored Escape after a click in the table behind it, in both engines. |
| D305 | Smoke checks are confirmed before a slice is handed over. The expected text of each new or changed smoke check is confirmed against a real engine at the vendored commit, on a throwaway database, with the commands and their output in the slice report. AGENTS.md gains the rule. GUI.4a applied it to T1, T2, T3 and W18: with an SEC identity the engine serves no listing venue and names SEC EDGAR as the provider, so T1 and T3 name the provider the engine prints and the exchange only when it prints one. |
| D306 | A listing venue shows whenever the engine serves one (D290). Profiles identified by SEC EDGAR have none today; that is an engine gap, tracked by [engine issue 282](https://github.com/PeterPontbriand/investment-analysis-engine/issues/282) and outside GUI.4a. A Playwright fixture of an SEC EDGAR profile with no venue shows the name, then the kind and the currency in the preview, no venue line in the panel, and a checked line naming SEC EDGAR. |
| D307 | Per-pull-request manual smoke runs are retired (approved 2026-11-21). A pull request no longer records or waits for a manual run. Supersedes the standing smoke-test rule and D113 to D115, D169, D170 (with its amendment 61ee04f), D296 and D302; D305 stands only in the form D308 gives it. AGENTS.md loses every rule about manual runs, smoke records, the record marker, `pnpm smoke --checks` and keeping `docs/project/SMOKE_TESTING.md` up to date per pull request, and gains the rules of D308, D309 and D311. The smoke checks T1 to T3 and W18 that GUI.4a wrote are covered by the real-engine tests of D308. |
| D308 | A real-engine browser suite (approved 2026-11-21). Playwright tests run the application's browser-test build against a real `ian serve` at the vendored commit, on a new throwaway database under `.tmp/engine-tests/` for each run, with real data providers. Its own script, `pnpm test:engine`, and its own configuration, `playwright.engine.config.ts`; it is not part of `pnpm gate` or CI, because it needs the network and the engine installed, and no scheduled CI run is planned. It finds `ian` as `pnpm sandbox` does (`IAD_IAN_PATH`, then `PATH`, then `uv tool dir --bin`), checks that the engine is at the commit in `vendor/ian/SOURCE.md`, stops with a clear message if it is not, and never switches the engine checkout. Each worker starts its own engine and creates its data through the engine's CLI and API, never in the contributor's database. Expected values come from the engine wherever they depend on provider data (what the application shows is compared with what the engine serves for the same thing); no company name, exchange or provider name is hard-coded; values the engine defines, such as a warning's term name and a failure message's template, may be asserted. Each test passes with and without an SEC identity: without one the engine answers a lookup and stores nothing (its API document, "Instrument profiles"), so the first test follows the lookup in that case. It runs on Chromium and WebKit, and skips a test with its reason when the machine cannot reach the providers. AGENTS.md gains the rule: before a screen-changing slice is handed over the agent runs `pnpm test:engine` and reports its summary, and a slice that changes what a screen shows from engine data adds or updates its real-engine tests in the same slice. First tests, covering what T1 to T3 and W18 checked: the preview and panel of a watchlist entry's ticker with Escape after a click behind the panel and the keyboard close; adding the mistyped ticker `ZZZZQ`, shown as `ZZZZQ: Ticker Not Recognized` under `Added 1 entry.`; that ticker's preview and the lookup's served message, with no profile stored afterwards; and a Saved runs row's kept identity and the run title. |
| D309 | The owner's look (approved 2026-11-21). A screen-changing slice's report ends with a section "Try it": a few lines on what changed and where to see it, and the one command, `pnpm sandbox` (D311). The owner uses the application unscripted and reports anything that bothers him. There is no record, no check id and no pass or fail. AGENTS.md gains the rule. |
| D310 | `docs/project/SMOKE_TESTING.md` is no longer maintained per pull request (approved 2026-11-21). It gains one note at its top saying so, naming D310 and saying that its future is decided in GUI.6, and is otherwise unchanged and not deleted. The GUI.6 section of the implementation plan gains the open decision: what becomes of it. The expected answer is a short checklist for the installed application (the installer, the first start, the engine found, and the macOS quit check of issue 24), run once per release, but GUI.6 decides. |
| D311 | `pnpm smoke` becomes `pnpm sandbox` (approved 2026-11-21). It keeps the engine discovery, the vendored-commit check with the engine-checkout switch and its restore, the stop handling, and the setup that creates the throwaway database with its sample data (now named `Sandbox`, `Sandbox Empty` and `Sandbox Scratch`, in `.tmp/sandbox/<time>/sandbox.sqlite3`) and starts the application against it. It drops the record (`SMOKE_RECORD.md`), `--checks`, the check list, the document reader, the read of the contributor's real database state, and their tests, after a search showed that nothing else used them. The tool's folder is `tools/sandbox/`. What `pnpm vendor-ian` shares with it (finding the engine through `ian about`, the vendored commit, the process runner) moved to `tools/engine/`, where `pnpm test:engine` also uses it. |
| D312 | GUI.4a finishes with D308's first tests and the owner's look (D309), approved 2026-11-21. Its pull request has no manual-run section and no smoke record. The GUI.4a row is marked Complete, with the date the pull request is opened, in a commit made then. |

### GUI.4b: term popups

Approved by the project owner on 2026-11-22. Decisions D313 to D327 are recorded in this section, in the order approved.

| # | Decision |
| :--- | :--- |
| D313 | Re-vendor. The branch's first commit is `pnpm vendor-ian 570b2fa2c7fdec7057b0b05aff56a814a5a4aad5` (engine main after API.18, the glossary entries Analysis Warning and Analysis Limitation, and API.19). It picks up API.18 (IAD issue #31) and API.19, which D325 to D327 cover. The pull request closes #31. |
| D314 | The application's own labels (settles D165 in the GUI.2 slice plan). Labels that name an engine concept get that engine term's help: "As of" → `as-of-date`; "Ad hoc entries" → `refresh`; "Warnings" → `analysis-warning`; "Limitations" → `analysis-limitation`. "Refresh comparison" would also have named `refresh`, but it appears only as a breadcrumb crumb, which is a link, so it gets no help (B5 rules out a trigger inside a link); the label-to-term map keeps `refresh` for "Ad hoc entries" only and does not hold the crumb. "Saved", "Saved by" and "Not run" get no help; they are ordinary words, not concepts. The application keeps one small typed map from these labels to engine term ids (`src/api/labelTerms.ts`). The "As of" labels on Analyze and Add entries get D316's help button, and run detail's "As of {date}" message is split so the label is the trigger (D315). |
| D315 | Which elements become term triggers. Every element that shows a term name with a term id where people read rather than fill in a form: table cells and column headers; headline card labels, statuses and reasons; outcome pills, including the counts pills; provider check verdicts; the run detail heading's strategy; the stored-options list; the persistent "Add entries" warning lines. Not: visually hidden live-region announcements, dialogs, and the cases of D316, D317 and D321. A code the engine serves without a term stays plain text. |
| D316 | Form controls. Strategy checkboxes, and selection fields whose term id is set, get a small separate help button after the label, with the same preview and panel and an accessible name such as "About Graham Number". Values inside native selects (the Saved runs filters, choice fields) get no help in GUI.4b. Rendered form: `[x] Graham Number (?)  [Show options]` and `Margin of safety (?)  [ 30 ]%`. |
| D317 | A term is never inside a link. Comparison value cells: the link keeps the value or "—", and the term is a trigger beside it. Comparison outcome column: the pill becomes a trigger; the row's value cells still link to the run. Refresh progress rows: the pill becomes a trigger, followed by a "View run" link. |
| D318 | Tab stops. As D286, every trigger is a tab stop. No roving tabindex. |
| D319 | How a term looks. Inline terms and column headers: a dotted underline in the text colour, and a help cursor. Pills stay pills: no underline, a darker hover background, the standard focus ring. Links keep P1's quiet solid underline, so the two stay distinct. |
| D320 | Content and source. The preview shows the definition only, since the trigger shows the name. The panel shows the term name as its heading, then the definition. Both come from the cached `/v1/help` index (`HelpTermItem.definition`, with the index's content language), with no per-term request; `/v1/help/terms/{term_id}` and the full entry come in GUI.4c. |
| D321 | No triggers inside the ticker preview or the ticker details panel in GUI.4b; links inside the panel are GUI.4c's. |
| D322 | Touch. A tap opens the panel (D283); there is no other touch control besides D316's help buttons. |
| D323 | Tests. Vitest: the definition lookup by term id; the D314 label map. Playwright, Chromium and WebKit, both text directions: preview and panel on a pill, a column header, the run detail heading's strategy and a headline card; a D316 help button; D317's cells, with the link and the trigger working separately; a touch tap opening the panel; plain text for a code with no term. Real-engine suite (D308): a term's preview shows the definition the engine serves for that id in `/v1/help`; every D314 term id is served. Engine text is never hard-coded. |
| D324 | Recording. D313 onward as above. The GUI.4b row is Next in the branch's first plan commit, and Complete, dated the day the pull request is opened, in a commit made then. |
| D325 | Separate messages for request-time database failures. `failureView` in `src/api/engineState.ts` has its own catalog keys; `connectionMessage` keeps today's launch messages unchanged. `database_busy`, with "Try again": "The analysis engine's database is busy with another program. Try again in a moment." The other `database_*` codes except the setup and upgrade codes, with no "Try again": "The analysis engine could not read or write its database." The setup and upgrade codes: unchanged (`engine.state.databaseSetup`). The keys are in every catalog the repository keeps (`en.json` and the `ar-XB` test catalog). |
| D326 | Tests for D325. Mock-engine Playwright tests: a screen request answered with 503 `database_busy` shows D325's message with "Try again", and that "Try again" then loads the screen; a 500 `database_io_error` shows the other message with no "Try again". The launch messages are unchanged and stay covered by the Vitest tests of `connectionMessage`, because the browser build has no launch state. No real-engine test. |
| D327 | What the re-vendor covers, from IAD issue #31 and API.19. Fixtures, labels and tests are checked against the vendored description: a run for an unknown ticker is Unavailable (outcome `unavailable`, status `input_unavailable`) with `provider_no_data` in the `provider_failure` element and a null `failure_reason_code` and refresh-result `reason_code`; the refresh summary's `schema_version` is 5 and the provider-check section reads sensibly for an Unavailable job; a storage error after readiness answers its precise `database_*` code with a `database` element whose `expected_revision` is null (`database_busy` 503, the others 500). Runs stored under older versions are refused with the engine's own message, which `failureView` shows as served. |
| D328 | Form help buttons (amends D316, and D286 for form help buttons only; found in the owner's look). The (?) help buttons of D316 leave the tab order (`tabindex="-1"`); they stay clickable and tappable, with the preview on hover. Each field or checkbox with a term gets `aria-describedby` pointing at a visually hidden copy of the term's definition, so assistive technology reads it on focus. F1 on a focused field or checkbox that has a term opens that term's details panel, and Escape returns focus to the field, as D283's panel does; the application keeps F1 for itself with `preventDefault` so a webview's own handling does not run. The help button's preview adds one line, "Press F1 for details." (a group's legend has no field to focus, so its preview does not). "Show options" stays a tab stop, and term triggers outside forms (D315, D317) are unchanged: still tab stops. The shell smoke test confirms that F1 reaches the application in the webview on Windows and Linux (CI); macOS joins the list of IAD issue #24. If F1 cannot be caught on a platform, work stops and is reported rather than choosing another key. |
