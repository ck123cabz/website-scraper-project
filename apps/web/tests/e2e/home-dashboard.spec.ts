import { test, expect } from '@playwright/test';

/**
 * E2E tests for Story 2: Home/Dashboard Overhaul
 * Tests the new dashboard at / with QuickStats, view toggle, and job views
 */

test.describe('Home Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('loads home page at / route', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('displays QuickStats cards', async ({ page }) => {
    // Wait for QuickStats to load
    await expect(page.getByText('Active Jobs')).toBeVisible();
    await expect(page.getByText('Success Rate')).toBeVisible();
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });

  test('view toggle is visible and functional', async ({ page }) => {
    // Check that view toggle is present
    const cardsTab = page.getByRole('tab', { name: /cards/i });
    const tableTab = page.getByRole('tab', { name: /table/i });

    await expect(cardsTab).toBeVisible();
    await expect(tableTab).toBeVisible();

    // Initially should be on cards view (default)
    await expect(cardsTab).toHaveAttribute('data-state', 'active');

    // Switch to table view
    await tableTab.click();
    await expect(tableTab).toHaveAttribute('data-state', 'active');
  });

  test('switches between cards and table views', async ({ page }) => {
    // Start with cards view
    const cardsTab = page.getByRole('tab', { name: /cards/i });
    const tableTab = page.getByRole('tab', { name: /table/i });

    // Verify cards view is shown
    await expect(cardsTab).toHaveAttribute('data-state', 'active');

    // Switch to table view
    await tableTab.click();

    // Wait for table to appear
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });

    // Switch back to cards
    await cardsTab.click();

    // Table should be hidden, cards should appear
    // Note: Cards may take a moment to render, so we use a flexible selector
    await expect(page.locator('[class*="grid"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('quick actions buttons are functional', async ({ page }) => {
    // Check for Quick Actions buttons
    const newJobButton = page.getByRole('button', { name: /new job/i });
    const exportButton = page.getByRole('button', { name: /export recent/i });

    await expect(newJobButton).toBeVisible();
    await expect(exportButton).toBeVisible();

    // Click New Job button
    await newJobButton.click();

    // Should navigate to /jobs/new
    await expect(page).toHaveURL('/jobs/new');
  });

  test('recent activity section is present', async ({ page }) => {
    // Check for Recent Activity section
    await expect(page.getByRole('heading', { name: /recent activity/i })).toBeVisible();
  });

  test('page is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that page renders without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance

    // Check that main elements are visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText('Active Jobs')).toBeVisible();
  });
});

test.describe('/dashboard redirect', () => {
  test('redirects /dashboard to /', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});

test.describe('Job interactions', () => {
  test('clicking a job card navigates to detail page', async ({ page }) => {
    await page.goto('/');

    // Wait for jobs to load
    await page.waitForTimeout(2000);

    // Try to find and click a job card
    const jobCard = page.locator('[class*="cursor-pointer"]').first();

    if (await jobCard.isVisible()) {
      await jobCard.click();

      // Should navigate to job detail page
      await expect(page.url()).toMatch(/\/jobs\/[^\/]+$/);
    }
  });

  test('clicking a table row navigates to detail page', async ({ page }) => {
    await page.goto('/');

    // Switch to table view
    const tableTab = page.getByRole('tab', { name: /table/i });
    await tableTab.click();

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Try to find and click a table row
    const tableRow = page.locator('tbody tr').first();

    if (await tableRow.isVisible()) {
      await tableRow.click();

      // Should navigate to job detail page
      await expect(page.url()).toMatch(/\/jobs\/[^\/]+$/);
    }
  });
});
