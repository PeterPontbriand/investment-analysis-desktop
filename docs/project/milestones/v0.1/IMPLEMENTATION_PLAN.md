# Milestone v0.1 — Preview release implementation plan

## At a glance

- **What v0.1 is:** the work from the charter to a preview release that investors can install and try, against IAN's local HTTP API.
- **What v0.1 is not:** anything the [charter](../../CHARTER.md#out-of-scope) puts out of scope.
- **Rules:** [AGENTS.md](../../../../AGENTS.md) and the [charter](../../CHARTER.md) govern the work. Each unit's slice plan, in this folder's unit folders, owns its sub-slices, decisions and acceptance criteria.

## Sequence and status

| Unit | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.0 | [Charter and governance](#gui0-charter-and-governance) | Complete | 2026-10-30 |
| GUI.1 | [Technology decision and scaffold](#gui1-technology-decision-and-scaffold) | Complete | 2026-11-02 |
| GUI.2 | [Read-only screens against IAN API.2](#gui2-read-only-screens) | Complete | 2026-11-15 |
| GUI.3 | [Actions and refresh progress against IAN API.4](#gui3-actions-and-refresh-progress) | Complete | 2026-11-20 |
| GUI.4 | [Help in place against IAN API.6](#gui4-help-in-place) | Complete | 2026-11-25 |
| GUI.5 | [First-run screen and installer](#gui5-first-run-and-installer) | Next | |
| GUI.6 | [Preview release and feedback intake](#gui6-preview-release-and-feedback) | Planned | |

GUI.2, GUI.3, and GUI.4 cannot start until IAN API.2, API.4, and API.6 respectively have merged.

## Units of work

### GUI.0: Charter and governance

- **Problem:** The application needs a separate repository with clear boundaries, user goals, and approval rules before implementation.
- **Decision:** Keep the GUI separate from IAN and make the [charter](../../CHARTER.md) the approved scope for its initial planning branch.
- **Scope:** Repository governance, preview scope, user questions, and mock-ups. No application code or framework scaffold.
- **Branch:** docs/charter, based on the two-file main initialization.
- **Detail:** [This unit](#gui0-charter-and-governance) is owned by this plan.

### GUI.1: Technology decision and scaffold

- **Problem:** Implementation needs an approved desktop shell, interface framework, dependency workflow, tests, and CI gate.
- **Decision:** The technology decisions were approved on 2026-10-31 and are recorded in the [GUI.1 slice plan](gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md).
- **Scope:** Record the technology decisions, create the approved scaffold, and define the unit's tests and CI gate. The gate includes documentation checks written in the repository's own language, equivalent to IAN's scripts/check_doc_links.py (local links and heading anchors resolve; no Mermaid) and scripts/check_sequence_tables.py (sequence-table status order and completion dates), run over every Markdown file, including those GUI.0 added.
- **Branch:** A dedicated implementation branch from main, after GUI.0 has been reviewed.
- **Detail:** [GUI.1 technology and scaffold slice plan](gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md).

The approved technology decisions and their record are in [Appendix A of the GUI.1 slice plan](gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record).

### GUI.2: Read-only screens

- **Problem:** Investors need to inspect analysis documents without learning a command line.
- **Decision:** Build the first read-only screens on IAN API.2 and use only documented API content for all displayed values and labels.
- **Scope:** Show watchlists, recent refreshes, saved runs and the refresh comparison; show run detail with summary, details, diagnostics, and the JSON document.
- **Branch:** `feat/gui-2a1-localization`, then `feat/gui-2a2-engine-adapter`, then `feat/gui-2b1-foundation`, then `feat/gui-2b1a-smoke-engine`, then `feat/gui-2b2-styling`, then `feat/gui-2b3-compare-detail`; GUI.2b needed IAN's refreshes list endpoint, which merged as IAN pull request 252, and IAN's API.8 changes, which merged as IAN pull request 255.
- **Detail:** [GUI.2 read-only screens slice plan](gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md).

### GUI.3: Actions and refresh progress

- **Problem:** Users need to manage their saved tickers and follow long-running refreshes.
- **Decision:** Add state-changing actions and refresh controls through IAN's action requests only, in four sub-slices, after one small additive IAN slice that serves what the forms and the progress screen need.
- **Scope:** Analyze a ticker with chosen strategies; create and edit watchlists; refresh with progress reporting and a stop control.
- **Branch:** `feat/gui-3a-watchlist-actions`, then `feat/gui-3b-selection-form`, then `feat/gui-3c-refresh-progress`, then `feat/gui-3d-analyze`; GUI.3b needs the IAN slice named in the slice plan.
- **Detail:** [GUI.3 actions and refresh progress slice plan](gui-3/GUI_3_ACTIONS_AND_REFRESH_PROGRESS_SLICE_PLAN.md).

### GUI.4: Help in place

- **Problem:** New investors need explanations without leaving the application.
- **Decision:** Load all analysis explanations and term links from IAN's /v1/help endpoints, in three sub-slices: ticker details (GUI.4a), term popups (GUI.4b) and help panel content (GUI.4c). Engine prerequisites: API.6 (the help endpoints), API.15 (instrument profiles) and API.16 (the ticker check on adding entries), all merged.
- **Scope:**
  - **Term help:** Show a short definition popup on hover or keyboard focus; open a help panel on click with the full entry, linked terms, and longer guide. Make the same help available through explicit controls on touch screens. Keep help links inside the application; optional further-reading links may open externally. A run's own derivation stays in its Details view.
  - **The application's own labels:** GUI.4 also decides whether the application's own labels that the comparison and run detail show with no term id ("Saved", "As of", "Saved by", "Warnings", "Limitations", "Not run", "Refresh comparison" and "Ad hoc entries") get help; IAN's glossary has an "As-of Date" term, for example (D165 in the [GUI.2 read-only screens slice plan](gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record)). The project owner decides it before GUI.4b.
  - **Ticker details:** GUI.4a gives any ticker cell, and the headings that name a ticker, a preview and a details panel from the engine's instrument profiles (IAD issue #19).
  - **Help screen:** the engine's guides and glossary on a Help screen, with in-application links (D369 in the [GUI.4 slice plan](gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started)).
  - **Getting started:** a screen first in the sidebar that says what the application does and does not do and what each screen is for, and links the engine's Beginner's Guide (IAD issue #32, D371 to D373).
- **Branch:** `feat/gui-4a-ticker-details`, then `feat/gui-4b-term-popups`, then `feat/gui-4c1-venue-help`, then `feat/gui-4c2-help-content`.
- **Detail:** [GUI.4 help in place slice plan](gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md).

### GUI.5: First-run and installer

- **Problem:** Users need a guided first launch and a predictable way to install the GUI and its pinned engine. A new user who starts with an empty database also finds every screen empty until they have learned enough to fill it.
- **Decision:** The first-run SEC identity is sent to IAN through its API (D341); the sample workspace and in-app Try it guide follow D332–D340. The desktop application and its compatible, pinned IAN version are one tested product release. The approved direction also covers managed engine lifecycle, platform-appropriate signed distribution, confirmed compatible-pair updates, user-data preservation, repeatable release production, clean-machine acceptance and privacy-conscious user-controlled diagnostics (D344–D351). The 2026-11-28 fix-up (D385–D395) adds the engine release the desktop pins, data care through the engine's API, and the order of GUI.5's units.
- **Scope:** Deliver a complete installable desktop-and-engine product: managed engine installation and lifecycle, first-run SEC identity and sample onboarding, platform packaging and signing, updates and recovery, user-data safety, release automation and clean-machine acceptance. Windows, macOS and Linux remain supported. GUI.5 prepares and verifies the product; preview publication and feedback intake belong to GUI.6.
- **Branch:** The implementation sequence and branches are in the [GUI.5 first-run and installer slice plan](gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md). The first-run sample workspace and SEC identity work still require IAN API.20 and API.21 respectively, both merged first. Data safety requires [IAN API.25](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api25--database-care-through-the-api), and release production the first engine pre-release from [IAN API.26](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api26--engine-release-production) (D385, D389, D392).
- **Detail:** [GUI.5 first-run and installer slice plan](gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md).

**Sample workspace, "Try it" guide and SEC identity (approved 2026-11-22)**

The engine's side is recorded in [IAN API plan A.18](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#a18-sample-workspace-and-the-sec-identity-through-the-api-2026-11-22) (W1 to W12) and its interface rules in [IAN Master Plan, Interfaces and separate computers](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/MASTER_PLAN.md#interfaces-and-separate-computers).

| # | Decision |
| :--- | :--- |
| D332 | A new user can start with a sample workspace that the engine keeps apart from their own data, builds on their computer from its own sample definition, and controls entirely (IAN W1 to W4, W6). The application only asks for it through the API and never stores, copies or deletes a database itself. |
| D333 | The engine never works on the pristine sample. Opening the sample workspace always makes a fresh copy, and switching back discards it (IAN W4). The application asks for confirmation before each switch and says what is discarded. |
| D334 | It is unmistakable whenever the sample workspace is in use: a coloured banner on every screen says that anything added there is not kept and has a "Back to my workspace" button, and the window title ends with "(Sample)". The application reads the active workspace from the engine (the `IAN-Workspace` header and `GET /v1/workspace`), so a switch made from the command line shows at once (IAN W8, W9). The banner's term links to IAN's "Sample workspace" glossary entry. |
| D335 | The first-run screen, after the SEC identity, offers "Start with a sample workspace (recommended; takes a few minutes and uses the internet)", checked by default. The build shows its progress the way a refresh does. Rejected: an installer option, because a macOS disk image has no options and the build needs the SEC identity and the network, which the installer does not have. |
| D336 | Settings offers "Open sample workspace", "Back to my workspace", "Rebuild sample workspace" and "Remove sample workspace". This is the one addition to settings beyond the first-run SEC identity screen ([charter](../../CHARTER.md#out-of-scope)). |
| D337 | A failed or partial build shows what failed and offers "Rebuild sample workspace", which the engine starts from nothing (IAN W10). |
| D338 | The "Try it" guide is an in-app panel shown while the sample workspace is open, with about six steps: open the sample watchlist, read a run, compare the refresh, open a term's help, add a ticker, and run a refresh. Its text is the application's own catalog strings, because it describes the application's screens; every analysis term in it links to IAN's help, so no explanation of IAN's is copied. The repository README gets a short "Try it" section that points to it. |
| D339 | Tests: mocked-engine Vitest and Playwright tests for the first-run choice, the banner, every switch, rebuild and remove; one real-engine test in `pnpm test:engine` (outside the gate, D308) that builds the sample and checks the banner and the sample watchlist against what the engine serves, naming no company or number. |
| D340 | `pnpm sandbox` builds its database by asking the engine for the sample workspace, then adds its own `Sandbox Empty` and `Sandbox Scratch` watchlists, so the owner's look shows what a new user sees and the sample has one definition, the engine's. |
| D341 | The SEC identity is sent to the engine through IAN API.21 (IAN W11, W12) instead of being kept in the application's settings and passed to `ian serve` as `SEC_USER_AGENT`, which works only while both run on one computer. It supersedes the "SEC identity" row of the charter's [Appendix A.1](../../CHARTER.md#a1-a-separate-gui-application-over-a-local-api). |
| D342 | No new same-computer assumption: every new interaction with the engine goes through IAN's API, never through environment variables, files or command-line calls, apart from starting `ian serve` ([IAN Master Plan](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/MASTER_PLAN.md#interfaces-and-separate-computers)). The charter records the rule. |
| D343 | Sequence: IAN API.20 and API.21 merge before the GUI.5 sub-slices that use them, and the sample workspace and its guide are in the first installer (an entry criterion of GUI.6). |

The product name was decided in GUI.1 ([D13 in Appendix A of the GUI.1 slice plan](gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record)).

Q4's answer informs the approved signing and trust direction; the product-delivery decisions were approved on 2026-11-27 and are recorded in [Appendix A of the GUI.5 slice plan](gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md#appendix-a--approved-decisions-2026-11-27), and the 2026-11-28 fix-up in [its Appendix B](gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md#appendix-b--approved-decisions-2026-11-28).

### GUI.6: Preview release and feedback

- **Problem:** The preview needs a controlled release and a way for users to report what they cannot understand or complete.
- **Decision:** Publish an accessible preview release with clear pre-release information, a prominent route to the appropriate platform download, and an easy feedback path (D352, recorded in [Appendix A of the GUI.5 slice plan](gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md#d352--make-preview-downloads-and-feedback-accessible-gui6)). Provide a user-controlled, privacy-conscious diagnostic-report capability (D351).
- **Entry criterion:** GUI.5's complete installable desktop-and-engine product has met its installed-artifact acceptance criteria. The first installer includes the sample workspace and Try it guide (D343).
- **Scope:** Publish preview builds and release information, explain the pre-release status, provide a prominent accessible download route and feedback intake, and plan a diagnostic report that users can produce and choose to share without telemetry or automatic transmission. Before preview builds are published, run and record a human smoke test of the installed application that walks through the preview's screens against a real engine started by the application. It is the human end-to-end check of IAN's local HTTP API, which [IAN's smoke test](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/SMOKE_TESTING.md) does not cover. Quitting on macOS while a refresh runs is tracked in [issue 24](https://github.com/PeterPontbriand/investment-analysis-desktop/issues/24); it waits for a Mac and is run then.
- **Open decision:** What becomes of [docs/project/SMOKE_TESTING.md](../../SMOKE_TESTING.md) (D310 in the [GUI.4 slice plan](gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#appendix-a-2026-11-20-decision-record)). It is no longer maintained per pull request. The expected answer is a short checklist for the installed application (the installer, the first start, the engine found, and the macOS quit check of [issue 24](https://github.com/PeterPontbriand/investment-analysis-desktop/issues/24)), run once per release, but GUI.6 decides.
- **Branch:** A dedicated release branch or tag from the accepted GUI implementation.
- **Detail:** ⚠ no slice plan yet.

## Acceptance criteria

- The preview has screens for ticker analysis with chosen strategies, watchlist creation and editing, refresh progress and stop, refresh comparison, run detail (summary, details, diagnostics, and JSON), first-run SEC identity and sample workspace choice, the sample workspace settings, the "Try it" guide, and installation.
- Whenever the sample workspace is active, every screen shows it and says that anything added there is not kept (D334); the application never stores, copies or deletes a database itself (D332).
- Every displayed financial number, label, status, code, and unit comes from an IAN API document; display formatting follows that document's unit.
- No GUI operation reads IAN's database, files, or Python modules.
- Every displayed analysis term, label, status, acronym, and code explains itself in place from IAN /v1/help. Hover or keyboard focus shows the short definition, and clicking opens the full help entry and guide with in-app links.
- The GUI contains no financial formula or strategy-specific rendering contract. New IAN strategies use the same generic API-driven presentation.
- The preview excludes local-model synthesis, general settings editing beyond the first-run SEC identity screen and the sample workspace controls (D336), database maintenance, and charts.
- GUI.2, GUI.3, and GUI.4 begin only after IAN API.2, API.4, and API.6 respectively merge.
- The first-run screen sends the user's SEC identity to the engine through IAN's API (D341).
- GUI.1 records the approved technology choices and its test and CI gates, including the documentation checks.
- The application is locale-ready as recorded in [Appendix D of the GUI.1 slice plan](gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-d-localization-readiness-decision-2026-11-08): adding an engine locale needs no application code change, and the application's own strings are catalog data.

## Questions for potential users before GUI.2 scope is fixed

Answers recorded on 2026-11-02.

Q1. Which computer would you use it on (Windows, Mac or other), and where did you stop last time you looked at the project?

A1. Windows & Mac. Stopped after reading the GitHub main page with little click-through. Might have been before latest changes to GitHub main page.

(Project owner insists that Linux compatibility be maintained)

Q2. Would you rather analyze one ticker at a time, or keep a list and check it periodically?

A2. Both, but if only one option is possible, then list.

Q3. In the comparison screen, what is missing or confusing? Which column would you look at first?

A3. "Acme Corp (ACME) — Graham Number" first, then, oddly, the large text in the center column "61.20 USD".

Q4. Would you install a desktop app that sets up its own engine in the background? Would an "unrecognized app" warning stop you?

A4. Yes, and yes with slight misgivings.

Q5. Of these, which would you most want next: Altman Z, Beneish M, EV/EBITDA and FCF yield, Interest Coverage, ROIC, or Magic Formula ranking?

A5. EV/EBITDA and FCF yield - supports cross-checking valuation from two independent angles rather than relying on a single accounting anchor (Graham Number).

Q6. Do you have, or want, a local AI model?

A6. Not yet, but very interested in exploring this.
