import { test, expect } from '../support/fixtures/base-fixtures';
import path from 'path';

/**
 * Job Creation E2E Tests
 * Tests for creating new scraping jobs via the UI
 */
test.describe('Job Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  });

  test('should load job creation page successfully', async ({ page }) => {
    // Verify page loads
    await expect(page.locator('[data-testid="new-job-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-creation-form"]')).toBeVisible();

    // Verify form title and description
    await expect(page.locator('[data-testid="form-title"]')).toHaveText('Create New Scraping Job');
    await expect(page.locator('[data-testid="form-description"]')).toContainText('Upload a file with URLs');
  });

  test('should have back to dashboard button', async ({ page }) => {
    const backButton = page.locator('[data-testid="back-to-dashboard"]');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Dashboard');
  });

  test('should display all form elements', async ({ page }) => {
    // Job name input
    await expect(page.locator('[data-testid="job-name-label"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-name-input"]')).toBeVisible();

    // Input method tabs
    await expect(page.locator('[data-testid="input-method-tabs"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-tab"]')).toBeVisible();

    // Submit button
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
  });

  test('should switch between file upload and manual entry tabs', async ({ page }) => {
    // Default should be file upload
    await expect(page.locator('[data-testid="file-upload-content"]')).toBeVisible();

    // Switch to manual entry
    await page.click('[data-testid="manual-tab"]');
    await expect(page.locator('[data-testid="manual-entry-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="urls-textarea"]')).toBeVisible();

    // Switch back to file upload
    await page.click('[data-testid="file-tab"]');
    await expect(page.locator('[data-testid="file-upload-content"]')).toBeVisible();
  });

  test('should disable submit button when no URLs provided', async ({ page }) => {
    const submitButton = page.locator('[data-testid="submit-button"]');

    // Should be disabled initially (no file selected)
    await expect(submitButton).toBeDisabled();

    // Switch to manual entry - should still be disabled (no URLs entered)
    await page.click('[data-testid="manual-tab"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when URLs are provided manually', async ({ page }) => {
    // Switch to manual entry
    await page.click('[data-testid="manual-tab"]');

    // Enter URLs
    await page.fill('[data-testid="urls-textarea"]', 'https://example.com\nhttps://test.com');

    // Submit button should be enabled
    await expect(page.locator('[data-testid="submit-button"]')).toBeEnabled();
  });

  test('should create job with manual URL entry', async ({ page, jobFactory }) => {
    // Fill job name
    await page.fill('[data-testid="job-name-input"]', 'E2E Test Job - Manual Entry');

    // Switch to manual entry
    await page.click('[data-testid="manual-tab"]');

    // Enter test URLs
    const testUrls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3',
    ];
    await page.fill('[data-testid="urls-textarea"]', testUrls.join('\n'));

    // Submit form
    await page.click('[data-testid="submit-button"]');

    // Should show loading state
    await expect(page.locator('[data-testid="submit-button"]')).toContainText('Creating Job');

    // Wait for success (should redirect to dashboard or show toast)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Verify we're on the dashboard
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible({ timeout: 10000 });
  });

  test('should validate job name is optional', async ({ page }) => {
    // Switch to manual entry without setting job name
    await page.click('[data-testid="manual-tab"]');
    await page.fill('[data-testid="urls-textarea"]', 'https://example.com');

    // Should be able to submit
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should show file name when file is selected', async ({ page }) => {
    // Create a test file path (we'll use a mock file upload)
    const fileInput = page.locator('[data-testid="file-upload-input"]');

    // Create test file content
    const testUrls = 'https://example.com\nhttps://test.com\nhttps://demo.com';
    const buffer = Buffer.from(testUrls);

    // Set file on input
    await fileInput.setInputFiles({
      name: 'test-urls.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    });

    // Should show selected file
    await expect(page.locator('[data-testid="selected-file"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-file"]')).toContainText('test-urls.txt');

    // Submit button should be enabled
    await expect(page.locator('[data-testid="submit-button"]')).toBeEnabled();
  });
});

/**
 * Job Creation - Form Validation Tests
 */
test.describe('Job Creation - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  });

  test('should handle empty manual URL input', async ({ page }) => {
    await page.click('[data-testid="manual-tab"]');

    // Try to enter whitespace only
    await page.fill('[data-testid="urls-textarea"]', '   \n   \n   ');

    // Submit button should remain disabled
    await expect(page.locator('[data-testid="submit-button"]')).toBeDisabled();
  });

  test('should trim whitespace from URLs', async ({ page }) => {
    await page.click('[data-testid="manual-tab"]');

    // Enter URLs with extra whitespace
    await page.fill('[data-testid="urls-textarea"]', '  https://example.com  \n  \n  https://test.com  ');

    // Should enable submit button (whitespace will be trimmed)
    await expect(page.locator('[data-testid="submit-button"]')).toBeEnabled();
  });
});

/**
 * Job Creation - Navigation Tests
 */
test.describe('Job Creation - Navigation', () => {
  test('should navigate to job creation from dashboard', async ({ page }) => {
    // Start on dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Click "New Job" button
    await page.click('[data-testid="new-job-button"]');

    // Should navigate to job creation page
    await expect(page).toHaveURL(/\/jobs\/new/);
    await expect(page.locator('[data-testid="new-job-page"]')).toBeVisible();
  });

  test('should navigate back to dashboard from job creation', async ({ page }) => {
    await page.goto('/jobs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Click back button
    await page.click('[data-testid="back-to-dashboard"]');

    // Should navigate back to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
  });
});
