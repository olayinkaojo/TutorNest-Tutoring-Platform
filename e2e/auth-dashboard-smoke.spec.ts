import { test, expect } from '@playwright/test';

/**
 * Optional smoke: real Supabase login → post-auth route.
 * Set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` (e.g. in CI secrets) to enable.
 */
test.describe('Auth smoke (optional credentials)', () => {
  test('email login reaches dashboard or role selection', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL?.trim();
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run login smoke');

    await page.goto('/auth');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password', { exact: true }).fill(password!);
    await page.getByRole('button', { name: 'Proceed' }).click();

    await expect(page).toHaveURL(/\/(dashboard|select-role)(\/|$)/, { timeout: 45000 });
  });
});
