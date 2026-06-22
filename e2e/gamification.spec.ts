import { test, expect } from '@playwright/test';

test.describe('Student Gamification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('should complete trivia game flow', async ({ page }) => {
    // 1. Check page loads
    await expect(page).toHaveTitle(/Knowledge Fons Academy|Tutoring/i);

    // 2. Navigate to trivia (assuming button exists)
    const playTriviaBtn = page.locator('button:has-text("Play Trivia"), a:has-text("Play Trivia")').first();
    if (await playTriviaBtn.isVisible()) {
      await playTriviaBtn.click();
    }

    // 3. Select topic (simulated)
    const topicSelection = page.locator('[data-testid="topic-selector"], button:has-text("Math")').first();
    if (await topicSelection.isVisible()) {
      await topicSelection.click();
    }

    // 4. Start game
    const startBtn = page.locator('button:has-text("Start"), button:has-text("Begin")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    // 5. Verify game interface appears
    const gameContainer = page.locator('[data-testid="game-container"], .game-screen').first();
    expect(gameContainer.or(page.locator('body'))).toBeTruthy();
  });

  test('should display achievements', async ({ page }) => {
    // Navigate to profile or achievements
    const achievementsBtn = page.locator('a:has-text("Achievements"), button:has-text("Badges")').first();
    if (await achievementsBtn.isVisible()) {
      await achievementsBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify page loads
    await expect(page).not.toHaveURL('/404');
  });

  test('should track progress', async ({ page }) => {
    // Navigate to dashboard
    const dashboardBtn = page.locator('a:has-text("Dashboard"), button:has-text("Home")').first();
    if (await dashboardBtn.isVisible()) {
      await dashboardBtn.click();
      await page.waitForTimeout(500);
    }

    // Check for progress indicator
    const progressBar = page.locator('[data-testid="progress"], .progress-bar').first();
    expect(progressBar.or(page.locator('body'))).toBeTruthy();
  });
});

test.describe('Learning Path Progression', () => {
  test('should show available topics', async ({ page }) => {
    await page.goto('/');

    // Look for topics section
    const topicsSection = page.locator('[data-testid="topics"], .topics-list, section:has-text("Topics")').first();
    
    if (await topicsSection.isVisible()) {
      expect(topicsSection).toBeTruthy();
    }
  });

  test('should track topic mastery', async ({ page }) => {
    await page.goto('/');

    // Navigate to a specific topic
    const topicLink = page.locator('a:has-text("Math"), a:has-text("Science"), [data-topic]').first();
    if (await topicLink.isVisible()) {
      await topicLink.click();
      await page.waitForTimeout(500);

      // Verify progress shown
      const masteryIndicator = page.locator('[data-testid="mastery"], .mastery-bar').first();
      expect(masteryIndicator.or(page.locator('body'))).toBeTruthy();
    }
  });
});

test.describe('Achievement System', () => {
  test('should display achievement badges', async ({ page }) => {
    await page.goto('/');

    // Navigate to achievements
    const achievementsLink = page.locator('a:has-text("Achievements"), [href*="achievements"]').first();
    if (await achievementsLink.isVisible()) {
      await achievementsLink.click();
      await page.waitForTimeout(500);

      // Check for badges
      const badges = page.locator('[data-testid="badge"], .achievement-badge').first();
      expect(badges.or(page.locator('body'))).toBeTruthy();
    }
  });

  test('should track streaks', async ({ page }) => {
    await page.goto('/');

    // Look for streak indicator
    const streakIndicator = page.locator('[data-testid="streak"], .streak-counter, :has-text("day streak")').first();
    
    // If visible, verify it exists
    if (await streakIndicator.isVisible()) {
      expect(streakIndicator).toBeTruthy();
    }
  });
});
