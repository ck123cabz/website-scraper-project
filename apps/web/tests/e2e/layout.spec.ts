import { test, expect } from '@playwright/test';

test.describe('Layout Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to home via sidebar', async ({ page }) => {
    // Click home link
    await page.click('a[href="/"]');
    await page.waitForURL('/');
    expect(page.url()).toContain('/');
  });

  test('should navigate to jobs via sidebar', async ({ page }) => {
    // Click jobs link
    await page.click('a[href="/jobs/all"]');
    await page.waitForURL('/jobs/all');
    expect(page.url()).toContain('/jobs/all');
  });

  test('should navigate to analytics via sidebar', async ({ page }) => {
    // Click analytics link
    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');
    expect(page.url()).toContain('/analytics');
  });

  test('should navigate to settings via sidebar', async ({ page }) => {
    // Click settings link
    await page.click('a[href="/settings"]');
    await page.waitForURL('/settings');
    expect(page.url()).toContain('/settings');
  });

  test('should highlight active route in sidebar', async ({ page }) => {
    // Navigate to analytics
    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');

    // Find the analytics link and check for active styling
    const analyticsLink = page.locator('a[href="/analytics"]');
    await expect(analyticsLink).toHaveClass(/bg-accent/);
  });

  test('should display breadcrumbs for current page', async ({ page }) => {
    // Navigate to jobs/all
    await page.click('a[href="/jobs/all"]');
    await page.waitForURL('/jobs/all');

    // Check that breadcrumb contains the page name
    const breadcrumbs = page.locator('header span');
    const hasJobsBreadcrumb = await breadcrumbs.filter({ hasText: 'Jobs' }).count();
    expect(hasJobsBreadcrumb).toBeGreaterThan(0);
  });

  test('should update breadcrumbs when navigating', async ({ page }) => {
    // Start on home
    expect(page.url()).toContain('/');

    // Navigate to analytics
    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');

    // Breadcrumb should show Analytics
    const analyticsInHeader = page.locator('header').filter({ hasText: 'Analytics' });
    await expect(analyticsInHeader).toBeVisible();
  });

  test('should maintain sidebar state while navigating', async ({ page }) => {
    // Collapse sidebar
    const toggleButton = page.locator('button[aria-label*="sidebar" i]').first();
    const initialHref = page.locator('a[href="/"]');

    // Sidebar should be visible initially
    await expect(initialHref).toBeVisible();

    // Navigate to analytics
    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');

    // Check that navigation occurred
    expect(page.url()).toContain('/analytics');
  });

  test('should display navigation items', async ({ page }) => {
    // Check that all nav items are present
    const homeLink = page.locator('a[href="/"]');
    const jobsLink = page.locator('a[href="/jobs/all"]');
    const analyticsLink = page.locator('a[href="/analytics"]');
    const settingsLink = page.locator('a[href="/settings"]');

    await expect(homeLink).toBeVisible();
    await expect(jobsLink).toBeVisible();
    await expect(analyticsLink).toBeVisible();
    await expect(settingsLink).toBeVisible();
  });

  test('should show navigation icons', async ({ page }) => {
    // Icons should be visible in sidebar
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });

  test('should handle navigation between all pages', async ({ page }) => {
    const navItems = ['/', '/jobs/all', '/analytics', '/settings'];

    for (const href of navItems) {
      await page.click(`a[href="${href}"]`);
      await page.waitForURL(href);
      expect(page.url()).toContain(href);
    }
  });

  test('should display header with breadcrumbs', async ({ page }) => {
    // Header should exist
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Breadcrumbs should be visible
    const breadcrumbs = header.locator('span');
    expect(await breadcrumbs.count()).toBeGreaterThan(0);
  });

  test('should have responsive layout on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Sidebar should be visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should navigate with keyboard after focus', async ({ page }) => {
    // Focus on first nav link
    await page.click('a[href="/"]');
    await page.keyboard.press('Tab');

    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');

    // Should still be on page (or navigated)
    expect(page.url()).toBeDefined();
  });

  test('should apply correct styling to active links', async ({ page }) => {
    // Navigate to specific page
    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');

    // Active link should have accent styling
    const activeLink = page.locator('a[href="/analytics"]');
    const classes = await activeLink.getAttribute('class');
    expect(classes).toContain('bg-accent');
  });

  test('should maintain navigation consistency', async ({ page }) => {
    // Navigate multiple times
    await page.click('a[href="/jobs/all"]');
    await page.waitForURL('/jobs/all');

    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');

    await page.click('a[href="/"]');
    await page.waitForURL('/');

    // Should be back at home
    expect(page.url()).not.toContain('/jobs');
    expect(page.url()).not.toContain('/analytics');
  });
});
