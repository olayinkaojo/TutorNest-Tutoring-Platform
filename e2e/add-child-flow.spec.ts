import { test, expect } from '@playwright/test';

// Exercises the exact flow investigated and fixed this session: a parent
// adding a child profile from the Parent Dashboard (AddChildDialog.tsx ->
// POST /parent/add-child -> GET /parent/children/:parentId). Uses its own
// fresh signup rather than the shared QA_PARENT_EMAIL account so it never
// depends on — or is confused by — another test's account state.
test.describe('Parent adds a child profile', () => {
  test('a freshly-signed-up parent can add a child and see it on the dashboard', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-8);
    const email = `qa-add-child-${uniqueSuffix}@example.com`;
    const password = 'TestPass123!';
    const childFirstName = `QAChild${uniqueSuffix}`;

    // 1) Sign up a brand-new parent account.
    await page.goto('/signup/parent');
    await page.locator('#fullName').fill('QA Test Parent');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.locator('#agreeTerms').check();
    await page.locator('#parent-final-terms').check();
    await page.locator('#parent-recording-ack').check();
    await page.getByRole('button', { name: /Create parent account/i }).click();

    await expect(page.getByText('Account created')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /Continue to sign in/i }).click();
    await expect(page).toHaveURL(/\/auth/);

    // 2) Sign in as the new parent.
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Proceed' }).click();
    await expect(page).toHaveURL(/\/dashboard\/parent(\/.*)?$/, { timeout: 20000 });

    // 3) A brand-new parent starts with zero children.
    await expect(page.getByText('No children added yet')).toBeVisible({ timeout: 15000 });

    // 4) Add a child.
    await page.getByRole('button', { name: /Add Your First Child/i }).click();
    await page.locator('#firstName').fill(childFirstName);
    await page.locator('#lastName').fill('TestChild');
    await page.locator('#dateOfBirth').fill('2013-05-10');

    await page.locator('#gradeLevel').click();
    await page.getByRole('option', { name: 'Primary 3 (P3) – Year 3' }).click();

    await page.getByLabel('Mathematics').check();
    await page.getByRole('button', { name: /^Add Child$/ }).click();

    // 5) The child appears immediately (dialog closes, list refreshes).
    await expect(page.getByText('No children added yet')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(childFirstName)).toBeVisible();

    // 6) Reload to confirm it was actually persisted server-side, not just
    // held in local component state.
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(childFirstName)).toBeVisible({ timeout: 15000 });
  });
});
