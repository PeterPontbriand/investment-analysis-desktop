# Spec GUI.4c2: help content and Getting started

- **Owning plan:** [GUI.4c2 in the GUI.4 slice plan](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c2--help-content-and-getting-started), decisions in [Appendix A, GUI.4c](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started).
- **Branch:** `feat/gui-4c2-help-content`, from `origin/main` at `d914c0d` (GUI.4c1 merged as #44), or the newer `origin/main` when the branch is made; the implementer reports which.
- **Decisions approved:** 2026-11-24.
- **Lane:** normal.

## Goal

A term's details panel shows its full entry with working links, the engine's guides open on a Help screen, further-reading links open in the browser, and a "Getting started" screen comes first in the sidebar. GUI.4 is complete and IAD issue #32 closes.

## Decisions

- D362: the panel history of GUI.4c1, used by links inside the panel.
- D364: the full entry in the panel, from `GET /v1/help/terms/{term_id}`.
- D365: the "Listed under" group line.
- D366: `markdown-it` 15.0.3, parsing only, rendered to Vue elements from an allow-list; no `v-html`.
- D367: links in served Markdown.
- D368: `tauri-plugin-opener` 2.7.3 for `https:` further-reading links.
- D369: the Help screen, `/help` and `/help/documents/:documentId`.
- D370: how served text looks.
- D371 to D373: "Getting started": its place, wording and guide link.
- D374: the GUI.5 row in the v0.1 plan.
- D375: the tests.
- D376: `pnpm test:engine` summary and "Try it" in the report.
- D377: what stays out.

Each is recorded in [Appendix A, GUI.4c](../GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started) of the GUI.4 slice plan.

## Out of scope

- Any re-vendor: the engine stays at `6f5da703e1a2711439ea4db6357e1288bd67234a`.
- Engine issues #301 and #302 (D378): no SEC EDGAR explanation, warning or Canadian venue text written by the application.
- Any sample-workspace content, the first-run screen, settings, or a change of the start screen (GUI.5, D371, D374).
- A help search, a glossary filter, or a list of terms anywhere but the Help screen.
- Term triggers or links inside the ticker preview or any preview popup (D284).
- Rendering raw HTML, images, or Markdown constructs outside D366's allow-list as anything but text.
- Issues #42, #37, #34, #24, #25 and #4 (D377), `docs/project/SMOKE_TESTING.md` and `docs/design/preview-mockups.html`.

## Allowed files

- `docs/project/milestones/v0.1/gui-4/specs/gui-4c2.md` (this spec; changed only by the spec author's corrections)
- `docs/project/milestones/v0.1/gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md` (the GUI.4c2 row's status, and the GUI.4c2 section's Detail bullet, in step 13)
- `docs/project/milestones/v0.1/IMPLEMENTATION_PLAN.md` (the GUI.4 section's Scope bullets and one new row in the "Decisions to approve before GUI.5" table in step 10; the GUI.4 and GUI.5 rows' status in step 13)
- `package.json`, `pnpm-lock.yaml` (adding `markdown-it` 15.0.3 and `@tauri-apps/plugin-opener` 2.7.3 only, step 2)
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` (adding `tauri-plugin-opener` 2.7.3 only, step 2)
- `src-tauri/src/lib.rs` (registering the opener plugin only)
- `src-tauri/capabilities/default.json` (one opener permission, step 7)
- `src/platform/types.ts`, `src/platform/browser.ts`, `src/platform/tauri.ts`
- `src/api/terms.ts` (the term-document and guide caches)
- `src/api/helpLinks.ts` (new)
- `src/components/HelpMarkdown.vue` (new)
- `src/components/TermEntryBody.vue` (new)
- `src/components/TermTrigger.vue` (the panel body it opens)
- `src/components/ExternalLink.vue` (new)
- `src/views/HelpView.vue`, `src/views/HelpDocumentView.vue`, `src/views/GettingStartedView.vue` (new)
- `src/router.ts`, `src/App.vue` (the routes and the two sidebar items only)
- `src/locales/en.json`, `tests/fixtures/locales/ar-XB.json`
- `tests/fixtures/api/data.ts`, `tests/fixtures/api/server.ts`, and a new `tests/fixtures/api/help.ts`
- `tests/browser/engine-mock.ts`, `tests/browser/help-content.spec.ts` (new), `tests/browser/getting-started.spec.ts` (new), `tests/browser/term-popups.spec.ts` (only where the panel's new body changes an expectation)
- `tests/browser/engine/help-content.spec.ts` (new), `tests/browser/engine/real-engine.ts` (a helper only if needed)
- `tests/unit/help-markdown.test.ts`, `tests/unit/help-links.test.ts` (new), `tests/unit/terms.test.ts`, `tests/unit/platform-browser.test.ts`, `tests/unit/screens.test.ts` (only for the new routes)
- `tests/unit/close-request.test.ts`, `tests/unit/compare-detail.test.ts`, `tests/unit/use-screen-data.test.ts` (each test Platform gains `openExternal: () => Promise.resolve()` only), `tests/browser/screens.spec.ts` (the sidebar list gains Getting started first and Help before About only)

## Steps

1. **Branch and spec.** In `E:\Source\investment-analysis-desktop`: `git fetch origin`, then `git switch -c feat/gui-4c2-help-content origin/main`. This spec is in the working tree as an untracked file; commit it alone as `docs(spec): GUI.4c2 help content spec`. Check: `pnpm docs:check` and `pnpm format:check`.

2. **Dependencies (D366, D368).** `pnpm add -E markdown-it@15.0.3 @tauri-apps/plugin-opener@2.7.3`, and in `src-tauri/` add `tauri-plugin-opener = "=2.7.3"` under `[dependencies]` in `Cargo.toml` and let Cargo update `Cargo.lock` (`cargo update -p tauri-plugin-opener --precise 2.7.3` after the edit, or the first `cargo build`). If pnpm's release-age check refuses either package, if `tauri-plugin-opener` 2.7.3 needs a `tauri` other than the pinned `=2.12.5`, or if either change moves any other existing dependency's version, stop and escalate; no older or newer pin without the project owner. Register the plugin in `src-tauri/src/lib.rs` on the builder for every build (not only `e2e`): `tauri::Builder::default().plugin(tauri_plugin_opener::init())`. Check: `pnpm gate:slice` (it runs the Rust and Tauri steps, because shell paths changed). Commit: `build(deps): add markdown-it and the tauri opener plugin`.

3. **Help documents in the engine object (D364, D369).** In `src/api/terms.ts`, add to `Terms` two cached reads, built like the existing per-locale caches (one entry per locale and id; a failed request is not kept): `termDocument(termId)` → `GET /v1/help/terms/{term_id}` with its `Content-Language`, and `helpDocument(documentId)` → `GET /v1/help/documents/{document_id}` with its `Content-Language`; and `helpIndex()`, returning the cached index the class already fetches, with its language. A 404 whose reason code is `help_term_not_found` or `help_document_not_found` resolves to `null` instead of rejecting. Add Vitest cases to `tests/unit/terms.test.ts`: one request per id and locale, a failure not cached, `null` for each not-found code. Add the endpoints to `tests/fixtures/api/server.ts` from a new `tests/fixtures/api/help.ts`, typed from `src/api/schema.ts`: term documents for `ticker`, `listing-venue`, `provider-no-data` and one term whose body uses every allowed construct and every link kind; guide documents `beginner-guide` (title "A Beginner's Guide to Investment Analysis in This Project", with an introduction, a level-2 and a level-3 section, a section with a wide table and one with a code block) and `finance-math` with a section id the term fixture links to. Check: `pnpm gate:slice`. Commit: `feat(help): term and guide documents from the engine`.

4. **Help links (D367).** New `src/api/helpLinks.ts`: `classifyHelpLink(href)` returns `{ kind: 'term', termId }` for `help:terms/<id>`; `{ kind: 'document', documentId, sectionId }` for `help:documents/<id>` (with `sectionId` from `#<section>`, or `null`); `{ kind: 'external', url }` for an absolute `https:` URL that `new URL()` parses; and `{ kind: 'text' }` for anything else, including `http:`, `javascript:`, a relative link and a `help:` link with no id. Also `sectionElementId(sectionId)` → `help-section-<sectionId>` and `groupElementId(groupId)` → `help-group-<groupId>`, so served ids never collide with the application's own. Vitest: `tests/unit/help-links.test.ts` covers each kind and each malformed case. Check: `pnpm gate:slice`. Commit: `feat(help): help link kinds`.

5. **The renderer (D366, D367, D370).** New `src/components/HelpMarkdown.vue` with props `markdown: string` and `lang: string | null`. It creates one `markdown-it` instance with `{ html: false, linkify: false, typographer: false }`, calls `parse()` (never `render()`), and builds Vue elements with a render function from the token stream. Allowed: `paragraph`, `strong`, `em`, `code_inline`, `fence` and `code_block`, `bullet_list`, `ordered_list` (keeping its `start`), `list_item`, `table` with `thead`, `tbody`, `tr`, `th`, `td` (a `style` of `text-align:left|center|right` maps to the class `align-start`, `align-center` or `align-end`, which use logical `text-align`), `softbreak` (a space), `hardbreak` (`<br>`), `text`, and `link_open`/`link_close`. Every other token, inline or block, renders its text content (its children's text, or `content`) as plain text; raw HTML tokens never occur because `html` is off, and if one does it renders as text. A link renders by `classifyHelpLink`: a term becomes a `TermTrigger` with the link's text as its visible text (its name prop is that text); a document becomes a `RouterLink` to `{ name: 'help-document', params: { documentId }, hash: sectionId === null ? '' : '#' + sectionElementId(sectionId) }`; external becomes `ExternalLink` (step 7); text renders the link's children only. A tight list's paragraphs render without `<p>`. The root element carries `lang` when given and the class `help-markdown`. Styles, in the component: code blocks as `<pre class="help-code" dir="ltr">` in `var(--font-mono)`, `white-space: pre`, `overflow-x: auto`, with `tabindex="0"` and an accessible name from the catalog (`help.codeBlock`, "Code") only when the block overflows (measured on mount and on resize); inline code in `var(--font-mono)`; each table inside the existing `TableScroll`. Vitest `tests/unit/help-markdown.test.ts` (mounting with `@vue/test-utils`): each allowed construct, nested lists, an ordered list's start, table alignment classes, `<script>` and `<b>` in served text shown as text, a `javascript:` link and a `http:` link shown as their text only, each link kind's element. Check: `pnpm gate:slice`. Commit: `feat(help): render served markdown from an allow-list`.

6. **The full entry in the panel (D362, D364, D365).** New `src/components/TermEntryBody.vue`, the panel body for a term, with props `termId`, `definition` and `lang`: it shows the definition at once (as `TermDefinition` does), then reads `engine.terms.termDocument(termId)`: while loading, `common.loading`; on failure, the existing `ScreenState` error with "Try again" that reads again; on `null`, `help.termNotFound` ("The analysis engine has no help entry for this term."); otherwise the body through `HelpMarkdown` (nothing when the body is empty), then a line `help.listedUnder` ("Listed under") followed by a `RouterLink` to `{ name: 'help', hash: '#' + groupElementId(group.id) }` with the group's title, carrying the document's `lang`. `TermTrigger.vue` opens `TermEntryBody` instead of `TermDefinition` in the panel; the preview keeps `TermDefinition`. A term link inside the panel uses D362's step (it is a `TermTrigger` inside the panel's scope already); a document or group link navigates, and the panel closes on the route change as today (D301). Check: `pnpm gate:slice`. Commit: `feat(help): the full term entry in the details panel`.

7. **Further reading opens in the browser (D368).** `Platform` gains `openExternal(url: string): Promise<void>`. `tauri.ts` calls `openUrl(url)` from `@tauri-apps/plugin-opener`. `browser.ts` records the URL instead of opening it: it pushes it onto an array kept on the host object as `openedExternalUrls` (created empty when the platform is made), which the browser tests read with `page.evaluate`; it never calls `window.open`. Extend `tests/unit/platform-browser.test.ts` for it. In `src-tauri/capabilities/default.json`, add `{ "identifier": "opener:allow-open-url", "allow": [{ "url": "https://*" }] }` to `permissions` and nothing else; if the plugin's permission schema at 2.7.3 does not accept that form, stop and escalate. New `src/components/ExternalLink.vue`: an `<a>` with the served `href`, `rel="noreferrer"`, the link's text, then a visually hidden `help.opensInBrowser` ("(opens in your browser)") and a visible `help.externalMark` ("↗", `aria-hidden`). Its click handler (also Enter, which an `<a>` turns into a click) calls `preventDefault()` and `getPlatform().openExternal(href)`; nothing else opens it. Check: `pnpm gate:slice`. Commit: `feat(help): further-reading links open in the browser`.

8. **The Help screen (D369, D370).** Routes in `src/router.ts`: `{ path: '/help', name: 'help', component: HelpView }` and `{ path: '/help/documents/:documentId', name: 'help-document', component: HelpDocumentView }`. In `App.vue`, a "Help" item (`nav.help`, "Help") just above About. `HelpView.vue`: `h1` `nav.help`; an `h2` `help.guides` ("Guides") and a list of `RouterLink`s to each guide in the index's order with its served title; then each group as an `h2` with `id` `groupElementId(group.id)` and its served title, followed by its terms as `TermTrigger`s (name visible, preview and panel as everywhere), in a list; the screen uses `useScreenData` with the `help` term document, so a failed index shows the usual failure state with "Try again". When the route has a hash naming a group, the screen scrolls that group's heading into view and focuses it (`tabindex="-1"`) once loaded. `HelpDocumentView.vue`: reads `engine.terms.helpDocument(documentId)` through `useScreenData`; breadcrumb `[{ label: t('nav.help'), to: { name: 'help' } }]` through `AppBreadcrumb`; `h1` the served title (`tabindex="-1"`), the introduction through `HelpMarkdown`, then each section as `h2` (level 2) or `h3` (level 3, and any deeper level) with `id` `sectionElementId(section.id)` and `tabindex="-1"`, followed by its Markdown; all served text carries the response's `lang`. On load and on every hash change, it focuses the heading the hash names, or the `h1` when there is no hash or the hash names no heading, and scrolls it into view. A `null` document shows `help.documentNotFound` ("The analysis engine has no guide with this name.") under the `h1` `nav.help`. Add both routes to `tests/unit/screens.test.ts` if that test lists routes. Check: `pnpm gate:slice`. Commit: `feat(help): the help screen and guides`.

9. **Getting started (D371 to D373).** Route `{ path: '/getting-started', name: 'getting-started', component: GettingStartedView }`; in `App.vue`, `nav.gettingStarted` ("Getting started") as the first sidebar item; `/` still redirects to Watchlists. `GettingStartedView.vue`, with every string from `en.json` under a new `gettingStarted` key and each sentence an `<i18n-t>` message with named slots, never split text:
   - `h1`: `nav.gettingStarted`.
   - `gettingStarted.intro`: "This application runs the analysis engine's {strategies} on the {tickers} you choose, and explains every result and term it shows. It explains; it does not recommend buying or selling anything." Slot `strategies`: a `TermTrigger` for `analysis-strategy` with the text `gettingStarted.terms.strategies` ("analysis strategies"); slot `tickers`: `ticker`, text `gettingStarted.terms.tickers` ("tickers").
   - A list, one item per screen, each starting with a `RouterLink` to the screen whose text is that screen's `nav.*` message, then the line: `gettingStarted.analyze` "{screen}: run one or more strategies on a single {ticker} and read the results." (`ticker`, text `gettingStarted.terms.ticker`, "ticker"); `gettingStarted.watchlists` "{screen}: build {watchlists} of {entries} and run them again whenever you like." (`watchlist`, "watchlists"; `entry`, "entries"); `gettingStarted.refreshes` "{screen}: see each {refresh}, follow one while it runs, and compare its results." (`refresh`, "refresh"); `gettingStarted.runs` "{screen}: find any saved {run}, filter the list and open its details." (`analysis-run`, "analysis run"); `gettingStarted.help` "{screen}: the analysis engine's glossary and guides."; `gettingStarted.about` "{screen}: which analysis engine the application uses." The screen link and a trigger are never nested (D317).
   - Last, from the cached help index (its own small state, so a failure there leaves the rest of the screen): `gettingStarted.guide` "New to investing? Start with this guide: {guide}" with a `RouterLink` to `{ name: 'help-document', params: { documentId: 'beginner-guide' } }` whose text is the index's title for `beginner-guide`; no line when the index lists no `beginner-guide`; the usual failure state with "Try again" in its place when the index cannot be read.
   - Add every new key to `tests/fixtures/locales/ar-XB.json` in that catalog's form. Check: `pnpm gate:slice`. Commit: `feat(start): getting started screen`.

10. **Tests and records (D374, D375).** Mocked Playwright, Chromium and WebKit, both text directions: `tests/browser/help-content.spec.ts` covers D375's panel, link, Help index, guide (with and without a section), external-link (reading `openedExternalUrls`, and checking the page URL did not change), wide-table and code-block cases, the loading state (a held request) and the failure state (a 500, then "Try again"), and `help_term_not_found`; `tests/browser/getting-started.spec.ts` covers the sidebar order, each trigger opening its term, each screen link, the guide link, no line without `beginner-guide`, and the index failing. Expected text comes from the catalog and the fixtures, never literal English. Then the plan records in `IMPLEMENTATION_PLAN.md`: the GUI.4 section's **Scope** list gains the two bullets below, after its last bullet, and the "Decisions to approve before GUI.5" table gains the row below as its last row.

    ```markdown
      - **Help screen:** the engine's guides and glossary on a Help screen, with in-application links (D369 in the [GUI.4 slice plan](gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started)).
      - **Getting started:** a screen first in the sidebar that says what the application does and does not do and what each screen is for, and links the engine's Beginner's Guide (IAD issue #32, D371 to D373).
    ```

    ```markdown
    | Where a new user lands | After the first-run screen a new user lands on Getting started, which offers Open sample workspace and, while the sample is open, a link to the Try it guide ([issue 36](https://github.com/PeterPontbriand/investment-analysis-desktop/issues/36)'s comment). The rule replaces Watchlists as the start screen for a new user only (D374 in the [GUI.4 slice plan](gui-4/GUI_4_HELP_IN_PLACE_SLICE_PLAN.md#gui4c-venue-help-help-content-and-getting-started)). |
    ```

    Check: `pnpm gate:slice`. Commit: `test(help): help content and getting started`, then `docs(plan): GUI.5 landing decision and GUI.4 scope`.

11. **Real-engine tests (D375).** New `tests/browser/engine/help-content.spec.ts`, comparing with what the engine serves (no engine text hard-coded): a term's panel body text matches `GET /v1/help/terms/{id}` for a term with a body (take the first term in the index whose document has a non-empty body); the Help screen lists every served guide title and group title; `beginner-guide` opens with its served title as the `h1` and its sections' headings in order; the "Getting started" guide link's text is the index's title for `beginner-guide`. The engine checkout must be at the vendored commit: if `E:\Source\investment-analysis-engine` has uncommitted changes, stop and escalate; otherwise note its branch, `git -C E:\Source\investment-analysis-engine switch --detach 6f5da703e1a2711439ea4db6357e1288bd67234a`, run `pnpm test:engine` to completion, and switch it back whatever the result. Check: `pnpm gate:slice`. Commit: `test(engine): help content against a real engine`.

12. **Push and report.** `pnpm gate:slice` once more (in the foreground, never across a turn end), then `git push -u origin feat/gui-4c2-help-content`. Report (see Report) and wait for the spec author's review; fix findings as told and push again.

13. **Pull request.** After the clean review: in the GUI.4 slice plan, the GUI.4c2 row becomes `Complete` with today's date, and the GUI.4c2 section's Detail bullet's last clause, "; its spec is written when GUI.4c1 has merged.", becomes ", and the GUI.4c2 spec" followed by a Markdown link to `specs/gui-4c2.md` and a full stop; in `IMPLEMENTATION_PLAN.md`, the GUI.4 row becomes `Complete` with today's date and GUI.5 `Next`. Run `pnpm docs:check`, commit `docs(plan): GUI.4 complete`, push, and open the pull request with the PR text below through `gh pr create --base main --head feat/gui-4c2-help-content --title "<the PR text's title>" --body-file <a file holding the description>`. If the machine's permission check refuses it, report that and wait. Then watch CI and send the spec author the failing lines of any failed job.

## Norms and safeguards

- Escalate by the table in [`AGENTS.md`](../../../../../../AGENTS.md#escalation-in-a-spec-driven-unit). Particular to this unit:
  - Only the three packages named in step 2 may change in `package.json`, `pnpm-lock.yaml`, `Cargo.toml` and `Cargo.lock`; anything else moving there is an escalation.
  - The capability gains exactly the one opener permission of step 7; any other Tauri permission is an escalation.
  - Nothing uses `v-html` or `innerHTML`, and nothing opens a URL except `openExternal` for a link the user activated.
  - If a served Markdown construct in the real engine's help renders wrongly under the allow-list (a table without a header, for example), stop and report it with its term or guide id rather than widening the allow-list.
- Every user-facing string is a catalog message in `en.json` and the `ar-XB` test catalog; tests read expected text from the catalog.
- The application writes no explanation of an engine term (`AGENTS.md`; D372's lines say what each screen is for, not what a term means).
- Styles use logical properties; `TableScroll` for tables.
- No AI or tool attribution anywhere.
- `pnpm gate:slice` after each step, in the foreground; no full gate (D348).

## Acceptance checks

1. `pnpm gate:slice` passes on the pushed commit, with the Rust and Tauri steps run (shell paths changed) and passing.
2. `pnpm docs:check` and `pnpm format:check` pass.
3. `git --no-pager diff --stat origin/main...HEAD` lists only allowed files; `git --no-pager diff origin/main...HEAD -- package.json src-tauri/Cargo.toml` shows only the three packages of step 2.
4. `git grep -n "v-html\|innerHTML" -- src` finds nothing.
5. The D375 Vitest cases and the new `terms`, `help-links`, `help-markdown` and `platform-browser` cases pass in `pnpm test`.
6. The mocked Playwright suite passes on Chromium and WebKit in both text directions, including `help-content.spec.ts` and `getting-started.spec.ts`.
7. `pnpm test:engine` completes, with its summary and every skipped test's reason in the report.
8. In `pnpm sandbox` (the Tauri application): "Getting started" is first in the sidebar; a term's panel shows its full entry; a guide link opens the Help screen at the right section; an `https:` link in the Beginner's Guide's "Further reading" opens in the default browser; Help is just above About.

## Report

- The branch's commit hashes with their titles, and the `main` commit it started from.
- `git --no-pager diff --stat origin/main...HEAD`.
- The last `pnpm gate:slice` result: its summary lines.
- The result of each acceptance check, numbered as above.
- The `pnpm test:engine` summary, with each skipped test and its reason, and whether an SEC identity was set.
- The installed versions of the three new packages as the lockfiles record them.
- Every escalation, with the table row that triggered it.
- Pilot measures: one value for each measure in the engine's spec workflow §7, "not yet known" for those known only after the pull request.
- **Try it:** "Getting started" is first in the sidebar; any dotted-underlined term's panel now shows the full entry with links; Help (above About) lists the guides and the glossary; further-reading links open in your browser. Command: `pnpm sandbox`.

## PR text

Title: `feat(help): full help entries, help screen and getting started (GUI.4c2)`

Description:

```markdown
## Summary

GUI.4c2 of the GUI.4 slice plan, which completes GUI.4.

- A term's details panel shows the engine's full entry (`GET /v1/help/terms/{term_id}`) under its definition, with a "Listed under" line linking its glossary group (D364, D365).
- Served Markdown is parsed with `markdown-it` 15.0.3 (raw HTML off) and rendered to Vue elements from an allow-list, so served text can never become markup; nothing uses `v-html` (D366).
- Links in served text stay in the application: a term link opens the term in the panel, with Back; a guide link opens the guide on the new Help screen, at its section when it names one. `https:` further-reading links open in the browser through `tauri-plugin-opener` 2.7.3, whose one permission allows `https:` URLs only; any other link shows as text (D367, D368).
- A Help screen, just above About, lists the engine's guides and glossary, and shows each guide with its sections (D369, D370).
- "Getting started" is the first sidebar item: what the application does and does not do, a line per screen with its engine terms as triggers, and a link to the engine's Beginner's Guide (D371 to D373).
- The v0.1 plan records where a new user lands after GUI.5's first-run screen (D374), and marks GUI.4 complete.

## Dependencies

- `markdown-it` 15.0.3 and `@tauri-apps/plugin-opener` 2.7.3 (npm), `tauri-plugin-opener` 2.7.3 (Cargo), approved with the GUI.4c decisions on 2026-11-24.

## Tests

- Vitest: the help link kinds, the Markdown allow-list (raw HTML and unsafe links shown as text), the term and guide caches, the browser platform's external-link record.
- Playwright with the mock engine, Chromium and WebKit, both text directions: the full entry with its loading, failure and not-found states, term and guide links, Back, the Help screen and sections, further reading, wide tables and code blocks, and Getting started.
- Real-engine suite (`pnpm test:engine`): entries, guides and the Getting started guide link compared with what the engine serves.

Closes #32
```

## Change log

- 2026-11-25, escalation 1 (steps 6 and 8): App.vue closes the panel only when the route's path changes, so a hash-only link kept it open. A group or document link inside the panel now also closes it (`closePanel({ returnFocus: false })`); the Help screen focuses the group heading on load and on every hash change; and a link to the address already shown focuses its target again. Mocked failure states use HTTP 500 with `database_busy`, the one failure that offers "Try again". The renderer's `validateLink` accepts every link so that `classifyHelpLink` alone decides how it shows.
- 2026-11-25, escalation 2 (steps 7 to 9): three unit tests build a `Platform` and one browser test lists the sidebar, so they change with the new `openExternal` and the two sidebar items; added to the allowed files for those changes only.
- 2026-11-25, escalation 3 (steps 5 to 8): the renderer needs `ExternalLink` (step 7) and the panel body needs the Help routes (step 8), so the steps are made in the order 4, 7, 5, 8, 6, 9, each with its own content and commit title.
