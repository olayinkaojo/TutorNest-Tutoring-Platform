import { test, expect } from '@playwright/test';

// Exercises the exact flow investigated and fixed this session: a parent
// adding a child profile from the Parent Dashboard (AddChildDialog.tsx ->
// POST /parent/add-child -> GET /parent/children/:parentId).
//
// KNOWN LIMITATION, confirmed 2026-09-07: this backend's CORS allowlist
// (resolveAllowOrigin in index.ts) intentionally returns a mismatched
// Access-Control-Allow-Origin for any request origin not on
// ALLOWED_ORIGINS — a deliberate security control, not a bug. A
// CI-hosted localhost is never going to be on that list, so *every*
// write (POST/PUT/DELETE) this test makes to the custom edge function —
// not just signup — fails in the browser with a generic "Failed to
// fetch", confirmed via a captured screenshot showing that exact error
// inside AddChildDialog.tsx after submit. Read-only calls and Supabase
// Auth's own sign-in (used below) aren't affected, which is why login
// always succeeds while this test's actual assertion doesn't.
//
// The underlying feature was verified directly instead, bypassing the
// browser entirely: curl login -> POST /parent/add-child -> GET
// /parent/children/:parentId round-tripped correctly against production.
// This test is left enabled (rather than skipped) because a real fix —
// adding the CI/test origin to ALLOWED_ORIGINS — would make it pass
// without any change here; ask before doing that, since it's a
// production security setting, not application code.
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
    // have children from other runs, so accept either entry point. Uses
    // waitFor (auto-retries) rather than isVisible() (a one-shot check with
    // no auto-wait) so this doesn't race the dashboard's async children
    // fetch that runs right after login.
    const addChildButton = page.getByRole('button', { name: /Add (Your First|Another) Child/i }).first();
    await addChildButton.waitFor({ state: 'visible', timeout: 15000 });
    await addChildButton.click();

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
