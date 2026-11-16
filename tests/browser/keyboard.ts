import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Focuses a link the way keyboard use does, so that :focus-visible applies.
// Some browsers do not Tab to links by default (WebKit), and a modifier-only
// key press does not count as keyboard use in every engine, so Tab is pressed
// and the link is then focused by script.
export async function focusByKeyboard(page: Page, link: Locator) {
  await page.keyboard.press('Tab');
  await link.focus();
  await expect(link).toBeFocused();
}
