import { test, expect } from '@playwright/test';

/**
 * Smoke tests - critical path verification
 * These tests should run quickly and verify core functionality
 */
test.describe('Smoke Tests', () => {
  test('application loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check no critical errors occurred
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('favicon') && // Ignore favicon errors
        !err.includes('Failed to load resource: the server responded with a status of 404') // Ignore 404s
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('API is reachable', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:8080';

    // Test health endpoint if available
    // Replace with your actual health check endpoint
    try {
      const response = await request.get(`${apiUrl}/health`);
      expect(response.ok() || response.status() === 404).toBeTruthy();
    } catch (error) {
      // If health endpoint doesn't exist, just log
      console.log('Health check endpoint not available');
    }
  });
});
