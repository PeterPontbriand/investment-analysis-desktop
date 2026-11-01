# Desktop application repository instructions

These rules apply to contributors and agents writing, reviewing, testing, or documenting this repository.

## Project boundaries

- This repository owns the desktop application. It communicates with the Investment Analysis Engine (IAN) only through IAN's published, versioned local HTTP API under /v1.
- The GUI never reads IAN's database, files, or Python modules. It never calculates a financial value. Every number, label, status, code, and unit it displays comes from an IAN API document; formatting may follow only the unit specified by that document.
- IAN owns explanations for displayed analysis content. Every term, label, status, acronym, and code shown by the GUI explains itself in place using IAN's /v1/help endpoints. The GUI's own help text covers how to use this application.
- User-facing failure text is a message. Do not call it a sentence, except when counting actual sentences.
- A section reference always names its document.
- The application stack is Vue 3 with TypeScript and Vite, managed by pnpm on Node 24 LTS.
- The repository layout is one root package with `src/`, `tools/`, `tests/unit/`, `tests/tools/`, and `tests/browser/`.
- ESLint forbids `@tauri-apps/*` imports everywhere except the reserved `src/platform/` module.
- Tools are written in TypeScript and run directly with Node's type stripping; use erasable TypeScript syntax only.
- Dependency versions are pinned exactly. Add or upgrade dependencies only through approved work.
- Dependabot pull requests are never merged; reapply dependency bumps on a project branch.
- `pnpm gate` must pass before pushing.
- The required CI check is `quality`, fed by Windows, macOS, and Linux jobs.
- This repository contains no Python. Its tooling, including documentation checks, is written in the repository's own language.

## Approval gates

Get explicit project-owner approval before opening or merging a pull request, destructive file deletion, force-push, adding or upgrading dependencies, or making a structural repository change. Approval gates do not prevent read-only review or preparation of a concrete proposal.

The approved file scope of a task is its edit boundary. Ask for approval before changing files outside that scope, and name the file, proposed change, and why it is needed. If a task cannot be completed as written and requires a substitute workaround, get approval for the substitute as well.

A design decision must be made or escalated to the project owner; do not leave it as an open item.

## Planning documents

Use IAN's docs/project/milestones/v0.2/integration-readiness/IR_CONTRACT_AND_SLICE_PLAN.md as the reference for new planning documents. A planning document:

- Opens with At a glance, stating what the work is, what it is not, and which rules it follows, with no history there.
- Places the sequence and status table next. Each scope cell is one line with a link; each status cell contains only a status word.
- Orders rows by status: Complete, In progress, Next, Planned, Deferred. Complete rows have ISO completion dates in non-decreasing order; all other completion cells are blank; no table has more than one Next row.
- Has one short section per unit of work with labeled Problem, Decision, Scope, Branch, and Detail bullets. Each section ends with a link to the lower-level document that owns its detail, or says no slice plan exists.
- Follows the work-unit sections with scope limits and acceptance criteria, then background and origin. Decision records, renumbering history, branching rationale, and accepted exceptions belong in a verbatim appendix.
- Keeps detail in its lowest-level owning document; a parent summarizes and links instead of duplicating a child's inventory, decisions, or history.

Documentation uses no Mermaid. Draw diagrams as plain text or tables. A section reference always names its document.

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

Run `pnpm gate` before pushing. The gate installs frozen dependencies and Playwright's Chromium and WebKit browsers, checks formatting, lint, application and tools types, Markdown links and anchors, Mermaid fences and sequence tables, runs Vitest, builds the production app, and runs the Chromium and WebKit browser tests. It writes the full output and a per-step result and duration summary to the root `gate-output.txt`, which is git-ignored. CI runs the same gate on Windows, macOS, and Linux; Linux installs Playwright's system libraries first. The `quality` check passes only when all three platform jobs succeed. Report actual command results; do not claim checks passed unless they ran successfully.
