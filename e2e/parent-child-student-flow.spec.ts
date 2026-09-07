import { test, expect } from '@playwright/test';

const PARENT_EMAIL = process.env.QA_PARENT_EMAIL;
const PARENT_PASSWORD = process.env.QA_PARENT_PASSWORD;

test.describe('Parent -> Child -> Student Journey', () => {
  test('parent can provision child student login and student can access dashboard + trivia', async ({ page }) => {
    test.skip(
      !PARENT_EMAIL || !PARENT_PASSWORD,
      'Set QA_PARENT_EMAIL and QA_PARENT_PASSWORD to run this authenticated flow.'
    );

    // 1) Parent sign in.
    await page.goto('/auth');
    await page.locator('#email').fill(PARENT_EMAIL!);
    await page.locator('#password').fill(PARENT_PASSWORD!);
    await page.getByRole('button', { name: 'Proceed' }).click();
    await expect(page).toHaveURL(/\/dashboard\/parent(\/.*)?$/);

    // 2) Ensure there is at least one child profile.
    await page.getByRole('tab', { name: 'Overview' }).click();

    const noChildrenState = page.getByText('No children added yet');
    if (await noChildrenState.isVisible()) {
      const uniqueSuffix = Date.now().toString().slice(-6);
      await page.getByRole('button', { name: /Add Your First Child|Add Another Child/i }).click();

      await page.locator('#firstName').fill(`QAChild${uniqueSuffix}`);
      await page.locator('#lastName').fill('Student');
      await page.locator('#dateOfBirth').fill('2012-09-01');

      // AddChildDialog.tsx's real <SelectItem> text — this had drifted from
      // "Year 3 (Primary 1)" (which no longer exists in the dropdown) ever
      // since QA_PARENT_EMAIL/QA_PARENT_PASSWORD went unset, silently
      // skipping this whole test and hiding the mismatch.
      await page.locator('#gradeLevel').click();
      await page.getByRole('option', { name: 'Primary 3 (P3) – Year 3' }).click();

      await page.getByLabel('Mathematics').check();
      await page.getByRole('button', { name: /^Add Child$/ }).click();

      await expect(page.getByText('No children added yet')).not.toBeVisible();
    }

    // 3) Enable (or verify) student login for the first child card.
    const enableLoginButton = page.getByRole('button', { name: 'Enable Student Login' }).first();
    if (await enableLoginButton.isVisible()) {
      await enableLoginButton.click();
      await page.getByRole('button', { name: /^Enable Student Login$/ }).last().click();
      await expect(page.getByText('Student login enabled successfully!')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(3200);
    }

    // 4) Generate a temporary password and capture credentials.
    await page.getByRole('button', { name: /Generate New Password/i }).first().click();
    await expect(page.getByText('Temporary Password:')).toBeVisible({ timeout: 10000 });

    const passwordText = await page.locator('span.font-mono.font-bold').first().innerText();
    const temporaryPassword = passwordText.trim();

    const emailLine = await page.getByText(/Email:/i).first().innerText();
    const emailMatch = emailLine.match(/Email:\s*([^\s]+)/i);
    expect(emailMatch).toBeTruthy();
    const studentEmail = emailMatch![1];

    expect(temporaryPassword.length).toBeGreaterThanOrEqual(8);

    // 5) Sign out parent, then sign in as child student.
    await page.getByRole('button', { name: /Sign Out/i }).first().click();
    await expect(page).toHaveURL(/\/auth/);

    await page.locator('#email').fill(studentEmail);
    await page.locator('#password').fill(temporaryPassword);
    await page.getByRole('button', { name: 'Proceed' }).click();

    await expect(page).toHaveURL(/\/dashboard\/student(\/.*)?$/);

    // 6) Verify student can access Trivia & Rewards section.
    await page.getByRole('tab', { name: 'Trivia & Rewards' }).click();
    await expect(page).toHaveURL(/\/dashboard\/student\/gamification/);

    await expect(
      page.getByText(/Daily Challenge|Battle Arena|Trivia/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
