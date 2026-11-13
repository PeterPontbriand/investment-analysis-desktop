import { expect, test as base } from '@playwright/test';

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

// Every browser test fails on a CSP violation or a console error.
export const test = base.extend<{
  failOnViolations: void;
  // HTTP statuses a test sends on purpose: the browser logs each as a console error.
  allowedHttpStatuses: number[];
}>({
  allowedHttpStatuses: [[], { option: true }],
  failOnViolations: [
    async ({ page, browserName, allowedHttpStatuses }, use) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const status = /server responded with a status of (\d+)/.exec(
          message.text(),
        )?.[1];
        if (
          status !== undefined &&
          allowedHttpStatuses.includes(Number(status))
        )
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
      const reported = await page
        .evaluate(() => window.__cspViolations ?? [])
        .catch(() => []);
      // WebKit reports a style-src-attr violation for the native select
      // control's own internal styling. It is accepted only when the page had
      // a select and set no style attribute itself at that moment.
      const violations =
        browserName === 'webkit'
          ? reported.filter(
              (entry) => entry !== 'style-src-attr: inline (select)',
            )
          : reported;
      expect(violations, 'CSP violations').toEqual([]);
      // The same internal styling also logs a console error in WebKit.
      const errors =
        browserName === 'webkit' &&
        reported.some((entry) => entry.endsWith('(select)'))
          ? consoleErrors.filter(
              (text) => !text.startsWith('Refused to apply a stylesheet'),
            )
          : consoleErrors;
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
