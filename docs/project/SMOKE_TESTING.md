# Smoke Testing the Desktop Application

Run this short set of checks by hand to see the desktop application work against a real analysis engine. It is for a contributor who starts the application from a terminal they opened themselves, and who judges each screen as a user would see it. Every step needs developer tooling, so this is a contributor document until the application has an installer. An agent or script may rehearse these steps, but its run is not a formal smoke test.

The test checks that the application starts the engine, that each screen shows what the engine holds, and that the application reports an engine that stops or is missing. It does not try to cover every control. Browser tests cover what a real engine cannot easily produce: paging, a stored selection the engine cannot read, a busy database, and a refresh of ad hoc entries.

Provider data changes over time, so exact values are not prescribed. For each step, judge whether the screen shows what the engine's own commands show, in readable words, with no raw code, traceback or `NaN` where a name or value belongs. Every step has a number (S1, S2, ... for setup, then N, W, R, H, E and L for each group of screens) so that [the record](#recording-the-result) can refer to it.

## Before you start

Run every command in one terminal. The throwaway database setting below lasts only in that terminal, and the application passes its environment through to the engine it starts.

S1. Get the engine at the commit this repository vendors, and make its command available.

- Read the commit in [the vendored API description's source record](../../vendor/ian/SOURCE.md).
- Check out that commit of the [engine repository](https://github.com/PeterPontbriand/investment-analysis-engine), then follow [the engine's installation guide](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md): [make the `ian` command available](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#make-the-ian-command-available) and [configure it](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#2-configuration), including the SEC EDGAR identification.
- Confirm that `ian --help` shows the engine's help text.
- Outbound access to Yahoo Finance and SEC EDGAR must be allowed, because the steps below run live analyses. If you have not run the engine's own [smoke test](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/SMOKE_TESTING.md) on this installation, run its provider check first (`ian health`), so a provider failure is not mistaken for an application failure.

Also install this repository's development tools as the [README](../../README.md) describes. On Windows that includes the C++ build tools, because `pnpm tauri dev` compiles the application.

Run `pnpm smoke --engine <your engine checkout>` from this repository's root. It does S2 to S10 as described below, writes the record to the throwaway folder and starts the application. The steps below stay the reference for what it runs, and you can follow them by hand instead. [If `pnpm smoke` stops](#if-pnpm-smoke-stops) lists its stop messages.

### Use a throwaway database

The setup below saves analysis runs and a watchlist. A saved run cannot be deleted, so the test runs against a dedicated throwaway SQLite file and not against your real database.

S2. Open a new terminal in the root folder of this repository, and check your real database once, before you set `IAN_DATABASE_URL` for the throwaway file. Do not unset or change any `IAN_DATABASE_URL` you already use. This command only reads: `pnpm smoke` runs this step, reading the state with `ian db status --json`; it continues on `ready` or `missing`.

```powershell
ian db status
```

Expect `State: ready`, or `State: missing` with `Database is not initialized yet.` if you have never run an analysis (the command then exits with status 1, which is expected). If it reports `upgrade_required`, follow [First use and explicit upgrades](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md#first-use-and-explicit-upgrades) before going on. For any other state, stop and use [Local Database Operations](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md).

S3. In that same terminal, point the session at a new throwaway file. This creates a new timestamped folder under this repository's ignored `.tmp/smoke/` folder, so there is nothing to prepare. PowerShell: `pnpm smoke` creates the folder and sets the variable for the commands it runs and for the application.

```powershell
$smoke = Join-Path (git rev-parse --show-toplevel) ".tmp/smoke/$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Force $smoke | Out-Null
$env:IAN_DATABASE_URL = "sqlite:///$($smoke -replace '\\', '/')/smoke-test.sqlite3"
```

Git Bash, macOS or Linux:

```bash
smoke="$(git rev-parse --show-toplevel)/.tmp/smoke/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$smoke"
export IAN_DATABASE_URL="sqlite:///$smoke/smoke-test.sqlite3"
```

S4. Create the file's schema and confirm it is ready:

```powershell
ian db upgrade
ian db status
```

`pnpm smoke` runs this step.

Expect the second command to name the throwaway file and report `State: ready`.

### Create the data

The commands are those of the engine's [local research workspace guide](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/WORKSPACE.md). The tickers are ordinary large companies, and the whole setup saves five runs.

S5. Create two watchlists, one of them left empty:

```powershell
ian watchlist create "Smoke Test"
ian watchlist create "Smoke Test Empty"
```

`pnpm smoke` runs this step.

S6. Fill the first watchlist with entries that have no as-of, a date as-of and a timestamp as-of with a timezone offset, in more than one strategy. `--as-of` takes `YYYY-MM-DD` or a timezone-aware ISO-8601 timestamp:

```powershell
ian watchlist add-selection momentum "Smoke Test" KO
ian watchlist add-selection momentum "Smoke Test" MSFT --as-of 2025-12-31
ian watchlist add-selection momentum "Smoke Test" AAPL --as-of 2025-12-31T16:00:00-05:00
ian watchlist add-selection graham-number "Smoke Test" KO
```

`pnpm smoke` runs this step.

Expect each command to print the watchlist with the new entry numbered after the earlier ones.

S7. Refresh the first watchlist, which runs every entry and saves each result:

```powershell
ian refresh "Smoke Test"
```

`pnpm smoke` runs this step.

Expect nothing to print until the refresh finishes, then a summary headed by a refresh ID that lists the four entries with their outcomes. Some entries may be unavailable; a refresh with at least one completed run is enough. Note the counts of each outcome: later steps compare the application with them.

S8. Save one direct analysis, which is a run with no refresh:

```powershell
ian momentum MSFT --save-run
```

`pnpm smoke` runs this step.

S9. List the saved runs:

```powershell
ian runs list
ian runs refreshes
```

`pnpm smoke` runs this step.

Expect five runs, and one refresh named `Smoke Test` with four runs.

### Start the application

S10. From the same terminal, in this repository's root folder, start the desktop application:

```powershell
pnpm tauri dev
```

`pnpm smoke` starts it.

The first start compiles the application and takes a while. Set `IAD_IAN_PATH` to the `ian` executable first only if `ian` is not on `PATH`. Expect a window to open. Leave the terminal open: it shows the application's launch line for the engine.

## N. Navigation and About

N1. The window opens on the Watchlists screen. The product name and the pre-release notice show beside a navigation with Watchlists, Refreshes, Saved runs and About; the navigation sits at the start side of the window, and the current item is marked.

N2. Each navigation link opens its screen. The breadcrumb above each screen names it, and the current navigation item follows.

N3. About shows the engine's version, API versions, schema version, SEC identity and languages. Compare them with the engine:

- The engine's commands offer no way to print its version, and its documents name no place to check it. Compare the engine version with the `version` in `pyproject.toml` in the engine checkout, and say in the record that this is what you compared with.
- SEC identity shows configured when the engine's configuration holds an SEC EDGAR identification, and not configured otherwise.

## W. Watchlists

W1. Watchlists lists `Smoke Test` with 4 entries and `Smoke Test Empty` with 0, each with its created time. A watchlist that was never changed shows a dash for its last change; the one you added entries to shows a time.

W2. The times are in your time zone and agree with the clock of the moment you ran the setup commands.

W3. Opening `Smoke Test` shows the breadcrumb Watchlists / Smoke Test, a line with the entry count and created time, and the entries numbered 1 to 4 with ticker, strategy name and as-of. The tickers and numbering agree with `ian watchlist show "Smoke Test"`.

W4. The strategy names are the engine's names for the strategies, and no raw method code such as `sma_crossover` shows.

W5. The three as-of forms read as follows:

- The entry with no as-of reads as the latest data, not as an empty cell.
- The entry with a date shows that calendar day, 31 December 2025, with no time and not a day earlier or later. If it shows a time instead, note it.
- The entry with a timestamp shows that instant as a local time, for 16:00 at UTC-5 on 31 December 2025.

W6. Under the entries, the refreshes of this watchlist list the refresh from S7 with its time, its four runs and its outcome counts.

W7. Opening `Smoke Test Empty` shows that it has no entries and that it has not been refreshed yet. The breadcrumb leads back to Watchlists.

## R. Refreshes

R1. Refreshes lists the refresh from S7: its completion time (a range when its first and last runs completed a minute or more apart), the watchlist name `Smoke Test`, a run count of 4, and a count for each outcome. The counts agree with `ian runs refreshes`.

R2. The outcome column headings are names the engine gives its outcomes, in the engine's order, and the counts add up to the run count.

R3. The direct analysis from S8 is not a refresh and does not appear here.

R4. If the database already holds more than 50 refreshes, "Show more" appends the next page and then disappears at the end. Otherwise mark this step N/A: browser tests cover paging.

## H. Saved runs

H1. Saved runs lists five runs, newest first, each with a completion time, ticker, strategy name and outcome. The run from S8 is among them, which is how a run saved by a direct analysis is reached.

H2. Filter by ticker: type `msft` in lower case and press Enter. Only the MSFT runs remain. Clear the field, type `ko` and move to another control instead of pressing Enter: the filter applies.

H3. Filter by strategy: the choices are the engine's strategies, led by "All strategies". Choosing one keeps only its runs.

H4. Filter by outcome: the choices are the engine's outcomes, led by "All outcomes". Choosing one keeps only its runs.

H5. A filter that matches nothing, such as a ticker the setup never used, says that no saved runs match the filters. "Clear filters" empties all three filters and shows all five runs again.

H6. If the database already holds more than 50 runs, "Show more" appends the next page, and changing a filter starts again at the first page. Otherwise mark this step N/A: browser tests cover paging.

## E. Engine problems

Do these last. Each one needs the application restarted afterwards, from the terminal you set up.

E1. The engine stops while the application is open. The application starts the engine through the `ian` launcher, which starts a chain of processes; ending the launcher's process makes the rest of the chain exit within seconds, because the engine stops when its input closes. In a second PowerShell terminal, end the `ian.exe` that the application started:

```powershell
$app = Get-Process investment-analysis-desktop
Get-CimInstance Win32_Process -Filter "ParentProcessId=$($app.Id) AND Name='ian.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId }
```

Then open another screen, such as Refreshes. Expect a message that the analysis engine stopped unexpectedly and that the application must be restarted, with no traceback and no process name. The navigation still works.

E2. The engine cannot be found. Close the application, then in a terminal where `ian` is not on `PATH` and `IAD_IAN_PATH` is not set, start it again. This removes every folder holding `ian.exe` from this terminal's `PATH`, so use a new terminal and do not run the smoke test's other steps in it:

```powershell
$env:Path = ($env:Path -split ';' | Where-Object { -not (Test-Path (Join-Path $_ 'ian.exe')) }) -join ';'
Remove-Item Env:IAD_IAN_PATH -ErrorAction SilentlyContinue
Get-Command ian -ErrorAction SilentlyContinue
pnpm tauri dev
```

`Get-Command` must print nothing. Expect every screen to say that the analysis engine is not installed or could not be found, and the navigation to keep working. The message names no command and no environment variable.

E3. A busy database is not checked here: the engine's documents give no safe way to cause it, so browser tests cover it.

## L. Language and layout

L1. Engine text carries its language. With the application running from `pnpm tauri dev`, open the developer tools (right-click a screen and choose Inspect, or press `Ctrl+Shift+I`, or `Cmd+Option+I` on macOS), and inspect a strategy name in Saved runs and an outcome heading in Refreshes. Each sits in an element with a `lang` attribute holding the engine's language, such as `en`, and a `data-term-id` attribute.

L2. No screen shows a raw code, such as a method identifier or an outcome code, where a name should be.

L3. Narrow the window to about half the screen width. The navigation and the tables stay usable, and a wide table scrolls instead of being cut off.

## Clean-up

Close the application window, then close the terminal you used: the throwaway `IAN_DATABASE_URL` setting goes with it, and closing the window stops the engine. Then delete the throwaway folder: the one `pnpm smoke` named in its record, `.tmp/smoke/<timestamp>` in this repository, which holds the database file with any `-wal` and `-shm` files beside it, and the record itself. Paste the record into the pull request description first.

## Recording the result

`pnpm smoke` writes the record to `SMOKE_RECORD.md` in the throwaway folder, and prints its path before it starts the application. The setup steps (S1 to S10) are filled in as `pass (scripted)`, each with its command output under "Command output". The checks (N, W, R, H, E and L) are blank: mark each one `pass`, `fail`, `n/a` or `note`, with a few words for anything that is not a plain pass, and finish the result line. A failure note never includes private data. The record lists the steps of this document, so a step added here shows up in the next record.

If you followed the steps by hand, write the same record yourself: the date, time zone, operating system, application commit, engine commit, the engine version and what you compared it with, the data you created, and each step with its mark.

Record a run in the description of the pull request that adds or changes a screen, naming the engine commit from [the source record](../../vendor/ian/SOURCE.md). Keep the record as the run's record; do not summarise it as "passed".

## If `pnpm smoke` stops

It stops with a plain message instead of guessing, and writes the record so far beside the throwaway folder when it got that far.

- **`--engine` is required, or the folder does not exist:** pass the folder of your engine checkout.
- **The folder is not a Git checkout:** pass the folder that holds the engine's `.git` folder.
- **The engine checkout is at another commit:** the message prints both commits and the `git checkout` to run in the engine checkout. Run it, then try again.
- **The `ian` command was not found, or `ian --help` failed:** make the command available as step S1 says, or set `IAD_IAN_PATH`.
- **Your real database is not `ready` or `missing`:** an `upgrade_required` database needs the engine's [explicit upgrade](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md#first-use-and-explicit-upgrades) first. For any other state, use the engine's [Local Database Operations](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md).
- **A setup command failed:** the message names the step and the command, and its output is in the record. For a provider failure, see the engine's troubleshooting guide.
- **The refresh completed no run:** check the providers with `ian health`, then run `pnpm smoke` again, which makes a new throwaway database.
- **The counts are not the setup's:** the setup leaves 5 runs, 1 refresh of 4 runs and 2 watchlists with 4 entries in all. Run `pnpm smoke` again, which makes a new throwaway database.

Cleaning up, and restarting the application for the engine-problem checks in the E steps, stay manual.

## Review checklist

- Every screen shows words from the application's catalog or names from the engine, never a raw code.
- No message names a command, an option, an environment variable or a file path.
- Times and dates read correctly in your time zone, and a date with no time never shifts by a day.
- A screen that shows the engine's own text marks its language.
- The application stays usable when the engine stops or is missing.

Do not treat a changed market value, an outcome that depends on live data or a slow first start as a failure by itself. Investigate a screen that shows a raw code, a blank where a name belongs, a count that disagrees with the engine, or a message that names a command.

## What smoke testing does not cover

A smoke test shows that the application works against a real engine on one day. It proves nothing about boundaries that a real engine cannot easily force, such as paging beyond one page, a stored selection the engine cannot read, a refresh of ad hoc entries, or a busy database. Browser tests cover those. The check for ad hoc entries is added to this document when the application can start refreshes itself, because the command line cannot start one.
