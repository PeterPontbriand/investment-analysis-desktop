# GUI.1 — Technology and scaffold slice plan

## At a glance

- **What GUI.1 is:** the approved technology choices, then the scaffold, tooling, tests, and CI gate built in two sub-slices.
- **What GUI.1 is not:** an API adapter, fixtures derived from IAN, launching the engine, or screens beyond one static screen.
- **Rules:** [AGENTS.md](../../AGENTS.md) and the [project charter](CHARTER.md) govern the work. The GUI uses IAN's versioned `/v1` API for engine content and does no financial calculations.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.1a | [Tooling and documentation checks](#gui1a--tooling-and-documentation-checks) | Next | |
| GUI.1b | [Tauri shell and shell smoke test](#gui1b--tauri-shell-and-shell-smoke-test) | Planned | |

## Sub-slices

### GUI.1a — Tooling and documentation checks

- **Problem:** Contributors need a reproducible frontend workflow and a local and CI quality gate before shell integration.
- **Decision:** Establish the approved Vue, TypeScript, package, lint, formatting, testing, documentation-check, and CI toolchain without Tauri or Rust.
- **Scope:** pnpm, Node 24 LTS, and a checked-in lockfile pinned as in D3; a Vue 3 and Vite app with one static screen as in D9; `vue-tsc`, ESLint, and Prettier as in D10, including the import rule in D20; a Vitest component test; Playwright browser tests in Chromium and WebKit against a mocked API as in D21; TypeScript documentation checks as in D11; `pnpm gate` as in D15; the `quality` CI aggregator fed by Windows and macOS jobs as in D14; Dependabot for GitHub Actions only as in D17; and repository layout as in D16. These decisions are recorded in [Appendix A](#appendix-a-2026-10-31-decision-record). Update `AGENTS.md` with the technology-specific development rules GUI.1a establishes.
- **Branch:** `docs/gui-1-slice-plan` owns this plan; implementation proceeds on the approved GUI.1 branch from `main` after this plan is accepted.
- **Detail:** This plan owns the [GUI.1a file scope](#gui1a-file-scope) and [GUI.1a acceptance criteria](#gui1a-acceptance-criteria).

### GUI.1b — Tauri shell and shell smoke test

- **Problem:** The approved scaffold needs a desktop shell and a smoke test against the real application window.
- **Decision:** Add Tauri 2 under `src-tauri/`, with Rust, linting, and shell testing pinned and gated as recorded below.
- **Scope:** Tauri 2 under `src-tauri/` as in D1; Rust pinned as in D3; `cargo fmt --check` and `cargo clippy` with warnings treated as errors as in D10; the bundle identifier and product name as in D12 and D13; a WebdriverIO shell smoke test using the embedded provider as in D4; the feature-gated WebDriver plugin and release-build check as in D5; and gate and CI additions for these checks. These decisions are recorded in [Appendix A](#appendix-a-2026-10-31-decision-record).
- **Branch:** Continues the approved GUI.1 implementation branch from `main`.
- **Detail:** This plan owns the [GUI.1b file scope](#gui1b-file-scope) and [GUI.1b acceptance criteria](#gui1b-acceptance-criteria).

## Scope limits

- One application package at the repository root; no pnpm workspace until a second package exists.
- One window and one static screen with the product name and a pre-release notice.
- No API adapter, IAN-derived fixtures, engine launch, or invented endpoint shapes.
- No screens beyond the static screen, and no analysis content sourced outside an IAN API document.
- OpenAPI type generation is deferred until IAN API.2 publishes `openapi.json`; no placeholder document or hand-written API types.
- Help rendering and touch-screen help are implemented in GUI.4.
- Remote engine access, an engine-hosting service, and mobile clients remain future work; the adapter and platform boundaries in D19 and D20 of [Appendix A](#appendix-a-2026-10-31-decision-record) keep these options open.

## Acceptance criteria

### GUI.1a file scope

- Root package metadata, pnpm lockfile, `.node-version`, and `engines` pin Node 24 LTS and pnpm as recorded in D3.
- Vue 3 and Vite scaffold with a single static screen; no `src-tauri/` or Rust files.
- ESLint flat configuration, Prettier configuration, Vue and TypeScript checking, and the ESLint rule preventing imports from `@tauri-apps/*` outside the platform module boundary.
- Vitest component test and Playwright Chromium and WebKit browser tests for the static screen.
- TypeScript documentation checks under `tools/` for repository Markdown links, heading anchors, Mermaid prohibition, and sequence-table rules.
- `pnpm gate`, GitHub Actions Windows and macOS jobs with a `quality` aggregator, and Dependabot limited to GitHub Actions.
- Root-level `src/`, `tools/`, and `tests/` layout, and the GUI.1a development rules in `AGENTS.md`.

### GUI.1a acceptance criteria

- Frozen-lockfile installation, Vue type checking, lint, formatting, component tests, browser tests, and documentation checks run from the local gate.
- Documentation checks cover every Markdown file in the repository and enforce the link, heading-anchor, no-Mermaid, and sequence-table rules in D11.
- Windows and macOS CI jobs feed one `quality` job; it passes only when both platform jobs pass, with no path filters or conditional skips.
- The ruleset is configured to require `quality` after the first workflow run.
- No Tauri, Rust, API adapter, IAN-derived fixtures, or engine launch is introduced in this sub-slice.

### GUI.1b file scope

- `src-tauri/` Tauri 2 application, configuration, and Rust toolchain pin.
- Tauri application identifier and product name configuration.
- WebdriverIO configuration and the embedded-provider shell smoke test.
- Cargo feature configuration that enables the WebDriver plugin only for end-to-end builds, plus the release-build exclusion check.
- Local gate and Windows/macOS CI additions for Rust formatting, Clippy, shell smoke testing, and release-build verification.

### GUI.1b acceptance criteria

- The desktop shell opens the single static screen and uses the approved bundle identifier and product name.
- `cargo fmt --check` and `cargo clippy` run with warnings treated as errors.
- WebdriverIO runs the real-shell smoke test on Windows and macOS with the embedded provider.
- The WebDriver plugin is off by default, enabled only for the end-to-end build, and absent from a release build.
- `pnpm gate` and the `quality` CI job cover all checks that apply to GUI.1a and GUI.1b.

## Background

Users are not expected to run IAN on phones. Mobile use means viewing a remote or hosted engine. A web UI in Tauri can later serve as both a hosted web app and a Tauri mobile viewer. The platform module and configurable engine base URL preserve those options without making them part of GUI.1.

## Appendix A: 2026-10-31 decision record

Approved by the project owner on 2026-10-31.

| # | Decision |
| :--- | :--- |
| D1 | Desktop shell: Tauri 2. |
| D2 | Interface framework: Vue 3 with TypeScript single-file components; `vue-tsc --noEmit` runs in the gate. |
| D3 | Toolchains: pnpm, pinned through the `packageManager` field in package.json, with the lockfile checked in and installed in frozen mode. Node 24 LTS, pinned through `.node-version` and `engines`. Rust, pinned through `rust-toolchain.toml`. The implementing sub-slice chooses the exact versions and records them in those files. |
| D4 | Tests: Vitest for unit and component tests. WebdriverIO with `@wdio/tauri-service` and its embedded provider, on Windows and macOS, used only for smoke tests of the real shell (see D21). The embedded provider is the only free provider on macOS, and on Windows it avoids matching the Edge WebDriver version. |
| D5 | The `tauri-plugin-wdio-webdriver` plugin is compiled only when a Cargo feature, off by default, is enabled for the end-to-end build. The gate checks that a release build does not contain it. A shipped app never exposes a WebDriver endpoint. |
| D6 | openapi-typescript is approved for generating types from IAN's openapi.json. It is installed in GUI.2, once IAN API.2 publishes that document; the generated types are then checked in and a drift check is added. Until then: no placeholder OpenAPI document and no hand-written API types. |
| D7 | Help Markdown: markdown-it with DOMPurify, a strict element and attribute allowlist, and link handling owned by the application (IAN term and document links open in the app; unsafe schemes are rejected). Installed in GUI.4. |
| D8 | Touch-screen help: every help affordance is an explicit, keyboard-accessible control that also works by touch. Built in GUI.4. |
| D9 | Scaffold content: one window with one static screen owned by the application (product name and a pre-release notice), one component test, browser tests of that screen, and one shell smoke test. No API adapter, no launch of ian serve, no fixtures derived from IAN, and no invented endpoint shapes. |
| D10 | Lint and format: ESLint (flat config, typescript-eslint, eslint-plugin-vue) and Prettier; `cargo fmt --check` and `cargo clippy` with warnings treated as errors. |
| D11 | Documentation checks: TypeScript files under tools/, run directly by Node 24's built-in type stripping (no tsx or ts-node), over every Markdown file in the repository. They are equivalent to IAN's scripts/check_doc_links.py (local links and heading anchors resolve; no Mermaid) and scripts/check_sequence_tables.py (sequence-table status order and completion dates). |
| D12 | Bundle identifier: `io.github.peterpontbriand.investment-analysis-desktop`. Tauri names the per-user data folder after it, so changing it later would mean migrating users' settings. |
| D13 | Product name: Investment Analysis Desktop. It is used for the window title, Tauri's productName and the Start-menu entry. This replaces the Start-menu name decision previously listed for GUI.5. |
| D14 | CI: one aggregator job named `quality` is the only required status check. It is fed by Windows and macOS jobs and passes only if they all pass. No workflow path filters or conditional skips. The project owner adds `quality` to the main ruleset after its first run. No Linux build. |
| D15 | Local gate: `pnpm gate` runs every step that can run on the development machine, including the shell smoke test on Windows. It writes `gate-output.txt` (git-ignored) and ends with a summary. |
| D16 | Layout: one package at the repository root, with src/, src-tauri/, tools/ and tests/. No pnpm workspace until a second package exists. |
| D17 | Dependency updates: Dependabot for github-actions only. Its pull requests are never merged; each bump is reapplied on a project branch. npm and Cargo upgrades happen only through approved slices. |
| D18 | These decisions are recorded in this slice plan, and the charter links to it. The branch docs/gui-1-proposed-decisions is deleted unmerged after this plan merges. |
| D19 | Engine address: the API adapter takes the engine's base URL and credential from configuration. The desktop supplies 127.0.0.1 and the per-launch token. No other code assumes a localhost engine or that the application launched it. This applies from GUI.2, when the adapter is built. It keeps remote engine access, a hosting service and mobile viewers possible without a rewrite. |
| D20 | Platform module: every Tauri API call goes through one platform module that also has a browser implementation. An ESLint rule forbids importing `@tauri-apps/*` anywhere else; the rule lands in GUI.1a, and the module is created when the application first needs a Tauri call. The UI therefore runs in a plain browser, as a hosted web app or the browser tests need. |
| D21 | Browser tests: Playwright runs the UI in Chromium and WebKit against a mocked API, and carries most UI testing. Chromium and WebKit are the engines behind Tauri's Windows and macOS webviews. WebdriverIO keeps only the shell smoke test. |

### Rejected alternatives

Reassessed on 2026-10-31, including suitability for mobile.

- Electron: the same Chromium on every platform and the most mature option, but large installers and no mobile build.
- Wails: v3 is in beta; its mobile support is experimental.
- Flutter: the strongest native mobile-and-desktop option, but it uses Dart, its desktop accessibility is weaker, its Markdown rendering is third-party, and it offers no clean route to a hosted web app.
- React Native with Microsoft's Windows and macOS targets: the desktop targets trail React Native's own releases.
- Compose Multiplatform, .NET MAUI, Avalonia and Qt: each needs a second UI for a hosted web app.
- Rust-native UI kits (Slint, Dioxus, egui): too young.
- Python toolkits: this repository has no Python, and the charter's Appendix A.1 rejects a Python GUI.
- React and Svelte were considered for the UI framework; Vue was kept.
