# Smoke Testing the Desktop Application

Follow this guide to perform a manual "smoke test" of the Investment Analysis Desktop application's user interface: a short check that its main functions work. This guide is for a contributor who starts the application from a terminal they opened themselves, and who judges each screen as a user would see it.

The Investment Analysis Desktop application neither holds data nor performs analysis; it only shows data from a connected Investment Analysis Engine instance (the engine), the separate program that does the analysis and holds all of the data.

At present, every step in this guide needs developer tooling, so this is a contributor document, not a user document. An agent or script may rehearse these steps, but for a run to constitute a formal smoke test the checks must be made manually.

The test checks that the application starts the engine, that each screen shows what the engine holds, and that the application reports an engine that stops or is missing. It does not try to cover every control. This repository's automated browser tests cover what a real engine cannot easily produce: paging through many results, a stored [selection](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#selection) the engine cannot read, a busy database, and a [refresh](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#refresh) of [entries](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#entry) that belong to no [watchlist](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#watchlist).

[Provider data](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#data-provider), the market and filing data the engine fetches live from Yahoo Finance and [SEC](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#sec) [EDGAR](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#edgar), changes over time, so exact values are not prescribed. For each step, judge whether the screen shows what the engine's own commands show, in readable words, with no raw code, traceback or `NaN` where a name or value belongs. Every step has a number (Step 1, Step 2, ... for setup, then Check N1, Check W1, ... for the checks, with a letter for each group of screens: N, W, R, H, L and E) so that [the record](#recording-the-result), the written account of a run, can refer to it.

## How the test runs

The test has two parts. The setup steps (Steps 1 to 10) install and prepare the engine, create some data and start the application. The checks (Check N1, Check W1 and so on) are steps you do by eye in the running application: you look at each screen and judge whether it shows what the setup created.

The setup creates data: watchlists, with the [tickers](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#ticker) and the [analysis strategy](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#analysis-strategy) to run on each, and [analysis runs](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#analysis-run). A saved run cannot be deleted, so the setup never writes to your real database. It uses a throwaway database instead: a new [SQLite](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#sqlite) file in a new timestamped folder under this repository's ignored `.tmp/smoke/` folder. Normally, the engine's `IAN_DATABASE_URL` environment variable determines which database file it uses. This test sets it to the throwaway file instead.

The setup steps can be done for you by this repository's tool, `pnpm smoke --engine <your engine checkout>`. It checks the engine, creates the throwaway database and its data, writes a record of the run with the setup steps filled in, and then starts the application against the throwaway database. It sets `IAN_DATABASE_URL` only for the commands and the application it starts, never in your terminal.

You can follow the setup steps by hand instead. Run every command in one terminal: the variable lasts only in the terminal where you set it, until that terminal closes, and the application passes its environment through to the engine it starts.

The record is `SMOKE_RECORD.md` in the throwaway folder. You mark the checks in it, and you paste it into the pull request description. [Recording the result](#recording-the-result) says how.

## Before you start

**Install the engine at the vendored commit.** The vendored commit is the engine-repository commit from which this repository's copy of the engine's API description was taken; it is named in [the vendored API description's source record](../../vendor/ian/SOURCE.md). The test must run against that commit, so the application is checked against the engine it was built for.

Step 1. Get the engine at the commit this repository vendors, and make its command available.

- Read the commit in [the vendored API description's source record](../../vendor/ian/SOURCE.md).
- Check out that commit of the [engine repository](https://github.com/PeterPontbriand/investment-analysis-engine), then follow [the engine's installation guide](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md): [make the `ian` command available](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#make-the-ian-command-available) and [configure it](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#2-configuration), including the SEC EDGAR identification.
- Confirm that `ian --help` shows the engine's help text.
- Outbound access to Yahoo Finance and SEC EDGAR must be allowed, because the steps below run live analyses. If you have not run the engine's own [smoke test](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/SMOKE_TESTING.md) on this installation, run its provider check first (`ian health`), so a provider failure is not mistaken for an application failure.

`pnpm smoke` finds `ian` itself: from `IAD_IAN_PATH` if you set it, otherwise on `PATH`, otherwise in uv's command folder. When you follow the steps by hand, the application finds `ian` on `PATH`. The engine's installer puts the `ian` command in uv's command folder and adds that folder to `PATH` for terminals opened afterwards, so open a new terminal after installing. If `ian` is still not found, follow the engine's troubleshooting entry, [`ian` is "not recognized" / "command not found"](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#ian-is-not-recognized--command-not-found). To use a specific `ian` instead, set the environment variable `IAD_IAN_PATH` (IAD is this application) to the file in the folder that `uv tool dir --bin` prints: `ian.exe` on Windows, `ian` elsewhere.

**Install this repository's development tools** as the [README](../../README.md) describes. On Windows that includes the C++ build tools, because `pnpm tauri dev`, the command that builds and opens the desktop application in development mode, compiles the application.

**Then start the test.** Run `pnpm smoke --engine <your engine checkout>` from this repository's root. It does Steps 2 to 10 as described below, writes the record to the throwaway folder and starts the application. The steps below stay the reference for what it runs, and you can follow them by hand instead. [If `pnpm smoke` stops](#if-pnpm-smoke-stops) lists its stop messages.

### Use a throwaway database

The setup below saves analysis runs and a watchlist, so it runs against a throwaway database and not against your real database, as [How the test runs](#how-the-test-runs) explains.

Step 2. Check your real database once, before you set `IAN_DATABASE_URL` for the throwaway file. Open a new terminal in the root folder of this repository for this, and do not unset or change any `IAN_DATABASE_URL` you already use, so that a problem with your normal database is noticed before the throwaway setting hides it. `ian db status` only reads; it reports whether the database exists and is ready:

```powershell
ian db status
```

`pnpm smoke` runs this step, reading the state with `ian db status --json`; it continues on `ready` or `missing`.

Expect `State: ready`, or `State: missing` with `Database is not initialized yet.` if you have never run an analysis (the command then exits with status 1, which is expected). If it reports `upgrade_required`, follow [First use and explicit upgrades](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md#first-use-and-explicit-upgrades) before going on. For any other state, stop and use [Local Database Operations](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md).

Step 3. Point your terminal session at a new throwaway database file. Do this in the same terminal. This creates a new timestamped folder under this repository's ignored `.tmp/smoke/` folder, so there is nothing to prepare. PowerShell:

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

`pnpm smoke` creates the folder and sets the variable for the commands it runs and for the application, and for nothing else.

Step 4. Create the file's schema and confirm it is ready:

```powershell
ian db upgrade
ian db status
```

`pnpm smoke` runs this step.

Expect the second command to name the throwaway file and report `State: ready`. The schema is the set of tables the engine stores its data in.

### Create the data

The commands are those of the engine's [local research workspace guide](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/WORKSPACE.md). The tickers are ordinary large companies, and the whole setup saves five runs.

Step 5. Create two watchlists, one of them left empty:

```powershell
ian watchlist create "Smoke Test"
ian watchlist create "Smoke Test Empty"
```

`pnpm smoke` runs this step.

Step 6. Fill the first watchlist with four entries. They have no [as-of](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#as-of-date), a date as-of and a timestamp as-of with a timezone offset, in more than one strategy. `--as-of` takes `YYYY-MM-DD` or a timezone-aware ISO-8601 timestamp:

```powershell
ian watchlist add-selection momentum "Smoke Test" KO
ian watchlist add-selection momentum "Smoke Test" MSFT --as-of 2025-12-31
ian watchlist add-selection momentum "Smoke Test" AAPL --as-of 2025-12-31T16:00:00-05:00
ian watchlist add-selection graham-number "Smoke Test" KO
```

`pnpm smoke` runs this step.

Expect each command to print the watchlist with the new entry numbered after the earlier ones.

Step 7. Refresh the first watchlist:

```powershell
ian refresh "Smoke Test"
```

`pnpm smoke` runs this step.

Expect nothing to print until the refresh finishes, then a summary headed by a refresh ID that lists the four entries with their outcomes. Some entries may be [unavailable](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#outcome-unavailable); a refresh with at least one [completed](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#outcome-completed) run is enough. Note the counts of each outcome: later steps compare the application with them.

Step 8. Save one direct analysis. It saves a run that belongs to no refresh:

```powershell
ian momentum MSFT --save-run
```

`pnpm smoke` runs this step.

Step 9. List the saved runs:

```powershell
ian runs list
ian runs refreshes
```

`pnpm smoke` runs this step.

Expect five runs, and one refresh named `Smoke Test` with four runs.

### Start the application

Step 10. Start the desktop application. Run it from this repository's root folder, in the terminal where you set `IAN_DATABASE_URL` if you are following the steps by hand:

```powershell
pnpm tauri dev
```

`pnpm smoke` starts it.

The first start compiles the application and takes a while. When you follow the steps by hand and `ian` is not on `PATH`, set `IAD_IAN_PATH` first, as [Before you start](#before-you-start) says; `pnpm smoke` does not need this. Expect a window to open. Leave the terminal open: it shows the application's launch line for the engine.

If the start fails with "Access is denied" when removing the application's executable, an earlier copy of the application is still running. Close it, or end it with `Get-Process investment-analysis-desktop -ErrorAction SilentlyContinue | Stop-Process`, and run `pnpm smoke` again. When `pnpm smoke` starts the application and it exits with a failure status, the tool marks Step 10 `fail` in the record.

## N. Navigation and About

Check N1. The window opens on the Watchlists screen. The product name and the pre-release notice show beside a navigation with Watchlists, Refreshes, Saved runs and About; the navigation sits at the start side of the window, and the current item is marked.

Check N2. Each navigation link opens its screen. The breadcrumb above each screen, the trail of names that shows where you are (such as Watchlists / Smoke Test), names it, and the current navigation item follows.

Check N3. About shows the engine's details. They are its version, API versions, schema version, SEC identity and languages; compare them with the engine:

- The engine's commands offer no way to print its version, and its documents name no place to check it. Compare the engine version with the `version` in `pyproject.toml` in the engine checkout, and say in the record that this is what you compared with.
- SEC identity shows configured when the engine's configuration holds an SEC EDGAR identification, and not configured otherwise.

## W. Watchlists

Check W1. The Watchlists screen lists both watchlists. `Smoke Test` has 4 entries and `Smoke Test Empty` has 0, each with its created time. A watchlist that was never changed shows a dash for its last change; the one you added entries to shows a time.

Check W2. Times are in your time zone. They agree with the clock of the moment you ran the setup commands.

Check W3. Open `Smoke Test` to see its entries. It shows the breadcrumb Watchlists / Smoke Test, a line with the entry count and created time, and the entries numbered 1 to 4 with ticker, strategy name and as-of. The tickers and numbering agree with `ian watchlist show "Smoke Test"`.

Check W4. Strategy names are the engine's names for the strategies. No raw method code such as `sma_crossover` shows.

Check W5. The four entries show their three as-of forms correctly. Two entries have no as-of (KO's momentum entry and its Graham number entry), one has a date (MSFT) and one has a timestamp (AAPL):

- The two entries with no as-of read as the latest data, not as an empty cell.
- The entry with a date shows that calendar day, 31 December 2025, with no time and not a day earlier or later. If it shows a time instead, note it.
- The entry with a timestamp shows that instant as a local time, for 16:00 at UTC-5 on 31 December 2025.

Check W6. The watchlist's refreshes are listed under its entries. They show the refresh from Step 7 with its time, its four runs and its outcome counts.

Check W7. Open `Smoke Test Empty` to see that it has no entries. It shows that it has no entries and that it has not been refreshed yet. The breadcrumb leads back to Watchlists.

## R. Refreshes

Check R1. Refreshes lists the refresh from Step 7. It shows its completion time (a range when its first and last runs completed a minute or more apart), the watchlist name `Smoke Test`, a run count of 4, and a count for each outcome. The counts agree with `ian runs refreshes`.

Check R2. The outcome column headings are names the engine gives its outcomes. They come in the engine's order, and the counts add up to the run count.

Check R3. The direct analysis from Step 8 is not a refresh and does not appear here.

## H. Saved runs

Check H1. Saved runs lists five runs, newest first. Each shows a completion time, ticker, strategy name and outcome. The five runs can complete within the same minute, so compare the list's order with the order of `ian runs list` (newest first), not with the times shown. The run from Step 8 is among them, which is how a run saved by a direct analysis is reached.

Check H2. Filter by ticker. Type `msft` in lower case and press Enter: only the MSFT runs remain. Clear the field, type `ko` and move to another control instead of pressing Enter: the filter applies.

Check H3. Filter by strategy. The choices are the engine's strategies, led by "All strategies". Choosing one keeps only its runs.

Check H4. Filter by outcome. The choices are the engine's outcomes, led by "All outcomes". Choosing one keeps only its runs.

Check H5. A filter that matches nothing says that no saved runs match the filters. Use a ticker the setup never used. "Clear filters" empties all three filters and shows all five runs again.

## L. Language and layout

Check L1. Engine text carries its language. With the application running from `pnpm tauri dev`, open the developer tools (right-click a screen and choose Inspect, or press `Ctrl+Shift+I`, or `Cmd+Option+I` on macOS), and inspect a strategy name in Saved runs and an outcome heading in Refreshes. Each sits in an element with a `lang` attribute holding the engine's language, such as `en`, and a `data-term-id` attribute, which names the help term that explains the text.

Check L2. No screen shows a raw code, such as a method identifier or an outcome code, where a name should be.

Check L3. A narrow window stays usable. Narrow the window to about half the screen width. The navigation and the tables stay usable, and a wide table scrolls instead of being cut off.

## E. Engine problems

Do these last. After Check E1, close the application. Check E2 starts it from a new terminal where the engine cannot be found, so it needs no data. To see the data again afterwards, run `pnpm smoke` again, which makes a fresh throwaway database.

Check E1. The engine stops while the application is open. The [`ian` command](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#make-the-ian-command-available) is a launcher that starts the engine, and the application starts the engine through it, so a chain of processes runs; ending the launcher's process makes the rest of the chain exit within seconds, because the engine stops when its input closes. End the `ian.exe` that the application started, in one of two ways. Only the application starts `ian.exe` with `serve` and `--allow-origin` in its command line, so that is how to tell it from any other `ian.exe`.

- In Task Manager, open the Details tab, right-click a column heading, choose "Select columns" and add "Command line". End the `ian.exe` process whose command line contains `serve`.
- Or, in a second PowerShell terminal, find it by its command line and end it:

```powershell
Get-CimInstance Win32_Process -Filter "Name='ian.exe'" | Where-Object { $_.CommandLine -match '\sserve\s' -and $_.CommandLine -match '--allow-origin' } | ForEach-Object { Stop-Process -Id $_.ProcessId }
```

Then open another screen, such as Refreshes. Expect a message that the analysis engine stopped unexpectedly and that the application must be restarted, with no traceback and no process name. The navigation still works.

Check E2. The engine cannot be found. Close the application, then in a terminal where `ian` is not on `PATH` and `IAD_IAN_PATH` is not set, start it again. This removes every folder holding `ian.exe` from this terminal's `PATH`, so use a new terminal and do not run the smoke test's other steps in it:

```powershell
$env:Path = ($env:Path -split ';' | Where-Object { -not (Test-Path (Join-Path $_ 'ian.exe')) }) -join ';'
Remove-Item Env:IAD_IAN_PATH -ErrorAction SilentlyContinue
Get-Command ian -ErrorAction SilentlyContinue
pnpm tauri dev
```

`Get-Command` must print nothing. Expect every screen to say that the analysis engine is not installed or could not be found, and the navigation to keep working. The message names no command and no environment variable.

## Clean-up

Close the application window; closing it stops the engine. Then delete the throwaway database files in the folder `pnpm smoke` named, `.tmp/smoke/<timestamp>` in this repository: `smoke-test.sqlite3`, and any `smoke-test.sqlite3-wal` and `smoke-test.sqlite3-shm` files beside it. Keep `SMOKE_RECORD.md` and leave the folder itself. `pnpm smoke` prints the folder and these files after the record's path.

With `pnpm smoke`, the throwaway `IAN_DATABASE_URL` setting never reaches your terminal, so there is nothing to unset. When you followed the steps by hand, close the terminal you set it in: that drops the setting.

## Recording the result

`pnpm smoke` writes the record to `SMOKE_RECORD.md` in the throwaway folder, and prints its path before it starts the application. Steps 1 to 9 of the setup are filled in as `pass (scripted)`, each with its command output under "Command output". Step 10 and every check are yours: the tool only started the application, so mark whether its window opened, and mark each check `pass`, `fail`, `n/a` or `note`, with a few words for anything that is not a plain pass, and finish the result line. Use `note` for something worth reporting that is neither a pass nor a fail, such as a difference you cannot judge or an oddity outside the check. A check that this document says cannot be made here no longer exists, so it has no line in the record and is not marked `n/a`; [What smoke testing does not cover](#what-smoke-testing-does-not-cover) lists what browser tests cover instead. A failure note never includes private data. The record lists the steps of this document, so a step added here shows up in the next record.

The "Command output" section is the tool's, and is kept as written. A run whose application failed to start is not a record for a pull request: fix the cause and run `pnpm smoke` again.

If you followed the steps by hand, write the same record yourself: the date, time zone, operating system, application commit, engine commit, the engine version and what you compared it with, the data you created, and each step with its mark.

Record a run in the description of the pull request that adds or changes a screen, naming the engine commit from [the source record](../../vendor/ian/SOURCE.md). Keep the record as the run's record; do not summarise it as "passed".

## If `pnpm smoke` stops

It stops with a plain message instead of guessing, and writes the record so far beside the throwaway folder when it got that far.

- **`--engine` is required, or the folder does not exist:** pass the folder of your engine checkout.
- **`--engine` points at this repository, or the folder is not an engine checkout:** pass the folder of your engine checkout, the investment-analysis-engine repository, not this one. The tool recognises it by its `pyproject.toml`, whose `[project]` table must name `investment-analysis-engine`.
- **The folder is not a Git checkout:** pass the folder that holds the engine's `.git` folder.
- **The engine checkout is at another commit:** the message prints both commits and the commands to run in the engine checkout: `git -C "<path>" fetch`, then `git -C "<path>" checkout <commit>`. Run them, then try again. This leaves the engine checkout on that commit rather than a branch; afterwards, `git -C "<path>" switch main` returns it to main.
- **The `ian` command was not found on `PATH` or in uv's command folder:** do the engine's "Make the `ian` command available" step (Step 1), then open a new terminal and try again. If that does not help, follow the troubleshooting entry linked in [Before you start](#before-you-start). To use a specific `ian`, set `IAD_IAN_PATH`.
- **`ian --help` failed:** the file the tool found does not run as the engine's `ian`. The record's Engine line, or the message, names where it came from; fix that installation, or set `IAD_IAN_PATH` to the right file.
- **`IAD_IAN_PATH` names a `.cmd` or `.bat` file:** the application and the tool start the engine without a shell, so `IAD_IAN_PATH` must name an executable (`.exe`). Point it at the `.exe`, or unset it so `ian` is found on `PATH`.
- **Your real database is not `ready` or `missing`:** an `upgrade_required` database needs the engine's [explicit upgrade](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md#first-use-and-explicit-upgrades) first. For any other state, use the engine's [Local Database Operations](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md).
- **A setup command failed:** the message names the step and the command, and its output is in the record. For a provider failure, see the engine's troubleshooting guide.
- **The start fails with "Access is denied" removing the application's executable:** an earlier copy of the application is still running. Close it, or end it with `Get-Process investment-analysis-desktop -ErrorAction SilentlyContinue | Stop-Process`, and run `pnpm smoke` again.
- **The refresh completed no run:** check the providers with `ian health`, then run `pnpm smoke` again, which makes a new throwaway database.
- **The counts are not the setup's:** the setup leaves 5 runs, 1 refresh of 4 runs and 2 watchlists with 4 entries in all. Run `pnpm smoke` again, which makes a new throwaway database.

Cleaning up, and restarting the application for the engine-problem checks (Checks E1 and E2), stay manual.

## Review checklist

- Every screen shows the application's own words or names from the engine, never a raw code.
- No message names a command, an option, an environment variable or a file path.
- Times and dates read correctly in your time zone, and a date with no time never shifts by a day.
- A screen that shows the engine's own text marks its language.
- The application stays usable when the engine stops or is missing.

Do not treat a changed market value, an outcome that depends on live data or a slow first start as a failure by itself. Investigate a screen that shows a raw code, a blank where a name belongs, a count that disagrees with the engine, or a message that names a command.

## What smoke testing does not cover

A smoke test shows that the application works against a real engine on one day. It proves nothing about boundaries that a real engine cannot easily force, such as paging beyond one page, a stored selection the engine cannot read, a refresh of entries that belong to no watchlist, or a busy database. Browser tests cover those.

No run of this setup can check three things, so this document has no check for them and browser tests cover them: a busy database (the engine's documents give no safe way to cause one), paging of refreshes (it needs more than 50 refreshes) and paging of runs (it needs more than 50 runs). The setup creates one refresh and five runs. The check for such a refresh is added to this document when the application can start refreshes itself, because the command line cannot start one.
