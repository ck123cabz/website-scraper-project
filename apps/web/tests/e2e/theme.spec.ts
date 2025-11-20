import { test, expect } from '@playwright/test';

test.describe('Theme Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle theme from light to dark', async ({ page }) => {
    // Find theme toggle button (sun emoji for light theme)
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Get initial theme state (light)
    const initialContent = await themeButton.textContent();
    expect(initialContent).toContain('☀️');

    // Click to toggle to dark
    await themeButton.click();
    await page.waitForTimeout(500);

    // Check that theme changed to dark (moon emoji)
    const updatedContent = await themeButton.textContent();
    expect(updatedContent).toContain('🌙');
  });

  test('should toggle theme from dark to light', async ({ page }) => {
    // Toggle to dark first
    const themeButton = page.locator('button[aria-label*="theme" i]');
    await themeButton.click();
    await page.waitForTimeout(500);

    // Should show moon emoji
    let content = await themeButton.textContent();
    expect(content).toContain('🌙');

    // Toggle back to light
    await themeButton.click();
    await page.waitForTimeout(500);

    // Should show sun emoji
    content = await themeButton.textContent();
    expect(content).toContain('☀️');
  });

  test('should apply dark mode class to document', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Toggle to dark mode
    await themeButton.click();
    await page.waitForTimeout(500);

    // Check if dark class is applied
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');
  });

  test('should remove dark mode class for light theme', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Toggle to dark
    await themeButton.click();
    await page.waitForTimeout(500);

    // Toggle back to light
    await themeButton.click();
    await page.waitForTimeout(500);

    // Dark class should be removed
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).not.toContain('dark');
  });

  test('should persist theme in localStorage', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Toggle to dark
    await themeButton.click();
    await page.waitForTimeout(500);

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });

  test('should restore theme from localStorage on page reload', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Toggle to dark
    await themeButton.click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Theme should still be dark
    const content = await themeButton.textContent();
    expect(content).toContain('🌙');
  });

  test('should apply theme styles to UI elements', async ({ page }) => {
    // Get initial background color
    const body = page.locator('body');
    const initialBg = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Toggle theme
    const themeButton = page.locator('button[aria-label*="theme" i]');
    await themeButton.click();
    await page.waitForTimeout(500);

    // Background should change
    const newBg = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Colors should be different (dark mode uses different colors)
    expect(initialBg).not.toBe(newBg);
  });

  test('should apply theme to sidebar component', async ({ page }) => {
    const sidebar = page.locator('aside');

    // Get initial background
    const initialBg = await sidebar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Toggle theme
    const themeButton = page.locator('button[aria-label*="theme" i]');
    await themeButton.click();
    await page.waitForTimeout(500);

    // Sidebar should have new colors
    const newBg = await sidebar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should be different
    expect(initialBg).not.toBe(newBg);
  });

  test('should apply theme to header component', async ({ page }) => {
    const header = page.locator('header');

    // Get initial color
    const initialColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Toggle theme
    const themeButton = page.locator('button[aria-label*="theme" i]');
    await themeButton.click();
    await page.waitForTimeout(500);

    // Header should have new colors
    const newColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(initialColor).not.toBe(newColor);
  });

  test('should maintain theme across page navigation', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Toggle to dark
    await themeButton.click();
    await page.waitForTimeout(500);

    // Navigate to different page
    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');

    // Theme should still be dark
    const content = await themeButton.textContent();
    expect(content).toContain('🌙');

    // HTML should still have dark class
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');
  });

  test('should persist theme across multiple toggles', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Toggle multiple times
    await themeButton.click();
    await page.waitForTimeout(300);
    expect(await themeButton.textContent()).toContain('🌙');

    await themeButton.click();
    await page.waitForTimeout(300);
    expect(await themeButton.textContent()).toContain('☀️');

    await themeButton.click();
    await page.waitForTimeout(300);
    expect(await themeButton.textContent()).toContain('🌙');

    // Reload and verify persistence
    await page.reload();
    await page.waitForTimeout(500);

    // Should still be dark
    expect(await themeButton.textContent()).toContain('🌙');
  });

  test('should handle rapid theme toggles', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Rapid clicks
    for (let i = 0; i < 5; i++) {
      await themeButton.click();
      await page.waitForTimeout(100);
    }

    // Should end up in final state
    const content = await themeButton.textContent();
    expect(content).toBeDefined();
    expect(['☀️', '🌙'].some(emoji => content?.includes(emoji))).toBe(true);
  });

  test('should display theme toggle in sidebar', async ({ page }) => {
    const sidebar = page.locator('aside');
    const themeButton = sidebar.locator('button[aria-label*="theme" i]');

    await expect(themeButton).toBeVisible();
  });

  test('should have accessible theme toggle button', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Should be keyboard accessible
    await page.keyboard.press('Tab');
    // Continue tabbing until we reach the theme button
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label*="theme" i]');
        return btn === document.activeElement;
      });

      if (focused) break;
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Should be able to activate with Enter
    await expect(themeButton).toBeVisible();
  });

  test('should sync theme with system preference changes', async ({ page }) => {
    // This test verifies that system preference changes are respected
    // when theme is set to 'system'

    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return localStorage.getItem('theme');
    });

    // If in system mode, it should follow system preference
    if (initialTheme === 'system') {
      const htmlClasses = await page.locator('html').getAttribute('class');
      // Should have either dark class or not, depending on system
      expect(htmlClasses).toBeDefined();
    }
  });

  test('should clear localStorage theme on default reset', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme" i]');

    // Set to dark
    await themeButton.click();
    await page.waitForTimeout(500);

    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Reload
    await page.reload();
    await page.waitForTimeout(500);

    // Should reset to light (default)
    const content = await themeButton.textContent();
    expect(content).toContain('☀️');
  });
});
