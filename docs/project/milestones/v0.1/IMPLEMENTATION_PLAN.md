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
| GUI.2 | [Read-only screens against IAN API.2](#gui2-read-only-screens) | Next | |
| GUI.3 | [Actions and refresh progress against IAN API.4](#gui3-actions-and-refresh-progress) | Planned | |
| GUI.4 | [Help in place against IAN API.6](#gui4-help-in-place) | Planned | |
| GUI.5 | [First-run screen and installer](#gui5-first-run-and-installer) | Planned | |
| GUI.6 | [Preview release and feedback intake](#gui6-preview-release-and-feedback) | Planned | |

GUI.2, GUI.3, and GUI.4 cannot start until IAN API.2, API.4, and API.6 respectively have merged.

## Units of work

### GUI.0: Charter and governance

- **Problem:** The application needs a separate repository with clear boundaries, user goals, and approval rules before implementation.
- **Decision:** Keep the GUI separate from IAN and make this charter the approved scope for its initial planning branch.
- **Scope:** Repository governance, preview scope, user questions, and mock-ups. No application code or framework scaffold.
- **Branch:** docs/charter, based on the two-file main initialization.
- **Detail:** [This unit](#gui0-charter-and-governance) is owned by this charter.

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
- **Branch:** `feat/gui-2a1-localization`, then `feat/gui-2a2-engine-adapter`, then `feat/gui-2b1-foundation`, then `feat/gui-2b2-compare-detail`; GUI.2b needed IAN's refreshes list endpoint, which merged as IAN pull request 252, and IAN's API.8 changes, which merged as IAN pull request 255.
- **Detail:** [GUI.2 read-only screens slice plan](gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md).

### GUI.3: Actions and refresh progress

- **Problem:** Users need to manage their saved tickers and follow long-running refreshes.
- **Decision:** Add state-changing actions and refresh controls through IAN API.4 only.
- **Scope:** Analyze a ticker with chosen strategies; create and edit watchlists; refresh with progress reporting and a stop control.
- **Branch:** A dedicated GUI.3 branch after IAN API.4 merges and GUI.1 establishes the scaffold.
- **Detail:** ⚠ no slice plan yet.

### GUI.4: Help in place

- **Problem:** New investors need explanations without leaving the application.
- **Decision:** Load all analysis explanations and term links from IAN's /v1/help endpoints.
- **Scope:** Show a short definition popup on hover or keyboard focus; open a help panel on click with the full entry, linked terms, and longer guide. Make the same help available through explicit controls on touch screens. Keep help links inside the application; optional further-reading links may open externally. A run's own derivation stays in its Details view.
- **Branch:** A dedicated GUI.4 branch after IAN API.6 merges and GUI.1 establishes the scaffold.
- **Detail:** ⚠ no slice plan yet.

### GUI.5: First-run and installer

- **Problem:** Users need a guided first launch and a predictable way to install the GUI and its pinned engine.
- **Decision:** Keep the SEC identity in GUI settings and pass it to ian serve as SEC_USER_AGENT; install the release's pinned IAN version behind the scenes.
- **Scope:** The first-run SEC identity screen and Windows, macOS and Linux installers, using the technology and signing choices approved in GUI.1.
- **Branch:** A dedicated GUI.5 branch after the scaffold decisions and API requirements it consumes are available.
- **Detail:** ⚠ no slice plan yet.

**Decisions to approve before GUI.5**

| Decision | Recommendation and trade-off |
| :--- | :--- |
| Windows and macOS installer formats and signing | Start with a signed Windows installer and a signed, notarized macOS disk image. Signing improves publisher identification and macOS distribution; certificates, notarization, and release steps add recurring cost and operational work. |
| Linux package format | No recommendation yet. Linux became a supported platform in GUI.1 ([D22 in Appendix A of the GUI.1 slice plan](gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record)). Candidates include AppImage, .deb and Flatpak, which differ in distribution reach, sandboxing and update handling. |
| Obtaining uv and pinning IAN | Bundle a pinned uv executable with each installer and install the exact IAN version selected for that GUI release. This avoids an extra user setup step and makes the pair reproducible; each release must update and validate its bundled installer tooling. |
| Update mechanism | Use Tauri's signed updater with explicit user confirmation before installing an update. It gives the application a direct update path; signing keys and release metadata become security-critical operational assets. |

The product name was decided in GUI.1 ([D13 in Appendix A of the GUI.1 slice plan](gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record)).

Answers to Q4 inform the signing decision, so these decisions are made after the user questions, not before GUI.1.

### GUI.6: Preview release and feedback

- **Problem:** The preview needs a controlled release and a way for users to report what they cannot understand or complete.
- **Decision:** Release the application as a preview and collect feedback against the screens and setup flow.
- **Scope:** Publish preview builds, explain the pre-release status, and provide a feedback intake route. Before preview builds are published, run and record a human smoke test of the installed application that walks through the preview's screens against a real engine started by the application. It is the human end-to-end check of IAN's local HTTP API, which [IAN's smoke test](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/SMOKE_TESTING.md) does not cover.
- **Branch:** A dedicated release branch or tag from the accepted GUI implementation.
- **Detail:** ⚠ no slice plan yet.

## Acceptance criteria

- The preview has screens for ticker analysis with chosen strategies, watchlist creation and editing, refresh progress and stop, refresh comparison, run detail (summary, details, diagnostics, and JSON), first-run SEC identity, and installation.
- Every displayed financial number, label, status, code, and unit comes from an IAN API document; display formatting follows that document's unit.
- No GUI operation reads IAN's database, files, or Python modules.
- Every displayed analysis term, label, status, acronym, and code explains itself in place from IAN /v1/help. Hover or keyboard focus shows the short definition, and clicking opens the full help entry and guide with in-app links.
- The GUI contains no financial formula or strategy-specific rendering contract. New IAN strategies use the same generic API-driven presentation.
- The preview excludes local-model synthesis, general settings editing beyond the first-run SEC identity screen, database maintenance, and charts.
- GUI.2, GUI.3, and GUI.4 begin only after IAN API.2, API.4, and API.6 respectively merge.
- The first-run screen stores the user's SEC identity in GUI settings and passes it to ian serve as SEC_USER_AGENT.
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
