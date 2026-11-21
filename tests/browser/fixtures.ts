import { expect, test as base } from '@playwright/test';

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

// WebKit reports these for the styling of its own native select control under
// the app's CSP (D111); the control looks and behaves the same without them.
// Opening the drop-down adds style-src-elem violations, which tests do not
// accept: no test opens a native drop-down.
const selectViolation = 'style-src-attr: inline (select)';
const selectConsoleError =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' appears in neither the style-src directive nor the default-src directive of the Content Security Policy.";

const maxViolationWaitMs = 500;
const violationPollMs = 25;

// Every browser test fails on a CSP violation or a console error.
export const test = base.extend<{
  failOnViolations: void;
  // HTTP statuses a test sends on purpose: the browser logs each as a console error.
  allowedHttpStatuses: number[];
  // Console errors a test provokes on purpose, by a part of their text.
  allowedConsoleErrors: string[];
}>({
  allowedHttpStatuses: [[], { option: true }],
  allowedConsoleErrors: [[], { option: true }],
  failOnViolations: [
    async (
      { page, browserName, allowedHttpStatuses, allowedConsoleErrors },
      use,
    ) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const status = /server responded with a status of (\d+)/.exec(
          message.text(),
        )?.[1];
        // The engine answers 404 to "is there a refresh job?" when there is
        // none (D245); the application asks once at start-up.
        if (
          status === '404' &&
          new URL(message.location().url || 'http://none/').pathname ===
            '/v1/refreshes/job'
        )
          return;
        if (
          status !== undefined &&
          allowedHttpStatuses.includes(Number(status))
        )
          return;
        if (allowedConsoleErrors.some((part) => message.text().includes(part)))
          return;
        consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__cspViolations?.push(
            `${event.violatedDirective}: ${event.blockedURI}${
              event.violatedDirective.startsWith('style-src-attr') &&
              document.querySelector('select') !== null &&
              document.querySelector('[style]') === null
                ? ' (select)'
                : ''
            }`,
          );
        });
      });
      await use();
      // WebKit logs the console message 5 to 16 ms before it dispatches the
      // securitypolicyviolation event (the native select exception above), so
      // a test that ends in between reads too few violations. Wait, for at
      // most 500 ms, until as many violations are recorded as the browser's
      // own CSP console errors seen so far. What is accepted does not change:
      // an error with no matching violation still fails below.
      const cspErrorsSeen = consoleErrors.filter(
        (text) => text === selectConsoleError,
      ).length;
      const readViolations = () =>
        page.evaluate(() => window.__cspViolations ?? []).catch(() => []);
      let reported = await readViolations();
      for (
        let waited = 0;
        browserName === 'webkit' &&
        reported.length < cspErrorsSeen &&
        waited < maxViolationWaitMs;
        waited += violationPollMs
      ) {
        await new Promise((resolve) => setTimeout(resolve, violationPollMs));
        reported = await readViolations();
      }
      // WebKit reports a style-src-attr violation for the native select
      // control's own internal styling. It is accepted only when the page had
      // a select and set no style attribute itself at that moment.
      const violations =
        browserName === 'webkit'
          ? reported.filter((entry) => entry !== selectViolation)
          : reported;
      expect(violations, 'CSP violations').toEqual([]);
      // The same violation logs one console error, with the browser's own
      // message. Drop at most one such error per accepted violation.
      let accepted =
        browserName === 'webkit'
          ? reported.filter((entry) => entry === selectViolation).length
          : 0;
      const errors = consoleErrors.filter((text) => {
        if (accepted > 0 && text === selectConsoleError) {
          accepted -= 1;
          return false;
        }
        return true;
      });
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
