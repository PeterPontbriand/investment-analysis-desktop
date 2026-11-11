# GUI.2 — Read-only screens slice plan

## At a glance

- **What GUI.2 is:** the first screens that show engine content: watchlists, recent refreshes, the refresh comparison, and run detail. It also adds what every later unit needs: starting `ian serve`, the API adapter, generated API types, locale handling, and the localization retrofit of the GUI.1 code.
- **What GUI.2 is not:** actions that change anything (GUI.3), help popups and the help panel (GUI.4), the first-run screen or the installer (GUI.5), or any financial calculation.
- **Rules:** [AGENTS.md](../../AGENTS.md) and the [project charter](CHARTER.md) govern the work. The decisions in [Appendix A](#appendix-a-2026-11-10-decision-record) and the localization decisions in [Appendix D of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-d-localization-readiness-decision-2026-11-08) apply to all GUI.2 code.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.2a | [Engine launch, API adapter and localization retrofit](#gui2a--engine-launch-api-adapter-and-localization-retrofit) | Next | |
| GUI.2b | [Read-only screens](#gui2b--read-only-screens) | Planned | |

## Sub-slices

### GUI.2a — Engine launch, API adapter and localization retrofit

- **Problem:** No screen can show engine content until the application can start the engine, call its API with typed requests, and send and honour a locale.
- **Decision:** Start `ian serve` from Rust, call the API from the webview with `fetch` through a typed adapter, vendor IAN's OpenAPI document, and retrofit the GUI.1 code to the localization decisions (D33, D35 to D42).
- **Scope:** the engine launch in `src-tauri/` and the `src/platform/` module (D35); the CSP and allowed-origin settings (D36); the vendored OpenAPI document, its source record, generated types and drift check (D37); the `fetch` adapter (D38); vue-i18n and the message catalog (D39); stylelint with a logical-properties rule (D40); locale state and headers (D41); vue-router (D42); retrofit items R1 to R8 of [Appendix D of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#retrofit-items-against-the-merged-gui1-code); and one placeholder screen showing `/v1/info`.
- **Branch:** `feat/gui-2a-adapter`, from main after this plan merges; its own pull request.
- **Detail:** This plan owns GUI.2a's [file scope](#file-scope) and [acceptance criteria](#acceptance-criteria).

### GUI.2b — Read-only screens

- **Problem:** Investors need to inspect their watchlists, refreshes and saved runs without a command line.
- **Decision:** Build four read-only screens on the GUI.2a adapter, showing only API content (D32, D43 to D47).
- **Scope:** the watchlists screen (the list and one watchlist's entries), the recent refreshes screen, the refresh comparison screen, and the run detail screen (concise, details and diagnostics text, and the JSON document); code display through help terms (D43); number and date formatting (D44); error and empty states (D45); typed fixtures and browser tests (D46); a recorded manual check against a real engine (D47).
- **Branch:** `feat/gui-2b-screens`, from main after GUI.2a merges and after IAN's refreshes list endpoint (D34) merges; its own pull request.
- **Detail:** This plan owns GUI.2b's [file scope](#file-scope-1) and [acceptance criteria](#acceptance-criteria-1).

## Scope limits

- Read-only: no request in GUI.2 uses `POST`, `PATCH` or `DELETE`.
- No help popup or help panel. Elements that show a term keep its term id for GUI.4 (D43).
- No pinned engine install, first-run screen or installer; the `ian` executable is found as in D35.
- No IAN process in CI (D47).
- No dependency beyond those named in D37, D39, D40 and D42.
- No release build or bundle, as [AGENTS.md](../../AGENTS.md) requires before GUI.5.

## GUI.2a detail

### File scope

- `src-tauri/`: the Rust code that starts and stops `ian serve`, the command that hands the base URL and token to the webview, and the CSP and capability changes (D35, D36).
- `src/platform/`: the platform module with its Tauri and browser implementations (D20 in [Appendix A of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record), D35).
- The vendored `openapi.json`, its source record naming the IAN commit, the generated types and the drift check (D37).
- The API adapter under `src/` (D38).
- The message catalog, locale state and the vue-i18n setup (D39, D41); vue-router setup (D42).
- `src/App.vue`, `src/main.ts`, `index.html`, `src-tauri/tauri.conf.json`, the existing tests and `playwright.config.ts`, for R1 to R8.
- stylelint configuration and its gate step (D40).
- `package.json`, the pnpm lockfile, `pnpm-workspace.yaml`, `tools/gate.ts`, `AGENTS.md` (development rules this sub-slice establishes), and this plan's status row.

### Acceptance criteria

- The desktop application starts `ian serve`, reads its port and token, and stops it when the application closes; a missing `ian` executable or a failed launch shows a message from the catalog, not a crash.
- The webview calls the API with `fetch`; the CSP widens only `connect-src` to `http://127.0.0.1:*`; the token is never written to disk or a log.
- The generated types come from the vendored `openapi.json`, and the gate fails when they drift from it.
- Every request sends `Accept-Language` from the locale state, and the application follows the response's `Content-Language`.
- The placeholder screen shows `/v1/info` fields through the adapter.
- R1 to R8 are closed: no literal user-facing string remains outside the catalog, `lang` and `dir` follow the locale, tests read expected text from the catalog with a pinned locale, Playwright includes a second-locale or right-to-left case, and stylelint enforces logical properties.
- The openapi-typescript peer warning is allowed by the single entry D51 describes, added with the drift check's gate step; no other peer rule or release-age exclusion exists.
- `pnpm gate` passes on Windows, macOS and Linux.

## GUI.2b detail

### File scope

- The four screens and their components under `src/`, and router entries.
- Catalog entries for the application's own text on those screens.
- Typed fixtures and Vitest and Playwright tests for the screens.
- This plan's status row and the charter's GUI.2 row.

### Acceptance criteria

- Every displayed number, label, status, code and unit comes from an API document; numbers and dates are formatted with `Intl` from raw values and the document's unit.
- A status, outcome or reason code is shown as its help term's name, and each such element carries its term id.
- New IAN strategies appear on every screen with no GUI code change.
- Each documented error `reason_code` the screens can receive has a tested state.
- The comparison puts ticker and strategy first and the headline value most prominent, following the user answer to Q3 in the [project charter](CHARTER.md#questions-for-potential-users-before-gui2-scope-is-fixed).
- The pull request records a manual run against a real engine at the vendored IAN commit.
- `pnpm gate` passes on Windows, macOS and Linux.

## Background

All of IAN's API work package was complete on 2026-11-08, so the gates for GUI.2, GUI.3 and GUI.4 in the [project charter](CHARTER.md#sequence-and-status) are met. The API had no way to list past refreshes: a refresh id is stored on each run, and the watchlist the refresh ran is stored only inside each run's saved record. D34 asks IAN for a list endpoint instead of having the GUI rebuild that list.

## Appendix A: 2026-11-10 decision record

Approved by the project owner on 2026-11-10. The numbering continues [Appendix D of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-d-localization-readiness-decision-2026-11-08), D24 to D31.

| # | Decision |
| :--- | :--- |
| D32 | Scope: four read-only screens: watchlists (the list and one watchlist's entries), recent refreshes, the refresh comparison, and run detail (concise, details and diagnostics text, and the JSON document). No actions, no help popups (GUI.4), no installer or first-run screen (GUI.5). |
| D33 | Split: two pull requests. GUI.2a: engine launch, API adapter, generated types, locale handling and the R1 to R8 retrofit, with one placeholder screen showing `/v1/info`. GUI.2b: the four screens. |
| D34 | Past refreshes: IAN adds `GET /v1/refreshes` in a small additive slice, listing each refresh's id, watchlist id and name, first and last completion time and run counts, with an optional `watchlist_id` filter. GUI.2a does not need it; GUI.2b starts after it merges. Rejected: deriving the list in the GUI from `/v1/runs` plus one comparison request per refresh, which is slow, paged, and logic the GUI should not own. |
| D35 | Starting the engine: Rust code in `src-tauri/` starts `ian serve --port 0 --allow-origin <webview origin>` with `std::process` (no new crate), reads its one line of JSON, keeps its standard input open, and closes it when the application exits. The UI receives the base URL and token through the platform module. In GUI.2 the `ian` executable comes from `PATH` or the `IAD_IAN_PATH` environment variable; the pinned install is GUI.5's. `SEC_USER_AGENT` passes through from the environment until GUI.5's first-run screen. |
| D36 | Calling the API: the webview calls the API with `fetch`, as D19 and D20 intend. The engine allows the webview origin (`tauri://localhost` on macOS and Linux, `http://tauri.localhost` on Windows). The CSP widens only `connect-src`, to `http://127.0.0.1:*`, as T7 anticipated. The token is held in memory only. Rejected: proxying every request through Rust, which avoids cross-origin rules but breaks the browser build. |
| D37 | API types: openapi-typescript, approved in D6, is installed at an exact version. IAN's `schemas/openapi.json` is vendored with a file recording the IAN commit it came from; the generated types are checked in; the drift check regenerates them from the vendored file. Moving to a newer engine is a deliberate change that replaces the vendored file. |
| D38 | HTTP client: a thin adapter over native `fetch`, typed by the generated types. No openapi-fetch or axios. |
| D39 | Catalog library (R1): vue-i18n at an exact version, in Composition API mode, with English as the fallback locale. |
| D40 | Logical-properties check (R7): stylelint and one logical-properties plugin, at exact versions, in the gate from GUI.2a, because GUI.2 brings the first real CSS. |
| D41 | Locale picker: GUI.2a builds the locale state and the `Accept-Language` and `Content-Language` handling. The picker appears only when `/v1/info` lists more than one locale. |
| D42 | Navigation: vue-router at an exact version, in memory-history mode. No Pinia. Rejected: a hand-written view switch, which grows awkward once run detail is reached from several screens. |
| D43 | Codes and labels: labels come from the API. A status, outcome or reason code is shown as its term's name, found through `/v1/help/references` and `/v1/help/terms/{id}`; the GUI never maps a code to its own wording (D25). Each element keeps its term id so GUI.4 can attach help without rework. |
| D44 | Numbers and dates: values are formatted with `Intl` by the cell's `unit`, in the active locale (D28). The comparison follows the user answer to Q3: ticker and strategy first, the headline value most prominent, as in the preview mock-ups. |
| D45 | Errors and empty states: the screens branch only on `reason_code`: engine not started or exited, `database_busy` (retry), other `database_*` codes, not found, and an empty workspace. The API's `reason` text is shown as given. |
| D46 | Test fixtures: Vitest and Playwright use hand-written fixtures typed by the generated types, so a type check catches a shape change without a JSON Schema validator. Fixtures may be captured once from a real `ian serve` at the vendored IAN commit. |
| D47 | Real-engine check: no IAN in CI. The GUI.2b pull request records a manual run against a real engine, and GUI.6 keeps the recorded human smoke test. |
| D48 | Engine version: GUI.2 pins the IAN commit in the vendored source record (D37). IAN still reports engine version 0.1.0 and its only tag is v0.1.0, so before GUI.5 pins an installable version, IAN needs a release or tag that includes the API. |
| D49 | Implementation: Claude Code implements IAD work while Codex is unavailable, under the same rules: the project owner approves and merges every pull request, and no AI attribution appears in the repository. |
| D50 | Logical-properties plugin (D40): stylelint-use-logical (maintained by csstools) at an exact version, with stylelint 17. Rejected: stylelint-use-logical-spec, unmaintained since 2024 and limited to stylelint below 17. Dependencies are never excluded from pnpm's minimum release age; when the newest release is too recent, the newest release outside the window is pinned. |
| D51 | openapi-typescript peer range: openapi-typescript 7.13.0 declares a peer of TypeScript 5, and the project pins TypeScript 6. Generation from IAN's openapi.json was checked to work with TypeScript 6. The warning is allowed through one narrow `peerDependencyRules.allowedVersions` entry in `pnpm-workspace.yaml` (`openapi-typescript>typescript: "6"`), added in the same change as the drift check's gate step, so the gate proves the combination works. |
