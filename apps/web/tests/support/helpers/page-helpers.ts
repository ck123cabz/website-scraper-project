import { Page, expect } from '@playwright/test';

/**
 * Helper functions for common page interactions
 * These are pure functions that take a Page object and perform common operations
 */

/**
 * Wait for a specific URL pattern
 */
export async function waitForUrl(page: Page, urlPattern: string | RegExp) {
  await page.waitForURL(urlPattern);
}

/**
 * Fill a form with data-testid selectors
 */
export async function fillFormByTestId(
  page: Page,
  fields: Record<string, string>
) {
  for (const [testId, value] of Object.entries(fields)) {
    await page.fill(`[data-testid="${testId}"]`, value);
  }
}

/**
 * Click an element by data-testid
 */
export async function clickByTestId(page: Page, testId: string) {
  await page.click(`[data-testid="${testId}"]`);
}

/**
 * Wait for an element to be visible by data-testid
 */
export async function waitForTestId(page: Page, testId: string) {
  await page.waitForSelector(`[data-testid="${testId}"]`, { state: 'visible' });
}

/**
 * Check if element exists by data-testid
 */
export async function hasTestId(page: Page, testId: string): Promise<boolean> {
  const element = await page.$(`[data-testid="${testId}"]`);
  return element !== null;
}

/**
 * Get text content by data-testid
 */
export async function getTextByTestId(
  page: Page,
  testId: string
): Promise<string> {
  const element = await page.$(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Element with data-testid="${testId}" not found`);
  }
  return (await element.textContent()) || '';
}

/**
 * Wait for API response by URL pattern
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp
) {
  return await page.waitForResponse(urlPattern);
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: unknown
) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}
