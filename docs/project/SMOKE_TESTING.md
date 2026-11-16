# Smoke Testing the Desktop Application

Follow this guide to perform a manual "smoke test" of the Investment Analysis Desktop application's user interface: a short check that its main functions work. This guide is for a contributor who starts the application from a terminal they opened themselves, and who judges each screen as a user would see it.

The Investment Analysis Desktop application neither holds data nor performs analysis; it only shows data from a connected Investment Analysis Engine instance (the engine), the separate program that does the analysis and holds all of the data.

At present, every step in this guide needs developer tooling, so this is a contributor document, not a user document. An agent or script may rehearse these steps, but for a run to constitute a formal smoke test the checks must be made manually.

The test checks that the application starts the engine, that each screen shows what the engine holds, and that the application reports an engine that stops or is missing. It does not try to cover every control. This repository's automated browser tests cover what a real engine cannot easily produce: paging through many results, a stored [selection](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#selection) the engine cannot read, a busy database, and a [refresh](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#refresh) of [entries](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#entry) that belong to no [watchlist](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#watchlist).

[Provider data](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#data-provider), the market and filing data the engine fetches live from Yahoo Finance and [SEC](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#sec) [EDGAR](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#edgar), changes over time, so exact values are not prescribed. For each step, judge whether the screen shows what the engine's own commands show, in readable words, with no raw code, traceback or `NaN` where a name or value belongs. Every step has a number (Step 1, Step 2, ... for setup, then Check N1, Check W1, ... for the checks, with a letter for each group of screens: N, W, R, C, H, D, L and E) so that [the record](#recording-the-result), the written account of a run, can refer to it.

## How the test runs

The test has two parts. The setup steps (Steps 1 to 10) install and prepare the engine, create some data and start the application. The checks (Check N1, Check W1 and so on) are steps you do by eye in the running application: you look at each screen and judge whether it shows what the setup created.

The setup creates data: watchlists, with the [tickers](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#ticker) and the [analysis strategy](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#analysis-strategy) to run on each, and [analysis runs](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#analysis-run). A saved run cannot be deleted, so the setup never writes to your real database. It uses a throwaway database instead: a new [SQLite](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#sqlite) file in a new timestamped folder under this repository's ignored `.tmp/smoke/` folder. Normally, the engine's `IAN_DATABASE_URL` environment variable determines which database file it uses. This test sets it to the throwaway file instead.

The setup steps can be done for you by this repository's tool, `pnpm smoke`. It finds your engine checkout by asking the `ian` command where it is installed, switches that checkout to the vendored commit when it is at another one and puts it back when the test ends, creates the throwaway database and its data, writes a record of the run with the setup steps filled in, and then starts the application against the throwaway database. It sets `IAN_DATABASE_URL` only for the commands and the application it starts, never in your terminal.

You can follow the setup steps by hand instead. Run every command in one terminal: the variable lasts only in the terminal where you set it, until that terminal closes, and the application passes its environment through to the engine it starts.

The record is `SMOKE_RECORD.md` in the throwaway folder. You mark the checks in it, and you paste it into the pull request description. [Recording the result](#recording-the-result) says how.

## Before you start

**Install the engine from a source checkout.** The vendored commit is the engine-repository commit from which this repository's copy of the engine's API description was taken; it is named in [the vendored API description's source record](../../vendor/ian/SOURCE.md). The test must run against that commit, so the application is checked against the engine it was built for. `pnpm smoke` needs the engine installed from a checkout of the engine repository (an engine installed as a package has no checkout to use), and if that checkout is at another commit it switches it for you, as [the engine checkout and `pnpm smoke`](#the-engine-checkout-and-pnpm-smoke) explains.

Step 1. Get the engine at the commit this repository vendors, and make its command available.

- Read the commit in [the vendored API description's source record](../../vendor/ian/SOURCE.md).
- Check out that commit of the [engine repository](https://github.com/PeterPontbriand/investment-analysis-engine), then follow [the engine's installation guide](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md): [make the `ian` command available](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#make-the-ian-command-available) and [configure it](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#2-configuration), including the SEC EDGAR identification.
- Confirm that `ian --help` shows the engine's help text.
- Outbound access to Yahoo Finance and SEC EDGAR must be allowed, because the steps below run live analyses. If you have not run the engine's own [smoke test](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/SMOKE_TESTING.md) on this installation, run its provider check first (`ian health`), so a provider failure is not mistaken for an application failure.

`pnpm smoke` finds `ian` itself: from `IAD_IAN_PATH` if you set it, otherwise on `PATH`, otherwise in uv's command folder. It then runs `ian about --json`, which reports the engine's version, the folder of the checkout the command runs and that checkout's Git commit, and uses that checkout. It cannot check one engine while running another, and it takes no argument naming the engine. When you follow the steps by hand, the application finds `ian` on `PATH`. The engine's installer puts the `ian` command in uv's command folder and adds that folder to `PATH` for terminals opened afterwards, so open a new terminal after installing. If `ian` is still not found, follow the engine's troubleshooting entry, [`ian` is "not recognized" / "command not found"](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#ian-is-not-recognized--command-not-found). To use a specific `ian` instead, set the environment variable `IAD_IAN_PATH` (IAD is this application) to the file in the folder that `uv tool dir --bin` prints: `ian.exe` on Windows, `ian` elsewhere.

**Install this repository's development tools** as the [README](../../README.md) describes. On Windows that includes the C++ build tools, because `pnpm tauri dev`, the command that builds and opens the desktop application in development mode, compiles the application.

**Then start the test.** Run `pnpm smoke` from this repository's root. It does Steps 2 to 10 as described below (switching the engine checkout between Step 3 and Step 4 when it must), writes the record to the throwaway folder and starts the application. The steps below stay the reference for what it runs, and you can follow them by hand instead. [If `pnpm smoke` stops](#if-pnpm-smoke-stops) lists its stop messages.

### The engine checkout and `pnpm smoke`

`pnpm smoke` leaves your engine checkout as it found it. It reads the checkout's commit from `ian about` and, when it must switch, its branch from `git symbolic-ref` (`ian about` reports no branch), and does one of two things:

- **The checkout is at the vendored commit:** nothing is switched. If the checkout has uncommitted changes, the run continues and the record notes them.
- **The checkout is at another commit:** the tool refuses a checkout with uncommitted changes (commit, stash or discard them first). Otherwise it makes sure the checkout has the vendored commit, running `git fetch origin` only when it does not, and after Step 3 switches the checkout to that commit with `git switch --detach`. A detached checkout is at a commit rather than on a branch, which is how the test pins the engine. Before it switches, the tool notes whether the checkout was on a branch or detached.

The tool never uses `--force` and never uses `reset`. Step 2 reads your real database with your own engine before the switch, and after the switch nothing touches the real database: every later step uses the throwaway database.

The tool puts the checkout back, with `git switch <branch>` or `git switch --detach <commit>`, when setup stops, when it hits an error, when the application exits (with any status) and when you press Ctrl+C or the terminal sends it a stop signal. A stop signal during setup ends the command that is running (on Windows with its whole process tree), starts no further command, does not start the application, and then restores the checkout, writes the record once with the stop recorded as "Interrupted", and exits. A switch already under way is left to finish before the restore, so Git is never killed half-way. While the application runs, Ctrl+C is left to the application, which exits, and the tool then restores. Any other stop signal while the application runs restores the checkout too, and the terminal shows the stop and the restore's result. If you close the terminal window, Windows allows the tool about 10 seconds to do it. When it switches the checkout, it prints the one command that restores it at the start, and the record carries the same command, so you can restore the checkout yourself if the terminal itself is closed. The restore's result is shown in the terminal, not in the record: the record's Engine line says the checkout was switched for the test, and the tool does not write the record once the application has started (see [Recording the result](#recording-the-result)). If the restore fails, the tool does not force it: it prints the message and that command.

The first engine command after a switch, and the first one after a restore, can take about a minute while the engine's environment syncs.

### Use a throwaway database

The setup below saves analysis runs and a watchlist, so it runs against a throwaway database and not against your real database, as [How the test runs](#how-the-test-runs) explains.

Step 2. Check your real database once, before you set `IAN_DATABASE_URL` for the throwaway file. Open a new terminal in the root folder of this repository for this, and do not unset or change any `IAN_DATABASE_URL` you already use, so that a problem with your normal database is noticed before the throwaway setting hides it. `ian db status` only reads; it reports whether the database exists and is ready:

```powershell
ian db status
```

`pnpm smoke` runs this step, reading the state with `ian db status --json`; it continues on `ready` or `missing`. It runs before the tool switches the engine checkout, so it reads your database with your own engine.

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

`pnpm smoke` creates the folder and sets the variable for the commands it runs and for the application, and for nothing else. When the engine checkout must be switched, the tool does it after this step, so every engine command from then on already uses the throwaway database.

Step 4. Create the file's schema and confirm it is ready:

```powershell
ian db upgrade
ian db status
```

`pnpm smoke` runs this step.

Expect the second command to name the throwaway file and report `State: ready`. The schema is the set of tables the engine stores its data in.

### Create the data

The commands are those of the engine's [local research workspace guide](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/WORKSPACE.md). The tickers are ordinary large companies, apart from SPY, an exchange-traded fund, and the whole setup saves six runs.

Step 5. Create two watchlists, one of them left empty:

```powershell
ian watchlist create "Smoke Test"
ian watchlist create "Smoke Test Empty"
```

`pnpm smoke` runs this step.

Step 6. Fill the first watchlist with five entries. They have no [as-of](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#as-of-date), a date as-of and a timestamp as-of with a timezone offset, in more than one strategy. The last entry runs the Piotroski F-Score on SPY, an exchange-traded fund that the strategy cannot score, so its run is not applicable: the comparison then shows an outcome column, "Not run" cells and a third strategy group. `--as-of` takes `YYYY-MM-DD` or a timezone-aware ISO-8601 timestamp:

```powershell
ian watchlist add-selection momentum "Smoke Test" KO
ian watchlist add-selection momentum "Smoke Test" MSFT --as-of 2025-12-31
ian watchlist add-selection momentum "Smoke Test" AAPL --as-of 2025-12-31T16:00:00-05:00
ian watchlist add-selection graham-number "Smoke Test" KO
ian watchlist add-selection piotroski "Smoke Test" SPY
```

`pnpm smoke` runs this step.

Expect each command to print the watchlist with the new entry numbered after the earlier ones.

Step 7. Refresh the first watchlist:

```powershell
ian refresh "Smoke Test"
```

`pnpm smoke` runs this step.

Expect nothing to print until the refresh finishes, then a summary headed by a refresh ID that lists the five entries with their outcomes. Some entries may be [unavailable](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#outcome-unavailable); a refresh with at least one [completed](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/GLOSSARY.md#outcome-completed) run is enough. Note the counts of each outcome: later steps compare the application with them.

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

Expect six runs, and one refresh named `Smoke Test` with five runs.

### Start the application

Step 10. Start the desktop application. Run it from this repository's root folder, in the terminal where you set `IAN_DATABASE_URL` if you are following the steps by hand:

```powershell
pnpm tauri dev
```

`pnpm smoke` starts it.

The first start compiles the application and takes a while. When you follow the steps by hand and `ian` is not on `PATH`, set `IAD_IAN_PATH` first, as [Before you start](#before-you-start) says; `pnpm smoke` does not need this. Expect a window to open. Leave the terminal open: it shows the application's launch line for the engine.

If the start fails with "Access is denied" when removing the application's executable, an earlier copy of the application is still running. Close it, or end it with `Get-Process investment-analysis-desktop -ErrorAction SilentlyContinue | Stop-Process`, and run `pnpm smoke` again. When `pnpm smoke` starts the application and it exits with a failure status, the terminal tells you to mark Step 10 `fail` in the record, with the exit status. When you close the window normally, the terminal may print `[ELIFECYCLE] Command failed with exit code -1.` This is pnpm reporting that the development server was stopped along with the application, not a failure of the application, and the exit status stays 0, so you can ignore it.

## N. Navigation and About

Check N1. The window opens on the Watchlists screen. The product name and the pre-release notice show beside a navigation with Watchlists, Refreshes, Saved runs and About; the navigation sits at the start side of the window, and the current item is marked.

Check N2. Each navigation link opens its screen. The breadcrumb above each screen, the trail of names that shows where you are (such as Watchlists / Smoke Test), names it, and the current navigation item follows.

Check N3. About shows the engine's details. They are its version, API versions, schema version, SEC identity and languages; compare them with the engine:

- Compare the engine version with the version `ian about` prints on its first line, and say in the record that this is what you compared with. `pnpm smoke` records the version `ian about` reported.
- SEC identity shows configured when the engine's configuration holds an SEC EDGAR identification, and not configured otherwise.

Check N4. The shell follows the look of the preview mock-ups. The navigation at the start side has a thin rule on its inner edge; the current item has a raised background with rounded corners; the product name and the pre-release notice sit above the navigation; the content area fills the rest of the window with the breadcrumb as a small line above the heading.

## W. Watchlists

Check W1. The Watchlists screen lists both watchlists. `Smoke Test` has 5 entries and `Smoke Test Empty` has 0, each with its created time. A watchlist that was never changed shows a dash for its last change; the one you added entries to shows a time.

Check W2. Times are in your time zone. They agree with the clock of the moment you ran the setup commands.

Check W3. Open `Smoke Test` to see its entries. It shows the breadcrumb Watchlists / Smoke Test, a line with the entry count and created time, and the entries numbered 1 to 5 with ticker, strategy name and as-of. The tickers and numbering agree with `ian watchlist show "Smoke Test"`.

Check W4. Strategy names are the engine's names for the strategies. No raw method code such as `sma_crossover` shows.

Check W5. The five entries show their three as-of forms correctly. Three entries have no as-of (KO's momentum entry, its Graham number entry and SPY's Piotroski entry), one has a date (MSFT) and one has a timestamp (AAPL):

- The three entries with no as-of read as the latest data, not as an empty cell.
- The entry with a date shows that calendar day, 31 December 2025, with no time and not a day earlier or later. If it shows a time instead, note it.
- The entry with a timestamp shows that instant as a local time, for 16:00 at UTC-5 on 31 December 2025.

Check W6. The watchlist's refreshes are listed under its entries. They show the refresh from Step 7 with its time, its five runs and its outcome counts. The completion time is a link to the refresh's comparison.

Check W7. Open `Smoke Test Empty` to see that it has no entries. It shows that it has no entries and that it has not been refreshed yet. The breadcrumb leads back to Watchlists.

Check W8. Tables follow the mock-ups: a thin rule under every row, secondary-coloured column headings, and the watchlist names as links in the accent colour. The entry counts are aligned to the end of their column.

## R. Refreshes

Check R1. Refreshes lists the refresh from Step 7. It shows its completion time (a range when its first and last runs completed a minute or more apart), the watchlist name `Smoke Test`, a run count of 5, and a count for each outcome. The counts agree with `ian runs refreshes`.

Check R2. The outcome column headings are names the engine gives its outcomes. They come in the engine's order, and the counts add up to the run count.

Check R3. The direct analysis from Step 8 is not a refresh and does not appear here.

Check R4. The count columns line up at the end of the column, and their digits are the same width, so counts of different sizes stay in line.

## C. Refresh comparison

Check C1. Open the comparison from Refreshes. The completion time of the refresh is a link; it opens the comparison. The breadcrumb reads Refreshes and then the heading, which is `Smoke Test` (a link to the watchlist), a dot and the refresh's completion time or time range, formatted as on Refreshes. Under the heading a line gives the run count (5 runs) and then each outcome that has runs, as its name and count, in the engine's order. The counts agree with Refreshes and with `ian runs refreshes`.

Check C2. The table groups the runs by ticker and strategy. The ticker column is at the start; the three strategy groups (Momentum, Graham Number and Piotroski F-Score) sit beside it, each with its strategy name over its own column labels, and the values are in a slightly heavier weight than the labels. Numbers are formatted by their unit (a percentage, a price with its currency code, a score) and no raw code or `NaN` shows. When the table has a number with no value, it shows a dash with the engine's name for its status beside it in small grey text; a text with no value shows a dash alone.

Check C3. A ticker with no run in a group shows one cell across the group with a dash and "Not run": KO in the Piotroski group, and SPY in the Momentum and Graham Number groups. A group shows an Outcome column only when one of its runs did not complete: the Piotroski group shows one, with SPY's outcome (Not applicable) as a pill, and a group whose runs all completed shows none.

Check C4. The ticker column stays in place. Narrow the window to about half the screen width and scroll the table to the end side: the ticker column stays at the start and the strategy groups scroll under it, and the page itself does not scroll sideways.

Check C5. Every value of a run is a link. Move the pointer over a value, or press Tab until one has focus: it is a link with a visible outline that opens that run's detail. "Not run" is not a link.

Check C6. The comparison has no "Refresh now" and no "Download JSON".

## H. Saved runs

Check H1. Saved runs lists six runs, newest first, matching `ian runs list`. Each shows a completion time, ticker, strategy name, outcome and where it was saved. The rows can look alike, because runs of the same ticker, strategy and outcome can complete in the same minute, but the "Saved by" column tells them apart: the direct analysis from Step 8 shows "Direct analysis" as plain text, and each of the five runs the refresh saved shows "Refresh" as a link.

Check H2. Filter by ticker. Type `msft` in lower case and press Enter: only the MSFT runs remain. Clear the field, type `ko` and move to another control instead of pressing Enter: the filter applies.

Check H3. Filter by strategy. The choices are the engine's strategies, led by "All strategies". Choosing one keeps only its runs.

Check H4. Filter by outcome. The choices are the engine's outcomes, led by "All outcomes". Choosing one keeps only its runs.

Check H5. A filter that matches nothing says that no saved runs match the filters. Use a ticker the setup never used. "Clear filters" empties all three filters and shows all six runs again.

Check H6. The outcome column shows each outcome as a pill: green for completed, amber for unavailable, red for failed and grey for not applicable. The pill's words are the engine's outcome names, and the Refreshes headings stay plain text.

Check H7. Keyboard focus is visible. Press Tab to move through the navigation links and then through the Saved runs filters and buttons: each control shows a clear outline when it has focus, and the order follows the screen from the start side to the end side and top to bottom. On macOS, if Tab skips links, turn on "Press Tab to highlight each item on a webpage" in Safari's settings, or use Option+Tab.

Check H8. The links in the list. "Refresh" in the "Saved by" column opens the comparison of the refresh that saved the run, with the breadcrumb Refreshes and then the comparison's heading. The completion time of each row is a link that opens the run's detail.

## D. Run detail

Check D1. Open a run from the comparison by one of its values. The title is the company's name, the ticker in brackets, a dash and the strategy name, such as "Coca-Cola Co (KO) — Graham Number". Under it a line shows the outcome as a pill, when the run was saved, "As of" with its date, the fiscal period end in the strategy's own words, and "Saved by refresh" as a link to the comparison. The breadcrumb reads Refreshes, Refresh comparison, and the ticker with the strategy; "Refresh comparison" returns to the comparison.

Check D2. The headline cards. There is one card for each headline cell, in the comparison's order: the cell's label in small grey text and its value in a large type step, formatted as in the comparison. The values agree with the comparison's row.

Check D3. Warnings and limitations. When the run has any, a "Warnings" list and a "Limitations" list sit under the cards, each under its own heading and written by the engine; a list the run does not have is left out.

Check D4. A cell with no value. Open SPY's Piotroski run. Its Score and Completeness cards each show a dash alone, because a text with no value has no status, and its line under the title has no period end. If any run's card has a number with no value, it shows a dash with the engine's name for its status and, when there is one, for its reason, in small grey text; this is the only place a reason shows. Mark that part `n/a` when no run has such a card. A run with no headline shows the engine's name for why, in a neutral panel, in place of the cards.

Check D5. The tabs. Summary, Details, Diagnostics and JSON are tabs, with Summary open first. The left and right arrow keys move to the next and previous tab and open it (in the other direction in a right-to-left layout), and Home and End go to the first and last. Each tab shows the engine's own text, or the document as indented JSON, in a block that does not wrap; the block scrolls sideways when a line is wide, and you can focus it with Tab and scroll it with the arrow keys. The text can be selected, and there is no copy button. Each text is fetched when its tab first opens: a failure on one tab leaves the others usable.

Check D6. Opened from Saved runs, a run's breadcrumb starts with Saved runs, and a run saved by a direct analysis (Step 8) says "Saved by direct analysis" as plain text. Filter Saved runs by ticker `ko`, open a run by its completion time, then choose "Saved runs" in the breadcrumb: the filter is still applied and the list starts at its first page.

## L. Language and layout

Check L1. Engine text carries its language. With the application running from `pnpm tauri dev`, open the developer tools (right-click a screen and choose Inspect, or press `Ctrl+Shift+I`, or `Cmd+Option+I` on macOS), and inspect a strategy name in Saved runs, an outcome heading in Refreshes, a column label in the comparison, and a headline card label and the strategy in the title of run detail. Each sits in an element with a `lang` attribute holding the engine's language, such as `en`, and a `data-term-id` attribute, which names the help term that explains the text.

Check L2. No screen shows a raw code, such as a method identifier or an outcome code, where a name should be.

Check L3. A narrow window stays usable. Narrow the window to about half the screen width. The navigation and the tables stay usable, and a wide table scrolls instead of being cut off; open the comparison, whose table is the widest.

Check L4. The application follows the operating system's colour theme while it runs. Switch the system between light and dark in the system's settings: the window changes with it, with no restart, and text stays readable in both. Note any white flash when the application starts in dark mode.

Check L5. Forms and states look settled. Saved runs' filter labels sit above their fields in small grey text, and a drop-down keeps the platform's own arrow. The "Connecting to the analysis engine…" message, if you catch it at start-up, is plain grey text.

## E. Engine problems

Do these last. After Check E1, close the application. Check E2 starts it from a new terminal where the engine cannot be found, so it needs no data. To see the data again afterwards, run `pnpm smoke` again, which makes a fresh throwaway database.

Check E1. The engine stops while the application is open. The [`ian` command](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/INSTALLATION.md#make-the-ian-command-available) is a launcher that starts the engine, and the application starts the engine through it. Two `ian.exe` processes therefore run, both with `serve` and `--allow-origin` in their command lines: the launcher, which is the `ian` command in uv's command folder, and the engine itself, which is `ian.exe` inside the engine checkout's `.venv\Scripts` folder and which the launcher runs through `uv run`. End the engine, the one inside the engine checkout's `.venv`, in one of two ways. The launcher exits too, usually at once; if it is still running a few seconds later, note that in the record.

- In Task Manager, open the Details tab, right-click a column heading, choose "Select columns" and add "Command line". End the `ian.exe` whose command line starts with the engine checkout's `.venv\Scripts\ian.exe` path.
- Or, in a second PowerShell terminal, run this. It lists every `ian.exe` it finds with its command line, and stops a process only when exactly one looks like the engine (inside the engine checkout's `.venv`, with `serve` and `--allow-origin`), saying which one it stopped; otherwise it stops nothing and says how many it found. The listed command lines contain your folder paths, so do not paste them into the record:

```powershell
$all = @(Get-CimInstance Win32_Process -Filter "Name='ian.exe'")
$all | ForEach-Object { "Found ian.exe, process $($_.ProcessId): $($_.CommandLine)" }
$engine = @($all | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('\.venv\Scripts\ian.exe') -and $_.CommandLine -match '\sserve(\s|$)' -and $_.CommandLine -match '--allow-origin' })
if ($engine.Count -eq 1) { Stop-Process -Id $engine[0].ProcessId; "Stopped the engine, process $($engine[0].ProcessId)." } else { "Stopped nothing: $($engine.Count) processes look like the engine, and exactly one was expected." }
```

Then open another screen, such as Refreshes. Expect a message that the analysis engine stopped unexpectedly and that the application must be restarted, with no traceback and no process name. The message sits in a neutral panel with a raised background and a thin border, not in red, with no spinner or animation. The navigation still works.

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

`pnpm smoke` writes the record to `SMOKE_RECORD.md` in the throwaway folder, and prints its path before it starts the application. Steps 1 to 9 of the setup are filled in as `pass (scripted)`, each with its command output under "Command output". Step 10 and every check are yours: the tool only started the application, so mark whether its window opened, and mark each check `pass`, `fail`, `n/a`, `not run` or `note`, with a few words for anything that is not a plain pass, and finish the result line. Use `n/a` for a check that does not apply to this run. Use `not run` for a check outside a targeted run, as [Targeted runs](#targeted-runs) explains; `not run` is not `n/a`. Use `note` for something worth reporting that is neither a pass nor a fail, such as a difference you cannot judge or an oddity outside the check. A check that this document says cannot be made here no longer exists, so it has no line in the record and is not marked `n/a`; [What smoke testing does not cover](#what-smoke-testing-does-not-cover) lists what browser tests cover instead. A failure note never includes private data. The record lists the steps of this document, so a step added here shows up in the next record.

Once the application starts, the tool never changes the record, for any reason, because your editor may hold unsaved marks and a change on disk would conflict with them. If the application exits with a failure status, the terminal tells you to mark Step 10 `fail`, with the exit status. The Engine line was written before the application started, so it says whether the checkout was switched for the test and never whether it was restored: the restore's result is in the terminal. The "Command output" section is the tool's, and is kept as written. A run whose application failed to start is not a record for a pull request: fix the cause and run `pnpm smoke` again.

If you followed the steps by hand, write the same record yourself: the date, time zone, operating system, application commit, engine commit, the engine version from `ian about`, whether you switched your engine checkout and restored it, the data you created, and each step with its mark.

A pull request that adds or changes a screen updates this document in the same pull request. It records a run only when the slice's decisions call for one, as [Targeted runs](#targeted-runs) says; the record then goes in the pull request description, naming the engine commit from [the source record](../../vendor/ian/SOURCE.md). Keep the record as the run's record; do not summarise it as "passed".

### Targeted runs

A pull request records a manual run only when automated tests cannot cover something it changes, typically the real webviews (WebView2, WKWebView and WebKitGTK, which the browser tests do not run) or a real engine (which CI does not have). Each slice's decisions say "no manual run", or name the checks to run and the gap that justifies each, and the pull request description repeats it.

`pnpm smoke` still does every setup step and writes every step into the record. Name the checks with `--checks`, a comma-separated list of check ids and of ranges within one letter group; each slice's decisions and its pull request description give the exact command:

```powershell
pnpm smoke --checks C1-C6,D1-D6,H1,H8,L1,L3
```

A targeted run names whole checks only. The record then has a "Targeted run" line naming them, leaves each named check for you to mark, and writes `not run` after every other check; its result line names the checks that were run, for example "Result: Checks C1 to C6, D1 to D6, H1, H8, L1 and L3: all passed". `not run` is separate from `n/a`, which means the check does not apply. Without `--checks` the run is a full run. `pnpm smoke` stops before any setup, with the valid check ids, when the list is empty, names an id that is not a check in this document, has a range across two letter groups or a reversed range, or names a check twice. Whether a release needs a complete run is GUI.6's decision.

## If `pnpm smoke` stops

It stops with a plain message instead of guessing, and writes the record so far beside the throwaway folder when it got that far.

- **`--engine` was passed:** the option no longer exists, because the tool finds the engine through `ian about`. Run `pnpm smoke` without it.
- **`ian about` is unknown:** the engine is older than the vendored commit. Update it by pulling main in your engine checkout, then run `pnpm smoke` again.
- **The engine is installed as a package:** `ian about` reports no installation folder. The smoke test needs the engine installed from a source checkout of the engine repository; follow the engine's installation guide from a checkout.
- **The engine's folder is not a Git checkout:** `ian about` reports no commit. Install the engine from a Git checkout of the engine repository.
- **`ian about` failed:** the file the tool found does not run as the engine's `ian`. The record's Engine line, or the message, names where it came from; fix that installation, or set `IAD_IAN_PATH` to the right file.
- **The engine checkout is at another commit and has uncommitted changes:** the tool will not switch it. Commit, stash or discard the changes in the engine checkout, then run `pnpm smoke` again.
- **The engine checkout does not have the vendored commit, even after a fetch:** nothing was switched. Check that the commit is on the engine's origin, then run `pnpm smoke` again.
- **The run stopped at "Engine switch":** the switch itself failed, or `ian` does not run the switched checkout. The stop is labelled "Engine switch" rather than a step number because it happens between Step 3 and Step 4. In the first case the checkout was not changed; in the second the tool restored it. The message says what Git reported.
- **The engine checkout was not restored:** the tool printed the one command that restores it, and the record carries it too. Run it in the engine checkout. A failed restore is usually a file that changed while the checkout was switched; the tool never forces it.
- **The `ian` command was not found on `PATH` or in uv's command folder:** do the engine's "Make the `ian` command available" step (Step 1), then open a new terminal and try again. If that does not help, follow the troubleshooting entry linked in [Before you start](#before-you-start). To use a specific `ian`, set `IAD_IAN_PATH`.
- **`IAD_IAN_PATH` names a `.cmd` or `.bat` file:** the application and the tool start the engine without a shell, so `IAD_IAN_PATH` must name an executable (`.exe`). Point it at the `.exe`, or unset it so `ian` is found on `PATH`.
- **Your real database is not `ready` or `missing`:** an `upgrade_required` database needs the engine's [explicit upgrade](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md#first-use-and-explicit-upgrades) first. For any other state, use the engine's [Local Database Operations](https://github.com/PeterPontbriand/investment-analysis-engine/blob/main/docs/user/DATABASE.md).
- **A setup command failed:** the message names the step and the command, and its output is in the record. For a provider failure, see the engine's troubleshooting guide.
- **The start fails with "Access is denied" removing the application's executable:** an earlier copy of the application is still running. Close it, or end it with `Get-Process investment-analysis-desktop -ErrorAction SilentlyContinue | Stop-Process`, and run `pnpm smoke` again.
- **The refresh completed no run:** check the providers with `ian health`, then run `pnpm smoke` again, which makes a new throwaway database.
- **The counts are not the setup's:** the setup leaves 6 runs, 1 refresh of 5 runs and 2 watchlists with 5 entries in all. Run `pnpm smoke` again, which makes a new throwaway database.

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

No run of this setup can check three things, so this document has no check for them and browser tests cover them: a busy database (the engine's documents give no safe way to cause one), paging of refreshes (it needs more than 50 refreshes) and paging of runs (it needs more than 50 runs). The setup creates one refresh and six runs. The check for such a refresh is added to this document when the application can start refreshes itself, because the command line cannot start one.
