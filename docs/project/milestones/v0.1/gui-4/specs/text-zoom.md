# Spec text-zoom: let the owner enlarge and shrink the window's text from the keyboard

- **Owning plan:** none; a fast-lane change under the [spec workflow](../../../../SPEC_WORKFLOW.md). The project owner chose it on 2026-11-26 (option A of the text-size question raised in the owner's look at GUI.4c3a).
- **Branch:** `feat/text-zoom-keys`, from the newest `origin/main`; the implementer reports its commit.
- **Decisions approved:** none needed; a fast-lane change has no decision in it. The owner approved the Tauri configuration change in the thread on 2026-11-26.
- **Lane:** fast.

## Goal

Ctrl plus, Ctrl minus and Ctrl 0 enlarge, shrink and reset the whole window's content on Windows, macOS and Linux, through the webview's own zoom and no in-app control. At a larger zoom the sidebar outgrows a window of the minimum size and scrolls by itself, so the owner can try that behaviour by hand.

## Decisions

None. The change is one window setting, plus a permission only if the platform needs it.

## Out of scope

- An in-app "Text size" setting, remembering the zoom across restarts, and any other font or layout change.
- Any change to the minimum window size, to styles, to Vue code, or to any dependency, `Cargo.toml` or `pnpm-lock.yaml`.
- Issues 37, 47 and 48 (flaky tests).

## Allowed files

- `docs/project/milestones/v0.1/gui-4/specs/text-zoom.md` (this spec; changed only by the spec author's corrections)
- `src-tauri/tauri.conf.json` (the main window's `zoomHotkeysEnabled` only)
- `src-tauri/capabilities/default.json`, or the capability file that holds the window's permissions, only if the zoom keys need a webview zoom permission on a platform (step 3)
- one test file that checks the setting: a new Vitest file under `tests/tools/` or an addition to an existing shell test file under `tests/shell/`, whichever the repository's convention for checking `tauri.conf.json` already uses

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`: `git fetch origin`, then `git switch -c feat/text-zoom-keys origin/main`. This spec is in the working tree as an untracked file; commit it alone as `docs(spec): text zoom keys spec`. Check: `pnpm docs:check` and `pnpm format:check`.

2. **The setting.** In `src-tauri/tauri.conf.json`, set `zoomHotkeysEnabled` to `true` on the main window, next to `minWidth` and `minHeight`. Check, in the Tauri 2.12.5 documentation or schema in the repository's dependencies (not from memory), that the property exists for a window with that name and what it needs on each platform. If it does not exist under that name, or the platform notes need anything beyond step 3, stop and escalate (AGENTS.md escalation table, the row for a work that needs a file outside the allowed files, or the Tauri configuration).

3. **Permission, only if needed.** If the documentation says macOS or Linux need a webview zoom permission, add exactly that one permission (for Tauri 2, `core:webview:allow-set-webview-zoom`) to the capability that already covers the main window; nothing else. If no permission is needed, change no capability file and say so in the report.

4. **The test.** Add a test that reads `src-tauri/tauri.conf.json` and fails when the main window does not have `zoomHotkeysEnabled: true` (and, if step 3 added a permission, when the capability lacks it). Expected values come from the file's structure, no literal window label other than the one the file already uses. Run it once with the setting removed to see it fail, then restore it. Check: `pnpm gate:slice`, then `pnpm gate --part shell` (the shell job runs in CI for any `src-tauri/` change; run it locally if the machine can, and say if it cannot). Commit: `feat(shell): enable keyboard zoom of the window text`.

5. **Push and report.** `git push -u origin feat/text-zoom-keys`, then report (see Report) and wait for the spec author's review. After a clean review, and when the project owner has typed the go-ahead for the pull request in the thread, open the pull request with the PR text below through `gh pr create --base main --head feat/text-zoom-keys --title "..." --body-file ...`; if the machine's permission check refuses it, report that and wait. Then watch CI and send the spec author the failing lines of any failed job.

## Norms and safeguards

- Escalate by the table in [`AGENTS.md`](../../../../../../AGENTS.md#escalation-in-a-spec-driven-unit).
- No dependency changes, no Rust code change, no style change; every user-facing string stays in the catalog (there is none here); no AI or tool attribution anywhere.
- `pnpm gate:slice` after each step that changes code, tests or a file the gate reads, in the foreground; no full gate.

## Acceptance checks

1. `pnpm gate:slice` passes on the pushed commit, and `pnpm gate --part shell` passes or the report says why it could not run.
2. `pnpm docs:check` and `pnpm format:check` pass.
3. `git --no-pager diff --stat origin/main...HEAD` lists only allowed files.
4. The new test passes, and fails with the setting removed.
5. In `pnpm sandbox` or the built application: Ctrl plus enlarges the content, Ctrl minus shrinks it, Ctrl 0 resets it, and at a larger zoom in an 800 by 600 window the sidebar scrolls by itself. Report which platform you tried; say plainly if the sandbox does not run in a Tauri window and the keys could not be tried.

## Report

- The branch's commit hashes with their titles, and the `main` commit it started from.
- `git --no-pager diff --stat origin/main...HEAD`.
- The last `pnpm gate:slice` result: its summary lines, and the shell gate's result.
- Whether the documentation required a permission, with the lines that say so.
- The result of each acceptance check, numbered as above.
- Every escalation, with the table row that triggered it.
- Pilot measures: one value for each measure in the engine's spec workflow section 7, "not yet known" for those known only after the pull request.
- **Try it:** in the application press Ctrl plus a few times: the content grows and the menu on the left scrolls by itself in a short window; Ctrl 0 resets it. Command: `pnpm sandbox` (or the built application, if the sandbox runs in a browser).

## PR text

Title: `feat(shell): enable keyboard zoom of the window text`

Description:

```markdown
## Summary

The owner's look at GUI.4c3a found no way to enlarge the text, and so no way to try the sidebar scrolling by hand at the minimum window size.

- The main window turns on the webview's own zoom keys: Ctrl plus, Ctrl minus and Ctrl 0. It changes one window setting and no code or styles, and the zoom is not remembered across restarts.

## Tests

- A test checks that the window setting is on.
```

## Change log

None yet.
