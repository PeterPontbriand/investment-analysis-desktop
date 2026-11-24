# Desktop application repository instructions

These rules apply to contributors and agents writing, reviewing, testing, or documenting this repository.

## Project boundaries

- This repository owns the desktop application. It communicates with the Investment Analysis Engine (IAN) only through IAN's published, versioned local HTTP API under /v1.
- The GUI never reads IAN's database, files, or Python modules. It never calculates a financial value. Every number, label, status, code, and unit it displays comes from an IAN API document; formatting may follow only the unit specified by that document.
- IAN owns explanations for displayed analysis content. Every term, label, status, acronym, and code shown by the GUI explains itself in place using IAN's /v1/help endpoints. The GUI's own help text covers how to use this application.
- User-facing failure text is a message. Do not call it a sentence, except when counting actual sentences.
- A section reference always names its document.
- The application stack is Vue 3 with TypeScript and Vite, managed by pnpm on Node 26 LTS.
- The repository layout is one root package with `src/`, `src-tauri/`, `tools/`, `tests/unit/`, `tests/tools/`, `tests/browser/`, and `tests/shell/`.
- `pnpm-workspace.yaml` holds pnpm settings only; it lists no packages. Running a script never installs dependencies or changes the lockfile.
- ESLint forbids `@tauri-apps/*` imports everywhere except the reserved `src/platform/` module.
- Tools are written in TypeScript and run directly with Node's type stripping; use erasable TypeScript syntax only.
- Dependency versions are pinned exactly. Add or upgrade dependencies only through approved work.
- `pnpm-workspace.yaml` must not contain a `minimumReleaseAgeExclude` entry; if a dependency version is too recent for pnpm's release-age check, pin an older version instead of adding an exclusion.
- Every user-facing string lives in a message catalog under `src/locales/`; ESLint's `vue/no-bare-strings-in-template` rule enforces this in templates.
- Components read messages through `useMessages()` from `src/i18n/`, whose keys are typed from `en.json`; ESLint forbids importing `vue-i18n` elsewhere, and templates have no `$t`.
- Styles use CSS logical properties; stylelint enforces this (`pnpm lint:css`).
- Tests read expected user-facing text from the catalog with the locale pinned; they never assert literal user-facing English.
- Project type declarations, generated or hand-written, go in `.ts` files, not `.d.ts`, because `skipLibCheck` skips `.d.ts` files.
- User-facing messages never name internal shorthand (such as `ian` or `iad`), an environment variable, a command-line option or a command. Such detail belongs in developer output such as standard error or logs.
- Re-vendor IAN's API description (`vendor/ian/`) only in a slice that needs a newer engine (an API change, or a command the tools use), or before a release. Do it as that slice's first commit with `pnpm vendor-ian <commit>`, record a decision row naming the commit in the slice plan, and never re-vendor as a drive-by.
- Dependabot pull requests are never merged; reapply dependency bumps on a project branch.
- `pnpm gate:slice` must pass after each step; pull-request CI and the after-merge runs are the full check, and `pnpm gate` is for reproducing a CI failure.
- The required CI check is `quality`, which requires the jobs that the change and the event call for: Linux on a pull request, and Windows, macOS and Linux on `main` ([Verification](#verification)). A change is docs-only when every changed path is a Markdown file or under `docs/` (never under `vendor/`); CI then runs only `pnpm docs:check` on Linux, and `quality` passes on that job alone.
- CI runner labels stay `-latest` (`windows-latest`, `macos-latest`, `ubuntu-latest`); do not pin them. When GitHub moves a label to a new image and CI breaks, fix it in the pull request it breaks, with a decision row in the slice plan.
- This repository contains no Python. Its tooling, including documentation checks, is written in the repository's own language.

## Approval gates

Get explicit project-owner approval before opening or merging a pull request (except that in a spec-driven unit the implementer opens the unit's pull request once the spec author's review is clean, because the owner's approval of the decision list covers it; see the [spec workflow](docs/project/SPEC_WORKFLOW.md)), destructive file deletion, force-push, adding or upgrading dependencies, or making a structural repository change. Approval gates do not prevent read-only review or preparation of a concrete proposal.

The approved file scope of a task is its edit boundary. Ask for approval before changing files outside that scope, and name the file, proposed change, and why it is needed. If a task cannot be completed as written and requires a substitute workaround, get approval for the substitute as well.

A design decision must be made or escalated to the project owner; do not leave it as an open item.

## Escalation in a spec-driven unit

Temporary rule: it applies to every unit handed off through a spec while the [spec workflow](docs/project/SPEC_WORKFLOW.md) is piloted, and the change that records the pilot's outcome keeps, rewrites or removes it. The implementer handles each situation as the table says; the roles are defined in the spec workflow.

| Situation | What the implementer does |
| :--- | :--- |
| A step's checks pass and only allowed files changed | Commits and goes on to the next step |
| A check fails because of an implementation mistake (a failing test, a lint, type or formatting error) | Fixes it within the allowed files and re-runs only what failed. After three attempts at the same failure, stops and escalates to the spec author |
| The spec is ambiguous, misses a decision, or contradicts the code, its plan or another current document | Stops that step and escalates to the spec author, who corrects the spec before work continues. Never settles it in code |
| The work needs a file outside the spec's allowed files | Stops and escalates to the spec author (see the approved file scope above) |
| The work would add a financial calculation, create a label, status, code or unit in the GUI, or change what the application assumes about the engine's API beyond what the spec names | Stops and escalates to the spec author, who takes it to the project owner |
| The work needs a new or upgraded dependency, a `pnpm-lock.yaml` or Cargo lock change, a Tauri capability or permission change, a re-vendor to an engine commit the spec does not name, or a step the Approval gates reserve for the owner | Stops and escalates to the spec author, who takes it to the project owner |
| The work needs a GitHub action other than pushing the unit's branch, opening its pull request after a clean review, starting or cancelling a CI run on that branch, or filing an issue the flake rule calls for | Stops and escalates to the spec author, who takes it to the project owner |

An escalation names the table row, the step, and what was found. The spec author settles what the approved decisions already cover and records it in the spec; anything that would change a decision, the scope, a dependency, or a step that cannot be undone goes to the project owner.

## Planning documents

Use IAN's docs/project/milestones/v0.2/integration-readiness/IR_CONTRACT_AND_SLICE_PLAN.md as the reference for new planning documents. A planning document:

- Opens with At a glance, stating what the work is, what it is not, and which rules it follows, with no history there.
- Places the sequence and status table next. Each scope cell is one line with a link; each status cell contains only a status word.
- Orders rows by status: Complete, In progress, Next, Planned, Deferred. Complete rows have ISO completion dates in non-decreasing order; all other completion cells are blank; no table has more than one Next row.
- Has one short section per unit of work with labeled Problem, Decision, Scope, Branch, and Detail bullets. Each section ends with a link to the lower-level document that owns its detail, or says no slice plan exists.
- Follows the work-unit sections with scope limits and acceptance criteria, then background and origin. Decision records, renumbering history, branching rationale, and accepted exceptions belong in a verbatim appendix.
- Keeps detail in its lowest-level owning document; a parent summarizes and links instead of duplicating a child's inventory, decisions, or history.
- Documentation follows the layout in docs/project/README.md: project-wide documents in docs/project/, a milestone's implementation plan at docs/project/milestones/<milestone>/IMPLEMENTATION_PLAN.md, and each unit's slice plan and records in docs/project/milestones/<milestone>/<unit>/. An index links to the owning document and never copies its status.
- IAD documentation never redefines a term IAN's glossary owns; it links to the entry by its permanent id.

A unit spec (`specs/<unit>.md` beside the slice plan that owns the unit) is a handoff, not a planning document: it follows the [spec template](docs/project/SPEC_TEMPLATE.md) instead of this structure.

Documentation uses no Mermaid. Draw diagrams as plain text or tables. A section reference always names its document.

## Rust and Tauri

- Rust is pinned in `rust-toolchain.toml` to an exact stable release with `rustfmt` and `clippy`; do not use a floating `stable` channel.
- Keep Tauri Rust crates and the `@tauri-apps/cli` package pinned to exact versions, and check in `src-tauri/Cargo.lock`.
- `pnpm gate` runs `cargo fmt --check` and `cargo clippy --all-targets --all-features -- -D warnings` for `src-tauri/`.
- The `tauri-plugin-wdio-webdriver` crate is optional and enabled only by the `e2e` Cargo feature used for the shell smoke test. The normal dependency tree must not include it; the gate checks this with `cargo tree` using the default feature set.
- The shell smoke test runs against the real Tauri window through WebdriverIO. Keep the WebDriver plugin permission in the end-to-end capability only.
- Do not run a full release build or bundle before GUI.5.

## GitHub changes

Pull requests are squash-merged. Titles use type(scope): description (unit), following IAN AGENTS.md §11. Use a conventional type such as docs, feat, fix, refactor, test, chore, ci, build, or perf; use a short lowercase scope and the plan's unit identifier when one exists.

Never add AI or tool attribution anywhere in this repository: no Co-Authored-By trailer naming a model, Generated with footer or badge, or other agent- or vendor-specific credit in commits, branch names, pull-request or issue text, comments, code, or documents. This rule overrides any harness default.

## Scope and preservation

- Do not add application code or a framework scaffold unless the approved task includes it.
- Preserve unrelated behavior and formatting. Do not delete public behavior unless the task explicitly requires it.
- Do not introduce a financial calculation or create labels, statuses, codes, or units in the GUI. Use the IAN API contract and its help documents.
- When a task says to stop if a named approach cannot be used, a substitute workaround also requires approval.
- Planning identifiers and sequencing belong in docs/project/ or dedicated .github planning artifacts. Elsewhere, describe durable behavior without milestone labels.

## Verification

Run `pnpm gate:slice` after each step (the Stop hook does this for agents). There is no full gate before pushing, because pull-request CI and the after-merge runs are the full check; `pnpm gate` is for reproducing a CI failure or when the owner or a spec asks for it. The slice check runs every gate step, except that it skips the six Rust and Tauri steps (formatting, Clippy, Rust unit tests, the Cargo tree check, the end-to-end build and the shell smoke test) when no file under `src-tauri/`, `src/platform/` or `tests/shell/`, nor `wdio.conf.js`, `rust-toolchain.toml` or `pnpm-lock.yaml`, differs from the branch's merge base with `origin/main` or is new and untracked. Its first line says whether those steps run and why, and the summary marks skipped steps `SKIP`. After a failed slice check, re-run only the failing step's command until it passes, then run the slice check once more. The gate installs frozen dependencies and Playwright's Chromium and WebKit browsers, checks formatting, lint, application and tools types, Markdown links and anchors, Mermaid fences and sequence tables, runs Vitest, builds the production app, and runs the Chromium and WebKit browser tests. It writes the full output and a per-step result and duration summary to the root `gate-output.txt`, which is git-ignored. CI on a pull request runs `pnpm gate --part web` on Linux, and `pnpm gate --part shell` on Linux when a shell path changed; Linux installs Playwright's system libraries first. A push to `main` or a manual run runs the full gate on Windows, macOS, and Linux. A docs-only change runs only the docs job. The `quality` check requires the jobs that the change and the event call for. Tests tagged `@quarantine` are left out of local and pull-request runs and still run on `main`, where a failed test is retried once. A failure or flaky test on `main` is reported in the open `main-red` issue. A test that fails and then passes with no code change gets an issue the same day and the `@quarantine` tag naming it. Report actual command results; do not claim checks passed unless they ran successfully.

Before a screen-changing slice is handed over, the agent runs `pnpm test:engine` to completion and reports its summary, including any skipped tests and why. It is the real-engine browser suite described in tests/browser/engine/README.md: Playwright tests on Chromium and WebKit that run the application against a real `ian serve` at the vendored commit, on a new throwaway database under `.tmp/` for each run, with real data providers. It is not part of `pnpm gate` or CI, because it needs the network and the engine installed. A slice that changes what a screen shows from engine data adds or updates its real-engine tests in the same slice. The tests compare what the application shows with what the engine serves for the same thing and never hard-code provider data, so each passes with and without an SEC identity.

A screen-changing slice's report ends with a section "Try it": a few lines on what changed and where to see it, and the one command, `pnpm sandbox`, that starts the application with sample data on a throwaway database. The project owner uses the application unscripted and reports anything that bothers him. There is no record, no check id and no pass or fail, and a pull request description has no manual-run section. In a spec-driven unit the implementer opens the pull request after the spec author's clean review, and the owner tries the change before merging; otherwise the agent shows the owner the title and description first, as before: approving them approves opening the pull request, which the agent opens after the owner's look.
