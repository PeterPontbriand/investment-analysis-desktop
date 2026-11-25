# Spec Workflow

How a unit of work goes from an approved decision list to a merged pull request through a spec committed on the unit's branch, instead of a prompt pasted into the implementer's session. This is the desktop repository's copy of the engine's [spec workflow](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/SPEC_WORKFLOW.md); the two keep their section numbers so they can be compared. The workflow is piloted on every unit in both repositories from issue #39 on, and [§7](#7-pilot) says how the pilot is judged. The decisions behind the workflow, D348 to D355, are recorded in [Appendix B of the charter](CHARTER.md#appendix-b-2026-11-23-development-workflow-decisions).

## 1. At a glance

- **What it is:** one Markdown spec per unit of work, written from the [spec template](SPEC_TEMPLATE.md) and committed on the unit's branch before implementation starts. The implementer is given the spec's path and nothing else. The spec author and the implementer settle questions and review findings between themselves, through the spec.
- **What it is not:** a replacement for plans. The plan that owns the unit still owns its decisions, file inventories and records; the spec links to them and adds what a handoff needs. There is no separate analysis document, no baton or loop-state file and no automation outside the repository's own gate and CI ([§8](#8-left-out)).
- **Rules it follows:**
  - A spec is complete when it is committed: no placeholder, no open question, no template guidance left in it.
  - The spec is corrected first whenever reality differs from it ([§4](#4-when-reality-differs-from-the-spec)).
  - The implementer escalates by the table in [`AGENTS.md`](../../AGENTS.md#escalation-in-a-spec-driven-unit).
  - The project owner approves every decision list, which also approves opening the unit's pull request once the spec author's review is clean, and merges every pull request ([`AGENTS.md`](../../AGENTS.md#approval-gates)).
- **Where it applies:** during the pilot, every unit in both repositories from issue #39 on. The engine repository has the same documents.

## 2. Roles

| Role | Who | What they do |
| :--- | :--- | :--- |
| Project owner | The repository owner | Approves or amends each decision list; answers escalations that would change a decision, scope, a dependency or anything that cannot be undone; approving a decision list also approves opening the unit's pull request after a clean review; merges |
| Spec author | The agent that drafts the decision list and reviews the work | Writes the spec (and the slice plan, when the unit needs one); answers the implementer's questions within the approved decisions; corrects the spec; reviews; escalates to the project owner what the approved decisions do not settle |
| Implementer | A coding agent on the project owner's development machine, started by the spec author through Remote Control in the owner's checkout; the owner's machine stays on while a unit runs | Implements the spec within its allowed files; runs the slice check; reports; opens the unit's pull request after a clean review, starts CI runs on its branch and files the issues the flake rule calls for; escalates by the table in [`AGENTS.md`](../../AGENTS.md#escalation-in-a-spec-driven-unit) |

## 3. The flow

1. **Decision list.** The spec author lists the unit's open decisions, each with a recommendation, in one list per slice that covers all its sub-slices. The project owner approves or amends them; approving the list also approves opening the unit's pull request once the spec author's review is clean. The approved decisions are recorded with their D-numbers in the decision appendix of the plan that owns the unit.
2. **Spec.** The spec author copies the [spec template](SPEC_TEMPLATE.md) to `specs/<unit>.md` in the folder of the slice plan that owns the unit (for GUI.4c1: `docs/project/milestones/v0.1/gui-4/specs/gui-4c1.md`), fills every section, and writes it into the owner's checkout; the implementer commits it as the first commit of the unit's branch, named as the owning plan says. All GitHub writes happen on the owner's machine under the owner's identity. When the unit's slice plan does not exist yet, the first spec's steps write it.
3. **Implementation.** The implementer checks out the branch and implements the spec's steps in order, changing only its allowed files. It runs the slice check (`pnpm gate:slice`) after each step that changes code, tests or a file the gate's tooling reads, enforced by the Stop hook, and runs no full gate before pushing ([§6](#6-the-quality-gate-in-the-flow)). It escalates instead of improvising.
4. **Behaviour first.** Before review, the implementer reports what the spec's Report section asks for: at least the commit hash, the diff stat against `main`, the last slice-check result, the result of each acceptance check and smoke check, and every escalation with the table row that triggered it. A screen-changing unit's report also gives the `pnpm test:engine` summary and ends with the "Try it" section that [`AGENTS.md`](../../AGENTS.md#verification) describes.
5. **Review.** The spec author reviews in this order: behaviour (the gate output, CI, the smoke checks), then architecture and the project boundaries in [`AGENTS.md`](../../AGENTS.md#project-boundaries), then logic and correctness, then scope (only allowed files changed, nothing beyond the spec). Each finding is tagged **spec change** or **code fix**. A spec change is committed to the spec before the code changes. A small defect is fixed in the branch before the pull request opens, or filed as an issue that the spec's PR text names; it is never left as a note. Review repeats until no finding remains.
6. **Pull request.** The spec's PR text is the pull request's title and description; it names every issue the change resolves with `Closes #N`. After a clean review the implementer opens the pull request with that text, the spec author watches CI and sends fixes, and the project owner gets one message that it is ready to merge, tries the change (for a screen-changing unit, with `pnpm sandbox`), then merges it. The merged spec stays in the repository as the record of what was built.

**Fast lane.** A change with no decision in it (fixing a red `main`, fixing or quarantining a flaky test, a small defect found after merge, a documentation correction) skips the decision list. The spec author writes a short spec and the flow continues from step 2. A fast-lane change that turns out to need a decision goes to the project owner.

**Batching.** While a pull request waits for merge, the spec author may draft the next unit's decision list. One implementer runs per repository at a time; one engine unit and one desktop unit may run at once.

## 4. When reality differs from the spec

The implementer never settles a difference in code. When a step cannot be done as written, because the spec is ambiguous, misses a decision, or contradicts the code, its plan or another current document, the implementer stops that step and escalates to the spec author. The spec author corrects the spec, adds a dated line to its change log, commits, and tells the implementer to continue. A correction that would change an approved decision goes to the project owner first, and the owning plan's decision record is updated with it.

## 5. Escalation

The escalation table is in [`AGENTS.md`](../../AGENTS.md#escalation-in-a-spec-driven-unit), the one place it is written. Every spec's Norms and safeguards section links to it rather than restating it, and adds any escalation that is particular to the unit.

## 6. The quality gate in the flow

Three tiers, each owning one question:

- **Inner loop: the slice check.** `pnpm gate:slice` ([`AGENTS.md`](../../AGENTS.md#verification)), after each spec step that changes code, tests or a file the gate's tooling reads. A documentation-only step runs `pnpm docs:check` and `pnpm format:check`. For the implementer, `tools/agent-stop-hook.ts`, run by the Stop hook in `.claude/settings.json`, does this whenever a turn ends with files changed since the last passing run: it runs the documentation checks for a documentation-only change and the slice check otherwise, sends any failure back to the implementer, and never loops (it does not run on the turn end that follows its own failure report, so the next turn end checks the fix).
- **Pull-request CI: the full check.** A Linux `web` job (`pnpm gate --part web`: lint, types, Vitest, build, Playwright on Chromium and WebKit), plus a Linux `shell` job (`pnpm gate --part shell`) when a shell path changed. No full gate runs locally before the push; `pnpm gate` is for reproducing a CI failure, or when the project owner or a spec asks for it.
- **After merge: every platform.** The full `pnpm gate` on Windows, macOS and Linux, with one Playwright retry. A failure or a flaky test opens or updates the `main-red` issue and is fixed first, in the fast lane. A test that fails and then passes with no code change gets an issue the same day and the `@quarantine` tag.

## 7. Pilot

Every unit in both repositories from issue #39 on is handed off through a spec. The pilot's measures, its target for each, and the three possible outcomes (adopt, adjust, drop) are written once, in the engine's [§7](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/SPEC_WORKFLOW.md#7-pilot), and apply to the units of both repositories together. Each unit's spec has a "Pilot measures" line in its Report, with one value per measure; the implementer reports the counts and the spec author checks them before the unit's pull request opens. The project owner decides the outcome after the first three spec-driven units merge, across both repositories, and the outcome is recorded in both repositories: here as a decision record in the charter's appendix, and in the engine's plan as that section says.

## 8. Left out

| Left out | Why |
| :--- | :--- |
| Separate analysis documents, design canvases, generated user stories and generated test prompts | Decision lists and slice plans already cover them; they serve team auditing and would cost time here |
| Custom slash commands for the workflow | The spec path is the whole instruction |
| A baton or loop-state file between agents | The spec author and the implementer message each other directly, and the spec carries the lasting record |
| Orchestration through GitHub Actions | One unit runs at a time per repository, and the project owner merges each pull request; the `main-red` report is not orchestration |
| Separate worktrees per agent | One unit runs at a time on one branch |
