import { expect, test } from '@playwright/test';

test('shows the static pre-release screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Investment Analysis Desktop');
  await expect(
    page.getByRole('heading', { name: 'Investment Analysis Desktop' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Pre-release: this application is under development and does not yet show any analysis.',
    ),
  ).toBeVisible();
});
