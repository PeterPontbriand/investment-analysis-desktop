import { expect, test as base } from '@playwright/test';

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

// Every browser test fails on a CSP violation or a console error.
export const test = base.extend<{ failOnViolations: void }>({
  failOnViolations: [
    async ({ page }, use) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__cspViolations?.push(
            `${event.violatedDirective}: ${event.blockedURI}`,
          );
        });
      });
      await use();
      const violations = await page
        .evaluate(() => window.__cspViolations ?? [])
        .catch(() => []);
      expect(violations, 'CSP violations').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
