# Spec GUI.5-planning: Installer and distribution planning update

- **Owning plan:** [v0.1 implementation plan — GUI.5: First-run and installer](../../IMPLEMENTATION_PLAN.md#gui5-first-run-and-installer).
- **Branch:** `docs/gui-5-installer-planning`, based on `5a50de17fa86b16284cd61a36a0463c3aa6efe26` (`origin/main`).
- **Decisions approved:** 2026-11-27. The project owner approved the product-delivery direction and recommendations in the discussion that produced this spec. The decisions below are to be recorded in the GUI.5 plan.
- **Lane:** Normal.

## Goal

The repository's v0.1 planning documents describe a coherent, achievable path from the current desktop application to signed, installable preview releases that a nontechnical investor can install, launch, and try without first setting up a developer environment.

The plan must cover the complete delivery experience—not just the generation of installer files—including the managed engine installation, first-run experience, platform distribution, updates, recovery, user-data preservation, release automation, and clean-machine acceptance testing.

This is a documentation-only planning unit. It makes no application or infrastructure changes.

## Decisions

Record the following approved decisions in the new GUI.5 slice plan's decision appendix, using decision identifiers D344 onward. Preserve all existing decision identifiers and records.

### D344 — Optimize distribution for nontechnical users

The product's distribution experience must not assume that users know what Python, Node.js, Rust, a terminal, a package manager, or an environment variable is.

A user should be able to obtain the appropriate installer, install the application through an ordinary platform-appropriate process, launch it, complete first-run setup, and reach a functioning demonstration without manually installing developer tools or configuring the engine.

This is the governing product requirement for the installer and distribution work.

### D345 — Install and manage the engine as part of the desktop product

Treat the desktop application and its compatible, pinned Investment Analysis Engine (IAN) version as one tested product release.

The installer must provide the runtime needed to establish the engine environment without requiring the user to install Python or other development tooling separately.

The existing GUI.5 recommendation to bundle a pinned `uv` executable and use it to install the exact IAN version selected for the desktop release remains the preferred approach.

The installed application must manage the engine lifecycle:

- Locate and launch the application-managed engine environment.
- Start the engine when the desktop application needs it.
- Detect and report startup failures in understandable language.
- Shut down the engine appropriately when the application exits.
- Keep the engine version compatible with the desktop application's expected API.
- Provide a recoverable path when the engine installation is missing, incomplete, or damaged.

Preserve the existing developer workflow. Development must continue to support the current `ian` discovery mechanism, including `IAD_IAN_PATH` and PATH lookup, without making those mechanisms part of the end-user installation requirements.

The desktop application must continue to communicate with IAN through its published API. This decision does not authorize direct database, file, Python-module, or other private engine access.

### D346 — Provide platform-appropriate installers and signing

The initial distribution recommendation is:

| Platform | Initial distribution approach |
| :--- | :--- |
| Windows | Signed NSIS `.exe` installer, with an ordinary installation wizard. |
| macOS | Signed and notarized `.dmg` distribution. |
| Linux | AppImage as the initial distribution candidate; evaluate `.deb` and Flatpak as later alternatives rather than expanding the first release unnecessarily. |

The GUI.5 plan must account for the practical requirements of each platform, including signing, notarization, architecture compatibility, packaging, and installation testing.

Signing and notarization are part of product trust and distribution readiness, not optional cosmetic enhancements. Their recurring costs, certificates, credentials, and operational responsibilities must be made explicit.

Do not claim that a package is signed or notarized until the corresponding release process has actually been established and verified.

### D347 — Treat updates as updates to a compatible product pair

The desktop application and IAN must be updated as a compatible, tested pair.

Use Tauri's signed updater as the preferred desktop update mechanism, with explicit user confirmation before an update is installed.

The plan must address:

- How a desktop release identifies its required IAN version.
- How update metadata identifies compatible desktop and engine versions.
- How updater signing keys and release credentials are protected.
- What happens when an update is interrupted or fails.
- How the application recovers from an incomplete or incompatible update.
- How user data is protected throughout the update process.

An update must not silently discard user data or leave the user with an unusable application.

### D348 — Automate repeatable release production

Release production should be repeatable and automated as far as practical through GitHub Actions.

The planned release process must cover:

- Building the desktop application and its pinned engine environment for supported platforms.
- Producing the platform-specific installer artifacts.
- Signing and notarizing the appropriate artifacts.
- Producing and validating checksums.
- Producing the signed updater artifacts and release metadata.
- Recording the exact desktop and IAN versions represented by each release.
- Publishing the appropriate assets and release notes.

Credentials and private signing keys must be handled as protected release secrets. They must never be committed to the repository or embedded in publicly distributed source or artifacts.

### D349 — Require clean-machine installation acceptance testing

A successful developer build is not evidence that an installer is suitable for nontechnical users.

The release acceptance process must include testing on clean machines or equivalent clean virtual machines that do not already have the project's development toolchain installed.

At a minimum, test:

- Fresh installation and first launch.
- Engine installation, discovery, and startup.
- First-run setup, including SEC identity configuration.
- Sample workspace creation and the in-app Try it guide.
- A representative analysis workflow.
- Operation when the network is unavailable or a required provider cannot be reached.
- Understandable handling of missing, incomplete, or damaged engine installations.
- Desktop and engine updates.
- Interrupted or failed updates and recovery.
- Uninstallation and subsequent reinstallation.
- Preservation of user data across uninstall and reinstall.

The acceptance plan must identify which checks apply to Windows, macOS, and Linux, and which platform-specific checks require actual hardware or operating-system environments.

### D350 — Preserve user data during uninstall and recovery

Uninstalling the desktop application must not silently delete the user's investment-analysis data.

The plan must distinguish application files and managed runtime files from user-owned data.

If complete data removal is offered, it must be a separate, explicit action with a clear explanation of what will be deleted.

Repairing or reinstalling the application must not require the user to sacrifice existing work.

### D351 — Provide useful, privacy-conscious diagnostics

The product should provide a way for a user to produce a diagnostic report when something goes wrong.

The report should be understandable and useful for support, while avoiding unnecessary disclosure of personal information, SEC identity details, credentials, tokens, or other sensitive data.

The plan must identify the intended contents, sanitization requirements, and user-controlled method of producing and sharing the report.

This is a product capability to plan, not authorization to add telemetry or automatic transmission of diagnostic data.

### D352 — Make preview downloads and feedback accessible

A prospective user should not need to understand the repository's development structure to find the correct installer.

The preview release experience should provide a clear, prominent route to the appropriate platform download, explain the pre-release status, and make it easy to report a problem or provide feedback.

The initial implementation may use a well-organized GitHub Releases page and repository README rather than requiring a separate website.

The release and feedback work belongs primarily to GUI.6, not to the installer implementation itself.

## Out of scope

This unit must not:

- Implement application code, installer scripts, build configuration, signing configuration, updater configuration, or GitHub Actions workflows.
- Add or upgrade dependencies.
- Change the Tauri or Rust configuration.
- Change the existing engine-launching implementation.
- Change the IAN API contract or assume new engine capabilities.
- Implement the first-run screen, sample workspace, or Try it guide.
- Revisit or renumber the existing approved GUI.5 decisions D332–D343.
- Create GitHub issues, milestones, releases, or project-board items.
- Change the project's supported-platform commitment.
- Introduce telemetry or automatic diagnostic-data transmission.
- Expand the v0.1 product scope into a general-purpose package manager or automatic background-update service.

Technical details that require implementation-time validation should be recorded as constraints, prerequisites, or explicit future decisions in the plan. They must not be silently converted into implementation commitments.

## Allowed files

Only these files may be created or changed:

1. `docs/project/milestones/v0.1/gui-5/specs/gui-5-planning-update.md` — this spec, committed as the first commit of the branch.
2. `docs/project/milestones/v0.1/IMPLEMENTATION_PLAN.md` — update the GUI.5 and GUI.6 descriptions, sequencing, and links to reflect the new planning.
3. `docs/project/milestones/v0.1/gui-5/GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md` — create the detailed GUI.5 planning document.

No other file is authorized to change. If the current documentation requires an additional change for consistency, stop and ask the spec author before making it.

## Steps

### 1. Establish the branch and commit this spec

- Inspect the worktree, current branch, and `origin/main`.
- Do not work on `main`.
- Require a clean worktree before starting. If it is not clean, stop and report the situation rather than modifying or stashing unrelated work.
- Fetch the latest `origin/main` and create `docs/gui-5-installer-planning` from it.
- If that branch already exists, do not reset, overwrite, or reuse it without approval.
- Confirm the exact base commit and record it in the spec header.
- Commit this spec as the first commit on the branch.

### 2. Create the GUI.5 slice plan

Create `GUI_5_FIRST_RUN_AND_INSTALLER_SLICE_PLAN.md` following the repository's planning-document conventions in `AGENTS.md`.

The document must have:

- An **At a glance** section stating what the plan covers, what it excludes, and which documents govern it.
- A sequence and status table immediately after At a glance.
- One short section for each planned work unit, using the required Problem, Decision, Scope, Branch, and Detail labels.
- Scope limits and acceptance criteria.
- Background and origin.
- An appendix recording decisions D344–D351, with their approval date of 2026-11-27.

The plan must be consistent with the existing GUI.5 decisions D332–D343. It must not duplicate their full decision records; link to the existing records in the v0.1 implementation plan.

Organize GUI.5 as a coherent sequence of work. At minimum, account for these areas:

1. **Managed engine installation and lifecycle:** pinned runtime and engine environment, installed-product engine discovery, startup and shutdown, compatibility, failure detection, and repair.
2. **First-run and sample onboarding:** existing first-run SEC identity and sample workspace decisions, including the sample banner, settings controls, and Try it guide.
3. **Platform packaging and signing:** Windows, macOS, and Linux distribution candidates, architecture considerations, signing, notarization, and their operational requirements.
4. **Updates and data safety:** signed updater, explicit user consent, desktop/engine compatibility, interrupted-update recovery, uninstall, and user-data preservation.
5. **Release automation and acceptance:** repeatable artifact production, protected signing credentials, checksums, release metadata, and clean-machine installation testing.

Choose a sensible sequence and state dependencies explicitly. In particular:

- IAN API.20 and API.21 remain prerequisites for the existing sample workspace and SEC identity work.
- The installed application must not require the user to install development tools.
- The engine must remain accessible through the published API.
- Release acceptance must test actual installed artifacts, not merely development builds.
- Windows, macOS, and Linux remain supported platforms, even if the initial packaging formats differ.

Do not over-specify implementation details that belong in future unit specs. The slice plan should establish the intended work, dependencies, branch sequence, acceptance criteria, and unresolved technical validation—not pre-implement the future specs.

The sequence table must have exactly one `Next` item and must follow the status-ordering rules in `AGENTS.md`.

### 3. Update the v0.1 implementation plan

Update the existing GUI.5 and GUI.6 sections so that they accurately summarize the new planning.

For GUI.5:

- Replace the current incomplete planning reference with a link to the new GUI.5 slice plan.
- Make clear that GUI.5 delivers a complete installable desktop-and-engine product, not merely installer files.
- Reflect the approved managed-engine, platform packaging, update, data-preservation, release-automation, and acceptance-testing direction.
- Preserve the existing GUI.5 decisions D332–D343 and their rationale.
- Remove or revise the old pre-GUI.5 decision table where its recommendations have now been superseded by approved decisions D344–D347.
- Keep any genuinely unresolved implementation questions visible rather than implying they have already been settled.

For GUI.6:

- Make clear that it owns preview publication and feedback intake after GUI.5's installable product and acceptance criteria are satisfied.
- Include the accessible download and release-information experience.
- Include the planned feedback route and privacy-conscious diagnostic-report capability.
- Retain the existing human smoke-test requirement for installed preview releases.
- Preserve the existing GUI.6 scope and prerequisites unless this approved planning direction requires a precise clarification.

Do not move GUI.6 work into GUI.5 merely because both concern distribution. GUI.5 prepares and verifies the product; GUI.6 publishes the preview and gathers feedback.

Do not change the status of GUI.5 or GUI.6 simply because their plans have been written. The implementation plan's sequence and status must continue to reflect actual implementation progress.

### 4. Review consistency and links

Review all three allowed files together.

Check that:

- Decision numbers are unique and sequential after D343.
- Existing decisions D332–D343 retain their original meaning and references.
- The implementation plan and GUI.5 slice plan agree on scope, sequencing, dependencies, and status.
- GUI.5 and GUI.6 responsibilities are clearly separated.
- The new document follows the planning-document structure in `AGENTS.md`.
- Every local Markdown link and heading anchor resolves.
- Sequence tables follow the repository's required status ordering and completion-date rules.
- No new technical or product decision has been introduced without approval.
- The documents do not duplicate material already owned by another document.

Run `pnpm docs:check` and `pnpm format:check`. Do not run a full application gate for this documentation-only unit.

### 5. Report and hand over

Report:

- The branch name and exact `origin/main` base commit.
- The commits made, including the initial spec commit.
- The final diff stat against `origin/main`.
- The three-file change list.
- The results of `pnpm docs:check` and `pnpm format:check`.
- Any unresolved technical validation or escalation.

After the spec author's clean review, open the pull request using the PR text below.

## Norms and safeguards

Follow the repository's `AGENTS.md`, especially:

- Project boundaries.
- Approval gates.
- Escalation in a spec-driven unit.
- Planning-document conventions.
- Scope and preservation.
- GitHub changes.
- Verification.

The escalation table in `AGENTS.md` is authoritative. If a decision, file scope, or existing document contradicts this spec, stop and escalate rather than resolving the discrepancy in code or documentation.

This is a documentation-only unit. No dependency, application, installer, release, or CI changes are authorized.

Do not add AI or tool attribution to any document, commit, branch, or pull request.

## Acceptance checks

The unit is complete when:

1. The spec is committed as the branch's first commit.
2. The GUI.5 slice plan exists and follows the repository's planning-document conventions.
3. The v0.1 implementation plan links to and accurately summarizes the new GUI.5 plan.
4. GUI.5 and GUI.6 have distinct, understandable responsibilities.
5. D344–D351 are recorded in the GUI.5 plan with the approval date 2026-11-27.
6. Existing GUI.5 decisions D332–D343 are preserved without renumbering or semantic changes.
7. The approved product-delivery direction is represented without turning unvalidated implementation details into commitments.
8. The change touches only the three allowed Markdown files.
9. `pnpm docs:check` passes.
10. `pnpm format:check` passes.
11. `git --no-pager diff --stat origin/main...HEAD` lists only the authorized files.

## Report

Provide the commit hashes, branch and base SHA, final diff stat, results of each acceptance check, and any escalation or unresolved issue.

## PR text

**Title**

`docs(gui-5): plan installer and distribution readiness (GUI.5-planning)`

**Description**

### Summary

Records the approved direction for delivering Investment Analysis Desktop as an installable product for nontechnical investors.

The GUI.5 plan now covers the complete product-delivery path: managed engine installation and lifecycle, first-run onboarding, platform-specific installers and signing, updates and recovery, user-data preservation, release automation, and clean-machine acceptance testing.

The v0.1 implementation plan distinguishes GUI.5's responsibility for preparing and verifying the installable product from GUI.6's responsibility for publishing the preview and collecting feedback.

### Scope

- Adds the GUI.5 first-run and installer slice plan.
- Records approved product-delivery decisions D344–D351.
- Updates the v0.1 implementation plan to reflect GUI.5 and GUI.6 responsibilities.
- Preserves the existing GUI.5 decisions D332–D343.

Documentation only. No application code, installer configuration, release workflow, or infrastructure changes.

### Verification

- `pnpm docs:check`
- `pnpm format:check`

## Change log

None. This is the initial committed version of the spec.