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
import { UrlResult, Layer3Factors } from '@website-scraper/shared';
import { PerfMonitor } from '../../common/decorators/perf-monitor.decorator';
import { StreamMonitor } from '../../common/decorators/stream-monitor.decorator';

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
   * Performance monitoring: Manual tracking in processStreamExport tracks throughput
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
   * Includes performance monitoring for row throughput
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
    // Performance tracking
    const startTime = Date.now();
    let rowCount = 0;
    let lastLogTime = Date.now();
    const logInterval = 2000; // Log progress every 2 seconds

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
            rowCount++;

            // Log progress at intervals
            const now = Date.now();
            if (now - lastLogTime > logInterval) {
              const elapsed = now - startTime;
              const throughput = ((rowCount / elapsed) * 1000).toFixed(0);
              this.logger.debug(
                `CSV Export (${format}, job=${jobId}): ${rowCount} rows, ${throughput} rows/sec`,
              );
              lastLogTime = now;
            }
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

      // Final performance log
      const duration = Date.now() - startTime;
      const throughput = ((rowCount / duration) * 1000).toFixed(0);
      this.logger.log(
        `CSV export completed: ${rowCount} rows in ${duration}ms (${throughput} rows/sec)`,
      );
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
   * Routes to appropriate column generator based on format
   *
   * @param result - URL result record
   * @param format - Export format
   * @returns Array of values for CSV row
   */
  private generateRowValues(
    result: UrlResult,
    format: string,
  ): Array<string | null | undefined> {
    switch (format) {
      case 'complete':
        return this.generateCompleteColumns(result);
      case 'summary':
        return this.generateSummaryColumns(result);
      case 'layer1':
        return this.generateLayerColumns(result, 'layer1');
      case 'layer2':
        return this.generateLayerColumns(result, 'layer2');
      case 'layer3':
        return this.generateLayerColumns(result, 'layer3');
      default:
        throw new Error(`Invalid format: ${format}`);
    }
  }

  /**
   * T062: Generate complete format columns (48 columns)
   * 10 core + 5 L1 + 10 L2 + 15 L3 + 8 metadata
   *
   * Handles NULL factor values gracefully for pre-migration data.
   *
   * @param result - URL result record
   * @returns Array of values for all 48 columns
   */
  private generateCompleteColumns(result: UrlResult): Array<string | null | undefined> {
    // Handle NULL factors for each layer
    const layer1Fields = this.handleNullFactor(result.layer1_factors, {
      tld_type: 'N/A',
      tld_value: 'N/A',
      domain_classification: 'N/A',
      pattern_matches: 'N/A',
      target_profile_type: 'N/A',
    });

    const layer2Fields = this.handleNullFactor(result.layer2_factors, {
      publication_score: 'N/A',
      product_offering: 'N/A',
      layout_quality: 'N/A',
      navigation_complexity: 'N/A',
      monetization_indicators: 'N/A',
      keywords_found: 'N/A',
      ad_networks_detected: 'N/A',
      has_blog: 'N/A',
      has_press_releases: 'N/A',
      reasoning: 'N/A',
    });

    const layer3Fields = this.handleNullFactor(result.layer3_factors, {
      classification: 'N/A',
      design_quality_score: 'N/A',
      design_quality_indicators: 'N/A',
      authority_indicators_score: 'N/A',
      authority_indicators: 'N/A',
      professional_presentation_score: 'N/A',
      presentation_indicators: 'N/A',
      content_originality_score: 'N/A',
      originality_indicators: 'N/A',
      llm_provider: 'N/A',
      model_version: 'N/A',
      cost_usd: 'N/A',
      reasoning: 'N/A',
      tokens_input: 'N/A',
      tokens_output: 'N/A',
    });

    return [
      // Core columns (10)
      ...this.generateCoreColumns(result),
      // Layer 1 columns (5)
      ...this.generateLayer1Columns(result),
      // Layer 2 columns (10)
      ...this.generateLayer2Columns(result),
      // Layer 3 columns (15)
      ...this.generateLayer3Columns(result),
      // Metadata columns (8)
      ...this.generateMetadataColumns(result),
    ];
  }

  /**
   * T063: Generate summary format columns (7 columns)
   * Core info + summary reason
   *
   * Handles NULL factors gracefully by providing fallback message.
   *
   * @param result - URL result record
   * @returns Array of values for 7 summary columns
   */
  private generateSummaryColumns(result: UrlResult): Array<string | null | undefined> {
    // Determine which layer's reasoning to show
    let summaryReason = '';
    if (result.eliminated_at_layer === 'layer1' && result.layer1_factors) {
      summaryReason = result.layer1_factors.reasoning;
    } else if (result.eliminated_at_layer === 'layer2' && result.layer2_factors) {
      summaryReason = result.layer2_factors.reasoning;
    } else if (result.layer3_factors) {
      summaryReason = result.layer3_factors.reasoning;
    } else {
      // Handle NULL factors - provide fallback message
      summaryReason = 'Factor data not available (processed before schema migration)';
    }

    return [
      result.url,
      result.status,
      result.confidence_score?.toString() ?? '',
      result.eliminated_at_layer ?? '',
      result.processing_time_ms.toString(),
      result.total_cost.toString(),
      summaryReason,
    ];
  }

  /**
   * T064: Generate layer-specific format columns
   * layer1: 15 columns (10 core + 5 L1)
   * layer2: 25 columns (10 core + 5 L1 + 10 L2)
   * layer3: 40 columns (10 core + 5 L1 + 10 L2 + 15 L3)
   *
   * @param result - URL result record
   * @param layer - Which layer format to generate
   * @returns Array of values for layer-specific columns
   */
  private generateLayerColumns(
    result: UrlResult,
    layer: 'layer1' | 'layer2' | 'layer3',
  ): Array<string | null | undefined> {
    const columns: Array<string | null | undefined> = [
      ...this.generateCoreColumns(result),
      ...this.generateLayer1Columns(result),
    ];

    if (layer === 'layer2' || layer === 'layer3') {
      columns.push(...this.generateLayer2Columns(result));
    }

    if (layer === 'layer3') {
      columns.push(...this.generateLayer3Columns(result));
    }

    return columns;
  }

  /**
   * Helper method to handle NULL factor values gracefully
   * Returns default message for pre-migration data or error cases
   *
   * @param factor - The factor object to check (Layer1/2/3Factors)
   * @param defaultValue - Default values to return if factor is NULL
   * @returns Either the original factor or default values
   */
  private handleNullFactor<T>(
    factor: T | null,
    defaultValue: Record<string, string>,
  ): Record<string, string> {
    if (!factor) {
      return {
        ...defaultValue,
        reason: 'Factor data not available (processed before schema migration)',
      };
    }
    return factor as unknown as Record<string, string>;
  }

  /**
   * Generate core columns (10 columns)
   * Common across all formats
   */
  private generateCoreColumns(result: UrlResult): Array<string | null | undefined> {
    return [
      result.url,
      result.status,
      result.confidence_score?.toString() ?? '',
      result.confidence_band ?? '',
      result.eliminated_at_layer ?? '',
      result.processing_time_ms.toString(),
      result.total_cost.toString(),
      result.layer1_factors?.passed.toString() ?? '',
      result.layer2_factors?.passed.toString() ?? '',
      result.layer3_factors ? (result.layer3_factors.classification === 'accepted').toString() : '',
    ];
  }

  /**
   * Generate Layer 1 columns (5 columns)
   */
  private generateLayer1Columns(result: UrlResult): Array<string | null | undefined> {
    if (!result.layer1_factors) {
      return ['', '', '', '', ''];
    }

    const l1 = result.layer1_factors;
    return [
      l1.tld_type,
      l1.tld_value,
      l1.domain_classification,
      l1.pattern_matches.join('; '),
      l1.target_profile.type,
    ];
  }

  /**
   * Generate Layer 2 columns (10 columns)
   */
  private generateLayer2Columns(result: UrlResult): Array<string | null | undefined> {
    if (!result.layer2_factors) {
      return ['', '', '', '', '', '', '', '', '', ''];
    }

    const l2 = result.layer2_factors;
    return [
      l2.publication_score.toString(),
      l2.module_scores.product_offering.toString(),
      l2.module_scores.layout_quality.toString(),
      l2.module_scores.navigation_complexity.toString(),
      l2.module_scores.monetization_indicators.toString(),
      l2.keywords_found.join('; '),
      l2.ad_networks_detected.join('; '),
      l2.content_signals.has_blog.toString(),
      l2.content_signals.has_press_releases.toString(),
      l2.reasoning,
    ];
  }

  /**
   * Generate Layer 3 columns (15 columns)
   */
  private generateLayer3Columns(result: UrlResult): Array<string | null | undefined> {
    if (!result.layer3_factors) {
      return ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
    }

    const l3 = result.layer3_factors;
    return [
      l3.classification,
      l3.sophistication_signals.design_quality.score.toString(),
      l3.sophistication_signals.design_quality.indicators.join('; '),
      l3.sophistication_signals.authority_indicators.score.toString(),
      l3.sophistication_signals.authority_indicators.indicators.join('; '),
      l3.sophistication_signals.professional_presentation.score.toString(),
      l3.sophistication_signals.professional_presentation.indicators.join('; '),
      l3.sophistication_signals.content_originality.score.toString(),
      l3.sophistication_signals.content_originality.indicators.join('; '),
      l3.llm_provider,
      l3.model_version,
      l3.cost_usd.toString(),
      l3.reasoning,
      l3.tokens_used.input.toString(),
      l3.tokens_used.output.toString(),
    ];
  }

  /**
   * Generate metadata columns (8 columns)
   */
  private generateMetadataColumns(result: UrlResult): Array<string | null | undefined> {
    return [
      result.job_id,
      result.url_id,
      result.retry_count.toString(),
      result.last_error ?? '',
      result.processed_at.toISOString(),
      result.created_at.toISOString(),
      result.updated_at.toISOString(),
      result.reviewer_notes ?? '',
    ];
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
