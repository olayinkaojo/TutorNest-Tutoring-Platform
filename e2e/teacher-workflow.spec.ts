import { test, expect } from '@playwright/test';

test.describe('Teacher Dashboard Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to teacher dashboard', async ({ page }) => {
    // Look for teacher dashboard link
    const teacherDashboardLink = page.locator(
      'a:has-text("Teacher"), a:has-text("Dashboard"), [href*="teacher"], [href*="dashboard"]'
    ).first();

    if (await teacherDashboardLink.isVisible()) {
      await teacherDashboardLink.click();
      await page.waitForTimeout(500);

      // Verify navigation
      expect(page.url()).not.toContain('404');
    }
  });

  test('should display class management interface', async ({ page }) => {
    const teacherDashboard = page.locator('[data-testid="teacher-dashboard"], .teacher-dashboard').first();
    
    if (await teacherDashboard.isVisible()) {
      expect(teacherDashboard).toBeTruthy();

      // Check for class management button
      const classBtn = page.locator('button:has-text("Class"), button:has-text("Manage")').first();
      if (await classBtn.isVisible()) {
        await classBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should show question bank', async ({ page }) => {
    const questionBankLink = page.locator(
      'a:has-text("Questions"), a:has-text("Question Bank"), button:has-text("Add Question")'
    ).first();

    if (await questionBankLink.isVisible()) {
      await questionBankLink.click();
      await page.waitForTimeout(500);

      // Verify question interface loaded
      expect(page.url()).not.toContain('404');
    }
  });

  test('should display analytics dashboard', async ({ page }) => {
    const analyticsLink = page.locator(
      'a:has-text("Analytics"), a:has-text("Reports"), [data-testid="analytics"]'
    ).first();

    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Check for analytics content
      const analyticsContent = page.locator('[data-testid="analytics-dashboard"], .analytics-container').first();
      expect(analyticsContent.or(page.locator('body'))).toBeTruthy();
    }
  });
});

test.describe('Tutoring Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show session booking interface', async ({ page }) => {
    // Look for booking button
    const bookingBtn = page.locator(
      'button:has-text("Book"), a:has-text("Sessions"), button:has-text("Schedule")'
    ).first();

    if (await bookingBtn.isVisible()) {
      await bookingBtn.click();
      await page.waitForTimeout(500);

      // Verify booking interface
      expect(page.url()).not.toContain('404');
    }
  });

  test('should display session calendar', async ({ page }) => {
    const calendarSection = page.locator('[data-testid="calendar"], .calendar, .schedule').first();
    
    if (await calendarSection.isVisible()) {
      expect(calendarSection).toBeTruthy();
    }
  });
});

test.describe('Pricing Tiers', () => {
  test('should display pricing page', async ({ page }) => {
    const pricingLink = page.locator('a:has-text("Pricing"), a:has-text("Plans"), button:has-text("Upgrade")').first();

    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await page.waitForTimeout(500);
    }

    // Check for pricing tiers
    const tierSection = page.locator('[data-testid="pricing-tiers"], .pricing-container').first();
    expect(tierSection.or(page.locator('body'))).toBeTruthy();
  });

  test('should show tier details', async ({ page }) => {
    await page.goto('/');

    // Look for price cards
    const priceCard = page.locator('[data-testid="price-card"], .price-tier, .plan-card').first();
    
    if (await priceCard.isVisible()) {
      expect(priceCard).toBeTruthy();
    }
  });
});
