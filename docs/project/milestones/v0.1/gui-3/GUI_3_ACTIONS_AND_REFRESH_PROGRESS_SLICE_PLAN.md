# GUI.3 — Actions and refresh progress slice plan

## At a glance

- **What GUI.3 is:** the first screens that change anything. A user can create, rename and delete a watchlist, add and remove its entries, refresh it and follow the refresh while it runs, stop it, and analyze one ticker with the strategies they choose.
- **What GUI.3 is not:** help popups and the help panel (GUI.4), the first-run screen or the installer (GUI.5), a language picker, editing engine settings, or any financial calculation.
- **Rules:** [AGENTS.md](../../../../../AGENTS.md) and the [project charter](../../../CHARTER.md) govern the work. The decisions of the [GUI.2 slice plan](../gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record) still apply unless a decision in [Appendix A](#appendix-a-2026-11-16-decision-record) amends one by number.
- **Needs from the engine:** one small additive engine slice (D181), proposed as the engine's API.13 and needed by GUI.3b and later. GUI.3a can start without it.

## Sequence and status

| Sub-slice | Scope | Status | Completed |
| :--- | :--- | :--- | :--- |
| GUI.3a | [Action groundwork and watchlist management](#gui3a--action-groundwork-and-watchlist-management) | Complete | 2026-11-16 |
| GUI.3b | [Selection form and adding entries](#gui3b--selection-form-and-adding-entries) | Complete | 2026-11-18 |
| GUI.3c | [Refresh with progress and stop](#gui3c--refresh-with-progress-and-stop) | Next | |
| GUI.3d | [Analyze a ticker](#gui3d--analyze-a-ticker) | Planned | |

## Sub-slices

### GUI.3a — Action groundwork and watchlist management

- **Problem:** The adapter can only read, no screen can change anything, and a user cannot create or tidy a watchlist without a command line.
- **Decision:** Extend the adapter to the engine's action requests, add the shared pieces every action needs (a pending state, a confirmation dialog, action failures), and build the watchlist actions that need no selection form (D182 to D188).
- **Scope:** typed `POST`, `PATCH` and `DELETE` in the adapter, with the failure's error list kept (D182); the action helper and the reload after success (D183); the confirmation dialog (D184); create, rename and delete a watchlist (D185, D186); remove entries, singly or by ticker or strategy (D187); action failures (D188).
- **Branch:** `feat/gui-3a-watchlist-actions`, from main; its own pull request. No re-vendor.
- **Detail:** [GUI.3a detail](#gui3a-detail) in this plan.

### GUI.3b — Selection form and adding entries

- **Problem:** Adding an entry needs a strategy's options, which differ for every strategy and must appear with no application change when the engine gains a strategy.
- **Decision:** Build one form generated from the engine's selection form document, and use it to add entries to a watchlist and to show an entry's stored options (D189 to D196).
- **Scope:** the re-vendor to the engine slice of D181; the generated selection form and its supported schema constructs (D189 to D192); the strategy chooser with one shared as-of date (D193); the "Add entries" screen (D194, D227); field errors placed on their fields (D195, D230); an entry's stored options, read-only, and the remedy for an unreadable entry (D196, D233, D234); the files (D236) and the smoke checks W14 to W17 (D237).
- **Branch:** `feat/gui-3b-selection-form`, from main after GUI.3a merges and the engine slice of D181 merges; its own pull request.
- **Detail:** [GUI.3b detail](#gui3b-detail) in this plan.

### GUI.3c — Refresh with progress and stop

- **Problem:** A refresh runs for minutes. A user needs to start one, see it advance, stop it, and find its results.
- **Decision:** Start the engine's refresh job, follow it by polling from one application-wide follower, and show it on its own screen with a stop control (D197 to D204).
- **Scope:** "Refresh now" on the watchlist screen and the comparison (D197); the application-wide follower (D198); the refresh progress screen and its route (D199, D200); the navigation marker (D201); the stop control (D202); the finished, stopped and failed states (D203); closing the window while a refresh runs (D204); the SEC identity notice (D205).
- **Branch:** `feat/gui-3c-refresh-progress`, from main after GUI.3b merges; its own pull request.
- **Detail:** [GUI.3c detail](#gui3c-detail) in this plan.

### GUI.3d — Analyze a ticker

- **Problem:** A user who wants one answer about one ticker should not have to build a watchlist first.
- **Decision:** An "Analyze a ticker" screen that reuses the strategy chooser of GUI.3b and the refresh job of GUI.3c: the chosen strategies run as one refresh of entries that belong to no watchlist, and the result is a comparison with one row (D206 to D208).
- **Scope:** the screen, its navigation item and route (D206); starting the refresh of entries and handing over to the progress screen (D207); what the screen does not offer (D208).
- **Branch:** `feat/gui-3d-analyze`, from main after GUI.3c merges; its own pull request.
- **Detail:** [GUI.3d detail](#gui3d-detail) in this plan.

## Screen sketches

These are layouts to review, not final wording. Text in round brackets is an outcome pill. Every strategy name, field label, option name and outcome name in them is served by the engine; the application's own words are the headings, buttons and the lines marked *app*.

### Watchlist screen with actions (GUI.3a, GUI.3b)

```text
Watchlists
Core                                   [ Refresh now ] [ Add entries ] [ Rename ] [ Delete ]
4 entries · created Oct 30, 2026, 2:02 PM

#   Ticker   Strategy              As of          Options
1   ACME     Momentum              Latest data    Show      [ Remove ]
2   ACME     Graham Growth Value   Latest data    Hide      [ Remove ]
       Expected growth      6.5
       AAA yield            4.9
       EPS basis            Three-Year-Average EPS
       Use cache            Yes
3   BOLT     Momentum              Jun 30, 2026   Show      [ Remove ]
4   BOLT     Graham Number         Latest data    Show      [ Remove ]

Refreshes of this watchlist
...
```

### Remove dialog (GUI.3a)

```text
+----------------------------------------------------------+
| Remove from Core                                         |
|                                                          |
| (o) This entry: ACME, Momentum                           |
| ( ) Every entry for ACME                                 |
| ( ) Every Momentum entry                                 |
|                                                          |
| Saved runs are kept.                               *app* |
|                                                          |
|                                   [ Cancel ] [ Remove ]  |
+----------------------------------------------------------+
```

### Add entries (GUI.3b) and Analyze a ticker (GUI.3d)

The two forms share the strategy chooser. "Add entries" takes several tickers and ends in "Add"; "Analyze a ticker" takes one ticker and ends in "Analyze".

```text
Add entries to Core

Tickers        [ ACME, BOLT                    ]
               Separate tickers with commas or spaces.              *app*

As of          [ yyyy-mm-dd ]
               Leave empty for the latest data.                     *app*

Strategies
[x] Momentum                                              Options: Show
[x] Graham Growth Value                                   Options: Hide
      Expected growth *     [ 6.5  ]
          Expected annual earnings growth, in percentage points.
      AAA yield *           [      ]
          AAA yield is required.
      EPS basis             [ Three-Year-Average EPS  v ]
      EPS override          [      ]
      Quote override        [      ]
      Use cache             [x]
[ ] Graham Number
...

* Required                                                          *app*

                                                   [ Cancel ] [ Add ]
```

### Refresh in progress (GUI.3c)

```text
Refreshes
Refreshing Core                                  [ Stop after running entries ]
7 of 12 entries finished

Ticker   Strategy        Result
ACME     Momentum        (Completed)          <- links to the saved run
ACME     FCF Growth      Running…
BOLT     Graham Number   (Unavailable)
BOLT     Momentum        Running…
...
3 entries not started yet
```

### Refresh ended (GUI.3c)

```text
Refreshes
Refresh of Core finished                                    [ Open comparison ]
12 runs  (Completed 9)  (Unavailable 2)  (Failed 1)

Data providers checked after a failure:
Yahoo Finance     Unreachable

Ticker   Strategy        Result
ACME     Momentum        (Completed)
...
```

A stopped refresh reads "Refresh of Core stopped" with "3 entries were not started." under the counts line. A failed one reads "Refresh of Core failed" with the failure shown as D188 sets it, and keeps the rows it had.

### Navigation while a refresh runs (GUI.3c)

```text
Investment Analysis Desktop
Pre-release: ...

Analyze a ticker
Watchlists
Refreshes
   Refresh running · 7 of 12        <- links to the progress screen
Saved runs
About
```

## Scope limits

- Every action goes through the engine's published action requests; no action reads or writes anything else.
- No help popup or help panel. Every element that shows an engine term keeps its term id for GUI.4, form fields included (D192).
- No first-run screen: until GUI.5 the SEC identity still comes from the environment the application was started in. GUI.3 only says when it is missing (D205).
- No choice of worker count, saving or provider check for a refresh; the engine's defaults apply (D197).
- No editing of a stored entry in place and no reordering of entries (D196).
- No analysis that is not saved (D207).
- No ticker lookup, company-name suggestion or check that a ticker exists before the engine analyzes it. Company details for a ticker, and any check of a typed ticker, are IAD issue #19, planned with GUI.4.
- No language picker, no in-application theme toggle, no log file; GUI.2's limits stand.
- No dependency is added. If a sub-slice finds it needs one, it stops and asks.
- No release build or bundle, as [AGENTS.md](../../../../../AGENTS.md) requires before GUI.5.
- [docs/design/preview-mockups.html](../../../../design/preview-mockups.html) is not edited.

## GUI.3a detail

### File scope

- `src/api/client.ts` and its tests, for the action requests and the kept failure (D182).
- New shared pieces under `src/api/`, `src/components/` and `src/composables/` for the action helper and the confirmation dialog (D183, D184).
- `src/views/WatchlistsView.vue` and `src/views/WatchlistView.vue`, for the watchlist actions (D185 to D187).
- Catalog entries in `src/locales/en.json` and the test catalog.
- Typed fixtures under `tests/fixtures/api/`, the Playwright engine mock, and Vitest and Playwright tests (D209).
- `docs/project/SMOKE_TESTING.md` and, if its setup changes, `tools/smoke/` with its tests (D210).
- This plan's status row and decision rows, and the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md)'s GUI.3 section.

### Acceptance criteria

- The adapter sends `POST`, `PATCH` and `DELETE` with paths, queries and bodies typed from the generated types; a failure keeps its `reason_code`, `reason`, `errors` and `Content-Language`.
- A watchlist can be created, renamed and deleted, and entries removed singly, by ticker and by strategy, each from the screen that shows it, by mouse and by keyboard alone.
- Delete and remove ask for confirmation in a dialog that traps focus, closes on Escape and returns focus to the control that opened it; both dialogs say that saved runs are kept.
- After an action succeeds the screen shows what the engine now holds; the application never edits its own copy.
- While an action is pending its control cannot be used again, and a failure is shown beside the control as D188 sets.
- A rename or removal that the engine committed and then answered with an unreadable entry shows that entry's reason message.
- No user-facing message names internal shorthand, a command, an option or an environment variable.
- The pull request records the targeted run D210 names for GUI.3a.
- `pnpm gate` passes on Windows, macOS and Linux.

## GUI.3b detail

### File scope

- `vendor/ian/openapi.json`, `vendor/ian/SOURCE.md` and `src/api/schema.ts`, for the re-vendor (D181).
- The selection form, its schema reader, its template filler and the strategy chooser under `src/selection/` (D189 to D193, D236).
- `src/views/AddEntriesView.vue` and its route in `src/router.ts`, for the "Add entries" screen (D194, D227).
- `src/views/WatchlistView.vue`, for the "Add entries" action, an entry's options and the unreadable-entry remedy (D196, D233, D234); `src/api/client.ts`, for the kept `unreadable` element (D234).
- Catalog entries, typed fixtures, the engine mock, and Vitest and Playwright tests (D209).
- `docs/project/SMOKE_TESTING.md` (D210), and this plan's status row and decision rows.

### Acceptance criteria

- The form for a strategy is built only from `GET /v1/strategies/{method_id}/selection`: field labels, descriptions, option names, required marks and starting values all come from that document and the help references. The application holds no field name of any strategy other than `as_of`.
- A made-up strategy with a made-up selection schema, present only in a test fixture, gets a working form with no application code change.
- A unit test walks every selection schema in the vendored API description and fails if one uses a construct the form does not support (D190); at run time such a field shows the message of D190 and the strategy cannot be submitted, while the other strategies still can.
- Entries can be added for several tickers and several strategies in one submission; the result of each strategy's request is reported, and a later failure does not hide an earlier success (D194).
- Each error the engine lists is shown at the field it names, worded with the field's label; an error that names no visible field is shown above the submit button (D195).
- Each entry's stored options can be shown in the entries table (D196).
- A watchlist the engine refuses because of an unreadable entry offers the remedy of D196.
- Every form control has a visible label, required fields are marked in text and with `aria-required`, each error is tied to its field with `aria-describedby`, and focus moves to the first field with an error.
- The vendored API description is the engine commit D181's slice merged as.
- The pull request records the targeted run D210 names for GUI.3b.
- `pnpm gate` passes on Windows, macOS and Linux.

## GUI.3c detail

### File scope

- The refresh follower under `src/api/` and its provision in `src/main.ts` or `src/App.vue` (D198).
- The refresh progress screen, its components and its route in `src/router.ts`, named by refresh id (D199, D200).
- `src/App.vue` or the navigation component, for the marker (D201).
- `src/views/WatchlistView.vue` and `src/views/RefreshCompareView.vue`, for "Refresh now" (D197); `src/components/RefreshesTable.vue` only if D201 needs it.
- `src/platform/` and `src-tauri/`, only for the close confirmation of D204, including one capability entry if it needs one.
- Catalog entries, typed fixtures, the engine mock (a scripted job), and Vitest and Playwright tests; the shell smoke test only if D204 changes what it sees (D209).
- `docs/project/SMOKE_TESTING.md` and `tools/smoke/` if setup changes (D210), and this plan's status row and decision rows.

### Acceptance criteria

- "Refresh now" starts a refresh of the watchlist and opens the progress screen; it cannot be used while the follower knows a refresh is running.
- The progress screen shows what the engine reports and nothing else: the counts line from `totals`, one row per entry that has started, each finished row's outcome as a pill linking to its saved run, and the count of entries not yet started (D200).
- A client that passes on each answer's `next_after`, the stop answer included, shows every event exactly once; the follower polls again at once when `has_more` is true (D198).
- The follower keeps no analysis document from an event in memory (D198).
- Leaving the progress screen and returning, or opening it from the navigation marker, shows the same refresh without losing a row; the progress screen of a refresh the engine no longer keeps shows the message of D199.
- Stop asks the engine to stop, shows that it is stopping, and ends in the stopped or finished state the engine reports (D202).
- A finished or stopped refresh links to its comparison and shows its outcome counts and provider check from the summary; a failed one shows its failure and keeps its rows (D203).
- A start the engine refuses because a refresh is already running links to the progress screen (D197).
- Progress is announced to assistive technology from the counts line only, politely, and no more than once per poll.
- Closing the window while a refresh runs follows D204.
- When the engine reports no SEC identity, the notice of D205 is shown wherever a refresh or an analysis can be started.
- The pull request records the targeted run D210 names for GUI.3c.
- `pnpm gate` passes on Windows, macOS and Linux.

## GUI.3d detail

### File scope

- The "Analyze a ticker" screen under `src/views/`, its route and its navigation item (D206).
- The strategy chooser of GUI.3b, only where the screen needs a variation of it.
- Catalog entries, typed fixtures, and Vitest and Playwright tests (D209).
- `docs/project/SMOKE_TESTING.md` (D210); this plan's status row and decision rows; the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md)'s GUI.3 and GUI.4 rows.

### Acceptance criteria

- The screen takes one ticker, one shared as-of date and the chosen strategies with their options, and starts one refresh of entries (D207).
- Field errors the engine names by entry index are shown on that strategy's fields (D195).
- After the start the user is on the progress screen; when the refresh ends, "Open comparison" shows one row for the ticker with a group per chosen strategy.
- The screen cannot start a refresh while one is running, and says why with a link to the progress screen.
- A made-up strategy can be chosen and analyzed with no application code change.
- The pull request records the targeted run D210 names for GUI.3d.
- `pnpm gate` passes on Windows, macOS and Linux.

## Background

GUI.2 finished on 2026-11-15 with every screen read-only. The engine's action requests and refresh jobs have been available since its API.4 slices merged on 2026-11-07, and they are described in the engine's [API guide](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/API.md), in its "Actions", "Refresh jobs", "Request bodies" and "Selection forms" sections.

Three GUI.2 decisions left work for GUI.3, all in the [GUI.2 slice plan](../gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record): D89 (an entry's full selection, and the remedy for an unreadable entry), D93 (the running refresh view) and D154 (the "Analyze a ticker" navigation item and "Refresh now").

Reading the vendored API description at engine commit `0a767d2` for this plan found five things the screens need that the engine does not yet serve. They are the content of D181:

| Need | What is served today |
| :--- | :--- |
| A label for each selection field | A machine-made title ("Bvps Override") and a term id that several fields share (in one strategy three fields name the Override term, and in another two fields share one term) |
| An error message that can name a field by its label | The finished message only, with fields spelled as request paths ("selection.long_window") |
| Which entry is unreadable, when a watchlist is refused for one | The reason message only |
| The number of entries in a refresh | The entries started and the entries not yet started, separately |
| A name for a data provider in a provider check | The provider's identifier only |

## Appendix A: 2026-11-16 decision record

Approved by the project owner on 2026-11-16. The numbering continues [Appendix A of the GUI.2 slice plan](../gui-2/GUI_2_READ_ONLY_SCREENS_SLICE_PLAN.md#appendix-a-2026-11-10-decision-record), D32 to D179. Each row gives the decision first and what was rejected after it.

### Plan and engine

| # | Decision |
| :--- | :--- |
| D180 | Split and order: four sub-slices, each its own pull request, in the order GUI.3a, GUI.3b, GUI.3c, GUI.3d. This plan lands first as a documentation pull request (`docs/gui-3-slice-plan`) with the edit to the v0.1 implementation plan's GUI.3 section. Rejected: three sub-slices with "Analyze a ticker" inside GUI.3c, because GUI.3c already carries the follower, the progress screen and the close confirmation. |
| D181 | Engine slice before GUI.3b: one additive engine slice, proposed as the engine's API.13, with five parts. (a) Every selection field, a nested group included, carries a curated label a person reads, enforced by a test. (b) Each item of a failure's `errors` carries its message template, with each parameter as a placeholder spelled as in `parameters`. (c) The failure for `stored_selection_unreadable` carries the unreadable entry (entry number, ticker and stored method identifier). (d) A refresh job's `totals` carries the total number of entries. (e) A provider check item carries the provider's name beside its identifier. Rejected, part by part: (a) show the machine-made title; (b) show the engine's message as served, with request paths in it; (c) offer only "Delete this watchlist"; (d) the application adds `admitted` and `remaining`; (e) show the identifier. |

### GUI.3a

| # | Decision |
| :--- | :--- |
| D182 | Adapter: one typed request function behind `get`, `post`, `patch` and `delete`, each typed from the generated types for path, query, body and the success document, whatever 2xx status it answers with. `ApiError` also keeps the envelope's `errors`. It stays a thin layer over `fetch` (D38). |
| D183 | After an action: the screen loads its data again from the engine and shows that; no optimistic update. A removal uses the entry numbers of the list as last loaded. Recorded limit: if another program changed the watchlist in between, a numbered removal can remove a different entry; the confirmation dialog names the entry so the user sees what was asked for, and the reload shows what happened. |
| D184 | Confirmation dialog: the native `<dialog>` element opened with `showModal()`, no dependency. Used for delete and remove only; create, rename, add, refresh and stop need none. |
| D185 | Create and rename: "New watchlist" on the Watchlists screen opens an inline form with one name field; after creating, the application opens the new watchlist. "Rename" on the watchlist screen turns the heading into the same field. A blank name cannot be submitted. A name already in use shows the engine's reason message at the field. |
| D186 | Delete: "Delete" on the watchlist screen, confirmed in a dialog that names the watchlist, gives its entry count and says saved runs are kept; afterwards the application returns to Watchlists. |
| D187 | Remove entries: each entry row has "Remove", which opens one dialog offering this entry, every entry for its ticker, or every entry of its strategy, as the sketch shows. Rejected: per-entry removal only (many clicks for a large watchlist); checkboxes on rows with one bulk button (more to build, and the engine has no request for an arbitrary set). |
| D188 | Action failures (amends D84 for actions): `watchlist_name_conflict`, `watchlist_empty`, `watchlist_entry_not_found` and `refresh_job_running` join D84's first group and show the engine's reason message as given, beside the control. `invalid_parameter` on a form follows D195. `database_busy` keeps its catalog message and "Try again" repeats the action. Before GUI.3a shows any of these, it confirms that none of the four messages names a command, an option or an environment variable, and stops if one does. |

### GUI.3b

| # | Decision |
| :--- | :--- |
| D189 | The form is generated: one component renders `schema` and `defaults` from the selection form document. Label: the field's served label (D181(a)). Hint: the field's `description`, shown under the field with the response's `lang`. Starting value: the schema's `default`, else the document's `defaults`, else empty. An empty optional field is left out of the request, so the engine applies its own value. |
| D190 | Supported constructs: boolean (checkbox); integer and number (number field, with the schema's bounds); string (text field); a closed set of values (native select); "this or null" (the same field, optional); a nested object (a labelled group); required. Anything else shows "This option cannot be set in this version of the application." at the field. If such a field is required, the strategy cannot be submitted. A unit test fails when a vendored selection schema uses an unsupported construct, so the gap is found at re-vendor time, not by a user. Rejected: a JSON Schema form library, a large dependency for a handful of constructs, with its own styling to override. |
| D191 | Option names: a value of a closed set is shown as its help term's name, through the references the application already loads (D83), with its term id kept. A value with no reference shows as served. |
| D192 | Term ids on fields: each field's label element carries the field's `x-term` as its term id, ready for GUI.4. |
| D193 | One as-of for the form: the form has a single "As of" date field above the strategies. Its value is sent as `as_of` in the selection of every chosen strategy whose schema declares `as_of`, and `as_of` is not repeated inside each strategy's options. The field is a native date input; empty means the latest data. Timestamps are not offered. Rejected: `as_of` inside every strategy's options, which makes a user type one date several times and allows mixed dates in one submission. If the native date input does not work in one of the three webviews, GUI.3b stops and asks. |
| D194 | Add entries: "Add entries" on the watchlist screen opens the form of the sketch: tickers (free text, split on commas and spaces, sent as typed because the engine trims and upper-cases), the as-of date, and the strategy chooser. A strategy's options are collapsed unless it has a required field with no starting value. One request is sent per chosen strategy, in the engine's strategy order; the form stops at the first failure, says which strategies were added, and keeps the rest for another try. Rejected: one strategy per submission, which is atomic but slower for the common "these tickers, these strategies" case; or a new engine request that adds several strategies at once. |
| D195 | Field errors: for `invalid_parameter` with `errors`, each item is shown at the field its `parameters` name (`selection.<field>`, `tickers`, `name`, and for GUI.3d `entries[i].selection.<field>` on the i-th chosen strategy). The message is built from the item's template (D181(b)) with each parameter replaced by its field label and each argument by its value. An item that names no visible field, or any `invalid_parameter` without `errors`, shows its message above the submit button. The application also blocks what the schema alone decides (a missing required field, a value outside the stated bounds) before sending, using catalog messages. |
| D196 | Stored options and unreadable entries: each entry row can show its stored selection, read-only, with the same labels and option names as the form. There is no edit in place: the engine has no request for it, so changing an entry is remove and add. For a watchlist refused with `stored_selection_unreadable`, the screen shows the reason message and, using D181(c), "Remove this entry"; "Delete this watchlist" is offered as well. |

### GUI.3c

| # | Decision |
| :--- | :--- |
| D197 | Starting: "Refresh now" appears on the watchlist screen and, when the comparison has a watchlist, on the comparison. The request names only the watchlist; worker count, saving and the provider check are left to the engine's defaults and are not offered. A refusal with `refresh_job_running` shows the reason message with a link to the progress screen; `watchlist_empty` shows its reason message. |
| D198 | The follower: one application-wide object, created with the shared engine client (D82), follows a refresh job by its refresh id until it ends, whichever screen is open: again at once when `has_more` is true, otherwise after one second. When the engine is ready it asks for the engine's latest job once, to find a refresh that is already running; after that it follows the id a start request returned. It is written for a job named by its id, not for "the one job", so an engine that later runs more than one refresh at a time needs no change to how a job is followed (D207). It keeps each row's position, ticker, method, state, outcome, reason code and saved run id, and drops the event's analysis document. A request that fails is tried again on the next tick; the screen shows the usual failure state after three failures in a row and keeps trying. |
| D199 | Route: the progress screen is at `/refreshes/:refreshId/progress`, under the comparison's route, with "Refreshes" above it in the trail. It shows that refresh's job, running or ended. The engine keeps only its latest job, so for an id it no longer keeps the screen shows "This refresh's progress is no longer available." with a link to the refresh's comparison. |
| D200 | Progress screen: as the sketches show. Heading "Refreshing <watchlist name>" or, for entries of no watchlist, "Refreshing ad hoc entries"; the watchlist name is read with the existing name lookup. The counts line reads "<finished> of <total> entries finished", both served (D181(d)). Rows are in entry order with no number column; a started row reads "Running…"; a finished row shows its outcome pill, linked to the saved run when there is one; a row that ended in an unexpected problem shows its reason code's term name, never the engine's error text, which may name a command. A last line gives the entries not yet started. The engine's word "job" is not used; the glossary's Entry and Refresh are. |
| D201 | Navigation marker: while a refresh runs, a line under "Refreshes" reads "Refresh running · <finished> of <total>" and links to the progress screen. When it ends the line reads "Refresh finished", "Refresh stopped" or "Refresh failed" until the progress screen has been opened once. |
| D202 | Stop: the button reads "Stop after running entries", as in the mock-ups, with no confirmation, because nothing saved is lost and the refresh can be run again. After it is pressed the heading reads "Stopping…" and the button cannot be used again. |
| D203 | Ended states: finished and stopped show the summary's run count and outcome pills (the same component as the comparison's counts line, D176), the provider check when the summary has one (provider name from D181(e), verdict as its term name) and "Open comparison". Stopped adds the entries never started. Failed shows the job's failure by D84's groups and D188. The application does not open the comparison by itself. |
| D204 | Closing the window while a refresh runs: the application asks "A refresh is running. Entries that have not finished will not be saved. Close anyway?" The engine gives running entries five seconds after the application exits and abandons the rest. This needs a close-requested handler in the platform module and may need one window permission; if it needs more than that, GUI.3c stops and asks. Rejected: no confirmation, relying on the user knowing a refresh is running. |
| D205 | SEC identity notice: when `/v1/info` reports no SEC identity, the watchlist screen, the "Add entries" result and the "Analyze a ticker" screen show "Strategies that read company filings need an SEC identity, and none is set up. Those analyses will fail until it is." The message names no environment variable; `docs/project/SMOKE_TESTING.md` tells contributors how to set it. The first-run screen stays in GUI.5. |

### GUI.3d

| # | Decision |
| :--- | :--- |
| D206 | Screen and navigation: "Analyze a ticker" is the first navigation item, as in the mock-ups, at `/analyze`. Watchlists stays the start screen, following the answer to Q2 in the [v0.1 implementation plan](../IMPLEMENTATION_PLAN.md#questions-for-potential-users-before-gui2-scope-is-fixed). |
| D207 | One path for analysis: the screen always starts a refresh of entries, one entry per chosen strategy, saved, even when one strategy is chosen. Results are found afterwards under Refreshes as "Ad hoc entries" and under Saved runs. The engine's single-analysis request is not used. Accepted limit for the preview: the engine runs one refresh at a time, so a ticker cannot be analyzed while a watchlist refresh is running; the screen says so and links to the progress screen. The limit is the engine's, and lifting it is engine work (more than one refresh at a time, or a queue), recorded as an engine issue when this plan lands; D198 and D199 name a job by its id so the application does not build the limit in. Rejected: the single-analysis request for one strategy, or as a way round a running refresh (a second code path with no progress and no stop, whose results have no comparison); "do not save" (an unsaved result has no comparison and no run detail, so the application would need a third way to show a result). |
| D208 | Not offered on the screen: several tickers at once (that is what a watchlist is for), and "add these to a watchlist" after the analysis. |

### GUI.3a sub-slice decisions

Approved by the project owner on 2026-11-16. Each row gives the decision first; where a row amends an earlier one it says so, and the amended row is not edited.

| # | Decision |
| :--- | :--- |
| D213 | The engine slice of D181 as approved (the engine's API.13, recorded as A.10 in the engine's API contract plan). Amends D181, D189 and D203. (a) Each selection field's label is served as the field's schema `title`, in sentence case, checked by an engine conformance test. (b) Each item of a failure's `errors` carries `template`. (c) The failure envelope for `stored_selection_unreadable` carries an `unreadable` element (entry number, ticker, stored method identifier, reason). (d) A refresh job's `totals` carries `total`. (e) Provider names are served once, as `providers` in `/v1/info`, not on each provider check item; D203 takes the provider name from there. GUI.3a uses none of these; GUI.3b re-vendors to the engine commit API.13 merges as. |
| D214 | Show the action's own result. Amends D183. When the rename or removal document holds `watchlist`, the screen shows that document directly; it loads its data again only when the document holds `unreadable` instead. After a create, the application opens the new watchlist by the `watchlist_id` in the 201 document. The application still never edits its own copy: `useScreenData` gains `replace(data)`, which sets the ready state without a request, and a pending load started earlier must not overwrite it. D183's recorded limit on numbered removal stands. |
| D215 | An unreadable watchlist can be deleted in GUI.3a. Moves this part of D196 forward. When the watchlist screen's load fails with `stored_selection_unreadable`, it shows the reason message as now and adds "Delete this watchlist", which opens the delete dialog of D186. The dialog takes the name from the Watchlists list (`GET /v1/watchlists`), because the watchlist document cannot be read; if the name cannot be found, it says "Delete this watchlist?" without a name. "Remove this entry" stays in GUI.3b. |
| D216 | Failure codes for actions. Amends D188 and D197. `watchlist_name_conflict`, `watchlist_empty` and `watchlist_entry_not_found` show the engine's reason message as given; the project owner checked the engine's text and none names a command, an option or an environment variable. `refresh_job_running` shows the catalog message "A refresh is already running." instead of the engine's text, which names a raw refresh identifier; GUI.3c adds the link to the progress screen. In `src/api/engineState.ts`, `resourceStateCodes` is renamed `reasonShownCodes` and gains the three codes, and `refresh_job_running` gets its own catalog key. In GUI.3a, `invalid_parameter` shows the existing defect message, because blank names are blocked before sending and nothing GUI.3a sends can cause it; D195 replaces this in GUI.3b. |
| D217 | Where an action failure shows. A failure of a dialog's action shows inside the dialog in an element with `role="alert"`, and the dialog stays open. A failure of the create or rename form shows at its name field, tied to it with `aria-describedby`. `watchlist_not_found` from an action shows in the same place; closing the dialog or form then loads the screen again, which shows the not-found state. `database_busy` shows its catalog message with "Try again", which repeats the action (D188). |
| D218 | Pending state. While an action is pending its button has `aria-disabled="true"`, ignores activation and reads "Saving…", "Removing…" or "Deleting…"; the native `disabled` attribute is used nowhere on these buttons. Cancel and Escape stay available. A cancelled dialog does not cancel a request already sent; the screen shows what the engine answers. |
| D219 | Remove dialog. Amends D187. "Every entry for <ticker>" is offered only when that ticker has another entry, and "Every <strategy name> entry" only when that strategy has another entry, both counted from the entries as last shown. Each option gives its count and "this entry" names the entry number: "Entry 1: ACME, Momentum", "Every entry for ACME (2)", "Every Momentum entry (2)". When only "this entry" is left the dialog is a plain confirmation, "Remove entry 3: BOLT, Graham Number?". Both forms say "Saved runs are kept." The requests are `DELETE /v1/watchlists/{id}/entries/{n}`, `POST remove-tickers` with the one ticker, and `POST remove-method` with the method id. Each row's Remove button has the accessible name "Remove entry <n>: <ticker>, <strategy name>". Strategy names are the engine's, as `StrategyName` shows them. |
| D220 | Telling the user what happened. A polite status line (`role="status"`) on the screen the user ends on shows "Deleted <name>." after a delete (on Watchlists), "Removed <n> entries." after a removal (pluralized through the catalog), and "No entries were removed. The watchlist had already changed." when `removed` is 0. Create and rename show no line. After deleting a watchlist whose name could not be found (D215), the line reads "Deleted the watchlist." After a removal or delete, focus goes to the screen's `h1`, which gets `tabindex="-1"`. After a cancel or Escape, focus returns to the control that opened the dialog or form. |
| D221 | Create and rename. Amends D185. "New watchlist" sits above the list on the Watchlists screen, including when the list is empty, and opens an inline form: a "Name" field, "Create" and "Cancel". "Rename" on the watchlist screen turns the `h1` into the same field, filled with the current name, with "Save" and "Cancel". Enter submits; Escape cancels and returns focus to the button that opened the form. A blank or whitespace-only name shows "Enter a name." at the field before anything is sent. The name is sent as typed: the engine trims it and compares names without regard to case. A conflict shows at the field (D217). |
| D222 | Button styles. The existing button style in `src/styles/base.css` gains two variants: primary (accent) for Create and Save, and danger (`--color-negative` text and border on `--color-negative-bg`) for the dialogs' Remove and Delete and the watchlist screen's Delete. The row Remove buttons, Rename and New watchlist keep the ordinary style. The dialog panel and its `::backdrop` are styled from the existing tokens, in both colour schemes and both text directions, with no new colour values. |
| D223 | Smoke test. Amends D210. Step 5 creates three watchlists: `Smoke Test`, `Smoke Test Empty` and `Smoke Test Scratch`. Step 6 fills `Smoke Test` as before, then adds six `Smoke Test Scratch` entries: KO, MSFT and AAPL, each under momentum and graham-number, with no as-of. Six, because removing one entry, then every entry for a ticker, then every entry of a strategy, and still ending on a plain confirmation, needs six. `Smoke Test Scratch` is not refreshed. No step is added and no step is renumbered: Steps 7 to 10 keep their numbers. Step 6's wording and expectations, Step 9's expected counts (3 watchlists with 11 entries in all) and the tool's Step 9 count check, W1, and anything else in `docs/project/SMOKE_TESTING.md` that counts watchlists or entries are updated. Check W8 already exists (the table-styling check), so the new checks are W9 to W13: W9 creates a watchlist, including the blocked blank name and the conflict with `Smoke Test`; W10 renames it; W11 removes AAPL's Graham Number entry from `Smoke Test Scratch` alone; W12 removes every entry for KO from KO's Momentum row, then every Momentum entry from MSFT's Momentum row, and cancels the plain confirmation for the last entry; W13 deletes `Smoke Test Scratch`, which still holds that entry, and sees that its refreshes, of which there are none, and the saved runs of `Smoke Test` are unaffected. Each check states what to expect, in the existing style; keyboard use and dialog focus are left to the Playwright tests. The targeted run is `pnpm smoke --checks W9-W13`, justified because only a real engine proves that the action requests the mock accepts are accepted. The smoke tool's tests stay passing and are extended for the added setup commands and the count check. |
| D224 | Engine mock and fixtures. Adds to D209. `tests/browser/engine-mock.ts` allows GET, POST, PATCH and DELETE in its CORS answer, records each request's method and parsed JSON body, and hands handlers the method and body as well as the URL. Fixtures add the create, rename, removal and delete documents, each with `watchlist` set and with `unreadable` set; a removal with `removed: 0`; and one failure for each of `watchlist_name_conflict`, `watchlist_empty`, `watchlist_entry_not_found`, `refresh_job_running`, `watchlist_not_found` and `database_busy`. Every fixture is typed from the generated schema types. |

### Tests, smoke test and documents

| # | Decision |
| :--- | :--- |
| D209 | Tests (adds to D94, D107 and D166): the Playwright engine mock answers the action methods, checks the request body it was sent, and can play a scripted refresh job across polls. Fixtures add a selection form for the made-up strategy, a failure with several `errors`, removal and rename documents with `unreadable` set, and job documents in each state. Vitest covers the schema reader, the supported-construct walk over the vendored schemas (D190), template filling (D195), ticker splitting and the follower's handling of `next_after` and `has_more` with a fake clock. Playwright covers each action by keyboard, each dialog's focus handling, both text directions for the forms, and one test per failure group of D188. |
| D210 | Smoke test (follows D168 to D170): every sub-slice updates `docs/project/SMOKE_TESTING.md`. Watchlist actions extend check group W; "Analyze a ticker" gets a new group A and refresh progress a new group P. The setup `pnpm smoke` scripts stays as it is, and the new checks make their own watchlist through the application. Each sub-slice has a targeted run, because only a real engine proves that requests the mock accepts are accepted, and only real providers show a refresh advancing: GUI.3a its new W checks; GUI.3b its new W checks; GUI.3c group P; GUI.3d group A. Windows only, as for GUI.2b3. Exact `pnpm smoke --checks` commands are set with each sub-slice's own decisions, when its checks are numbered. |
| D211 | Documents: this plan lives at `docs/project/milestones/v0.1/gui-3/`. The v0.1 implementation plan's GUI.3 section gains the engine slice in its Decision, the four branches and the link to this plan. The preview mock-ups are not edited. |
| D212 | Sub-slice decisions: as in GUI.2, each sub-slice's remaining decisions (file-level choices, check numbers, exact messages) are listed with recommendations and approved before its agent prompt is written. Catalog wording in this plan's sketches is a starting point for that review. |

### GUI.3b sub-slice decisions

Approved by the project owner on 2026-11-18. Each row gives the decision first; where a row amends an earlier one it says so, and the amended row is not edited.

| # | Decision |
| :--- | :--- |
| D225 | Re-vendor. The branch's first commit runs `pnpm vendor-ian f238779` (the engine's API.14 merge, which also carries API.12 and API.13) and adds this row. Nothing else goes in that commit except the mechanical fixes the regenerated types force, such as the failure envelope's `schema_version` moving from 14 to 15 in fixtures. The engine's later commit 97d0989 changes only its quality gate and serves nothing different. |
| D226 | The engine's API.14 as approved. Amends D213. (a) Every option of a selection field has its own glossary entry, served through the help references. D191 therefore works as written: an option shows its term's name, for example "Three-Year-Average EPS", "Fiscal-Year EPS", "Longest Available Horizon", "Three-Year Horizon", "Display-Only Policy", "Total FCF Basis". The field's label keeps the field's own `x-term` (D192). (b) The duplicate-entry rule (`entries.duplicate`) names the strategy by its label in a `strategy` argument, with one template for a twin in the watchlist and one for a twin in the same request. The application needs nothing special for it. |
| D227 | "Add entries" is its own screen. Amends D194. Route `/watchlists/:watchlistId/add`, heading "Add entries to <name>", trail "Watchlists › <name>" (parent screens only, as elsewhere). "Add entries" sits in the watchlist screen's heading actions as the sketch shows, including for an empty watchlist, and is not offered when the watchlist cannot be read. The screen loads the watchlist document on opening, for its name and entry count, and shows its load failure like the other screens. Cancel returns to the watchlist screen. While the requests run, "Add" follows D218 and reads "Adding…". Rejected: an inline form on the watchlist screen, which is long and would push the entries table down. The "Analyze a ticker" screen of GUI.3d is a screen too. |
| D228 | Supported constructs as the engine actually serves them. Makes D190 concrete. Boolean as a checkbox; integer and number as a number field; string as a text field; a closed set as a native select, whether inline or through `$ref`; "this or null" through `anyOf` with `{"type": "null"}`; a nested object, through `$ref`, as a labelled group; `required`. `$ref` resolves only inside the served schema's own `$defs` (the vendored description uses `#/components/schemas/...` instead, and the walking test resolves those). `defaults` are read by the field's path, so a nested field's configured value is found under its group. Fields appear in the served `properties` order, which is the engine model's order, never sorted. `as_of` is never rendered inside a strategy's options: the shared "As of" field of D193 handles it, and the walking test exempts it. The walking test covers every selection schema reachable from `SelectionFormDocument.schema` in the vendored description. |
| D229 | Number fields and checks before sending. A native number input: `step="1"` for an integer, `step="any"` for a number, and `min`/`max` only for inclusive bounds. The application checks exclusive bounds itself, and treats the input's `badInput` as an invalid number. Messages show at the field, without repeating its label, as GUI.3a's "Enter a name." does. Numbers in them use the active locale's number format: "Enter a value."; "Enter a whole number."; "Enter a number."; "Enter a number greater than {limit}."; "Enter a number of at least {limit}."; "Enter a number less than {limit}."; "Enter a number of at most {limit}."; "Enter at least one ticker." (at the Tickers field); "Choose at least one strategy." (above Add). Only chosen strategies are checked and sent. |
| D230 | Filling the engine's message templates. Amends D195. Each parameter placeholder is replaced by the label of the field it names, exactly as shown, with no change of case; lower-casing would break "RSI period" and "AAA corporate bond yield". Each argument is replaced by its value: numbers in the locale's number format, text as given, anything else as its JSON text. Example: "Invalid momentum windows: Short window (200) must be smaller than Long window (50)." Where each error goes: `tickers` and `tickers[i]` to the Tickers field; `selection.as_of` to "As of"; `selection.<field>` and nested paths such as `selection.policy.<field>` to that field in the options of the strategy whose request failed; `method_id`, `body` and anything unrecognised above "Add". An error that names several fields is shown once, at the first of them in form order. Every field it names gets `aria-invalid="true"` and an `aria-describedby` pointing to that message. A strategy whose options hold an error expands them. Focus moves to the first field with an error. A `stored_selection_unreadable` failure on this screen shows its reason message above "Add". |
| D231 | Several strategies, and what the user is told. Adds to D194. Requests go in the engine's strategy order. When one fails after earlier ones succeeded, the strategies already added are unchecked, the failed strategy and those after it stay checked, and a polite status line (`role="status"`) above the form reads, pluralized through the catalog and with the names joined by `Intl.ListFormat` in the active locale: "Added 2 entries for Graham Number. The strategies still chosen were not added." or "Added 1 entry for Momentum and Graham Number. The strategies still chosen were not added." When every request succeeds, the application returns to the watchlist screen with D220's status line "Added <n> entries." (pluralized). Here <n> is the entry count in the last answer minus the count when the form loaded. The watchlist screen loads afresh on arrival; D214 is unaffected, because this is a new screen. |
| D232 | Cancel never asks for confirmation, even with input typed. Nothing is saved, and GUI.3a's forms don't ask either. |
| D233 | An entry's stored options. Makes D196 concrete. The entries table gains an "Options" column with a "Show"/"Hide" button that carries `aria-expanded`. Its accessible name is "Show options for entry <n>: <ticker>, <strategy name>" (and "Hide …" when open). The expanded row beneath lists the fields the strategy's selection schema declares, in served order, except `as_of`, which has its own column. Values: Yes/No for booleans, the locale's number format for numbers, the term name for an option (as D226), text as given, "Not set" for null. A nested group shows its label, then its fields indented. A strategy's selection form document is fetched the first time one of its entries is shown and kept while the screen is open; a failure to fetch it shows inside the expanded row the way the screen shows other request failures. Stored fields the schema does not declare are not shown. The engine refuses a stored selection with an undeclared field (that is an unreadable entry), and the three fields every selection carries (`analysis_id`, `method_id`, `config_schema_version`) are not options. |
| D234 | Removing an unreadable entry. Completes D196 and D215. `ApiError` keeps the failure envelope's `unreadable` element. When the watchlist screen's load fails with `stored_selection_unreadable` and `unreadable` is present, the screen shows the reason message as now, plus "Remove entry <n> (<ticker>)" next to "Delete this watchlist". It opens ConfirmDialog with "Remove entry <n> (<ticker>)?". The stored method code is not shown, since it is a raw code (check W4). The dialog sends `DELETE /v1/watchlists/{id}/entries/{n}`. If the removal document holds `watchlist`, the screen shows it with "Removed 1 entry."; if it holds `unreadable` again, the screen shows that entry's remedy in the same way. Without `unreadable`, only "Delete this watchlist" is offered, as now. Dialog failures follow D217 and pending states D218 ("Removing…"). |
| D235 | The missing-SEC-identity notice stays wholly in GUI.3c. Amends D205: "the 'Add entries' result" is dropped, because adding an entry analyzes nothing. |
| D236 | Files. A new folder `src/selection/` holds the schema reader, the template filler, ticker splitting, the form fields, the strategy chooser and the read-only options display (its pure modules unit-tested). The screen is `src/views/AddEntriesView.vue`. |
| D237 | Smoke test. Adds checks W14 to W17 to `docs/project/SMOKE_TESTING.md`. Setup is unchanged: W14 creates its own watchlist through the application (D210). Targeted run: `pnpm smoke --checks W14-W17`, Windows only. The gap it covers: the native date and number inputs in a real webview, and the real engine accepting the requests the mock accepts and returning real templates. Unreadable entries stay with the Playwright tests, because a real engine cannot easily make one. W14 adds entries, W15 shows engine errors at their fields, W16 is a partial add and W17 shows stored options. |
| D238 | Partial-add wording, from the first targeted run. Amends D231. The status line reads "Added 2 entries for Graham Number. Other selected strategies were not added." (pluralized, with the names joined as before). Rejected: "The strategies still chosen were not added.", which read as awkward. |
| D239 | The "As of" date field has , so the real webview takes four digits for the year and then moves on to the month. Found by check W14. Rejected: replacing the native date field with a text field, which would reverse D193. |
| D240 | Options open when a strategy is chosen. Amends D194. When the screen opens, every strategy's options are hidden. Choosing a strategy shows its options when one of its required options currently has no value; otherwise they stay hidden. "Currently" means the strategy's values as they stand, not its starting values, so a strategy chosen again after its required options were filled in stays hidden. If the strategy's selection form is still loading when it is chosen, the same rule is applied when the form becomes ready, provided the strategy is still chosen. Unchecking a strategy hides its options and keeps its values, so choosing it again restores what was typed. The Show/Hide button stays on every strategy, chosen or not, and opening options never moves focus. Options still open for a strategy whose request comes back with a field error (D230), for a field the form cannot fill, and for a form that failed to load when Add is chosen. Rejected: keeping D194's rule, which the project owner found awkward in use; opening options on choosing for every strategy, because most strategies need no input and the form would grow for nothing. |

### GUI.3c sub-slice decisions

Approved by the project owner on 2026-11-19. Each row gives the decision first; where a row amends an earlier one it says so, and the amended row is not edited.

| # | Decision |
| :--- | :--- |
| D241 | Order and engine. GUI.3c starts from main after GUI.3b's merge and uses the engine commit GUI.3b vendored; it has no re-vendor. |
| D242 | One engine-information cache. An application-wide cache of `GET /v1/info`, loaded once per engine connection and kept beside the follower (D198), supplies `sec_identity_configured` (D205) and `providers` (D203 as amended by D213(e)). About keeps its own load and reload unchanged. |
| D243 | One request at a time. Amends D198 and D202. The follower has at most one request in flight. Stop goes through the follower: it waits for any poll in flight, sends `POST /v1/refreshes/{refresh_id}/job/stop` with the follower's current `after`, and takes the answer's events and `next_after` exactly as it takes a poll's. Every event is therefore shown exactly once, by construction. |
| D244 | Stopping comes from the engine. Amends D202. The heading reads "Stopping…" whenever the job's `state` is `stopping`, so it survives leaving and returning and shows a stop made by another client; it is not a local flag. The Stop button follows D218 (`aria-disabled="true"`, activation ignored, never the native `disabled` attribute) while the stop request is pending and while the state is `stopping`. Any state other than `running`, `stopping`, `completed`, `stopped` and `failed` is treated as `running`, as the engine's description says. |
| D245 | Finding a refresh at start-up. Makes D198 concrete. When the engine is ready, the follower sends `GET /v1/refreshes/job` once. A 404 with `refresh_job_not_found` means there is none. A job in `running` or `stopping` is followed. A job that has already ended is ignored: no navigation marker, no row state. |
| D246 | Rows from events only. Makes D198 concrete. The progress screen's rows are built only from events. Opening a refresh the follower holds nothing for polls it from `after=0`, which replays every event the engine keeps; `summary.results` is not a second source of rows. |
| D247 | A refresh no longer kept. Makes D199 concrete. For a 404 with `refresh_job_not_found` on that refresh's job, the screen shows "This refresh's progress is no longer available." with a link to the refresh's comparison, always. A refresh that saved no runs then lands on the comparison's own not-found state; nothing is requested in advance to avoid that. |
| D248 | Counts on the progress and ended screens. Amends D203. The ended states use the same counts line as the progress screen, "<finished> of <total> entries finished", never a run count, followed by the outcome pills from `summary.counts`. The summary's `error` key (entries that stopped because of an unexpected problem) shows as an extra failed-tone pill reading "Unexpected problem", the application's own catalog wording, shown only when its count is above zero; the four outcome pills keep the comparison's rules (D176). Finished: "Refresh of Core finished", then "12 of 12 entries finished" with the pills Completed 9, Unavailable 1, Failed 1 and Unexpected problem 1, and "Open comparison" at the heading's end. Stopped: "Refresh of Core stopped", then "7 of 12 entries finished" with the pills Completed 6 and Failed 1, and "5 entries were not started." under them. Any other unknown key in `summary.counts` is a defect: stop and report if the vendored description or fixtures show one. |
| D249 | Rows that end badly. Makes D200 concrete. A finished row whose outcome is `failed` shows only its outcome pill, linked to the saved run when there is one; the reason is on the run detail screen. A row that stopped because of an unexpected problem (no outcome, `reason_code` set) shows its reason code's help term name through the help references (the engine serves a term for every failure reason code), never the event's `error` text. If any reason code turns out to have no term in the references, stop and report; do not add a fallback. |
| D250 | Heading when the watchlist cannot be found. Amends D200. While a refresh runs, the watchlist name comes from the existing name lookup; once it has ended, from the summary's `watchlist_name`. If the lookup cannot find the watchlist (deleted during the refresh), the heading reads "Refreshing a watchlist". Deleting a watchlist while a refresh runs is not blocked. |
| D251 | Where "Refresh now" appears. Amends D197. On the watchlist screen it sits in the heading actions after "Add entries"; on the comparison it appears when the refresh has a watchlist. It is not offered when the watchlist cannot be read or has no entries; the `watchlist_empty` message stays for a race. While the follower knows a refresh is running, the button follows D218's `aria-disabled` pattern and a line beside it reads "A refresh is running." followed by the link "Show progress" to the progress screen. A start refused with `refresh_job_running` shows the existing catalog message "A refresh is already running." with the same "Show progress" link (D216). After a successful start, the application opens the progress screen of the returned refresh id. |
| D252 | A running refresh elsewhere. Adds to D201 and the file scope. First check whether `GET /v1/refreshes` lists a refresh while it is running (from its runs saved so far); report what you find. If it does, the Refreshes table's row for the refresh the follower is following, while it runs, carries a "Running" note linking to its progress screen. Whether or not the list includes it, the comparison of a refresh the follower knows to be running shows a polite status line "This refresh is still running." with the link "Show progress". |
| D253 | Announcing progress. Amends the acceptance criterion "no more than once per poll". The progress screen's counts line is announced politely only when the finished count changes, no more than once every 10 seconds, and the ended state is always announced. |
| D254 | Announcing the end on any screen. Adds to D201. When a followed refresh ends, the navigation marker announces it once, politely, whatever screen is open: "Refresh of <name> finished.", "Refresh of <name> stopped." or "Refresh of <name> failed." (with D250's wording for a watchlist that cannot be found and "Refresh of ad hoc entries …" for entries of no watchlist). |
| D255 | Closing the window. Makes D204 concrete and amends its "one window permission". The platform module gains a close-requested hook. The Tauri implementation listens for the window's close request; when no refresh is running, the window closes normally with no question; when one is running, it prevents the close and opens the application's own ConfirmDialog (no dialog plugin) reading "A refresh is running. Entries that have not finished will not be saved. Close anyway?", with "Keep open" and "Close anyway" (danger style, D222). "Close anyway" closes the window. The browser implementation does nothing. Approved permissions in `src-tauri/capabilities/default.json`: `core:window:allow-destroy`, `core:event:allow-listen` and `core:event:allow-unlisten`. Using fewer is fine; if more or different permissions are needed, stop and ask. The engine's bounded shutdown on standard-input close (already in `src-tauri/src/lib.rs`) is what gives running entries their time; it is not changed. |
| D256 | Quitting on macOS. Adds to D255. On macOS, Tauri's built-in Quit menu item bypasses the application's own handling, so Cmd+Q would skip D255. On macOS, the application menu's built-in Quit item is replaced with a custom menu item bound to CmdOrCtrl+Q that runs the same path as D255: quit at once when no refresh runs, otherwise the same dialog, with "Close anyway" quitting the application. The rest of the default macOS menu stays as it is. Windows and Linux are unchanged (no application menu). The menu construction is covered by Rust unit tests where it can be tested off macOS, and the macOS CI job builds it. A new crate, a new Cargo feature or another permission needs approval first. Known limit: Quit from the Dock, logging out and shutting down do not go through the menu, and whether anything catches them is unverified until a Mac is available (D259). |
| D257 | The SEC identity notice. Amends D205 and D235. The notice of D205 shows on the watchlist screen (including an empty watchlist) and on the comparison whenever it offers "Refresh now", when the cache of D242 reports `sec_identity_configured` false. GUI.3d adds it to "Analyze a ticker". |
| D258 | Smoke group P. Makes D210 concrete. `docs/project/SMOKE_TESTING.md` gains group P. Setup (Steps 1 to 10) is unchanged. The P checks create a `Smoke Test Progress` watchlist through the application with about 8 tickers under Momentum in one "Add entries" pass, so `Smoke Test` and the counts other groups expect are untouched. P1: "Refresh now" starts a refresh and the progress screen advances. P2: leaving the screen and returning through the navigation marker loses no row. P3: a second "Refresh now" is blocked while one runs, with "Show progress". P4: Stop, pressed once the first row finishes, ends in the stopped state. P5: the ended state and "Open comparison". P6: closing the window during a refresh asks first, and "Keep open" keeps it open. The group's letter is added to the document's list of groups. Targeted run: `pnpm smoke --checks P1-P6`, Windows only. The gap: only a real engine and real providers show a refresh advancing, stopping and ending, and only the real window shows the close request. The SEC identity notice stays with the Playwright tests. |
| D259 | The macOS quit check. Adds to D258. A check P7, marked macOS only, covers Cmd+Q, Quit from the Dock and logging out while a refresh runs. It is not part of GUI.3c's targeted run. It is run the first time a Mac is available, at the latest with the installer work of GUI.6; a failure is filed as an issue then. The v0.1 implementation plan's GUI.6 entry names P7, so it cannot be missed. |
