import { test, expect } from '@playwright/test';

// Exercises the exact flow investigated and fixed this session: a parent
// adding a child profile from the Parent Dashboard (AddChildDialog.tsx ->
// POST /parent/add-child -> GET /parent/children/:parentId).
//
// Uses the shared QA_PARENT_EMAIL account (signs in via the standard
// Supabase-auth-backed /auth page — not a fresh signup) rather than
// provisioning a new account per run: POST /signup goes through this
// backend's own CORS allowlist (see resolveAllowOrigin in index.ts),
// which intentionally rejects any origin not on it, and a CI-hosted
// localhost isn't on that list — confirmed directly (curl reproduced the
// mismatched Access-Control-Allow-Origin header). That's a deliberate
// security control on the real app, not something to route around from a
// test, so this test avoids /signup entirely rather than depend on it.
const PARENT_EMAIL = process.env.QA_PARENT_EMAIL;
const PARENT_PASSWORD = process.env.QA_PARENT_PASSWORD;

test.describe('Parent adds a child profile', () => {
  test('parent can add a child and see it on the dashboard', async ({ page }) => {
    test.skip(
      !PARENT_EMAIL || !PARENT_PASSWORD,
      'Set QA_PARENT_EMAIL and QA_PARENT_PASSWORD to run this authenticated flow.'
    );

    const uniqueSuffix = Date.now().toString().slice(-8);
    const childFirstName = `QAChild${uniqueSuffix}`;

    // 1) Sign in as the existing QA parent.
    await page.goto('/auth');
    await page.locator('#email').fill(PARENT_EMAIL!);
    await page.locator('#password').fill(PARENT_PASSWORD!);
    await page.getByRole('button', { name: 'Proceed' }).click();
    await expect(page).toHaveURL(/\/dashboard\/parent(\/.*)?$/, { timeout: 20000 });

    // 2) Open the Add Child dialog — the account may or may not already
    // have children from other runs, so check both entry points.
    const addFirstChild = page.getByRole('button', { name: /Add Your First Child/i });
    const addAnotherChild = page.getByRole('button', { name: /Add Another Child/i });
    if (await addFirstChild.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addFirstChild.click();
    } else {
      await addAnotherChild.first().click();
    }

    // 3) Fill and submit the Add Child form.
    await page.locator('#firstName').fill(childFirstName);
    await page.locator('#lastName').fill('TestChild');
    await page.locator('#dateOfBirth').fill('2013-05-10');

    await page.locator('#gradeLevel').click();
    await page.getByRole('option', { name: 'Primary 3 (P3) – Year 3' }).click();

    await page.getByLabel('Mathematics').check();
    await page.getByRole('button', { name: /^Add Child$/ }).click();

    // 4) The new child appears immediately (dialog closes, list refreshes).
    await expect(page.getByText(childFirstName)).toBeVisible({ timeout: 10000 });

    // 5) Reload to confirm it was actually persisted server-side, not just
    // held in local component state.
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(childFirstName)).toBeVisible({ timeout: 15000 });
  });
});
