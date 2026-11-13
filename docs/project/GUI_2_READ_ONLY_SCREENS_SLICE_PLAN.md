# GUI.2 — Read-only screens slice plan

## At a glance

- **What GUI.2 is:** the first screens that show engine content: watchlists, recent refreshes, the refresh comparison, and run detail. It also adds what every later unit needs: starting `ian serve`, the API adapter, generated API types, locale handling, and the localization retrofit of the GUI.1 code.
- **What GUI.2 is not:** actions that change anything (GUI.3), help popups and the help panel (GUI.4), the first-run screen or the installer (GUI.5), or any financial calculation.
- **Rules:** [AGENTS.md](../../AGENTS.md) and the [project charter](CHARTER.md) govern the work. The decisions in [Appendix A](#appendix-a-2026-11-10-decision-record) and the localization decisions in [Appendix D of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-d-localization-readiness-decision-2026-11-08) apply to all GUI.2 code.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.2a1 | [Localization retrofit](#gui2a1--localization-retrofit) | Complete | 2026-11-11 |
| GUI.2a2 | [Engine launch and API adapter](#gui2a2--engine-launch-and-api-adapter) | Complete | 2026-11-13 |
| GUI.2b | [Read-only screens](#gui2b--read-only-screens) | Planned | |

## Sub-slices

### GUI.2a1 — Localization retrofit

- **Problem:** The GUI.1 code has literal English strings, a fixed `lang`, no text direction and no check for physical CSS properties, and GUI.2 adds the first real screens.
- **Decision:** Retrofit the GUI.1 code before any engine work: a message catalog, locale state, `lang`, `dir` and page title that follow the locale, logical-properties linting, and tests that read text from the catalog (D52, D39 to D42, D54, D59 to D63).
- **Scope:** vue-i18n and the message catalog (D39, D61); locale state, `lang`, `dir` and the page title (D62, D63); vue-router (D42); stylelint with a logical-properties rule (D40, D54); retrofit items R1 to R4 and R6 to R8 of [Appendix D of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#retrofit-items-against-the-merged-gui1-code); the test-only `ar-XB` pseudo-locale and its browser-test build (D60); and CSP enforcement in browser tests (D59).
- **Branch:** `feat/gui-2a1-localization`, from the dependency commits; its own pull request.
- **Detail:** This plan owns GUI.2a1's [file scope](#file-scope) and [acceptance criteria](#acceptance-criteria).

### GUI.2a2 — Engine launch and API adapter

- **Problem:** No screen can show engine content until the application can start the engine, call its API with typed requests, and send and honour a locale.
- **Decision:** Start `ian serve` from Rust, call the API from the webview with `fetch` through a typed adapter, and vendor IAN's OpenAPI document (D35 to D38, D41, D53, D55 to D58, D64 to D67).
- **Scope:** the engine launch in `src-tauri/` and the `src/platform/` module (D35, D53, D55, D56, D58); the CSP and allowed-origin settings (D36, D55); the vendored OpenAPI document, its source record, generated types and drift check (D37, D65); the `fetch` adapter (D38); `Accept-Language` and `Content-Language` handling (D41, D64); retrofit item R5 (the window title, D62); the D51 peer entry; the stub engine and its shell smoke test (D57); and the `/v1/info` placeholder screen (D66).
- **Branch:** `feat/gui-2a2-engine-adapter`, from main after GUI.2a1 merges; its own pull request.
- **Detail:** This plan owns GUI.2a2's [file scope](#file-scope-1) and [acceptance criteria](#acceptance-criteria-1).

### GUI.2b — Read-only screens

- **Problem:** Investors need to inspect their watchlists, refreshes and saved runs without a command line.
- **Decision:** Build four read-only screens on the GUI.2a adapter, showing only API content (D32, D43 to D47).
- **Scope:** the watchlists screen (the list and one watchlist's entries), the recent refreshes screen, the refresh comparison screen, and the run detail screen (concise, details and diagnostics text, and the JSON document); code display through help terms (D43); number and date formatting (D44); error and empty states (D45); typed fixtures and browser tests (D46); a recorded manual check against a real engine (D47).
- **Branch:** `feat/gui-2b-screens`, from main after GUI.2a2 merges; IAN's refreshes list endpoint (D34) merged as IAN pull request 252; its own pull request.
- **Detail:** This plan owns GUI.2b's [file scope](#file-scope-2) and [acceptance criteria](#acceptance-criteria-2).

## Scope limits

- Read-only: no request in GUI.2 uses `POST`, `PATCH` or `DELETE`.
- No help popup or help panel. Elements that show a term keep its term id for GUI.4 (D43).
- No pinned engine install, first-run screen or installer; the `ian` executable is found as in D35.
- No IAN process in CI (D47).
- No dependency beyond those named in D37, D39, D40, D42, D53 and D54.
- No release build or bundle, as [AGENTS.md](../../AGENTS.md) requires before GUI.5.
- Choosing a locale is not persisted; persistence is decided in the slice where the language picker first becomes visible (D63).
- IAD has no log file before GUI.5; GUI.5 decides the log file, its location and where the engine-launch lines go (D67).
- Before GUI.2b shows the API's reason messages as given (D45), the GUI.2b decisions confirm that none of them names a command, option or environment variable (D56).

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
- `src/platform/`: the platform module with its Tauri and browser implementations (D20 in [Appendix A of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record), D35, D53, D58).
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
