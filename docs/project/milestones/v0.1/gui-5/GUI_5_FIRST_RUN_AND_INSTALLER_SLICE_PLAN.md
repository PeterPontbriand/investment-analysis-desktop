# GUI.5 — First-run and installer slice plan

## At a glance

- **What this plan covers:** the work to deliver a complete, installable desktop-and-engine product for nontechnical investors, from managed engine setup and first-run onboarding through platform packaging, updates, release production and clean-machine acceptance.
- **What this plan excludes:** publishing preview releases and collecting feedback, which GUI.6 owns; application implementation details not yet validated; and changes to IAN's API contract.
- **Rules:** [AGENTS.md](../../../../../AGENTS.md) and the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md) govern this work. GUI.5 decisions D332–D343 remain in the [v0.1 implementation plan, GUI.5 section](../IMPLEMENTATION_PLAN.md#gui5-first-run-and-installer); this plan records the additional approved direction D344–D352 and the 2026-11-28 fix-up D385–D395.

## Sequence and status

| Unit | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.5a | [Managed engine installation and lifecycle](#gui5a-managed-engine-installation-and-lifecycle) | Next | |
| GUI.5c | [Platform packaging and signing](#gui5c-platform-packaging-and-signing) | Planned | |
| GUI.5d | [Updates and data safety](#gui5d-updates-and-data-safety) | Planned | |
| GUI.5b | [First-run and sample onboarding](#gui5b-first-run-and-sample-onboarding) | Planned | |
| GUI.5e | [Release automation and acceptance](#gui5e-release-automation-and-acceptance) | Planned | |

The units run in the table's order, and keep their letters so that existing links still work (D392). GUI.5a is built and tested against an IAN commit or a locally built engine package. GUI.5c depends on GUI.5a. GUI.5d depends on GUI.5c and on [IAN API.25](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api25--database-care-through-the-api). GUI.5b depends on IAN API.20 and API.21, which IAN's order places after its Canadian-listings work. GUI.5e depends on all of them and on the first engine pre-release that [IAN API.26](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api26--engine-release-production) produces (D385). GUI.6 starts after GUI.5 is complete and its installed-product acceptance criteria are satisfied.

## Units of work

### GUI.5a: Managed engine installation and lifecycle

- **Problem:** An installed desktop application must work without asking an investor to install development tools or configure an engine.
- **Decision:** Install and manage the pinned, compatible IAN environment as part of the desktop product, preserve the current developer discovery workflow, and keep all engine communication on the published API. The managed engine lives in a folder that belongs to the application (D386); the first launch needs the internet and says so (D387); the compatibility check reads the engine's version from its API (D388).
- **Scope:** Establish the runtime and engine environment from a pinned engine release and its checked dependency list (D385); locate, start and stop the managed engine; check desktop/engine compatibility; report startup failures clearly; and provide a recoverable path for a missing, incomplete or damaged installation.
- **Branch:** `feat/gui-5a-managed-engine`.
- **Detail:** No lower-level slice plan exists yet.

### GUI.5b: First-run and sample onboarding

- **Problem:** A first-time user needs a guided path to a working demonstration without configuring the engine or learning developer tools.
- **Decision:** Preserve the approved first-run SEC identity and sample workspace direction, including the sample banner, settings controls and in-app Try it guide. After the first-run screen a new user lands on Getting started, which offers Open sample workspace and, while the sample is open, a link to the Try it guide; for a new user only, this replaces Watchlists as the start screen (D393, restating D374 in the [GUI.4 slice plan](../gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started)).
- **Scope:** Implement first-run setup and onboarding with the engine through its API. IAN API.20 and API.21 must merge before the sample workspace and SEC identity work that uses them.
- **Branch:** `feat/gui-5b-first-run-sample`.
- **Detail:** The existing decisions are recorded in the [v0.1 implementation plan, GUI.5 section](../IMPLEMENTATION_PLAN.md#gui5-first-run-and-installer). No lower-level slice plan exists yet.

### GUI.5c: Platform packaging and signing

- **Problem:** The installable product needs a practical distribution format and verified trust path on each supported desktop platform.
- **Decision:** Start with a signed Windows NSIS `.exe`, a signed and notarized macOS `.dmg`, and an AppImage candidate for Linux; consider `.deb` and Flatpak as later alternatives.
- **Scope:** Validate packaging and architecture compatibility for Windows, macOS and Linux; establish signing and notarization requirements; and make recurring costs, certificates, credentials and operational responsibilities explicit. Do not claim signing or notarization until the release process has been established and verified. Builds made for a release pin an engine pre-release (D385).
- **Branch:** `feat/gui-5c-platform-packaging`.
- **Detail:** No lower-level slice plan exists yet.

### GUI.5d: Updates and data safety

- **Problem:** Updating, repairing or removing the desktop product must not leave an unusable application or silently discard user work.
- **Decision:** Treat desktop and IAN versions as a compatible product pair; prefer Tauri's signed updater with explicit user confirmation; preserve user data during updates, recovery, uninstall and reinstall. The user's data is kept safe only through [IAN API.25](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api25--database-care-through-the-api)'s database operations, never by the application handling the database itself (D389). Uninstalling keeps the user's data, and the first preview has no action that removes it all (D390). The update confirmation says when results saved before the update can no longer be opened in detail (D391).
- **Scope:** Define compatible version metadata, protect updater signing keys and release credentials, handle interrupted or failed updates (backing up through the engine first and offering to restore that backup), recover from incomplete or incompatible installations, and distinguish application/runtime files from user-owned data. A complete data removal action is tracked in [issue 59](https://github.com/PeterPontbriand/investment-analysis-desktop/issues/59) and is not in the first preview.
- **Branch:** `feat/gui-5d-updates-data-safety`.
- **Detail:** No lower-level slice plan exists yet.

### GUI.5e: Release automation and acceptance

- **Problem:** A successful developer build does not demonstrate that a nontechnical user can install and use the released product.
- **Decision:** Make release production repeatable through GitHub Actions where practical, and require clean-machine acceptance testing of actual installed artifacts. The pinned engine comes from a release that [IAN API.26](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api26--engine-release-production) produces (D385).
- **Scope:** Plan platform builds and installers, signing/notarization, checksums, signed updater artifacts and metadata, exact desktop/IAN version records, release assets and notes, and protected release secrets. Test fresh installation and first launch, engine setup and startup, SEC identity and sample onboarding, a representative analysis, network/provider failures, repair, updates and recovery, uninstall/reinstall, and user-data preservation on clean machines or equivalent VMs. Identify checks requiring actual platform hardware or operating systems.
- **Branch:** `feat/gui-5e-release-acceptance`.
- **Detail:** No lower-level slice plan exists yet.

## Scope limits

- GUI.5 prepares and verifies the installable desktop-and-engine product. GUI.6 owns preview publication, accessible download and release information, feedback intake, and the human smoke test for installed preview releases.
- Windows, macOS and Linux remain supported platforms. Different initial package formats do not change that commitment.
- The installed application does not require the user to install Python, Node.js, Rust, a terminal, a package manager or configure an environment variable.
- The engine remains accessible to the GUI through its published, versioned HTTP API. This plan does not authorize direct database, file, Python-module or other private engine access. Backup, upgrade and restore of the user's data, and the engine's part of a diagnostic report, also go through the API (D389, D394).
- The managed engine and its runtime live in a folder that belongs to the application, never in the user's own tool folders or on PATH (D386).
- The current developer workflow continues to support `IAD_IAN_PATH` and PATH-based `ian` discovery.
- The GUI.5 first-run and sample work depends on IAN API.20 and API.21, data safety on IAN API.25, and release production on IAN API.26. The sample workspace and Try it guide remain part of the first installer as required by D343.
- This plan does not implement product code, installer scripts or configuration, signing/updater configuration, dependencies, CI workflows, telemetry, automatic diagnostic-data transmission, a general-purpose package manager or background updating.
- Technical details that need implementation-time validation remain constraints or future decisions for their owning specs; this plan does not settle them in advance.

Future specs must validate whether a pinned bundled `uv` can establish and recover the IAN environment on each supported platform and architecture; the installed engine's discovery, startup, shutdown and compatibility behavior; package and updater recovery paths; signing-key custody and the ongoing signing/notarization process; and the diagnostic report's exact contents and sanitization. These implementation details remain open.

## Acceptance criteria

- The first-run path can reach a functioning demonstration without a user installing development tools or configuring the engine.
- The installed product installs and manages its pinned IAN environment, starts and stops it appropriately, checks compatibility, explains startup failures and provides a recovery path.
- The GUI continues to use IAN's published API, and developer discovery through `IAD_IAN_PATH` and PATH continues to work.
- The first-run SEC identity and sample workspace work starts only after IAN API.20 and API.21 have merged; the approved sample banner, settings controls and Try it guide are in the first installer.
- Windows, macOS and Linux have platform-appropriate packaging plans, with signing and notarization requirements and operational costs identified.
- Desktop and IAN updates identify a compatible pair, require user confirmation that names any saved results that will no longer open in detail, back up through the engine before changing anything, recover from interrupted or incompatible updates, and preserve user data. Uninstall does not delete user-owned data.
- Release production records exact desktop and IAN versions, creates and validates checksums, protects signing credentials and produces the planned platform and updater artifacts.
- Acceptance testing covers actual installed artifacts on clean machines or equivalent clean VMs for all supported platforms, including onboarding, representative use, failure and recovery paths, updates, uninstall/reinstall and data preservation.
- A diagnostic report can be planned as a user-controlled support capability with clear contents and sanitization, taking the engine's part only from its API; no telemetry or automatic transmission is introduced.
- GUI.6 owns preview publication and feedback intake after GUI.5's installable product and acceptance criteria are satisfied.

## Background and origin

GUI.5's existing first-run, sample workspace and SEC identity decisions D332–D343 are recorded in the [v0.1 implementation plan, GUI.5 section](../IMPLEMENTATION_PLAN.md#gui5-first-run-and-installer). They remain in force and are not repeated here. This plan records the approved 2026-11-27 product-delivery direction for managed engine installation, platform distribution, updates, data safety, release production and acceptance, plus the preview-access direction assigned to GUI.6. A review on 2026-11-28 found that the direction needed an installable engine release, engine-side data care and a different order; the fix-up decisions D385–D395 in Appendix B record the answers, with the engine's side in [IAN API plan A.25](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#a25-engine-releases-for-the-desktop-2026-11-28).

## Appendix A — approved decisions (2026-11-27)

### D344 — Optimize distribution for nontechnical users

The product's distribution experience must not assume that users know what Python, Node.js, Rust, a terminal, a package manager or an environment variable is. A user should be able to obtain the appropriate installer, install the application through an ordinary platform-appropriate process, launch it, complete first-run setup and reach a functioning demonstration without manually installing developer tools or configuring the engine. This is the governing product requirement for installer and distribution work.

### D345 — Install and manage the engine as part of the desktop product

Treat the desktop application and its compatible, pinned Investment Analysis Engine (IAN) version as one tested product release. The installer must provide the runtime needed to establish the engine environment without requiring separate installation of Python or other development tooling. The existing GUI.5 recommendation to bundle a pinned `uv` executable and use it to install the exact IAN version selected for the desktop release remains the preferred approach.

The installed application must locate and launch the application-managed engine environment, start the engine when needed, detect and report startup failures in understandable language, shut down the engine appropriately when the application exits, keep the engine version compatible with the desktop application's expected API, and provide a recoverable path when the installation is missing, incomplete or damaged.

Preserve the existing developer workflow, including `IAD_IAN_PATH` and PATH lookup, without making those mechanisms end-user requirements. The desktop application continues to communicate with IAN through its published API; this decision does not authorize direct database, file, Python-module or other private engine access.

### D346 — Provide platform-appropriate installers and signing

The initial distribution recommendation is a signed Windows NSIS `.exe` installer with an ordinary installation wizard, a signed and notarized macOS `.dmg`, and an AppImage as the initial Linux distribution candidate. Evaluate `.deb` and Flatpak as later alternatives rather than expanding the first release unnecessarily.

The plan must account for platform requirements including signing, notarization, architecture compatibility, packaging and installation testing. Recurring costs, certificates, credentials and operational responsibilities must be explicit. Do not claim that a package is signed or notarized until the corresponding release process has been established and verified.

### D347 — Treat updates as updates to a compatible product pair

The desktop application and IAN must be updated as a compatible, tested pair. Use Tauri's signed updater as the preferred desktop update mechanism, with explicit user confirmation before an update is installed.

The plan must address how a desktop release identifies its required IAN version, how update metadata identifies compatible desktop and engine versions, how updater signing keys and release credentials are protected, what happens when an update is interrupted or fails, how the application recovers from an incomplete or incompatible update, and how user data is protected throughout. An update must not silently discard user data or leave the user with an unusable application.

### D348 — Automate repeatable release production

Release production should be repeatable and automated as far as practical through GitHub Actions. The planned process covers building the desktop application and pinned engine environment for supported platforms; producing platform-specific installers; signing and notarizing appropriate artifacts; producing and validating checksums; producing signed updater artifacts and release metadata; recording exact desktop and IAN versions; and publishing assets and release notes.

Credentials and private signing keys are protected release secrets and must never be committed to the repository or embedded in publicly distributed source or artifacts.

### D349 — Require clean-machine installation acceptance testing

A successful developer build is not evidence that an installer is suitable for nontechnical users. Release acceptance must include testing on clean machines or equivalent clean virtual machines without the project's development toolchain.

At a minimum, test fresh installation and first launch; engine installation, discovery and startup; first-run setup including SEC identity configuration; sample workspace creation and the in-app Try it guide; a representative analysis workflow; operation when the network is unavailable or a required provider cannot be reached; understandable handling of missing, incomplete or damaged engine installations; desktop and engine updates; interrupted or failed updates and recovery; uninstallation and subsequent reinstallation; and preservation of user data across uninstall and reinstall. Identify which checks apply to Windows, macOS and Linux and which require actual hardware or operating-system environments.

### D350 — Preserve user data during uninstall and recovery

Uninstalling the desktop application must not silently delete the user's investment-analysis data. Distinguish application files and managed runtime files from user-owned data. If complete data removal is offered, it must be a separate, explicit action with a clear explanation of what will be deleted. Repairing or reinstalling the application must not require the user to sacrifice existing work.

### D351 — Provide useful, privacy-conscious diagnostics

The product should provide a way for a user to produce a diagnostic report when something goes wrong. The report should be understandable and useful for support while avoiding unnecessary disclosure of personal information, SEC identity details, credentials, tokens or other sensitive data. The plan must identify the intended contents, sanitization requirements and user-controlled method of producing and sharing the report.

This is a product capability to plan, not authorization to add telemetry or automatic transmission of diagnostic data.

### D352 — Make preview downloads and feedback accessible (GUI.6)

A prospective user should not need to understand the repository's development structure to find the correct installer. The preview release experience should provide a clear, prominent route to the appropriate platform download, explain the pre-release status and make it easy to report a problem or provide feedback. The initial implementation may use a well-organized GitHub Releases page and repository README rather than requiring a separate website.

The release and feedback work belongs primarily to GUI.6, not to the installer implementation itself.

## Appendix B — approved decisions (2026-11-28)

Approved by the project owner on 2026-11-28. The engine's side is recorded in [IAN API plan A.25](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#a25-engine-releases-for-the-desktop-2026-11-28) (R1 to R9).

### D385 — An engine release is a prerequisite

GUI.5a is built and tested against an IAN commit or a locally built engine package. GUI.5c's release builds and GUI.5e need the first engine pre-release that [IAN API.26](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api26--engine-release-production) produces. A desktop release pins one exact IAN pre-release and checks the checksums of its engine package and its dependency list before installing them.

### D386 — The managed engine lives in the application's own folder

The desktop application installs the engine with `uv tool install`, as IAN's A.1 says, with `uv`'s tool, Python and cache folders pointed at a folder that belongs to the application. It never uses the user's own `uv` tools and never puts `ian` on PATH, so the managed engine never collides with a developer's own `ian`, and uninstalling removes it whole. Developer discovery through `IAD_IAN_PATH` and PATH is unchanged.

### D387 — The first launch needs the internet

`uv` downloads Python and the engine's checked dependencies at the first launch. The first-run screen says so before it starts, in the same words as D335's sample choice, and when there is no connection it explains and offers to try again. Rejected for the first preview: a fully offline installer that carries Python and every dependency for each platform, which makes every installer much larger and needs every dependency built for each platform and architecture.

### D388 — The compatibility check reads the engine's API

The desktop application reads `engine_version` and `api_versions` from `/v1/info`. For the managed engine, any version other than the pinned one leads to the repair path (D345). With developer discovery it only warns.

### D389 — Data safety goes through the engine

GUI.5d keeps the user's data safe only through [IAN API.25](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/project/milestones/v0.2/api/API_CONTRACT_AND_SLICE_PLAN.md#api25--database-care-through-the-api)'s database operations. Before an engine update the application asks the engine for a backup, it upgrades the database through the API, and when the update or the upgrade fails it offers to restore that backup. The application never finds, copies, backs up or deletes the database itself (D332, D342). GUI.5d starts after IAN API.25 merges.

### D390 — Uninstalling keeps the data

Uninstalling removes the application and the managed engine folder of D386 only. Its text, in investor words, says that the user's analysis data is kept and that reinstalling finds it again. The first preview has no action that removes all of the user's data, which D350 allows only "if offered"; the action is tracked in [issue 59](https://github.com/PeterPontbriand/investment-analysis-desktop/issues/59), paired with the engine operation that IAN's R7 tracks.

### D391 — The update confirmation names what changes

When a release's metadata says that results saved before it can no longer be opened in detail (IAN R5), the update confirmation says so in investor words before anything is installed, and the user can decline.

### D392 — GUI.5 order

The units run in the order GUI.5a, GUI.5c, GUI.5d, GUI.5b, GUI.5e and keep their letters, so that existing links still work. GUI.5c needs GUI.5a; GUI.5d needs GUI.5c and IAN API.25; GUI.5b needs IAN API.20 and API.21; GUI.5e needs all of them and IAN API.26's first pre-release. GUI.5a stays Next.

### D393 — The new-user landing rule

GUI.5b restates D374 in the [GUI.4 slice plan](../gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started): after the first-run screen a new user lands on Getting started, which offers Open sample workspace and, while the sample is open, a link to the Try it guide. For a new user only, this replaces Watchlists as the start screen.

### D394 — Diagnostics read the engine only through its API

The diagnostic report of D351 takes the engine's part only from `/v1/info` and IAN API.25's database status. It never reads engine files, logs or the database. When more engine detail is needed later, IAN adds an API operation, with a matching command, first. The report never contains the SEC identity, the API token or file paths that could name the user.

### D395 — The planning spec's own filename

The GUI.5 planning spec lists itself as `gui-5-planning-update.md` in its Allowed files, but it is committed as `specs/planning.md`. The entry is corrected and the spec's Change log says so.
