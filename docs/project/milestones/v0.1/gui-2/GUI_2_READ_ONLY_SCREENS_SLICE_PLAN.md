# GUI.2 — Read-only screens slice plan

## At a glance

- **What GUI.2 is:** the first screens that show engine content: watchlists, recent refreshes, saved runs, the refresh comparison, and run detail. It also adds what every later unit needs: starting `ian serve`, the API adapter, generated API types, locale handling, and the localization retrofit of the GUI.1 code.
- **What GUI.2 is not:** actions that change anything (GUI.3), help popups and the help panel (GUI.4), the first-run screen or the installer (GUI.5), or any financial calculation.
- **Rules:** [AGENTS.md](../../../../../AGENTS.md) and the [project charter](../../../CHARTER.md) govern the work. The decisions in [Appendix A](#appendix-a-2026-11-10-decision-record) and the localization decisions in [Appendix D of the GUI.1 slice plan](../gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-d-localization-readiness-decision-2026-11-08) apply to all GUI.2 code.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.2a1 | [Localization retrofit](#gui2a1--localization-retrofit) | Complete | 2026-11-11 |
| GUI.2a2 | [Engine launch and API adapter](#gui2a2--engine-launch-and-api-adapter) | Complete | 2026-11-13 |
| GUI.2b1 | [Shared groundwork, watchlists, refreshes and saved runs](#gui2b1--shared-groundwork-watchlists-refreshes-and-saved-runs) | In progress | |
| GUI.2b2 | [Comparison and run detail](#gui2b2--comparison-and-run-detail) | Planned | |

## Sub-slices

### GUI.2a1 — Localization retrofit

- **Problem:** The GUI.1 code has literal English strings, a fixed `lang`, no text direction and no check for physical CSS properties, and GUI.2 adds the first real screens.
- **Decision:** Retrofit the GUI.1 code before any engine work: a message catalog, locale state, `lang`, `dir` and page title that follow the locale, logical-properties linting, and tests that read text from the catalog (D52, D39 to D42, D54, D59 to D63).
- **Scope:** vue-i18n and the message catalog (D39, D61); locale state, `lang`, `dir` and the page title (D62, D63); vue-router (D42); stylelint with a logical-properties rule (D40, D54); retrofit items R1 to R4 and R6 to R8 of [Appendix D of the GUI.1 slice plan](../gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#retrofit-items-against-the-merged-gui1-code); the test-only `ar-XB` pseudo-locale and its browser-test build (D60); and CSP enforcement in browser tests (D59).
- **Branch:** `feat/gui-2a1-localization`, from the dependency commits; its own pull request.
- **Detail:** This plan owns GUI.2a1's [file scope](#file-scope) and [acceptance criteria](#acceptance-criteria).

### GUI.2a2 — Engine launch and API adapter

- **Problem:** No screen can show engine content until the application can start the engine, call its API with typed requests, and send and honour a locale.
- **Decision:** Start `ian serve` from Rust, call the API from the webview with `fetch` through a typed adapter, and vendor IAN's OpenAPI document (D35 to D38, D41, D53, D55 to D58, D64 to D67).
- **Scope:** the engine launch in `src-tauri/` and the `src/platform/` module (D35, D53, D55, D56, D58); the CSP and allowed-origin settings (D36, D55); the vendored OpenAPI document, its source record, generated types and drift check (D37, D65); the `fetch` adapter (D38); `Accept-Language` and `Content-Language` handling (D41, D64); retrofit item R5 (the window title, D62); the D51 peer entry; the stub engine and its shell smoke test (D57); and the `/v1/info` placeholder screen (D66).
- **Branch:** `feat/gui-2a2-engine-adapter`, from main after GUI.2a1 merges; its own pull request.
- **Detail:** This plan owns GUI.2a2's [file scope](#file-scope-1) and [acceptance criteria](#acceptance-criteria-1).

### GUI.2b1 — Shared groundwork, watchlists, refreshes and saved runs

- **Problem:** Every engine screen needs the same client, term names, formatting, error states and navigation, and investors need to inspect their watchlists, refreshes and saved runs without a command line.
- **Decision:** Build the shared groundwork and three read-only screens on the GUI.2a adapter, showing only API content (D78 to D90, D93 to D95, D98 to D109).
- **Scope:** the IAN re-vendor (D78); the adapter extension (D81); the shared engine client (D82); term names (D83, D101); formatting (D85, D105, D106); error and empty states (D84, D99, D100); the navigation and app shell (D87, D98); the watchlists screen (D89, D102), the refreshes screen (D90) and the saved runs screen (D80, D103); paging (D88); typed fixtures and browser tests (D94, D107); TypeScript in Vue files (D109).
- **Branch:** `feat/gui-2b1-foundation`, from main after IAN pull request 255 (API.8) merged; its own pull request.
- **Detail:** This plan owns GUI.2b1's [file scope](#file-scope-2) and [acceptance criteria](#acceptance-criteria-2).

### GUI.2b2 — Comparison and run detail

- **Problem:** Investors need to compare a refresh's runs across tickers and strategies and read one run in full.
- **Decision:** Build the refresh comparison and run detail on the GUI.2b1 groundwork (D86, D91, D92, D94).
- **Scope:** the refresh comparison screen; the run detail screen with its header, headline cards, warnings and limitations, the concise, details and diagnostics text, and the JSON document; links from refresh and run rows to them.
- **Branch:** `feat/gui-2b2-compare-detail`, from main after GUI.2b1 merges; its own pull request. Its own open decisions are taken before it starts (D96).
- **Detail:** This plan owns GUI.2b2's [file scope](#file-scope-3) and [acceptance criteria](#acceptance-criteria-3).

## Scope limits

- Read-only: no request in GUI.2 uses `POST`, `PATCH` or `DELETE`.
- No help popup or help panel. Elements that show a term keep its term id for GUI.4 (D43).
- No pinned engine install, first-run screen or installer; the `ian` executable is found as in D35.
- No IAN process in CI (D47).
- No dependency beyond those named in D37, D39, D40, D42, D53 and D54.
- No release build or bundle, as [AGENTS.md](../../../../../AGENTS.md) requires before GUI.5.
- Choosing a locale is not persisted; persistence is decided in the slice where the language picker first becomes visible (D63).
- IAD has no log file before GUI.5; GUI.5 decides the log file, its location and where the engine-launch lines go (D67).
- Before GUI.2b shows the API's reason messages as given (D45), the GUI.2b decisions confirm that none of them names a command, option or environment variable (D56). Met by D78: IAN's database reason messages name no command, option or file path, and D84 still shows catalog messages for them.
- Out of scope for GUI.2b: the running refresh job view, the language picker and any per-strategy rendering of a strategy document (D93).

## GUI.2a1 detail

### File scope

- `package.json`, the pnpm lockfile, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `stylelint.config.js`, `tsconfig.json`, `.gitignore`, `.prettierignore` and `index.html`.
- The message catalog (`src/locales/`), the vue-i18n and locale code, the router and the home view under `src/`, and `src/App.vue` and `src/main.ts` (D39, D42, D61 to D63).
- The existing tests, the test-only catalogs under `tests/fixtures/locales/`, the shared Playwright fixture, the stylelint rule test and the production-locale check tool (D59, D60).
- `tools/gate.ts` (the stylelint and production-locale steps), `AGENTS.md` (development rules this sub-slice establishes), `docs/project/CHARTER.md` and this plan.

### Acceptance criteria

- Every user-facing string is in `src/locales/en.json`, discovered at build time with the locale tag taken from the file name; message keys are typed from it; `meta.direction` is `ltr` or `rtl` in every catalog.
- ESLint's `vue/no-bare-strings-in-template` rule is an error for `.vue` files, so a literal string in a template fails lint.
- Messages are read only through `useMessages()`: `vue-i18n` cannot be imported outside `src/i18n/`, and `$t` is not injected into templates.
- The starting locale is the first `navigator.languages` entry with a catalog, then English (D63); `lang`, `dir` and the page title follow the active catalog (R3, R4).
- stylelint's `csstools/use-logical` rule is `always`; a test proves it fires for a physical property in plain CSS and in a `.vue` style block, and the gate runs it.
- Tests read expected user-facing text from the catalog with the locale pinned (R6); a unit test checks that every catalog has `en.json`'s key set.
- The browser-test build (`--mode browser-test`) includes the `ar-XB` pseudo-locale, and Playwright checks its `lang`, `dir`, title and text (R8); a gate step fails when the production build contains the tag of any test-only locale.
- `vite preview` serves the CSP read from `src-tauri/tauri.conf.json`; every browser test fails on a CSP violation or console error, and one test checks the header.
- vue-router uses memory history and serves the screen at `/`.
- `pnpm gate` passes on Windows, macOS and Linux.

## GUI.2a2 detail

### File scope

- `src-tauri/`: the Rust code that starts and stops `ian serve`, the commands that hand the connection and status to the webview, the stub engine binary, and the CSP and capability changes (D35, D36, D55 to D57).
- `src/platform/`: the platform module with its Tauri and browser implementations (D20 in [Appendix A of the GUI.1 slice plan](../gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record), D35, D53, D58).
- `vendor/ian/openapi.json`, its source record naming the IAN commit, the generated types and the drift check (D37, D65).
- The API adapter and the placeholder screen under `src/` (D38, D64, D66).
- `src-tauri/tauri.conf.json` and the shell test, for R5.
- `package.json`, the pnpm lockfile, `pnpm-workspace.yaml`, `tools/gate.ts` and this plan's status row.

### Acceptance criteria

- The desktop application starts `ian serve`, reads its port and token, and stops it when the application closes; a missing `ian` executable or a failed launch shows a message from the catalog, not a crash.
- The webview calls the API with `fetch`; the CSP widens only `connect-src` to `http://127.0.0.1:*`; the token is never written to disk or a log.
- The generated types come from the vendored `openapi.json`, and the gate fails when they drift from it.
- Every request sends `Accept-Language` from the locale state, and the application follows the response's `Content-Language`.
- An element showing engine text carries a `lang` attribute taken from the response's `Content-Language` (D64).
- The placeholder screen shows `/v1/info` fields through the adapter (D66).
- R5 is closed: the window title follows the locale through the platform module.
- The openapi-typescript peer warning is allowed by the single entry D51 describes, added with the drift check's gate step; no other peer rule or release-age exclusion exists.
- The stub engine smoke test (D57) passes on every CI platform without IAN.
- Until GUI.5, Rust writes one line per launch outcome to standard error (D67).
- The shell smoke test passes; its "Tauri core.invoke not available" warning is the accepted exception recorded in D76.
- `pnpm gate` passes on Windows, macOS and Linux.

### Engine state messages

| State | English message |
| :--- | :--- |
| `not_found` | The analysis engine is not installed, or could not be found. |
| `launch_failed` with `database_upgrade_required`, `database_incompatible_schema`, `database_initialization_failed` or `database_migration_failed` | The analysis engine's database needs to be set up or upgraded before the engine can start. |
| `launch_failed` with `database_busy` | The analysis engine's database is in use by another program. Close that program, then restart this application. |
| `launch_failed` with any other `database_*` code | The analysis engine could not open its database. |
| `launch_failed` with any other or unknown code | The analysis engine could not start. |
| `timed_out` | The analysis engine did not start within 30 seconds. |
| `exited` | The analysis engine stopped unexpectedly. Restart the application to continue. |

## GUI.2b1 detail

### File scope

- `vendor/ian/openapi.json`, `vendor/ian/SOURCE.md` and `src/api/schema.ts`, for the re-vendor (D78).
- `src/`: the API adapter and client, the shared engine client, term names, formatting, the message catalogs, the router, `src/App.vue`, `src/main.ts`, and the views and components of the shell and the three screens.
- `tests/unit/`, `tests/browser/` and `tests/fixtures/`, including the typed API fixtures and the test-only catalog; `playwright.config.ts` and `vitest.config.ts` for the time zone only (D107).
- `eslint.config.js`, for D109 only.
- `tests/shell/window.spec.js`, updated to the new shell.
- `docs/project/SMOKE_TESTING.md` and `AGENTS.md` (D113 to D115).
- `tools/smoke/`, `tests/tools/` with its fixtures, and the `smoke` script of `package.json` (D117).
- The documentation layout of D116: the moved slice plans, `docs/project/milestones/v0.1/IMPLEMENTATION_PLAN.md`, the charter's split, and the indexes `docs/README.md`, `docs/project/README.md` and `docs/project/milestones/README.md`.
- This plan and the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md)'s GUI.2 section.

### Acceptance criteria

- The vendored API description is IAN commit `beb58a2`, and the drift check passes (D78).
- `get(path, { path?, query? })` substitutes encoded path parameters and omits undefined query parameters, typed from the generated types (D81).
- One engine connection and client serve every screen, and each screen reloads when the locale changes (D82).
- Outcome and strategy names come from the help references, the help index and `/v1/strategies`, each fetched once per locale; each element keeps its term id, and a code or method the engine does not list shows as served with no term id (D83, D101).
- A failed help references, help index or strategies request shows the screen's failure state, not codes or method ids as served, and recovers on retry (D110).
- Each `reason_code` group has a tested state: resource states show the API's message with its `lang`, `database_*` codes show catalog messages with "Try again" for `database_busy` only, and every other code shows one catalog message (D84, D100).
- Every D85 unit has a unit test with the locale pinned, and both test runners use the `America/Toronto` time zone (D85, D106, D107).
- The navigation, breadcrumb and routes follow D87 and D98; the shell lays out correctly in the `ar-XB` pseudo-locale.
- The watchlists, refreshes and saved runs screens follow D89, D90, D102, D103 and D105, with "Show more" paging (D88) and the empty states of D108.
- While the connection is pending, or the engine is not ready, every screen shows the matching catalog message and the navigation stays usable (D99).
- An extra, made-up strategy appears in the saved runs list, its filter and a watchlist's entries with no GUI code change (D94).
- No request uses `POST`, `PATCH` or `DELETE`.
- `docs/project/SMOKE_TESTING.md` exists (D113 to D115), and the pull request records a run of it.
- The pull request records a manual run against a real engine at IAN `beb58a2` (D47).
- `pnpm gate` passes on Windows, macOS and Linux.

## GUI.2b2 detail

### File scope

- The comparison and run detail screens and their components under `src/`, and router entries.
- Catalog entries for the application's own text on those screens.
- Typed fixtures and Vitest and Playwright tests for the screens.
- This plan's status row and the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md)'s GUI.2 row.

### Acceptance criteria

- The run detail header shows the company name and ticker, the strategy name, the status as its term name and the effective as-of; headline cards come from the run overview, with `warnings` and `limitations` as lists below them (D86).
- The comparison follows D91: a sticky ticker column, horizontally scrolling strategy groups, an outcome column only in a group with a non-completed run, "Not run" for a null run, and no "Refresh now" or "Download JSON".
- Run detail has Summary, Details, Diagnostics and JSON views as read-only selectable blocks, with `lang` and `dir` as D92 sets them.
- Every displayed number, label, status, code and unit comes from an API document; numbers and dates are formatted with `Intl` from raw values and the document's unit (D85).
- A status, outcome or reason code is shown as its help term's name, and each such element carries its term id.
- A made-up strategy appears in the comparison and run detail with no GUI code change (D94).
- The comparison puts ticker and strategy first and the headline value most prominent, following the user answer to Q3 in the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md#questions-for-potential-users-before-gui2-scope-is-fixed).
- The pull request records a manual run against a real engine at the vendored IAN commit.
- `pnpm gate` passes on Windows, macOS and Linux.

## Background

All of IAN's API work package was complete on 2026-11-08, so the gates for GUI.2, GUI.3 and GUI.4 in the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md#sequence-and-status) are met. The API had no way to list past refreshes: a refresh id is stored on each run, and the watchlist the refresh ran is stored only inside each run's saved record. D34 asks IAN for a list endpoint instead of having the GUI rebuild that list.

## Appendix A: 2026-11-10 decision record

Approved by the project owner on 2026-11-10. The numbering continues [Appendix D of the GUI.1 slice plan](../gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-d-localization-readiness-decision-2026-11-08), D24 to D31.

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
| D52 | Split (amends D33): GUI.2a becomes GUI.2a1, the localization retrofit (vue-i18n and the catalog, locale state, `lang` and `dir`, vue-router, stylelint, R1 to R4 and R6 to R8), and GUI.2a2, the engine launch and API adapter (the platform module, CSP and allowed origin, vendored OpenAPI document, generated types and drift check, the adapter, locale headers, R5, the D51 peer entry and the `/v1/info` placeholder screen). Each has its own pull request. |
| D53 | Tauri API package (amends T3 in Appendix C of the GUI.1 slice plan): `@tauri-apps/api` 2.12.4, exact, added in GUI.2a2 for the platform module's Tauri implementation (the engine command and the window title). Rejected: `window.__TAURI_INTERNALS__`, a private API. |
| D54 | Vue styles in stylelint: `postcss-html` 2.0.0, exact, as stylelint's custom syntax for `.vue` files. The stylelint configuration has only the logical-properties rule and no shared base configuration; Prettier owns formatting. |
| D55 | Allowed origin: Rust passes the origin of the main webview's URL at launch as `--allow-origin`, which covers every platform and `tauri dev` from one source. |
| D56 | Engine readiness, failure and exit: Rust starts the engine in a background thread during setup. A command `engine_connection` returns `ready` (base URL and token), `not_found`, `launch_failed` (with the failure's `reason_code`) or `timed_out` after 30 seconds. A command `engine_status` reports `running` or `exited`; the adapter calls it only after a network error, so no Tauri events are used. The engine's standard error is discarded, and on Windows it runs without a console window. Users see only catalog messages chosen by state and launch-failure `reason_code` (see [Engine state messages](#engine-state-messages)); the engine's launch-failure reason message is never shown, because it is written for command-line users. No user-facing message names internal shorthand, an environment variable, an option or a command. |
| D57 | Stub engine: a Rust binary using only the standard library, built only with the `e2e` feature, prints the ready line, serves a fixed `/v1/info` with the engine's CORS headers and exits when its standard input closes. The shell smoke test points `IAD_IAN_PATH` at it and checks the placeholder screen, testing the launch, CORS, CSP and loopback `fetch` on every CI platform without IAN (D47). |
| D58 | Browser connection: the platform module's browser implementation reads the base URL and token from the URL fragment (`#engine=<base URL>&token=<token>`) and clears the fragment with `history.replaceState`. Without a fragment there is no engine. |
| D59 | CSP in browser tests: `vite preview` serves the CSP read from `src-tauri/tauri.conf.json`, and every browser test fails on a CSP violation. |
| D60 | Second locale in tests: a test-only right-to-left pseudo-locale, `ar-XB`, lives under `tests/` and is built only into the browser-test build; a gate step checks that the production build contains no test locale. Playwright uses it to check `dir`, `lang` and catalog text. |
| D61 | Catalog layout: one JSON catalog per locale in `src/locales/`, discovered at build time so adding a locale adds a file only. Each catalog declares its text direction in `meta.direction`. Message keys are typed from `en.json`. Tests read expected text from the catalog with the locale pinned. |
| D62 | Product name and titles: the product name is catalog text like any other. `tauri.conf.json` and `index.html` keep it only as the title shown before the application loads; the page title (GUI.2a1) and the window title (GUI.2a2) are set from the catalog. |
| D63 | Starting locale: the first `navigator.languages` entry with an IAD catalog, matching the exact tag and then its language, otherwise English. Persisting the choice is decided in the slice where the language picker first becomes visible. |
| D64 | Served locale (D26): the adapter returns each response's `Content-Language` with its data, and an element showing engine text carries a `lang` attribute with that value. |
| D65 | Vendored API description: `vendor/ian/openapi.json`, with `vendor/ian/SOURCE.md` recording the IAN commit and its date. Generated types are in `src/api/schema.ts`, excluded from Prettier and ESLint. A gate step, "OpenAPI types drift check", regenerates the types into a temporary file and compares them. The D51 peer entry lands in the same commit. |
| D66 | Placeholder screen: the product heading and pre-release notice, then an "Analysis engine" section listing the engine version, API versions, schema version, SEC identity ("Configured" or "Not configured") and languages. Labels come from the catalog; values come from `/v1/info`, with language names as the API serves them. |
| D67 | Engine launch detail: until GUI.5, Rust writes one line per launch outcome to standard error, naming the executable path tried and where it came from (`PATH` or `IAD_IAN_PATH`), the `reason_code` and the engine's reason message. GUI.5 decides IAD's log file. |
| D68 | Library type checking: `tsconfig.json` sets `skipLibCheck`, as `tools/tsconfig.json` already does. vue-i18n's declarations import `GenericComponentInstance`, a Vue 3.6 type that Vue 3.5 does not export, in every release from 11.2.1 (2025-11-22) onward. Rejected: pinning vue-i18n 11.2.0, the last release without that import, which would forgo a year of fixes and block vue-i18n upgrades until Vue 3.6. Because `skipLibCheck` also skips the project's own `.d.ts` files, generated or hand-written type declarations are kept in `.ts` files (D65). Revisit when Vue 3.6 is adopted. |
| D69 | Pseudo-locale in browser tests: the right-to-left test sets `navigator.language` and `navigator.languages` to `ar-XB` with an init script instead of Playwright's `locale` option, because WebKit on macOS does not report a private-use region such as `XB` through that option. The English projects keep `locale: 'en-US'`. Rejected: renaming the pseudo-locale to a real tag, which takes a name a real catalog needs, and a locale override in the browser-test build, which bypasses the real startup path. |
| D70 | No engine in the browser build: when the platform module's browser implementation finds no `#engine=` fragment, the placeholder screen's "Analysis engine" section shows one catalog message, "No analysis engine is connected.", and makes no request. It is not one of the engine states in the "Engine state messages" table. |
| D71 | Language picker: GUI.2a2 builds no picker component. IAN serves only `en` and IAD has only the `en` catalog, so D41's condition can't be met yet. The picker, and the choice of whether to remember the selection (D63), come in the first slice where either side has a second locale. GUI.2a2 still builds the locale state's `Accept-Language` and `Content-Language` handling (D41, D64). |
| D72 | Rust tests: the engine launch's pure parts have Rust unit tests: choosing the executable (`IAD_IAN_PATH` over `PATH`), parsing the first standard-output line into `ready` or `launch_failed` (with the envelope's `reason_code`, or none), and deriving the origin from the webview URL. A new gate step, "Rust unit tests", runs `cargo test` for `src-tauri/` with the default features, after the Clippy step. |
| D73 | Vendored engine: `vendor/ian/openapi.json` comes from IAN commit `ab180c7` (2026-11-12). That commit already contains `GET /v1/refreshes`, so GUI.2b does not need to re-vendor for D34. |
| D74 | Ending the engine: when the application exits, Rust closes the engine's standard input and neither waits for the engine nor kills it. IAN finishes or stops a running refresh within its own bounded shutdown and then exits. After a `timed_out` or `launch_failed` result, Rust kills the child if it is still running, so no engine is left listening. |
| D75 | Window title permission: the `default` capability gains only `core:window:allow-set-title`, for R5. The app's own commands (`engine_connection`, `engine_status`) need no capability entry. No other permission is added. |
| D76 | Shell test warning: the shell smoke test runs without `tauri-plugin-wdio`, so `@wdio/tauri-service` 1.5.1's window-state probe logs "Tauri core.invoke not available" and costs about 5 s per probed command. The service has no setting to disable the probe. Accepted until a shell test needs `browser.tauri.execute` or mocks; that slice adds the plugin to the end-to-end build only. |
| D77 | Placeholder messages outside the engine states: while the connection is pending, the "Analysis engine" section shows "Connecting to the analysis engine…" (`engine.loading`). A request that fails while the engine is still running, whether from a network error or an HTTP failure, shows "The analysis engine did not respond as expected." (`engine.unreachable`). Both are catalog messages, and neither shows the API's reason text. GUI.2b replaces `engine.unreachable` on its screens with D45's reason-code branches. |

Approved by the project owner on 2026-11-13.

| # | Decision |
| :--- | :--- |
| D78 | IAN prerequisite (API.8): before GUI.2b, IAN served structured cell units (a closed `CellUnit` code set of `percent`, `points`, `multiple` and `per_share`, plus a nullable ISO 4217 `currency`; a `percent` value is the percentage itself), `database_*` reason messages that name no command, option or file path, and a run overview with its headline (`GET /v1/runs/{analysis_run_id}/overview`). It merged as IAN pull request 255 (commit `beb58a2`), and GUI.2b1's first commit vendors that commit (amends D73). |
| D79 | Split (amends D33): GUI.2b becomes GUI.2b1 (`feat/gui-2b1-foundation`: shared groundwork, the watchlists screen, the refreshes screen and the saved runs screen) and GUI.2b2 (`feat/gui-2b2-compare-detail`: the refresh comparison and run detail). The groundwork is the adapter extension, the shared engine client, term names, formatting, error and empty states, and navigation. Each has its own pull request. |
| D80 | Saved runs screen (amends D32): a fifth screen lists `GET /v1/runs` with ticker, strategy and outcome filters. It is the only way to reach runs saved by a direct analysis. |
| D81 | Adapter parameters: the adapter's `get(path, { path?, query? })` takes path and query parameters typed from each operation's `parameters` in the generated types. It stays a thin layer over `fetch` (D38). `GetPath` covers every GET that answers 200 with JSON. |
| D82 | Shared engine client: the engine connection and API client are created once at startup and provided to the app, and screens obtain the client through `useApi()`. Each screen reloads its data when the locale changes. The engine information section uses the shared client. |
| D83 | Term names (refines D43): IAD resolves term names with two requests cached in memory per locale: `GET /v1/help/references` (each code set's values to term ids) and `GET /v1/help` (the index, with every term's id, name and definition). It does not request `/v1/help/terms/{id}` per code. Each element keeps its term id. Each displayed field is bound to its code-set name, such as an outcome to `RunOutcome` and a cell's status to `CellStatusValue`. |
| D84 | Errors (amends D45): screens branch on `reason_code` in three groups. Resource states (`watchlist_not_found`, `analysis_run_not_found`, `stored_selection_unreadable`, `unsupported_run_version`, `invalid_stored_run`, `unsupported_projection`) show the API's `reason` message as given, with `lang` from the response. `database_*` codes show catalog messages reusing the engine-state wording, with a retry button for `database_busy` only; this holds even though D78 cleaned the API's database messages, so a later message change cannot leak a command. Every other code (including `not_authenticated`, `host_not_allowed`, `origin_not_allowed`, `endpoint_not_found`, `invalid_parameter`, `execution_error` and any unknown code) shows one catalog message. Empty states (no watchlists, no refreshes, no runs) each have a catalog message. |
| D85 | Formatting (with D78's units): `percent` uses `Intl` unit `percent` with 1 decimal place (`18.4%`). `points` is a number with 1 decimal place (`100.0`). `multiple` is a number with 1 decimal place plus a catalog suffix (`12.3×`). `per_share` with a currency uses `Intl` currency style, displayed as the currency code (`USD 36.69`). `per_share` with no currency is a number with 2 decimal places (`36.69`). An instant is shown in the user's time zone as a medium date with a short time (`Oct 30, 2026, 2:02 PM`). A date-only value (`period_end`, an as-of date) is formatted in UTC, date only, so the day never shifts (`Jun 30, 2024`). A null value shows `—`, with the cell's status term name beside it. |
| D86 | Run detail header (GUI.2b2): the header gives company name and ticker, the strategy name (from `/v1/strategies`, keyed by method), the status as its term name and the effective as-of. Headline cards come from the run overview (D78), and `warnings` and `limitations` show as lists below them. |
| D87 | Navigation: a persistent navigation with Watchlists, Refreshes, Saved runs and About. About holds the engine information section, and Watchlists is the start screen. Breadcrumbs (for example `Watchlists / Core`) stand in for a back button, which memory history does not have. |
| D88 | Paging: a "Show more" button appends the next page, using `limit=50` and `has_more`. No numbered pages. |
| D89 | Watchlists screen: the list shows name, entry count, created and last changed. One watchlist shows each entry's position, ticker, strategy and as-of only (Pydantic schema titles are not localizable and are poor labels; the full selection comes with GUI.3's selection form), followed by the refreshes of that watchlist (the D90 list, filtered by `watchlist_id`). On a 409 `stored_selection_unreadable` the screen shows the reason message; the remedy, removing the entry, comes with GUI.3. IAN's whole-watchlist refusal is kept, because a refresh of that watchlist fails too. |
| D90 | Refreshes screen: each row shows the last completion time, plus the first completion time only when the two differ by a minute or more; the watchlist name as it was at refresh time, with no "(renamed)" marker; the run count; and one count column per outcome, headed by the `RunOutcome` term names. A refresh with no watchlist shows the catalog text "Ad hoc entries". |
| D91 | Comparison (GUI.2b2): the preview mock-up's layout, implementing the Q3 answer and D44. The ticker column is sticky and strategy groups scroll horizontally. An outcome column appears in a strategy group only when that group has a non-completed run. A null run shows `—` with the catalog text "Not run". `headline_unavailable` shows its term name across the group. A strategy that is no longer declared shows its stored label with no term. Clicking a run's cells opens run detail. There is no "Refresh now" or "Download JSON", and the `alias` field is not shown. |
| D92 | Run detail views (GUI.2b2): tabs for Summary, Details and Diagnostics (`/text?mode=concise\|details\|diagnostics`) and JSON (pretty-printed), all read-only, selectable `<pre>` blocks with no copy button. Engine text gets `lang` from Content-Language and `dir` from IAD's catalog for that language when IAD has one, otherwise `dir="auto"`. JSON is always `dir="ltr"`. |
| D93 | Out of scope for GUI.2b: the running refresh job view (`GET /v1/refreshes/job`, which belongs with the refresh action in GUI.3), the language picker (D71 still holds), and any per-strategy rendering of a strategy document. |
| D94 | Tests (adds to D46): a fixture with an extra, made-up strategy appears in the saved runs list, the comparison and run detail, proving that new strategies need no GUI code change; one browser test for each D84 group; and a unit test for each D85 unit, run with the locale pinned. |
| D95 | Decision numbering: GUI.2b's decisions continue from D78, because D77 records GUI.2a2's placeholder messages. |
| D96 | Plan layout: the GUI.2b row splits into GUI.2b1 and GUI.2b2, each with its own section. GUI.2b2's scope and acceptance criteria are written in GUI.2b1's pull request from D86, D91 and D92, and its own open decisions are taken before it starts. The scope limits gain D93's exclusions, and the limit asking GUI.2b to confirm that no reason message names a command, option or environment variable is recorded as met by D78. |
| D97 | Branch: `feat/gui-2b1-foundation`, from main after API.8 merged. Its first commit re-vendors IAN `beb58a2`. |
| D98 | App shell and routes: the navigation sits on the inline-start side under the product name, and the content area holds a breadcrumb and the screen. Routes are `/watchlists` (start screen; `/` redirects to it), `/watchlists/:watchlistId`, `/refreshes`, `/runs` and `/about`. The placeholder screen becomes the About screen, keeping the engine information section. The pre-release notice becomes "Pre-release: this application is under development." |
| D99 | Engine not ready: the connection is obtained once (D82). While it is pending, the content area of every screen shows "Connecting to the analysis engine…". When the engine is not ready (an engine state, or no engine in the browser build, D70), the content area of every screen shows that state's existing catalog message, and the navigation stays usable. |
| D100 | Request failures: `ApiError` also carries the failure envelope's `reason` and the response's `Content-Language`, which D84's resource-state group needs. A network failure while the engine is still running keeps D77's `engine.unreachable` message, and an exited engine keeps `engine.state.exited`. D84's third group shows "Something went wrong in the analysis engine." For `database_busy`, "Try again" reloads the screen's data. |
| D101 | Term name elements: one `TermName` component shows a code as its term's name in an element with `data-term-id` and a `lang` from the help response's Content-Language. A strategy name shows its `/v1/strategies` `label`, with `data-term-id` set to the strategy's `term`. References, the help index and the strategies are each fetched once per locale; a failed fetch is not cached. A code with no reference, or a `method_id` that `/v1/strategies` does not list, shows as served, with no term id. Rejected: an IAN change adding a label to `RunSummaryDocument`. |
| D102 | An entry's as-of: a date is formatted as a date-only value (D85), an instant in the user's time zone (D85), and null shows the catalog text "Latest data", as the API describes a null as-of. |
| D103 | Saved runs filters: the ticker text is trimmed and sent only when it is not empty, and applies on Enter or when the field loses focus; the engine normalizes case. Strategy options come from `/v1/strategies` in declared order, outcome options from the `RunOutcome` code set in `/v1/help/references` in served order. Changing a filter reloads from the first page. With no filters an empty list shows "No saved runs yet."; with a filter, "No saved runs match these filters." The list has no refresh column. |
| D104 | Linked rows: in GUI.2b1 only watchlist rows open something (the watchlist). Refresh rows and run rows stay plain until GUI.2b2 adds the comparison and run detail. |
| D105 | Refresh time range: when the first and last completion times differ by a minute or more, the refreshes screen shows them with `Intl.DateTimeFormat.prototype.formatRange` (for example `Oct 30, 2026, 1:58 – 2:02 PM`). |
| D106 | Formatting groundwork: every D85 formatter and its unit test lands in GUI.2b1, though number cells are first shown in GUI.2b2. |
| D107 | Test fixtures and time zone: typed fixtures live in `tests/fixtures/api/`, shared by Vitest and Playwright. One Playwright engine mock generalizes `tests/browser/engine.spec.ts`'s route handling (CORS, Content-Language, a document per path and failure envelopes). Both runners pin the time zone to `America/Toronto`, so a date-only value wrongly formatted in local time fails. The extra strategy (D94) appears in the saved runs list, its strategy filter and a watchlist's entries. |
| D108 | Catalog text: the English text in GUI.2b1's catalog entries table. The no-entries message is for a stored watchlist only; IAN refuses an empty list of entries before a refresh starts (rule `refresh.entries_empty`), and a listed refresh always has at least one run. |
| D109 | TypeScript in Vue files: `eslint.config.js` gives `vue-eslint-parser` typescript-eslint's parser for `<script lang="ts">` blocks, so components can use typed props, type imports and typed refs. No new dependency; type-aware linting stays off. Rejected: untyped runtime props with typed code moved to `.ts` modules, which weakens component typing and would be copied. |
| D110 | Term and strategy name requests: a failed request for the help references, the help index or the strategies shows the screen's failure state (D84, D100), like a failed list request; the as-served fallback of D101 applies only to a code, term or method the engine does not list. Each screen's loader declares the term documents it needs, and the loader fetches them before the screen's own requests, so no screen can show names without them. |
| D111 | WebKit's native select: under the app's CSP, WebKit reports a style-src-attr violation and a console error for its own styling of a native <select>, and two style-src-elem violations when the drop-down is opened. A bare-page check confirmed both and that the control looks and behaves the same, closed and open. Browser tests accept exactly the style-src-attr violation and its console error, in WebKit only, and no test opens a native drop-down; a test that does extends this exception under this decision. Rejected: loosening style-src-attr in the CSP, and a custom drop-down, which loses native accessibility and right-to-left behaviour. |
| D112 | Intended HTTP failures in browser tests: a test that deliberately answers with a failure status lists that status in `allowedHttpStatuses`, and only the browser's own console line for that status is ignored; every other console error still fails the test. Tests that don't set it are unchanged. |
| D113 | Smoke test: IAD's human smoke test is `docs/project/SMOKE_TESTING.md`, a contributor document, because every step needs developer tooling until GUI.5's installer. It starts in GUI.2b1, and each screen slice's pull request records a run of it, using the record `pnpm smoke` generates (D117), against a real engine at the vendored IAN commit (D47). GUI.6 adapts it into the recorded smoke test of the installed application, and moves its user-facing part to user documentation then. |
| D114 | Smoke test shape: it follows IAN's smoke test, with numbered steps (Step 1, Step 2… for setup, then Check N1, Check W1… with a letter per screen group, such as Check W1 for Watchlists) that a run's record can name, and expectations judged as a user would see them, never exact data values. It names no slice, milestone or commit; it points to `vendor/ian/SOURCE.md` for the IAN commit. It covers the desktop application only; the browser build with a URL fragment is left to contributors. |
| D115 | Smoke test upkeep: a pull request that adds or changes a screen updates the smoke test in the same pull request. |
| D116 | Documentation layout: docs/ follows IAN's hierarchy. The charter keeps the product direction and boundaries; the preview release is milestone v0.1, whose implementation plan owns the sequence and status table, the units of work, the acceptance criteria and the potential-user answers; each unit's slice plan and records live in a unit folder under docs/project/milestones/v0.1/. Indexes at docs/, docs/project/ and docs/project/milestones/ link to owners and copy no status. Done in GUI.2b1, while there were two slice plans to move. |
| D117 | Smoke test tool: `pnpm smoke --engine <engine checkout>` does the smoke test's setup steps and writes a pre-filled record. It checks that the checkout is at the commit in `vendor/ian/SOURCE.md` and that `ian` resolves; runs `ian db status` read-only against the real database; creates a timestamped throwaway database under `.tmp/smoke/` with the data the setup steps describe; writes `SMOKE_RECORD.md` beside it with each scripted step marked `pass (scripted)` and its command output; and starts `pnpm tauri dev` with the throwaway database set. It stops with a plain message instead of guessing: the engine at another commit, a real database neither `ready` nor `missing`, a refresh with no completed run, or counts other than the setup's. The record's step list is read from SMOKE_TESTING.md, so a step change needs no tool change. The engine checkout is an argument because IAN's launcher does not expose its installation folder; reading package metadata inside uv's tool folder was rejected as another project's internals. Clean-up and the engine-problem restarts stay manual. |
