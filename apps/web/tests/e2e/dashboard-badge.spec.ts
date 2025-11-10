import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Dashboard Badge UI (T047-TEST-A)
 *
 * Tests the dashboard badge functionality that displays manual review queue count
 * next to the "Manual Review" button when dashboard_badge setting is enabled.
 *
 * Success Criteria (SC-002):
 * - Badge displays queue count when enabled
 * - Badge is hidden when dashboard_badge setting is disabled
 * - Badge loads within 1 second
 * - Badge updates when queue count changes
 * - Test with different queue counts (1, 8, 12)
 * - Test error handling and graceful degradation
 */

test.describe('Dashboard Badge UI (T047-TEST-A)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the settings API to enable dashboard_badge
    await page.route('**/api/settings', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'default',
            manual_review_settings: {
              queue_size_limit: null,
              auto_review_timeout_days: null,
              notifications: {
                email_threshold: 100,
                dashboard_badge: true,
                slack_integration: false,
              },
            },
            layer1_rules: {},
            layer2_rules: {},
            layer3_rules: {},
            confidence_bands: {},
            updated_at: new Date().toISOString(),
          }),
        },
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('should display badge with queue count when enabled', async ({ page }) => {
    // Mock queue status with items
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 12,
            stale_count: 2,
            by_band: {
              high: 2,
              medium: 7,
              low: 3,
              auto_reject: 0,
            },
            oldest_queued_at: new Date(Date.now() - 3600000).toISOString(),
          }),
        },
      });
    });

    // Reload to trigger API call
    await page.reload({ waitUntil: 'networkidle' });

    // Badge should be visible with count
    const badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).toBeVisible({ timeout: 1000 });
    await expect(badge).toContainText('12');
  });

  test('should hide badge when queue is empty', async ({ page }) => {
    // Mock queue status with no items
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 0,
            stale_count: 0,
            by_band: {},
            oldest_queued_at: null,
          }),
        },
      });
    });

    // Reload to trigger API call
    await page.reload({ waitUntil: 'networkidle' });

    // Badge should not be visible when queue is empty
    const badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).not.toBeVisible();
  });

  test('should hide badge when dashboard_badge setting is disabled', async ({ page }) => {
    // Mock settings with dashboard_badge disabled
    await page.route('**/api/settings', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'default',
            manual_review_settings: {
              queue_size_limit: null,
              auto_review_timeout_days: null,
              notifications: {
                email_threshold: 100,
                dashboard_badge: false, // DISABLED
                slack_integration: false,
              },
            },
            layer1_rules: {},
            layer2_rules: {},
            layer3_rules: {},
            confidence_bands: {},
            updated_at: new Date().toISOString(),
          }),
        },
      });
    });

    // Mock queue status with items
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 5,
            stale_count: 1,
            by_band: { medium: 5 },
            oldest_queued_at: new Date(Date.now() - 1800000).toISOString(),
          }),
        },
      });
    });

    // Reload to trigger API call
    await page.reload({ waitUntil: 'networkidle' });

    // Badge should not be visible even though queue has items
    const badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).not.toBeVisible();
  });

  test('should display different badge counts', async ({ page }) => {
    // Test with small count
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 1,
            stale_count: 0,
            by_band: { medium: 1 },
            oldest_queued_at: new Date().toISOString(),
          }),
        },
      });
    });

    await page.reload({ waitUntil: 'networkidle' });

    const badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('1');

    // Test with large count
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 99,
            stale_count: 20,
            by_band: { high: 10, medium: 50, low: 39 },
            oldest_queued_at: new Date(Date.now() - 86400000).toISOString(),
          }),
        },
      });
    });

    await page.reload({ waitUntil: 'networkidle' });

    await expect(badge).toBeVisible();
    await expect(badge).toContainText('99');
  });

  test('should load badge within 1 second', async ({ page }) => {
    // Mock queue status
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 10,
            stale_count: 2,
            by_band: { medium: 8, low: 2 },
            oldest_queued_at: new Date(Date.now() - 3600000).toISOString(),
          }),
        },
      });
    });

    const startTime = Date.now();

    // Reload and wait for badge
    await page.reload({ waitUntil: 'domcontentloaded' });
    const badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).toBeVisible({ timeout: 1000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(1000);
  });

  test('should maintain badge styling', async ({ page }) => {
    // Mock queue status with items
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 8,
            stale_count: 1,
            by_band: { medium: 7, low: 1 },
            oldest_queued_at: new Date(Date.now() - 1800000).toISOString(),
          }),
        },
      });
    });

    await page.reload({ waitUntil: 'networkidle' });

    const badge = page.locator('[data-testid="manual-review-badge"]');

    // Verify badge is visible
    await expect(badge).toBeVisible();

    // Verify badge has correct styling classes
    const badgeElement = await badge.getAttribute('class');
    expect(badgeElement).toContain('bg-red-500');
    expect(badgeElement).toContain('text-white');
  });

  test('should navigate to manual review page on button click', async ({ page }) => {
    // Mock queue status with items
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 5,
            stale_count: 0,
            by_band: { high: 2, medium: 3 },
            oldest_queued_at: new Date(Date.now() - 1200000).toISOString(),
          }),
        },
      });
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Click manual review button
    const manualReviewButton = page.locator('[data-testid="manual-review-button"]');
    await manualReviewButton.click();

    // Should navigate to manual review page
    await expect(page).toHaveURL('/manual-review');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock settings API error
    await page.route('**/api/settings', async (route) => {
      await route.abort('failed');
    });

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Page should still load and be usable (graceful degradation)
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // Manual review button should still be clickable
    const button = page.locator('[data-testid="manual-review-button"]');
    await expect(button).toBeVisible();

    // Badge should not be visible if settings fail
    const badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).not.toBeVisible();
  });

  test('should handle queue API errors gracefully', async ({ page }) => {
    // Mock queue status API error
    await page.route('**/api/manual-review/status', async (route) => {
      await route.abort('failed');
    });

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Page should still load and be usable
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // Manual review button should still be visible
    const button = page.locator('[data-testid="manual-review-button"]');
    await expect(button).toBeVisible();

    // Badge should not be visible if queue API fails
    const badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).not.toBeVisible();
  });
});

/**
 * Dashboard Badge Integration Tests
 * Tests badge behavior in context of full dashboard workflow
 */
test.describe('Dashboard Badge Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock settings with badge enabled
    await page.route('**/api/settings', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'default',
            manual_review_settings: {
              queue_size_limit: null,
              auto_review_timeout_days: null,
              notifications: {
                email_threshold: 100,
                dashboard_badge: true,
                slack_integration: false,
              },
            },
            layer1_rules: {},
            layer2_rules: {},
            layer3_rules: {},
            confidence_bands: {},
            updated_at: new Date().toISOString(),
          }),
        },
      });
    });
  });

  test('should refresh badge count periodically', async ({ page }) => {
    let callCount = 0;

    // Mock queue status with incrementing count
    await page.route('**/api/manual-review/status', async (route) => {
      callCount++;
      const count = callCount <= 1 ? 5 : 8; // First call: 5, Second call: 8

      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: count,
            stale_count: 0,
            by_band: { medium: count },
            oldest_queued_at: new Date(Date.now() - 600000).toISOString(),
          }),
        },
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const badge = page.locator('[data-testid="manual-review-badge"]');

    // Initial count should be 5
    await expect(badge).toContainText('5');

    // Wait for refetch interval (60 seconds) and verify it updates
    // For testing, we'll manually trigger a reload to simulate refetch
    await page.reload({ waitUntil: 'networkidle' });

    // Count should now be 8
    await expect(badge).toContainText('8');
  });

  test('should be visible on responsive viewports', async ({ page }) => {
    // Mock queue status
    await page.route('**/api/manual-review/status', async (route) => {
      await route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active_count: 3,
            stale_count: 0,
            by_band: { high: 3 },
            oldest_queued_at: new Date().toISOString(),
          }),
        },
      });
    });

    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    let badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).toBeVisible();

    // Test on tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'networkidle' });

    badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).toBeVisible();

    // Test on desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload({ waitUntil: 'networkidle' });

    badge = page.locator('[data-testid="manual-review-badge"]');
    await expect(badge).toBeVisible();
  });
});
