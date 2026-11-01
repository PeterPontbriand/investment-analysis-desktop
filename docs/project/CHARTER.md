# Investment Analysis Desktop charter

## At a glance

- This charter establishes the governance and staged scope for a separate desktop application that lets investors use IAN without a command line.
- It covers the preview release and the work needed to reach it; it does not authorize application code, a framework scaffold, or dependency installation.
- The GUI uses only IAN's versioned local HTTP API, displays values and explanations supplied by IAN, and keeps financial calculations in IAN.
- GUI.1 technology decisions were approved on 2026-10-31 and are recorded in the [GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md).

## Sequence and status

| Unit | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.0 | [Charter and governance](#gui0-charter-and-governance) | Complete | 2026-10-30 |
| GUI.1 | [Technology decision and scaffold](#gui1-technology-decision-and-scaffold) | Next | |
| GUI.2 | [Read-only screens against IAN API.2](#gui2-read-only-screens) | Planned | |
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
- **Decision:** The technology decisions were approved on 2026-10-31 and are recorded in the [GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md).
- **Scope:** Record the technology decisions, create the approved scaffold, and define the unit's tests and CI gate. The gate includes documentation checks written in the repository's own language, equivalent to IAN's scripts/check_doc_links.py (local links and heading anchors resolve; no Mermaid) and scripts/check_sequence_tables.py (sequence-table status order and completion dates), run over every Markdown file, including those GUI.0 added.
- **Branch:** A dedicated implementation branch from main, after GUI.0 has been reviewed.
- **Detail:** [GUI.1 technology and scaffold slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md).

The approved technology decisions and their record are in [Appendix A of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record).

### GUI.2: Read-only screens

- **Problem:** Investors need to inspect analysis documents without learning a command line.
- **Decision:** Build the first read-only screens on IAN API.2 and use only documented API content for all displayed values and labels.
- **Scope:** Show the refresh comparison; show run detail with summary, details, diagnostics, and the JSON document.
- **Branch:** A dedicated GUI.2 branch after IAN API.2 merges and GUI.1 establishes the scaffold.
- **Detail:** ⚠ no slice plan yet.

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
- **Scope:** The first-run SEC identity screen and Windows/macOS installers, using the technology and signing choices approved in GUI.1.
- **Branch:** A dedicated GUI.5 branch after the scaffold decisions and API requirements it consumes are available.
- **Detail:** ⚠ no slice plan yet.

**Decisions to approve before GUI.5**

| Decision | Recommendation and trade-off |
| :--- | :--- |
| Windows and macOS installer formats and signing | Start with a signed Windows installer and a signed, notarized macOS disk image. Signing improves publisher identification and macOS distribution; certificates, notarization, and release steps add recurring cost and operational work. |
| Obtaining uv and pinning IAN | Bundle a pinned uv executable with each installer and install the exact IAN version selected for that GUI release. This avoids an extra user setup step and makes the pair reproducible; each release must update and validate its bundled installer tooling. |
| Update mechanism | Use Tauri's signed updater with explicit user confirmation before installing an update. It gives the application a direct update path; signing keys and release metadata become security-critical operational assets. |

The product name was decided in GUI.1 ([D13 in Appendix A of the GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record)).

Answers to Q4 inform the signing decision, so these decisions are made after the user questions, not before GUI.1.

### GUI.6: Preview release and feedback

- **Problem:** The preview needs a controlled release and a way for users to report what they cannot understand or complete.
- **Decision:** Release the application as a preview and collect feedback against the screens and setup flow.
- **Scope:** Publish preview builds, explain the pre-release status, and provide a feedback intake route.
- **Branch:** A dedicated release branch or tag from the accepted GUI implementation.
- **Detail:** ⚠ no slice plan yet.

## Out of scope

- Local-model synthesis; it waits for IAN Step 3.6.
- General settings editing beyond the first-run SEC identity screen, database maintenance, and charts.
- Any financial calculation in the GUI or any data access outside IAN's published /v1 API.
- Bundling copies of IAN's investor explanations in the GUI.
- Requiring users to leave the application to understand displayed analysis content.
- A strategy-specific GUI implementation. A strategy appears from IAN's generic API content: headline cells, projection text, its JSON document, and its selection JSON Schema. Adding a strategy to IAN therefore needs no GUI code change.
- Remote access to an engine, an engine-hosting service, and mobile clients are future work; decisions D19 and D20 in the [GUI.1 slice plan](GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record) keep them open.

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

## Questions for potential users before GUI.2 scope is fixed

Q1. Which computer would you use it on (Windows, Mac or other), and where did you stop last time you looked at the project?

Q2. Would you rather analyze one ticker at a time, or keep a list and check it periodically?

Q3. In the comparison screen, what is missing or confusing? Which column would you look at first?

Q4. Would you install a desktop app that sets up its own engine in the background? Would an "unrecognized app" warning stop you?

Q5. Of these, which would you most want next: Altman Z, Beneish M, EV/EBITDA and FCF yield, Interest Coverage, ROIC, or Magic Formula ranking?

Q6. Do you have, or want, a local AI model?

## Background

The project starts from the 2026-10-30 decision to provide investors with a desktop route into IAN while keeping the engine's financial analysis, labels, and explanations owned by IAN. The preview is aimed first at Windows users, including people who are new to investing and do not use command-line tools. The technology and installer choices remain subject to project-owner approval before GUI.1.

The preview screens are shown in [preview mock-ups](../design/preview-mockups.html).

## Appendix A: 2026-10-30 decisions from IAN's API plan

The following excerpts quote the decisions recorded in Appendix A.1, A.2 and A.4 of IAN's [API contract and slice plan](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md). In these excerpts, "this repository" and "here" mean IAN, not this repository.

### A.1: A separate GUI application over a local API

Approved by the project owner on 2026-10-30.

| Item | Decision |
| :--- | :--- |
| Products | Two: the engine (this repository) and a GUI application in its own repository. The Discovery Workbook's "full GUI/frontend integration belongs to separate projects" stands |
| Work in this repository | A versioned local HTTP API over a new application layer, as work package API, after 3.5.3e and before 3.5.4 |
| Why before 3.5.4 | The six remaining Step 3.5 strategies use the application layer from the start, and users can comment while they are still unbuilt. Once API.6 merges, Step 3.5 continues here while the GUI is built in parallel |
| GUI technology | Decided in the GUI repository's own contract; the initial lean is a Tauri desktop shell with a TypeScript interface, which builds installers and starts ian serve as a background process |
| Installer | Owned by the GUI application, which installs a version-pinned engine with uv tool install. "Use my own engine install" is not in its first release |
| SEC identity | Kept in the GUI application's own settings and passed to the ian serve process as SEC_USER_AGENT; the engine still never writes to its settings folder |
| Versioning | Changes inside /v1 only add. A breaking change becomes /v2, and both are served for one engine minor release. Each GUI release pins the engine version it installs |
| v0.2 exit | Option (a): v0.2 closes when a GUI release works with engine v0.2, and the GUI is the documented route for a new user. The alternative, (b), kept the exit on the engine's own surfaces and left the new-user goal to the GUI's plan |

Rejected:

- **A GUI inside this package** (server-rendered pages from the engine): simplest to change, but it put a GUI and its dependencies inside the engine, kept the installer here, and needed an exception to the rule that the engine never writes to its settings folder.
- **A GUI that runs ian ... --json for each action:** no engine work, but every action pays Python's start-up, a refresh cannot report progress, and Windows shows a console window.
- **A separate GUI written in Python:** it still needs the API, and Python desktop packaging is the weakest option for an installer.

### A.2: API shape and dependencies

Approved by the project owner on 2026-10-30.

- Transport: HTTP and JSON on 127.0.0.1, a random or given port, a per-launch token and a Host check against DNS rebinding.
- Dependencies: starlette and uvicorn; httpx as a development dependency for the in-process test client. FastAPI was the alternative; it was not chosen, so openapi.json is generated by a project script from the route table and the Pydantic document models.
- Testing: endpoint tests use the in-process test client, so they open no socket; openapi.json is checked in and compared like schemas/.

### A.4: Help content in the GUI

Approved by the project owner on 2026-10-30.

| Item | Decision |
| :--- | :--- |
| Owner | The engine owns every explanation and serves it through the API; the GUI bundles none. Rejected: the GUI copying the documents of the engine version it pins, which splits the label-to-term mapping between two repositories |
| Source | Markdown stays the source, with an enforced entry structure and a generated, drift-checked help bundle in the package. Rejected: TOML as the source with GLOSSARY.md generated, which is stricter but awkward for prose |
| Glossary split | Contributor terms move to a contributor glossary under docs/project/; only investor terms are served |
| Term references | Headline cells, strategies, run outcomes, calculation statuses, failure reason codes and selection fields each name a term; a conformance test enforces it, and "glossary terms" is a strategy edit site |
| Served documents | The glossary, the Beginner Guide, Finance Math and the strategy guides' explanatory sections. Installation, quick-start, usage, workspace, database, hardware and smoke-testing documents are not served |
| Links | Links to terms and served sections become in-app links; other links are optional further reading. A short definition depends on no link. Responses are Markdown; the GUI renders them with a sanitizing renderer |
| Sequence | API.5 and API.6, after API.4 and before 3.5.4; API.5 waits for 3.5.3e because 3.5.3d adds Piotroski's glossary entries |
| GUI behavior | A popup on hover or focus with the short definition, and a help panel on click with the full entry, linked terms and the longer guide. A run's own derivation stays in its Details view. The GUI repository decides the interaction details |

