import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Manual Review page
 * Provides selectors and helper methods for E2E tests
 */
export class ManualReviewPage {
  readonly page: Page;

  // Main page elements
  readonly pageTitle: Locator;
  readonly queueTable: Locator;
  readonly queueStatusCard: Locator;

  // Table elements
  readonly tableRows: Locator;
  readonly urlColumn: Locator;
  readonly confidenceScoreColumn: Locator;
  readonly confidenceBandColumn: Locator;
  readonly queuedAtColumn: Locator;
  readonly staleBadge: Locator;
  readonly actionButtons: Locator;

  // Filter controls
  readonly staleItemsCheckbox: Locator;
  readonly searchInput: Locator;
  readonly bandFilter: Locator;
  readonly refreshButton: Locator;

  // Pagination controls
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageInfo: Locator;

  // Review Dialog elements
  readonly reviewDialog: Locator;
  readonly dialogUrl: Locator;
  readonly dialogConfidenceScore: Locator;
  readonly dialogFactorBreakdown: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly notesTextarea: Locator;
  readonly submitReviewButton: Locator;
  readonly cancelButton: Locator;

  // Factor breakdown sections (within dialog)
  readonly layer1Section: Locator;
  readonly layer2Section: Locator;
  readonly layer3Section: Locator;
  readonly factorIndicators: Locator;

  // Status messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main page elements
    this.pageTitle = page.getByRole('heading', { name: /manual review/i });
    this.queueTable = page.getByRole('table');
    this.queueStatusCard = page.getByTestId('queue-status-card');

    // Table elements
    this.tableRows = this.queueTable.locator('tbody tr');
    this.urlColumn = page.getByRole('cell', { name: /https?:\/\// });
    this.confidenceScoreColumn = page.getByTestId('confidence-score');
    this.confidenceBandColumn = page.getByTestId('confidence-band');
    this.queuedAtColumn = page.getByTestId('queued-at');
    this.staleBadge = page.getByTestId('stale-badge');
    this.actionButtons = page.getByRole('button', { name: /review/i });

    // Filter controls
    this.staleItemsCheckbox = page.getByLabel(/stale items only/i);
    this.searchInput = page.getByPlaceholder(/search urls/i);
    this.bandFilter = page.getByLabel(/filter by band/i);
    this.refreshButton = page.getByRole('button', { name: /refresh/i });

    // Pagination controls
    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.pageInfo = page.getByTestId('page-info');

    // Review Dialog elements
    this.reviewDialog = page.getByRole('dialog');
    this.dialogUrl = this.reviewDialog.getByTestId('review-url');
    this.dialogConfidenceScore = this.reviewDialog.getByTestId('review-confidence-score');
    this.dialogFactorBreakdown = this.reviewDialog.getByTestId('factor-breakdown');
    this.approveButton = this.reviewDialog.getByRole('button', { name: /approve/i });
    this.rejectButton = this.reviewDialog.getByRole('button', { name: /reject/i });
    this.notesTextarea = this.reviewDialog.getByLabel(/notes/i);
    this.submitReviewButton = this.reviewDialog.getByRole('button', { name: /submit/i });
    this.cancelButton = this.reviewDialog.getByRole('button', { name: /cancel/i });

    // Factor breakdown sections
    this.layer1Section = this.dialogFactorBreakdown.getByTestId('layer1-section');
    this.layer2Section = this.dialogFactorBreakdown.getByTestId('layer2-section');
    this.layer3Section = this.dialogFactorBreakdown.getByTestId('layer3-section');
    this.factorIndicators = this.dialogFactorBreakdown.getByTestId('factor-indicator');

    // Status messages
    this.successMessage = page.getByRole('alert').filter({ hasText: /success/i });
    this.errorMessage = page.getByRole('alert').filter({ hasText: /error/i });
    this.emptyStateMessage = page.getByText(/no items in queue/i);
  }

  /**
   * Navigate to the Manual Review page
   */
  async goto() {
    await this.page.goto('/manual-review');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for the queue table to load
   */
  async waitForTableLoad() {
    await this.queueTable.waitFor({ state: 'visible' });
  }

  /**
   * Get the number of items in the queue table
   */
  async getQueueItemCount(): Promise<number> {
    const rows = await this.tableRows.count();
    return rows;
  }

  /**
   * Click the review button for a specific row
   */
  async clickReviewButton(rowIndex: number = 0) {
    const row = this.tableRows.nth(rowIndex);
    const reviewButton = row.getByRole('button', { name: /review/i });
    await reviewButton.click();
    await this.reviewDialog.waitFor({ state: 'visible' });
  }

  /**
   * Open review dialog for a URL by its text
   */
  async openReviewDialogForUrl(url: string) {
    const row = this.tableRows.filter({ hasText: url }).first();
    const reviewButton = row.getByRole('button', { name: /review/i });
    await reviewButton.click();
    await this.reviewDialog.waitFor({ state: 'visible' });
  }

  /**
   * Approve the current item in the review dialog
   */
  async approveCurrentItem(notes?: string) {
    await this.approveButton.click();
    if (notes) {
      await this.notesTextarea.fill(notes);
    }
    await this.submitReviewButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Reject the current item in the review dialog
   */
  async rejectCurrentItem(notes: string) {
    await this.rejectButton.click();
    await this.notesTextarea.fill(notes);
    await this.submitReviewButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Close the review dialog without submitting
   */
  async closeReviewDialog() {
    await this.cancelButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Enable the "Stale Items Only" filter
   */
  async filterByStaleItems() {
    await this.staleItemsCheckbox.check();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Search for a URL in the queue
   */
  async searchForUrl(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filter by confidence band
   */
  async filterByBand(band: string) {
    await this.bandFilter.selectOption(band);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Refresh the queue table
   */
  async refreshQueue() {
    await this.refreshButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the queue status metrics (count, stale count, etc.)
   */
  async getQueueStatus(): Promise<{ total: number; stale: number }> {
    const statusText = await this.queueStatusCard.textContent();

    // Parse the status card text to extract metrics
    // Example format: "12 items in queue (2 stale)"
    const totalMatch = statusText?.match(/(\d+)\s+items/);
    const staleMatch = statusText?.match(/\((\d+)\s+stale\)/);

    return {
      total: totalMatch ? parseInt(totalMatch[1], 10) : 0,
      stale: staleMatch ? parseInt(staleMatch[1], 10) : 0,
    };
  }

  /**
   * Verify that a URL appears in the results table (not in queue anymore)
   */
  async verifyUrlInResultsTable(url: string, expectedStatus: 'approved' | 'rejected') {
    // Navigate to results page
    await this.page.goto('/results');
    await this.page.waitForLoadState('networkidle');

    const resultsTable = this.page.getByRole('table');
    const row = resultsTable.locator('tbody tr').filter({ hasText: url }).first();

    const statusCell = row.getByTestId('status');
    await statusCell.waitFor({ state: 'visible' });

    const statusText = await statusCell.textContent();
    return statusText?.toLowerCase().includes(expectedStatus);
  }

  /**
   * Check if a specific factor indicator is present in the breakdown
   */
  async hasFactorIndicator(factorName: string, passed: boolean): Promise<boolean> {
    const indicator = this.factorIndicators.filter({ hasText: factorName }).first();
    await indicator.waitFor({ state: 'visible' });

    const icon = passed
      ? indicator.locator('[data-status="passed"]')
      : indicator.locator('[data-status="failed"]');

    return await icon.isVisible();
  }

  /**
   * Get all visible factor breakdown sections
   */
  async getVisibleFactorSections(): Promise<string[]> {
    const sections: string[] = [];

    if (await this.layer1Section.isVisible()) {
      sections.push('Layer 1: Domain Analysis');
    }
    if (await this.layer2Section.isVisible()) {
      sections.push('Layer 2: Guest Post Red Flags');
    }
    if (await this.layer3Section.isVisible()) {
      sections.push('Layer 3: Sophistication Signals');
    }

    return sections;
  }

  /**
   * Navigate to the next page of results
   */
  async goToNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to the previous page of results
   */
  async goToPreviousPage() {
    await this.previousPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current pagination info (e.g., "Showing 1-10 of 50")
   */
  async getPaginationInfo(): Promise<string> {
    return (await this.pageInfo.textContent()) || '';
  }
}
