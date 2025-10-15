import { test, expect } from '../support/fixtures/base-fixtures';
import {
  clickByTestId,
  waitForTestId,
  fillFormByTestId,
} from '../support/helpers/page-helpers';
import {
  expectTestIdToBeVisible,
  expectUrlToBe,
} from '../support/helpers/assertions';

/**
 * Example E2E test demonstrating the test framework
 * This test should be replaced with actual application tests
 */
test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page loaded
    await expect(page).toHaveTitle(/Website Scraper/i);
  });

  test.skip('should have main navigation', async ({ page }) => {
    // Skip this test - placeholder for future tests
    // Replace with actual application homepage tests when implemented
  });
});

test.describe('Job Creation Flow', () => {
  test('should create a new scraping job', async ({ page, jobFactory }) => {
    // Generate test data using the factory
    const testJob = jobFactory.create({
      url: 'https://example.com',
    });

    await page.goto('/');

    // Example flow - adjust based on your actual UI
    // Replace with actual data-testid selectors from your components

    // These are placeholder examples - update with real selectors
    const urlInput = page.locator('input[name="url"]').first();
    if (await urlInput.isVisible()) {
      await urlInput.fill(testJob.url);

      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }
    }
  });
});

test.describe('Data Factory Example', () => {
  test('should use user factory', async ({ userFactory }) => {
    const user = userFactory.create();

    expect(user.email).toContain('@');
    expect(user.password.length).toBeGreaterThan(8);
    expect(user.name).toBeTruthy();
  });

  test('should use job factory', async ({ jobFactory }) => {
    const jobs = jobFactory.createMany(3);

    expect(jobs).toHaveLength(3);
    jobs.forEach(job => {
      expect(job.url).toContain('http');
    });
  });
});
