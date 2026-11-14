# Investment Analysis Desktop charter

## At a glance

- This charter establishes the governance and staged scope for a separate desktop application that lets investors use IAN without a command line.
- Its first milestone, the preview release, is planned in the [v0.1 implementation plan](milestones/v0.1/IMPLEMENTATION_PLAN.md), which owns the sequence and status of the work.
- The GUI uses only IAN's versioned local HTTP API, displays values and explanations supplied by IAN, and keeps financial calculations in IAN.
- IAD is one application in a suite whose boundaries are recorded in IAN's Master Plan, in the [Product boundaries section](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/MASTER_PLAN.md#25-product-boundaries).
- GUI.1 technology decisions were approved on 2026-10-31 and are recorded in the [GUI.1 slice plan](milestones/v0.1/gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md).

## Out of scope

- Local-model synthesis; it waits for IAN Step 3.6.
- General settings editing beyond the first-run SEC identity screen, database maintenance, and charts.
- Any financial calculation in the GUI or any data access outside IAN's published /v1 API.
- Bundling copies of IAN's investor explanations in the GUI.
- Requiring users to leave the application to understand displayed analysis content.
- A strategy-specific GUI implementation. A strategy appears from IAN's generic API content: headline cells, projection text, its JSON document, and its selection JSON Schema. Adding a strategy to IAN therefore needs no GUI code change.
- Remote access to an engine, an engine-hosting service, and mobile clients are future work; decisions D19 and D20 in the [GUI.1 slice plan](milestones/v0.1/gui-1/GUI_1_TECHNOLOGY_AND_SCAFFOLD_SLICE_PLAN.md#appendix-a-2026-10-31-decision-record) keep them open.

## Background

The project starts from the 2026-10-30 decision to provide investors with a desktop route into IAN while keeping the engine's financial analysis, labels, and explanations owned by IAN. The preview is aimed first at Windows users, including people who are new to investing and do not use command-line tools. The technology choices were approved in GUI.1; the installer choices are approved before GUI.5.

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

