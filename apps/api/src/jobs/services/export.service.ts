/**
 * ExportService - CSV Export with Streaming
 * Task T061 [Phase 5 - User Story 3]
 *
 * Handles streaming CSV export for job results with multiple format options.
 * Uses batch processing (100 rows per batch) to minimize memory usage.
 *
 * Export Formats:
 * - complete: 48 columns (10 core + 5 L1 + 10 L2 + 15 L3 + 8 other)
 * - summary: 7 columns (core + summary reason)
 * - layer1: 15 columns (10 core + 5 L1)
 * - layer2: 20-25 columns (core + L1 + L2)
 * - layer3: 25+ columns (all layers)
 *
 * Performance Target: 10k rows in < 5 seconds
 * Memory Target: < 10MB increase during export
 */

import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { JobsService } from '../jobs.service';
import { UrlResult } from '@website-scraper/shared';

/**
 * Export options interface
 */
export interface ExportOptions {
  format: 'complete' | 'summary' | 'layer1' | 'layer2' | 'layer3';
  filter?: 'approved' | 'rejected' | 'all';
  layer?: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all';
  confidence?: 'high' | 'medium' | 'low' | 'all';
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly BATCH_SIZE = 100;
  private readonly UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

  constructor(private readonly jobsService: JobsService) {}

  /**
   * Stream CSV export with batch processing
   * Main export method that returns a Node.js ReadableStream
   *
   * @param jobId - Job UUID to export
   * @param format - Export format (complete, summary, layer1, layer2, layer3)
   * @param filters - Optional filters for status, layer, confidence
   * @returns ReadableStream of CSV data with UTF-8 BOM
   */
  async streamCSVExport(
    jobId: string,
    format: 'complete' | 'summary' | 'layer1' | 'layer2' | 'layer3' = 'complete',
    filters?: {
      filter?: 'approved' | 'rejected' | 'all';
      layer?: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all';
      confidence?: 'high' | 'medium' | 'low' | 'all';
    },
  ): Promise<Readable> {
    // Validate jobId format (UUID)
    if (!this.isValidUUID(jobId)) {
      throw new Error(`Invalid job ID format: ${jobId}`);
    }

    // Validate format parameter
    const validFormats = ['complete', 'summary', 'layer1', 'layer2', 'layer3'];
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid format: ${format}. Must be one of: ${validFormats.join(', ')}`);
    }

    this.logger.log(`Starting CSV export for job ${jobId} with format: ${format}`);

    // Create readable stream
    const stream = new Readable({
      read() {
        // No-op, we'll push data manually
      },
    });

    // Start streaming process asynchronously
    this.processStreamExport(stream, jobId, format, filters).catch((error) => {
      this.logger.error(`Export stream error: ${error.message}`, error.stack);
      stream.destroy(error);
    });

    return stream;
  }

  /**
   * Internal method to process export in batches and stream to output
   */
  private async processStreamExport(
    stream: Readable,
    jobId: string,
    format: string,
    filters?: {
      filter?: 'approved' | 'rejected' | 'all';
      layer?: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all';
      confidence?: 'high' | 'medium' | 'low' | 'all';
    },
  ): Promise<void> {
    try {
      // Verify job exists
      const job = await this.jobsService.getJobById(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Emit UTF-8 BOM for Excel compatibility
      stream.push(this.UTF8_BOM);

      // Emit header row
      const headers = this.getColumnHeaders(format);
      const headerRow = this.formatCSVRow(headers);
      stream.push(headerRow + '\r\n');

      // Process results in batches
      let page = 1;
      let hasMoreResults = true;

      while (hasMoreResults) {
        try {
          const result = await this.jobsService.getJobResults(
            jobId,
            page,
            this.BATCH_SIZE,
            filters?.filter,
            filters?.layer,
            filters?.confidence,
          );

          const { results, pagination } = result;

          // Process each result in the batch
          for (const urlResult of results) {
            const rowValues = this.generateRowValues(urlResult, format);
            const rowString = this.formatCSVRow(rowValues);
            stream.push(rowString + '\r\n');
          }

          // Check if more pages exist
          hasMoreResults = page < pagination.pages;
          page++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error fetching batch at page ${page}: ${errorMessage}`);
          throw error;
        }
      }

      // End stream
      stream.push(null);
      this.logger.log(`CSV export completed for job ${jobId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Export processing error: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get column headers based on export format
   * Returns array of column names
   *
   * @param format - Export format
   * @returns Array of column header names
   */
  private getColumnHeaders(format: string): string[] {
    const coreColumns = [
      'URL',
      'Status',
      'Confidence Score',
      'Confidence Band',
      'Eliminated At Layer',
      'Processing Time (ms)',
      'Total Cost (USD)',
      'Layer 1 Passed',
      'Layer 2 Passed',
      'Layer 3 Passed',
    ];

    const layer1Columns = [
      'L1: TLD Type',
      'L1: TLD Value',
      'L1: Domain Classification',
      'L1: Pattern Matches',
      'L1: Target Profile Type',
    ];

    const layer2Columns = [
      'L2: Publication Score',
      'L2: Product Offering Score',
      'L2: Layout Quality Score',
      'L2: Navigation Complexity Score',
      'L2: Monetization Indicators Score',
      'L2: Keywords Found',
      'L2: Ad Networks Detected',
      'L2: Has Blog',
      'L2: Has Press Releases',
      'L2: Reasoning',
    ];

    const layer3Columns = [
      'L3: Classification',
      'L3: Design Quality Score',
      'L3: Design Quality Indicators',
      'L3: Authority Indicators Score',
      'L3: Authority Indicators',
      'L3: Professional Presentation Score',
      'L3: Presentation Indicators',
      'L3: Content Originality Score',
      'L3: Originality Indicators',
      'L3: LLM Provider',
      'L3: LLM Model',
      'L3: LLM Cost (USD)',
      'L3: Reasoning',
      'L3: Tokens Input',
      'L3: Tokens Output',
    ];

    const metadataColumns = [
      'Job ID',
      'URL ID',
      'Retry Count',
      'Last Error',
      'Processed At',
      'Created At',
      'Updated At',
      'Reviewer Notes',
    ];

    switch (format) {
      case 'complete':
        // 48 columns: 10 core + 5 L1 + 10 L2 + 15 L3 + 8 metadata
        return [
          ...coreColumns,
          ...layer1Columns,
          ...layer2Columns,
          ...layer3Columns,
          ...metadataColumns,
        ];

      case 'summary':
        // 7 columns: core info + summary reason
        return [
          'URL',
          'Status',
          'Confidence Score',
          'Eliminated At Layer',
          'Processing Time (ms)',
          'Total Cost (USD)',
          'Summary Reason',
        ];

      case 'layer1':
        // 15 columns: 10 core + 5 L1
        return [...coreColumns, ...layer1Columns];

      case 'layer2':
        // 20-25 columns: 10 core + 5 L1 + 10 L2
        return [...coreColumns, ...layer1Columns, ...layer2Columns];

      case 'layer3':
        // 25+ columns: all layers
        return [...coreColumns, ...layer1Columns, ...layer2Columns, ...layer3Columns];

      default:
        return coreColumns;
    }
  }

  /**
   * Generate row values based on format and URL result
   * This is a stub that will be implemented in T062-T064
   *
   * @param result - URL result record
   * @param format - Export format
   * @returns Array of values for CSV row
   */
  private generateRowValues(
    result: UrlResult,
    format: string,
  ): Array<string | null | undefined> {
    // TODO: Implement in T062-T064
    // For now, return placeholder values matching column count
    const headers = this.getColumnHeaders(format);
    return headers.map(() => '');
  }

  /**
   * Escape a single CSV field per RFC 4180
   * Handles commas, quotes, newlines, carriage returns
   *
   * RFC 4180 Rules:
   * 1. Comma (,) in value -> Wrap in quotes
   * 2. Double quote (") in value -> Escape with "" + wrap in quotes
   * 3. Newline (\n) in value -> Wrap in quotes
   * 4. Carriage return (\r) in value -> Wrap in quotes
   *
   * @param value - Value to escape
   * @returns Escaped CSV field
   */
  escapeCSVField(value: string | null | undefined): string {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Convert to string
    const stringValue = String(value);

    // Return empty string if empty
    if (stringValue === '') {
      return '';
    }

    // Check if escaping is needed (contains comma, quote, newline, or carriage return)
    const needsEscaping =
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r');

    if (!needsEscaping) {
      return stringValue;
    }

    // Escape double quotes by doubling them
    const escapedValue = stringValue.replace(/"/g, '""');

    // Wrap in quotes
    return `"${escapedValue}"`;
  }

  /**
   * Format array of values as CSV row
   * Calls escapeCSVField for each value and joins with commas
   *
   * @param values - Array of values
   * @returns Formatted CSV row (without newline)
   */
  formatCSVRow(values: Array<string | null | undefined>): string {
    return values.map((value) => this.escapeCSVField(value)).join(',');
  }

  /**
   * Generate CSV with UTF-8 BOM and CRLF line endings
   * For Excel compatibility
   *
   * @param rows - Array of CSV rows
   * @returns Complete CSV string with BOM and CRLF
   */
  generateCSVWithBOM(rows: string[]): string {
    // UTF-8 BOM character
    const BOM = '\uFEFF';

    // Join rows with CRLF line endings
    const content = rows.join('\r\n');

    // Add BOM at start
    return BOM + content;
  }

  /**
   * Validate UUID format
   * @param uuid - String to validate
   * @returns true if valid UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
