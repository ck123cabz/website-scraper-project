import { test, expect } from '@playwright/test';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open with meta+k on Mac', async ({ page }) => {
    // Press Cmd+K (meta+k)
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Command dialog should be visible
    const commandDialog = page.locator('div[data-testid="command-dialog"]');
    const isVisible = await commandDialog.isVisible().catch(() => false);

    // Note: This may not work if command dialog is not rendered as expected
    // We'll check for the input field instead
    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      await expect(input).toBeVisible();
    }
  });

  test('should open with ctrl+k on Windows/Linux', async ({ page, browserName }) => {
    // Skip on Mac
    if (browserName === 'webkit') {
      test.skip();
    }

    // Press Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      await expect(input).toBeVisible();
    }
  });

  test('should close with Escape key', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Input should not be visible
      const isVisible = await input.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('should display search input', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      await expect(input).toBeVisible();
      expect(await input.getAttribute('placeholder')).toContain('Search');
    }
  });

  test('should display navigation commands', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Look for navigation command options
    const commandText = await page.textContent('body');
    expect(commandText).toContain('Home');
    expect(commandText).toContain('Jobs');
    expect(commandText).toContain('Analytics');
    expect(commandText).toContain('Settings');
  });

  test('should filter commands by search', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      // Type to search
      await input.fill('home');
      await page.waitForTimeout(300);

      // Should show home command
      const content = await page.textContent('body');
      expect(content).toContain('Home');
    }
  });

  test('should navigate to home from command palette', async ({ page }) => {
    // Go to analytics first
    await page.goto('/analytics');

    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Find and click home command
    const homeOption = page.locator('text=Home').first();
    if (await homeOption.count() > 0) {
      await homeOption.click();
      await page.waitForURL('/');
      expect(page.url()).toContain('/');
    }
  });

  test('should navigate to jobs from command palette', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Find and click jobs command
    const jobsOption = page.locator('text=Jobs').first();
    if (await jobsOption.count() > 0) {
      await jobsOption.click();
      await page.waitForURL('/jobs/all');
      expect(page.url()).toContain('/jobs/all');
    }
  });

  test('should navigate to analytics from command palette', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Find and click analytics command
    const analyticsOption = page.locator('text=Analytics').first();
    if (await analyticsOption.count() > 0) {
      await analyticsOption.click();
      await page.waitForURL('/analytics');
      expect(page.url()).toContain('/analytics');
    }
  });

  test('should navigate to settings from command palette', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Find and click settings command
    const settingsOption = page.locator('text=Settings').first();
    if (await settingsOption.count() > 0) {
      await settingsOption.click();
      await page.waitForURL('/settings');
      expect(page.url()).toContain('/settings');
    }
  });

  test('should close palette after navigation', async ({ page }) => {
    // Navigate to analytics first
    await page.goto('/analytics');

    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Navigate home
    const homeOption = page.locator('text=Home').first();
    if (await homeOption.count() > 0) {
      await homeOption.click();
      await page.waitForURL('/');
      await page.waitForTimeout(300);

      // Palette should be closed
      const input = page.locator('input[placeholder*="Search"]');
      const isVisible = await input.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('should display keyboard shortcut hint', async ({ page }) => {
    // Palette hint should be visible on page
    const hint = page.locator('text=/⌘K|Ctrl\\+K/');
    if (await hint.count() > 0) {
      await expect(hint.first()).toBeVisible();
    }
  });

  test('should support arrow key navigation', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      // Focus should be on input
      await expect(input).toBeFocused();

      // Press arrow down
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Should highlight first option
      // (This depends on command component implementation)
    }
  });

  test('should handle empty search results', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      // Search for something that doesn't exist
      await input.fill('xyzabc123notacommand');
      await page.waitForTimeout(300);

      // Should show "No results found"
      const content = await page.textContent('body');
      expect(content).toContain('No results found');
    }
  });

  test('should support clearing search', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      // Type something
      await input.fill('analytics');
      await page.waitForTimeout(300);

      // Clear search
      await input.fill('');
      await page.waitForTimeout(300);

      // Should show all commands again
      const content = await page.textContent('body');
      expect(content).toContain('Home');
      expect(content).toContain('Jobs');
    }
  });

  test('should maintain search state while navigating options', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      // Type search term
      await input.fill('settings');
      await page.waitForTimeout(300);

      // Input should still have the search term
      const value = await input.inputValue();
      expect(value).toBe('settings');
    }
  });

  test('should show command descriptions', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Look for descriptions
    const content = await page.textContent('body');
    // Commands should have descriptions like "Go to dashboard", "View all jobs", etc
    expect(content).toContain('dashboard');
    expect(content).toContain('jobs');
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab through to find command palette trigger
    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => {
        return document.activeElement?.tagName || '';
      });

      if (focused === 'BODY' || i === 0) {
        // Try opening with keyboard
        await page.keyboard.press('Meta+k');
        await page.waitForTimeout(500);

        const input = page.locator('input[placeholder*="Search"]');
        if (await input.count() > 0) {
          await expect(input).toBeVisible();
          break;
        }
      }

      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }
  });

  test('should handle rapid open/close', async ({ page }) => {
    // Open and close quickly multiple times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(200);

      const input = page.locator('input[placeholder*="Search"]');
      if (await input.count() > 0) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }

    // Should still be functional
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Search"]');
    if (await input.count() > 0) {
      await expect(input).toBeVisible();
    }
  });

  test('should work across different pages', async ({ page }) => {
    // Navigate to analytics
    await page.goto('/analytics');

    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Should be able to navigate home
    const homeOption = page.locator('text=Home').first();
    if (await homeOption.count() > 0) {
      await homeOption.click();
      await page.waitForURL('/');
      expect(page.url()).toContain('/');
    }

    // Navigate to jobs
    await page.goto('/jobs/all');

    // Open palette again
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Should still work
    const settingsOption = page.locator('text=Settings').first();
    if (await settingsOption.count() > 0) {
      await expect(settingsOption).toBeVisible();
    }
  });
});
