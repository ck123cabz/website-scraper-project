import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * Tests for the main dashboard page functionality
 */
test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    // Use domcontentloaded to avoid waiting for WebSocket connections
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  });

  test('should load dashboard successfully', async ({ page }) => {
    // Verify page loads
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // Verify title and description
    await expect(page.locator('[data-testid="dashboard-title"]')).toHaveText('Job Dashboard');
    await expect(page.locator('[data-testid="dashboard-description"]')).toContainText('Monitor your scraping jobs');
  });

  test('should display new job button', async ({ page }) => {
    const newJobButton = page.locator('[data-testid="new-job-button"]');

    await expect(newJobButton).toBeVisible();
    await expect(newJobButton).toContainText('New Job');
  });

  test('should handle empty job list state', async ({ page }) => {
    // Wait for job list to load
    await page.waitForLoadState('networkidle');

    // Check if either job list or empty state is visible
    const jobList = page.locator('[data-testid="job-list"]');
    const emptyState = page.locator('[data-testid="empty-state"]');
    const loading = page.locator('[data-testid="loading"]');

    // Wait for loading to finish
    await expect(loading).not.toBeVisible({ timeout: 10000 });

    // Either jobs or empty state should be visible
    const hasJobs = await jobList.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasJobs || isEmpty).toBeTruthy();
  });

  test('should display job cards when jobs exist', async ({ page }) => {
    // Wait for potential jobs to load (with fallback for WebSocket issues)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Check if job list is visible
    const jobList = page.locator('[data-testid="job-list"]');

    // Only run this test if jobs exist
    if (await jobList.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify job cards exist
      const jobCards = page.locator('[data-testid^="job-card-"]');
      await expect(jobCards.first()).toBeVisible();

      // Verify job card contains required elements
      const firstCard = jobCards.first();
      await expect(firstCard.locator('[data-testid="job-name"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="job-status"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="job-progress"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="job-url-count"]')).toBeVisible();
    }
  });

  test('should handle loading state', async ({ page }) => {
    // Reload to see loading state
    await page.reload();

    // Check for loading indicator (may be brief)
    const loading = page.locator('[data-testid="loading"]');

    // Loading should either be visible briefly or already done
    const isLoading = await loading.isVisible({ timeout: 1000 }).catch(() => false);

    // After loading completes, should show either jobs or empty state
    await expect(loading).not.toBeVisible({ timeout: 10000 });
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
  });
});

/**
 * Job Card Interaction Tests
 */
test.describe('Job Card Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  });

  test('should navigate to job details when clicking card', async ({ page }) => {
    // Check if jobs exist
    const jobCard = page.locator('[data-testid^="job-card-"]').first();

    if (await jobCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get job ID from data-testid
      const testId = await jobCard.getAttribute('data-testid');
      const jobId = testId?.replace('job-card-', '');

      // Click the card
      await jobCard.click();

      // Should navigate to job details page
      await expect(page).toHaveURL(new RegExp(`/jobs/${jobId}`));
    } else {
      test.skip();
    }
  });

  test('should display job status correctly', async ({ page }) => {
    const jobCard = page.locator('[data-testid^="job-card-"]').first();

    if (await jobCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const status = jobCard.locator('[data-testid="job-status"]');
      await expect(status).toBeVisible();

      // Status should be one of the valid statuses
      const statusText = await status.textContent();
      const validStatuses = ['Pending', 'Processing', 'Paused', 'Completed', 'Failed', 'Cancelled'];

      expect(validStatuses).toContain(statusText);
    } else {
      test.skip();
    }
  });

  test('should show progress information', async ({ page }) => {
    const jobCard = page.locator('[data-testid^="job-card-"]').first();

    if (await jobCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Progress percentage should be visible
      const progress = jobCard.locator('[data-testid="job-progress"]');
      await expect(progress).toBeVisible();

      // Should be a number followed by %
      const progressText = await progress.textContent();
      expect(progressText).toMatch(/^\d+(\.\d+)?%$/);

      // URL count should be visible
      const urlCount = jobCard.locator('[data-testid="job-url-count"]');
      await expect(urlCount).toBeVisible();

      // Should match format: "X / Y"
      const urlCountText = await urlCount.textContent();
      expect(urlCountText).toMatch(/^\d+(?:,\d{3})*\s*\/\s*\d+(?:,\d{3})*$/);
    } else {
      test.skip();
    }
  });

  test('should display cost information', async ({ page }) => {
    const jobCard = page.locator('[data-testid^="job-card-"]').first();

    if (await jobCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const cost = jobCard.locator('[data-testid="job-cost"]');
      await expect(cost).toBeVisible();

      // Cost should include currency symbol
      const costText = await cost.textContent();
      expect(costText).toMatch(/[$€£¥]/);
    } else {
      test.skip();
    }
  });
});
