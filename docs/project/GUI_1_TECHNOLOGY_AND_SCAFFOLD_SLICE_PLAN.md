# GUI.1 — Technology and scaffold slice plan

## At a glance

- **What GUI.1 is:** the approved technology choices, then the scaffold, tooling, tests, and CI gate built in two sub-slices.
- **What GUI.1 is not:** an API adapter, fixtures derived from IAN, launching the engine, or screens beyond one static screen.
- **Rules:** [AGENTS.md](../../AGENTS.md) and the [project charter](CHARTER.md) govern the work. The GUI uses IAN's versioned `/v1` API for engine content and does no financial calculations.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.1a | [Tooling and documentation checks](#gui1a--tooling-and-documentation-checks) | Complete | 2026-10-31 |
| GUI.1b | [Tauri shell and shell smoke test](#gui1b--tauri-shell-and-shell-smoke-test) | Complete | 2026-11-01 |

## Sub-slices

### GUI.1a — Tooling and documentation checks

- **Problem:** Contributors need a reproducible frontend workflow and a local and CI quality gate before shell integration.
- **Decision:** Establish the approved Vue, TypeScript, package, lint, formatting, testing, documentation-check, and CI toolchain without Tauri or Rust.
- **Scope:** pnpm, Node 26 LTS, and a checked-in lockfile pinned as in D3 and D23; a Vue 3 and Vite app with one static screen as in D9; `vue-tsc`, ESLint, and Prettier as in D10, including the import rule in D20; a Vitest component test; Playwright tests of the static screen in Chromium and WebKit with no mocked API as in D21; TypeScript documentation checks as in D11; `pnpm gate` as in D15; the `quality` CI aggregator fed by Windows, macOS, and Linux jobs as in D14 and D22; Dependabot for GitHub Actions only as in D17; and repository layout as in D16. These decisions are recorded in [Appendix A](#appendix-a-2026-10-31-decision-record) and [Appendix B](#appendix-b-gui1a-implementation-decisions-2026-10-31). Update `AGENTS.md` with the technology-specific development rules GUI.1a establishes.
- **Branch:** `feat/gui-1a-tooling`, from main after this plan merges; its own pull request.
- **Detail:** This plan owns GUI.1a's [file scope](#file-scope) and [acceptance criteria](#acceptance-criteria).

### GUI.1b — Tauri shell and shell smoke test

- **Problem:** The approved scaffold needs a desktop shell and a smoke test against the real application window.
- **Decision:** Add Tauri 2 under `src-tauri/`, with Rust, linting, and shell testing pinned and gated as recorded below.
- **Scope:** Tauri 2 under `src-tauri/` as in D1; Rust pinned as in D3; `cargo fmt --check` and `cargo clippy` with warnings treated as errors as in D10; the bundle identifier and product name as in D12 and D13; a WebdriverIO shell smoke test using the embedded provider on Windows and macOS as in D4, with the Linux provider confirmed in GUI.1b before the Linux smoke test is implemented (D22); the feature-gated WebDriver plugin and release-build check as in D5; and gate and CI additions for these checks. These decisions are recorded in [Appendix A](#appendix-a-2026-10-31-decision-record).
- **Branch:** `feat/gui-1b-tauri-shell`, from main after GUI.1a merges; its own pull request.
- **Detail:** This plan owns GUI.1b's [file scope](#file-scope-1) and [acceptance criteria](#acceptance-criteria-1).

## Scope limits

- One application package at the repository root; no pnpm workspace until a second package exists.
- One window and one static screen with the product name and a pre-release notice.
- No API adapter, IAN-derived fixtures, engine launch, or invented endpoint shapes.
- No screens beyond the static screen, and no analysis content sourced outside an IAN API document.
- OpenAPI type generation is deferred until IAN API.2 publishes `openapi.json`; no placeholder document or hand-written API types.
- Help rendering and touch-screen help are implemented in GUI.4.
- Playwright tests against a mocked API begin when GUI.2 builds the API adapter (D19, D21).
- The `src/platform/` module itself is created when the application first needs a Tauri call (D20).
- Remote engine access, an engine-hosting service, and mobile clients remain future work; the adapter and platform boundaries in D19 and D20 of [Appendix A](#appendix-a-2026-10-31-decision-record) keep these options open.

## GUI.1a detail

### File scope

- Root package metadata, pnpm lockfile, `.node-version`, and `engines` pin Node 26 LTS and pnpm as recorded in D3 and D23.
- `pnpm-workspace.yaml` holding pnpm settings only, with no package list (G19).
- Vue 3 and Vite scaffold with a single static screen; no `src-tauri/` or Rust files.
- ESLint flat configuration, Prettier configuration, Vue and TypeScript checking, and the ESLint rule preventing imports from `@tauri-apps/*` outside `src/platform/`.
- Vitest component test and Playwright tests of the static screen in Chromium and WebKit, with no mocked API.
- TypeScript documentation checks under `tools/` for repository Markdown links, heading anchors, Mermaid prohibition, and sequence-table rules.
- `pnpm gate`, GitHub Actions Windows, macOS, and Linux jobs with a `quality` aggregator, and Dependabot limited to GitHub Actions (D14, D22).
- `.gitattributes`, `.gitignore`, and `docs/project/CHARTER.md` updates for line endings, generated output, and Linux support.
- Root-level `src/`, `tools/`, and `tests/` layout, and the GUI.1a development rules in `AGENTS.md`.

### Acceptance criteria

- Frozen-lockfile installation, Vue type checking, lint, formatting, component tests, browser tests, and documentation checks run from the local gate.
- The ESLint rule forbids importing `@tauri-apps/*` outside `src/platform/`.
- Playwright tests the static screen in Chromium and WebKit with no mocked API.
- Documentation checks cover every Markdown file in the repository and enforce the link, heading-anchor, no-Mermaid, and sequence-table rules in D11.
- Windows, macOS, and Linux CI jobs feed one `quality` job; it passes only when all three platform jobs pass, with no path filters or conditional skips (D14, D22).
- After the first workflow run, the project owner adds `quality` as a required check in the main ruleset (D14).
- Each documentation check has tests showing it fails on a broken local link, a missing heading anchor, a Mermaid block, and a sequence table that breaks the status-order or completion-date rules. Each test also shows the check passes on a valid file.
- No Tauri, Rust, API adapter, IAN-derived fixtures, or engine launch is introduced in this sub-slice.

## GUI.1b detail

### File scope

- `src-tauri/` Tauri 2 application, configuration, and Rust toolchain pin.
- Tauri application identifier and product name configuration.
- WebdriverIO configuration and the embedded-provider shell smoke test.
- Cargo feature configuration that enables the WebDriver plugin only for end-to-end builds, plus the release-build exclusion check.
- Local gate and Windows, macOS, and Linux CI additions for Rust formatting, Clippy, shell smoke testing, and release-build verification (D4, D14, D22).

### Acceptance criteria

- The desktop shell opens the single static screen and uses the approved bundle identifier and product name.
- `cargo fmt --check` and `cargo clippy` run with warnings treated as errors.
- WebdriverIO runs the real-shell smoke test on Windows and macOS with the embedded provider; GUI.1b confirms which WebdriverIO provider supports Linux before implementing the Linux smoke test (D4, D22).
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
| D22 | Linux is a supported platform. It amends D14: CI adds a Linux job feeding `quality`. It amends D4: the GUI.1b shell smoke test also runs on Linux, and GUI.1b confirms which WebdriverIO provider supports Linux before implementing it. |
| D23 | Node: Node 26, the current LTS line since 2026-10-28, replaces Node 24 LTS. It amends D3 (`.node-version` and `engines` pin Node 26) and D11 (the documentation checks run with Node 26's built-in type stripping). `@types/node` follows the pinned Node major version. |

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

## Appendix B: GUI.1a implementation decisions (2026-10-31)

| # | Decision |
| :--- | :--- |
| G1 | `.gitattributes` sets `* text=auto eol=lf`; Prettier uses `endOfLine: "lf"`. |
| G2 | `.gitignore` ignores `gate-output.txt`, `playwright-report/`, `test-results/`, and `blob-report/`. |
| G3 | Prettier formats code and configuration only; `.prettierignore` excludes Markdown and `docs/design/*.html`. |
| G4 | Both documentation checks scan every tracked Markdown file and every untracked, unignored Markdown file via `git ls-files --cached --others --exclude-standard`; outside Git they scan all on-disk Markdown except `node_modules`. |
| G5 | Shared Markdown listing and both checks live in `tools/docs/` and run directly with Node 26 type stripping (D23); `tools/tsconfig.json` enables `noEmit`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, and `verbatimModuleSyntax`, and the gate runs its TypeScript check. |
| G6 | Vitest is the unit-test runner; the Vue Test Utils component test is in `tests/unit/` with jsdom, tool tests are in `tests/tools/`, and Playwright tests are in `tests/browser/`. |
| G7 | Playwright tests the production build served by `vite preview`; Chromium and WebKit run on every platform, including Windows. |
| G8 | The window, document, and heading say `Investment Analysis Desktop`; its only other text is the approved pre-release notice. No routing, state management, or styling framework is added. |
| G9 | `pnpm gate` runs `node tools/gate.ts`: frozen install, Playwright browser install, Prettier, ESLint, Vue type check, tools type check, both documentation checks, Vitest, Vite build, and Playwright in order; it logs to ignored `gate-output.txt`, reports every step and duration, stops if install fails, and otherwise runs all steps and exits non-zero on failure. No step spawns through a shell; pnpm steps run the program named by `npm_execpath`. |
| G10 | CI runs Windows, macOS, and Linux jobs, uploads each `gate-output.txt` even on failure, and uses an always-running `quality` aggregator that fails unless all platform jobs succeed; triggers target main without path filters or conditional skips, with actions pinned by major tag. Linux installs Playwright system dependencies before the gate. |
| G11 | One root package pins the approved Vue, Vite, ESLint, Prettier, Vitest, Vue Test Utils, jsdom, Playwright, and Node types dependencies exactly at their latest stable versions. `vue` is the only runtime dependency. `@types/node` follows the pinned Node major version (D23). TypeScript is held at the newest version supported by typescript-eslint and vue-tsc; TypeScript 7.0.2 was incompatible with both on 2026-10-31. |
| G16 | Linux is supported and is included in GUI.1 CI; GUI.1b confirms a Linux-capable WebdriverIO provider before implementing its shell smoke test. |
| G17 | Linux package format remains a GUI.5 decision; candidates include AppImage, `.deb`, and Flatpak. |
| G18 | The gate installs Chromium and WebKit; Linux CI installs their system libraries before the gate. |
| G19 | `pnpm-workspace.yaml` holds pnpm settings only and lists no packages, so the repository stays one package (D16). It sets `verifyDepsBeforeRun: false`, so running a script never installs dependencies or changes the lockfile; the gate's frozen install is the first install. |

Numbering follows the approval discussion; G12–G15 were operational or withdrawn and are not recorded.

## Appendix C: GUI.1b implementation decisions (2026-11-02)

Approved by the project owner on 2026-11-02.

| # | Decision |
| :--- | :--- |
| T1 | Pin Rust to 1.99.1 in `rust-toolchain.toml`, with `rustfmt` and `clippy` components. |
| T2 | Pin `tauri` 2.12.5, `tauri-build` 2.7.4, and `@tauri-apps/cli` 2.12.4 exactly; check in `src-tauri/Cargo.lock`. Pin the WebdriverIO stack exactly: `@wdio/tauri-service` 1.5.1, CLI/local-runner/Mocha framework 9.32.0, and globals 9.31.3. Pin `tauri-plugin-wdio-webdriver` 1.5.1. |
| T3 | Do not install `@tauri-apps/api`; the static screen makes no Tauri API call, and `src/platform/` remains deferred until an API call is needed. |
| T4 | The Windows and Linux shell smoke tests passed with the embedded provider. Linux was confirmed in Actions run [41379017399](https://github.com/PeterPontbriand/investment-analysis-desktop/actions/runs/41379017399), so the Linux-only `tauri-driver` and WebKitWebDriver fallback was not needed. |
| T5 | Linux CI installs WebKitGTK 4.1 and its companion development packages, then runs `pnpm gate` under `xvfb-run`. |
| T6 | The gate runs `cargo tree --locked` with default features and fails if `tauri-plugin-wdio-webdriver` appears. No release build or bundle is run before GUI.5. |
| T7 | Configure one resizable window titled “Investment Analysis Desktop” at 1200 by 800 with a minimum size of 800 by 600. Use the strict CSP `default-src 'self'`; GUI.2 may widen `connect-src`. Tauri devtools remain available only in debug builds. |
| T8 | The default window capability grants no Tauri permissions. The WebDriver permission is present only in the end-to-end capability selected by the `e2e` Cargo feature. |
| T9 | Generate placeholder desktop and platform icons with `tauri icon` from `src-tauri/icons/placeholder.svg`. GUI.5 owns the real icon. |
| T10 | Cache Cargo dependencies and build outputs with `Swatinem/rust-cache@v2`. |
| T11 | Append gate checks in this order: Rust format, Clippy with warnings denied, default Cargo tree exclusion, feature-enabled debug Tauri build, and the real-window smoke test. CI runs the full gate on Windows, macOS, and Linux and feeds `quality`, with no path filters or platform skips. The embedded provider does not require Edge or Gecko driver installation. |
| T12 | Windows, macOS, and Linux CI passed in Actions run [41379017399](https://github.com/PeterPontbriand/investment-analysis-desktop/actions/runs/41379017399). GUI.1b and GUI.1 are complete as of 2026-11-01. |
| T13 | CI runs on pushes to `main`, pull requests to `main`, and manual dispatch. |
| T14 | pnpm 12 `allowBuilds` denies `edgedriver` and `geckodriver` while allowing `esbuild`. |
