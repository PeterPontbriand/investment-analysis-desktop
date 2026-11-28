# Spec GUI.5-plan-fixup: GUI.5 plan fix-up after the 2026-11-28 review

- **Owning plan:** [GUI.5 first-run and installer slice plan](../GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md), whose Appendix B this unit adds.
- **Branch:** `docs/gui-5-plan-fixup`, from `origin/main` at `e4a484c` (`fix(test): wait for a recorded request before reading it (#58)`), or the newest `origin/main` if it has moved and the records patch still applies cleanly.
- **Decisions approved:** 2026-11-28. The project owner approved D385 to D395 (and the engine's R1 to R9) in the project thread.
- **Lane:** normal.

## Goal

The GUI.5 plan says what the installable product needs from the engine (an installable engine release, and data care through its API), runs its units in an order that does not stall on the engine's sequence, restores the new-user landing rule, and keeps diagnostics on the engine's API. It is documentation only.

## Decisions

- D385: a desktop release pins one exact engine pre-release from IAN API.26 and checks its checksums.
- D386: the managed engine lives in a folder that belongs to the application, never in the user's own tool folders or on PATH.
- D387: the first launch needs the internet, and the first-run screen says so.
- D388: the compatibility check reads `engine_version` and `api_versions` from `/v1/info`.
- D389: data safety goes only through IAN API.25's database operations.
- D390: uninstalling keeps the user's data; no remove-everything action in the first preview, tracked in a new issue.
- D391: the update confirmation says when older saved results stop opening in detail.
- D392: the GUI.5 order becomes 5a, 5c, 5d, 5b, 5e, letters unchanged.
- D393: GUI.5b restates D374, the new-user landing rule.
- D394: diagnostics take the engine's part only from its API.
- D395: the planning spec's own filename is corrected.

The records are in the patch this spec ships with, as the slice plan's Appendix B.

## Out of scope

- Any application code, configuration, dependency, workflow or test change.
- Lower-level specs for GUI.5a to GUI.5e.
- Any change to D332 to D352 beyond the wording the patch makes.
- Any change in IAN. The engine's side (record A.25, units API.25 and API.26, the U2 amendment and the IAN issue that pairs with D390's issue) is a separate IAN pull request after IAN's API.24 merges. Until it merges, the three links to IAN anchors that this unit adds (`#a25-engine-releases-for-the-desktop-2026-11-28`, `#api25--database-care-through-the-api`, `#api26--engine-release-production`) point at headings that do not exist yet. `pnpm docs:check` checks only local links, so it passes; the spec author re-checks the anchors when the IAN pull request merges.
- Re-vendoring the engine, and IAD issue 54.

## Allowed files

- `docs/project/milestones/v0.1/gui-5/specs/plan-fixup.md` (this spec; changed only by the spec author's corrections)
- `docs/project/milestones/v0.1/gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md` (as the patch changes it, plus the issue number in step 3)
- `docs/project/milestones/v0.1/IMPLEMENTATION_PLAN.md` (the GUI.5 section only, as the patch changes it)
- `docs/project/milestones/v0.1/gui-5/specs/planning.md` (its Allowed files item 1 and its Change log only, as the patch changes them)

The patch itself, `.tmp/specs/gui-5-plan-fixup.patch`, is not committed.

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`, check that the worktree is clean apart from this spec and `.tmp/`; if it is not, stop and report. Then `git fetch origin` and `git switch -c docs/gui-5-plan-fixup origin/main`. If the branch already exists, stop and report. This spec is in the working tree as an untracked file; commit it alone as `docs(spec): GUI.5 plan fix-up spec`. Check: `pnpm docs:check` and `pnpm format:check`.

2. **The records.** Check the patch: `sha256sum .tmp/specs/gui-5-plan-fixup.patch` must print `7190e98058c6e85321c63a525275269e2f854946dfdab6c6dd2a0907f9381071`. Then `git apply --check .tmp/specs/gui-5-plan-fixup.patch` and `git apply .tmp/specs/gui-5-plan-fixup.patch`. If the checksum differs or the patch does not apply, stop and report; do not merge it by hand. Do not commit yet.

3. **The tracking issue (D390).** File the issue with `gh issue create --repo PeterPontbriand/investment-analysis-desktop --title "Offer to remove all of the user's data, through the engine" --body-file <file>`, with the body below, written to a file under `.tmp/`. Then replace both occurrences of `ISSUE_NUMBER` in `GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md` (two links, in GUI.5d's Scope and in D390) with the new issue's number, so each reads `[issue N](https://github.com/PeterPontbriand/investment-analysis-desktop/issues/N)`. Check that `ISSUE_NUMBER` no longer appears in any file outside this spec. If the machine's permission check refuses `gh issue create`, stop and report; the project owner approved filing it with the decision list.

   Issue body:

   ```markdown
   GUI.5's first preview has no action that removes all of a user's analysis data. Uninstalling keeps the data, and reinstalling finds it again (D390 in Appendix B of the GUI.5 slice plan, `docs/project/milestones/v0.1/gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md`).

   D350 allows a complete data removal only as a separate, explicit action with a clear explanation of what is deleted. The data belongs to the engine, and the application never deletes a database itself (D332, D342), so the action needs an engine operation first, through the API and the command line. The engine's decision R7 (IAN API plan record A.25) tracks that operation in its own issue.

   When both exist, the application can offer the action, with a confirmation that says in investor words what is deleted and that it cannot be undone.
   ```

4. **Check and commit.** `pnpm docs:check` and `pnpm format:check` must pass. `git --no-pager diff --stat` lists only the three plan files. Commit as `docs(gui-5): record the GUI.5 plan fix-up decisions (GUI.5-plan-fixup)`.

5. **Push and report.** `git push -u origin docs/gui-5-plan-fixup`, then report (see Report) and wait for the spec author's review. Do not open the pull request before the spec author says the review is clean and that the IAN pull request has merged. Then open it with `gh pr create --base main --head docs/gui-5-plan-fixup --title "..." --body-file <file>` and the PR text below, with the issue number from step 3 filled in where the PR text says so. If the machine's permission check refuses it, report that and wait.

## Norms and safeguards

- The escalation table in [AGENTS.md](../../../../../../AGENTS.md) is authoritative. A patch that does not apply, a checksum that differs, a branch that already exists or a file outside the allowed files is an escalation, not something to fix by hand.
- Documentation only: no dependency, code, configuration or workflow change, and no full gate (`pnpm docs:check` and `pnpm format:check` are the checks, as the spec workflow says for a docs-only unit).
- No AI or tool attribution in commits, the branch, the issue or the pull request.
- Do not edit the decision records' wording. If something in them looks wrong, report it.

## Acceptance checks

1. The spec is the branch's first commit, alone.
2. `pnpm docs:check` prints no broken local links or anchors and valid sequence tables; `pnpm format:check` passes.
3. `git --no-pager diff --stat origin/main...HEAD` lists only the four allowed files.
4. `git grep -n ISSUE_NUMBER -- ':!docs/project/milestones/v0.1/gui-5/specs/plan-fixup.md'` finds nothing, and both issue links name the issue filed in step 3.
5. The GUI.5 sequence table lists GUI.5a (Next), GUI.5c, GUI.5d, GUI.5b and GUI.5e, in that order.
6. The slice plan has an Appendix B with D385 to D395.

## Report

The branch and its base commit, both commit hashes, the diff stat, the docs and format check results, the issue number and link, the result of each acceptance check, any escalation with the AGENTS.md table row that triggered it, and a "Pilot measures" line with the counts the spec workflow asks for.

## PR text

**Title**

`docs(gui-5): record the GUI.5 plan fix-up decisions (GUI.5-plan-fixup)`

**Description** (replace `N` with the issue number from step 3 before opening)

```markdown
### Summary

Records the decisions that came out of the 2026-11-28 review of the GUI.5 plan (D385 to D395, Appendix B of the GUI.5 slice plan):

- A desktop release pins one exact engine pre-release, produced by IAN API.26, and checks its checksums (D385). The managed engine lives in the application's own folder (D386). The first launch needs the internet and says so (D387). The compatibility check reads the engine's version from `/v1/info` (D388).
- Data safety goes only through IAN API.25's database operations: backup before an update, upgrade through the API, restore on failure (D389). Uninstalling keeps the user's data (D390), and the update confirmation names saved results that will no longer open in detail (D391).
- GUI.5 runs 5a, 5c, 5d, 5b, 5e, so the work does not stall while IAN API.20 and API.21 wait behind the Canadian-listings work (D392).
- GUI.5b restates the new-user landing rule D374, which the previous planning pull request dropped (D393).
- The diagnostic report takes the engine's part only from its API (D394).
- The planning spec's own filename is corrected (D395).

The engine's side is IAN API plan record A.25.

A remove-all-data action is tracked in #N.

### Scope

Documentation only: the GUI.5 slice plan, the v0.1 implementation plan's GUI.5 section and the GUI.5 planning spec.

### Verification

- `pnpm docs:check`
- `pnpm format:check`
```

## Change log

- 2026-11-28: The link to AGENTS.md under Norms and safeguards had five ../ segments; it needs six, because the spec is five folders below the repository root. Found by the implementer's step 1 check.
- 2026-11-28: Step 3's check and acceptance check 4 asked that `ISSUE_NUMBER` appear nowhere in the repository, which this spec cannot meet while it names the placeholder; both now exclude this spec. Found by the implementer's report.
