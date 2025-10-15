import { Page, expect } from '@playwright/test';

/**
 * Custom assertion helpers for common test scenarios
 */

/**
 * Assert that a toast/notification message appears
 */
export async function expectToastMessage(page: Page, message: string) {
  // Adjust selector based on your toast library (e.g., sonner)
  await expect(page.locator('[data-sonner-toast]')).toContainText(message);
}

/**
 * Assert that a specific URL is loaded
 */
export async function expectUrlToBe(page: Page, url: string | RegExp) {
  await expect(page).toHaveURL(url);
}

/**
 * Assert that an element by data-testid is visible
 */
export async function expectTestIdToBeVisible(page: Page, testId: string) {
  await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible();
}

/**
 * Assert that an element by data-testid contains text
 */
export async function expectTestIdToContainText(
  page: Page,
  testId: string,
  text: string | RegExp
) {
  await expect(page.locator(`[data-testid="${testId}"]`)).toContainText(text);
}

/**
 * Assert that a table has specific row count
 */
export async function expectTableRowCount(page: Page, count: number) {
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(count);
}

/**
 * Assert loading state is complete
 */
export async function expectLoadingComplete(page: Page) {
  // Wait for common loading indicators to disappear
  await expect(
    page.locator('[data-testid="loading"], [aria-label="Loading"]')
  ).toHaveCount(0, { timeout: 10000 });
}
