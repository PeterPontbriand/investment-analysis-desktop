# Real-engine browser tests

These Playwright tests run the application's browser-test build against a real `ian serve`, on a new throwaway database, with real data providers. The mocked browser tests in `tests/browser/` cannot show what the engine really serves; these can. The decision is D308 in the [GUI.4 slice plan](../../../docs/project/milestones/v0.1/gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#appendix-a-2026-11-20-decision-record).

They are not part of `pnpm gate` or CI, because they need the network and the engine installed. No scheduled run is planned. Before a screen-changing slice is handed over, the agent runs them and reports the summary (see AGENTS.md).

## What they need

- The `ian` command, installed from a source checkout of the engine repository, as the engine's installation guide describes. It is found the way `pnpm sandbox` finds it: `IAD_IAN_PATH`, then `PATH`, then `uv tool dir --bin`.
- The engine checkout at the commit named in `vendor/ian/SOURCE.md`. The tests check this first and stop with a message if it is not. They never switch your checkout: switch it yourself, or let `pnpm sandbox` do it.
- Network access to the data providers. When a provider cannot be reached, the tests that need one are skipped with the reason, not failed.
- Playwright's Chromium and WebKit browsers, which `pnpm gate` installs.

## How to run them

```bash
pnpm test:engine
```

The command builds the application in browser-test mode and serves it on port 4174, apart from the mocked tests' port 4173. Each Playwright project (Chromium and WebKit) starts its own engine on its own database under `.tmp/engine-tests/<time>/`, which is git-ignored. Nothing reads or changes your own database: every command and the server get `IAN_DATABASE_URL` for the throwaway file.

The engine reads an SEC identity from `SEC_USER_AGENT` or from the `.env` file of its settings folder. Each test passes with and without one. To run without one, which gives the engine an empty settings folder and no variable:

```bash
IAD_ENGINE_TEST_WITHOUT_SEC=1 pnpm test:engine
```

```powershell
$env:IAD_ENGINE_TEST_WITHOUT_SEC = '1'; pnpm test:engine; Remove-Item Env:IAD_ENGINE_TEST_WITHOUT_SEC
```

Without an SEC identity the engine answers a lookup but stores no profile, so a ticker has to be looked up before its details show; the tests follow that.

## What they compare

Provider data changes, so no test names a company, an exchange or a provider. Each reads the same thing from the engine and compares it with what the application shows:

- The preview and panel of a watchlist entry: the name, the venue only when the engine serves one, the kind's term name, the currency, and the line naming the provider the engine served (`GET /v1/instrument-profiles/{ticker}`, `GET /v1/info` and the help documents).
- Adding a ticker no provider knows (`ZZZZQ`): the warning line under `Added 1 entry.`, with the term name from the help index; the preview that says no details are stored; the message of a lookup, which must be the one the engine serves for the same lookup and must follow the engine's own template; and that no profile is stored afterwards.
- A Saved runs row's ticker: the identity the run kept, from the run overview's `security_identity`, and the run detail title, which starts with the same name.
- Term popups (GUI.4b, `term-popups.spec.ts`): the engine lists a help term for every label the application names (`src/api/labelTerms.ts`); a run outcome pill's preview shows the definition the engine serves for that term in `/v1/help`, and its panel shows the name and the definition; the "As of" column header does the same with the engine's `as-of-date` term.

Values the engine defines may be asserted: a warning's term name and a failure message's template.

## Adding a test

A slice that changes what a screen shows from engine data adds or updates its tests here. Use `test` and `expect` from `real-engine.ts`: its `engine` fixture is one engine and database for the worker, with `get`, `post`, `cli`, `providers` (whether the providers could be reached), `savedRunId` and helpers for provider and term names. Make a watchlist of your own with `cli` when the test changes data, so tests stay independent.
