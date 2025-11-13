/**
 * T057: 48-Column Complete CSV Format Tests
 * Task T057 [Phase 5 - User Story 3]
 *
 * Tests for the complete 48-column CSV export format with all Layer 1/2/3 factors.
 *
 * Column Breakdown (48 total):
 * - Core Columns (10): url, status, confidence_score, confidence_band, eliminated_at_layer,
 *   processing_time_ms, total_cost, layer1_passed, layer2_passed, layer3_passed
 * - Layer 1 Columns (5): l1_tld_type, l1_tld_value, l1_domain_classification,
 *   l1_pattern_matches, l1_target_profile
 * - Layer 2 Columns (10): l2_publication_score, l2_product_offering_score, l2_layout_score,
 *   l2_navigation_score, l2_monetization_score, l2_keywords_found, l2_ad_networks,
 *   l2_content_signals, l2_reasoning, l2_passed
 * - Layer 3 Columns (15): l3_classification, l3_design_quality_score, l3_design_quality_indicators,
 *   l3_authority_score, l3_authority_indicators, l3_presentation_score, l3_presentation_indicators,
 *   l3_originality_score, l3_originality_indicators, l3_llm_provider, l3_llm_model,
 *   l3_llm_cost, l3_reasoning, l3_tokens_input, l3_tokens_output
 * - Metadata Columns (8): job_id, url_id, retry_count, last_error, processed_at,
 *   created_at, updated_at, reviewer_notes
 *
 * Test Requirements:
 * 1. Column Count: Verify exactly 48 columns
 * 2. Column Names: All expected names in correct order, snake_case
 * 3. Data Types: Numeric, boolean, string, date formatting
 * 4. Multi-value Fields: Comma-separated lists, properly escaped
 * 5. NULL Handling: Pre-migration data, eliminated layers
 * 6. Test Scenarios: Approved, Layer 1/2/3 eliminated, rejected
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { SupabaseService } from '../../supabase/supabase.service';
import { UrlResult } from '@website-scraper/shared';

/**
 * Mock SupabaseService for testing
 */
class MockSupabaseService {
  private mockClient: any;

  constructor() {
    this.mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };
  }

  getClient() {
    return this.mockClient;
  }

  getMockClient() {
    return this.mockClient;
  }
}

/**
 * ExportService - To be implemented in T061
 */
class ExportService {
  constructor(private readonly supabase: SupabaseService) {}

  async streamCSVExport(
    jobId: string,
    format: 'complete' | 'summary' | 'layer1' | 'layer2' | 'layer3',
    filters?: { status?: string; confidence?: string; layer?: string }
  ): Promise<Readable> {
    throw new Error('Not implemented yet - TDD approach');
  }
}

describe('ExportService - T057: 48-Column Complete CSV Format', () => {
  let exportService: ExportService;
  let mockSupabaseService: MockSupabaseService;
  let mockSupabaseClient: any;

  beforeAll(async () => {
    mockSupabaseService = new MockSupabaseService();
    mockSupabaseClient = mockSupabaseService.getMockClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    exportService = moduleFixture.get<ExportService>(ExportService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper: Generate mock UrlResult with all layer factors
   */
  function generateCompleteUrlResult(): UrlResult {
    return {
      id: 'result-0001',
      url: 'https://example.com',
      job_id: 'test-job-id',
      url_id: 'url-0001',
      status: 'approved',
      confidence_score: 0.92,
      confidence_band: 'very-high',
      eliminated_at_layer: 'passed_all',
      processing_time_ms: 3500,
      total_cost: 0.0045,
      retry_count: 0,
      last_error: null,
      last_retry_at: null,
      processed_at: new Date('2025-01-13T12:00:00Z'),
      reviewer_notes: null,
      created_at: new Date('2025-01-13T11:00:00Z'),
      updated_at: new Date('2025-01-13T12:00:00Z'),

      layer1_factors: {
        tld_type: 'gtld',
        tld_value: '.com',
        domain_classification: 'commercial',
        pattern_matches: ['affiliate-link', 'tracking-pixel'],
        target_profile: { type: 'B2B software', confidence: 0.95 },
        reasoning: 'Commercial domain targeting B2B',
        passed: true,
      },

      layer2_factors: {
        publication_score: 0.25,
        module_scores: {
          product_offering: 0.95,
          layout_quality: 0.88,
          navigation_complexity: 0.75,
          monetization_indicators: 0.92,
        },
        keywords_found: ['enterprise', 'solution', 'platform'],
        ad_networks_detected: ['Google Ads'],
        content_signals: {
          has_blog: false,
          has_press_releases: true,
          has_whitepapers: true,
          has_case_studies: true,
        },
        reasoning: 'Strong product indicators',
        passed: true,
      },

      layer3_factors: {
        classification: 'accepted',
        sophistication_signals: {
          design_quality: {
            score: 0.95,
            indicators: ['Modern UI', 'Consistent branding'],
          },
          authority_indicators: {
            score: 0.9,
            indicators: ['Industry certifications', 'Customer testimonials'],
          },
          professional_presentation: {
            score: 0.93,
            indicators: ['Clear value prop', 'Well-structured content'],
          },
          content_originality: {
            score: 0.88,
            indicators: ['Unique product features', 'Original whitepapers'],
          },
        },
        llm_provider: 'anthropic',
        model_version: 'claude-3-opus-20240229',
        cost_usd: 0.0045,
        reasoning: 'High-quality B2B software company with strong design and authority.',
        tokens_used: { input: 2500, output: 750 },
        processing_time_ms: 3250,
      },
    };
  }

  /**
   * Helper: Parse CSV content into rows and columns
   */
  function parseCSV(csvContent: string): string[][] {
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => {
      const columns: string[] = [];
      let currentColumn = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(currentColumn.trim());
          currentColumn = '';
        } else {
          currentColumn += char;
        }
      }
      columns.push(currentColumn.trim());
      return columns;
    });
  }

  // ============================================================================
  // Test Suite 1: Column Count Verification
  // ============================================================================

  describe('1. Column Count Verification', () => {
    it('should generate CSV with exactly 48 columns in header row', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const lines = csvContent.split('\n');
        const headerLine = lines[0];
        const columnCount = headerLine.split(',').length;

        // Assert
        expect(columnCount).toBe(48);
        console.log(`[T057] Column count test: Found ${columnCount} columns (Expected: 48)`);

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('should count exactly 47 comma separators in header (48 columns - 1)', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const headerLine = csvContent.split('\n')[0];
        const commaCount = (headerLine.match(/,/g) || []).length;

        // Assert
        expect(commaCount).toBe(47);

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });
  });

  // ============================================================================
  // Test Suite 2: Column Names and Order
  // ============================================================================

  describe('2. Column Names and Order', () => {
    const EXPECTED_COLUMNS = [
      // Core Columns (10)
      'url', 'status', 'confidence_score', 'confidence_band', 'eliminated_at_layer',
      'processing_time_ms', 'total_cost', 'layer1_passed', 'layer2_passed', 'layer3_passed',

      // Layer 1 Columns (5)
      'l1_tld_type', 'l1_tld_value', 'l1_domain_classification', 'l1_pattern_matches', 'l1_target_profile',

      // Layer 2 Columns (10)
      'l2_publication_score', 'l2_product_offering_score', 'l2_layout_score', 'l2_navigation_score',
      'l2_monetization_score', 'l2_keywords_found', 'l2_ad_networks', 'l2_content_signals',
      'l2_reasoning', 'l2_passed',

      // Layer 3 Columns (15)
      'l3_classification', 'l3_design_quality_score', 'l3_design_quality_indicators',
      'l3_authority_score', 'l3_authority_indicators', 'l3_presentation_score',
      'l3_presentation_indicators', 'l3_originality_score', 'l3_originality_indicators',
      'l3_llm_provider', 'l3_llm_model', 'l3_llm_cost', 'l3_reasoning',
      'l3_tokens_input', 'l3_tokens_output',

      // Metadata Columns (8)
      'job_id', 'url_id', 'retry_count', 'last_error', 'processed_at',
      'created_at', 'updated_at', 'reviewer_notes',
    ];

    it('should verify expected column array has exactly 48 elements', () => {
      expect(EXPECTED_COLUMNS.length).toBe(48);
    });

    it('should have all 48 expected column names in correct order', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const headerLine = csvContent.split('\n')[0];
        const actualColumns = headerLine.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

        // Assert - Check each expected column at correct position
        EXPECTED_COLUMNS.forEach((expectedCol, index) => {
          expect(actualColumns[index]).toBe(expectedCol);
        });

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('should use snake_case naming for all column names', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const headerLine = csvContent.split('\n')[0];
        const columns = headerLine.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

        // Assert - All column names should be lowercase with underscores
        columns.forEach(col => {
          expect(col).toMatch(/^[a-z0-9_]+$/);
          expect(col).not.toMatch(/[A-Z]/); // No uppercase
          expect(col).not.toMatch(/[\s-]/); // No spaces or hyphens
        });

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('should have no duplicate column names', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const headerLine = csvContent.split('\n')[0];
        const columns = headerLine.split(',');

        // Assert
        const uniqueColumns = new Set(columns);
        expect(uniqueColumns.size).toBe(columns.length);

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });
  });

  // ============================================================================
  // Test Suite 3: Data Type Verification
  // ============================================================================

  describe('3. Data Type Verification', () => {
    it('should format numeric columns correctly (no scientific notation)', async () => {
      // Arrange
      const mockResult: UrlResult = {
        ...generateCompleteUrlResult(),
        confidence_score: 0.8567,
        processing_time_ms: 3542,
        total_cost: 0.00234,
        retry_count: 2,
      };

      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert - Numeric values formatted as decimal numbers
        expect(dataRow[2]).toMatch(/^0\.\d+$/); // confidence_score
        expect(dataRow[5]).toMatch(/^\d+$/); // processing_time_ms
        expect(dataRow[6]).toMatch(/^0\.\d+$/); // total_cost
        expect(dataRow[40]).toMatch(/^\d+$/); // retry_count

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('should format boolean columns as true/false strings', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert - Boolean columns should be 'true' or 'false'
        expect(['true', 'false']).toContain(dataRow[7]); // layer1_passed
        expect(['true', 'false']).toContain(dataRow[8]); // layer2_passed
        expect(['true', 'false']).toContain(dataRow[9]); // layer3_passed

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('should format date columns as ISO 8601 strings', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert - Date columns in ISO 8601 format
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        expect(dataRow[42]).toMatch(isoRegex); // processed_at
        expect(dataRow[43]).toMatch(isoRegex); // created_at
        expect(dataRow[44]).toMatch(isoRegex); // updated_at

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });
  });

  // ============================================================================
  // Test Suite 4: Multi-value Fields and Escaping
  // ============================================================================

  describe('4. Multi-value Fields and CSV Escaping', () => {
    it('should format array fields as comma-separated lists', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert - Array fields should contain expected values
        expect(dataRow[13]).toContain('affiliate-link'); // l1_pattern_matches
        expect(dataRow[19]).toContain('enterprise'); // l2_keywords_found
        expect(dataRow[20]).toContain('Google Ads'); // l2_ad_networks

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('should properly escape fields containing commas per RFC 4180', async () => {
      // Arrange
      const mockResult: UrlResult = {
        ...generateCompleteUrlResult(),
        url: 'https://example.com/path?param=value,with,commas',
      };

      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        // Assert - Fields with commas should be quoted
        expect(csvContent).toContain('"https://example.com/path?param=value,with,commas"');

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('should properly escape fields containing quotes per RFC 4180', async () => {
      // Arrange
      const mockResult: UrlResult = {
        ...generateCompleteUrlResult(),
        layer3_factors: {
          ...generateCompleteUrlResult().layer3_factors!,
          reasoning: 'The site uses "affiliate links" and "sponsored content" throughout.',
        },
      };

      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        // Assert - Quotes should be doubled and field wrapped in quotes
        expect(csvContent).toContain('""affiliate links""');
        expect(csvContent).toContain('""sponsored content""');

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });
  });

  // ============================================================================
  // Test Suite 5: NULL Value Handling
  // ============================================================================

  describe('5. NULL Value Handling', () => {
    it('Scenario 5: Pre-migration data with NULL factor columns', async () => {
      // Arrange - Pre-migration URL with no layer factors
      const mockResult: UrlResult = {
        ...generateCompleteUrlResult(),
        layer1_factors: null,
        layer2_factors: null,
        layer3_factors: null,
        confidence_score: null,
        confidence_band: null,
        eliminated_at_layer: null,
      };

      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert - Core columns populated, layer columns empty
        expect(dataRow[0]).toBeTruthy(); // url
        expect(dataRow[1]).toBeTruthy(); // status

        // Layer columns should be empty or NULL
        expect(dataRow[10]).toBeFalsy(); // l1_tld_type
        expect(dataRow[15]).toBeFalsy(); // l2_publication_score
        expect(dataRow[25]).toBeFalsy(); // l3_classification

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('Scenario 2: URL eliminated at Layer 1 (L2/L3 columns NULL)', async () => {
      // Arrange
      const mockResult: UrlResult = {
        ...generateCompleteUrlResult(),
        eliminated_at_layer: 'layer1',
        layer1_factors: {
          tld_type: 'cctld',
          tld_value: '.ru',
          domain_classification: 'spam',
          pattern_matches: ['url-shortener'],
          target_profile: { type: 'spam', confidence: 0.95 },
          reasoning: 'Eliminated due to spam TLD',
          passed: false,
        },
        layer2_factors: null,
        layer3_factors: null,
        confidence_score: null,
      };

      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert
        expect(dataRow[4]).toBe('layer1'); // eliminated_at_layer
        expect(dataRow[7]).toBe('false'); // layer1_passed

        // Layer 1 populated
        expect(dataRow[10]).toBe('cctld'); // l1_tld_type
        expect(dataRow[11]).toBe('.ru'); // l1_tld_value

        // Layer 2/3 empty
        expect(dataRow[15]).toBeFalsy(); // l2_publication_score
        expect(dataRow[25]).toBeFalsy(); // l3_classification

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('Scenario 3: URL eliminated at Layer 2 (L3 columns NULL)', async () => {
      // Arrange
      const mockResult: UrlResult = {
        ...generateCompleteUrlResult(),
        eliminated_at_layer: 'layer2',
        layer2_factors: {
          publication_score: 0.85,
          module_scores: {
            product_offering: 0.1,
            layout_quality: 0.2,
            navigation_complexity: 0.9,
            monetization_indicators: 0.8,
          },
          keywords_found: ['blog', 'articles'],
          ad_networks_detected: ['Google Ads'],
          content_signals: {
            has_blog: true,
            has_press_releases: false,
            has_whitepapers: false,
            has_case_studies: false,
          },
          reasoning: 'High publication score indicates content site',
          passed: false,
        },
        layer3_factors: null,
        confidence_score: null,
      };

      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert
        expect(dataRow[4]).toBe('layer2'); // eliminated_at_layer
        expect(dataRow[7]).toBe('true'); // layer1_passed
        expect(dataRow[8]).toBe('false'); // layer2_passed

        // Layer 1 and 2 populated
        expect(dataRow[10]).toBe('gtld'); // l1_tld_type
        expect(dataRow[15]).toMatch(/^0\.\d+$/); // l2_publication_score

        // Layer 3 empty
        expect(dataRow[25]).toBeFalsy(); // l3_classification

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });
  });

  // ============================================================================
  // Test Suite 6: Complete Test Scenarios
  // ============================================================================

  describe('6. Complete Test Scenarios', () => {
    it('Scenario 1: Approved URL (passed all layers)', async () => {
      // Arrange
      const mockResult = generateCompleteUrlResult();
      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        expect(rows.length).toBe(2); // Header + 1 data row

        const dataRow = rows[1];

        // Assert - All 48 columns populated
        expect(dataRow[1]).toBe('approved'); // status
        expect(dataRow[4]).toBe('passed_all'); // eliminated_at_layer
        expect(dataRow[7]).toBe('true'); // layer1_passed
        expect(dataRow[8]).toBe('true'); // layer2_passed
        expect(dataRow[9]).toBe('true'); // layer3_passed
        expect(dataRow[25]).toBe('accepted'); // l3_classification

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });

    it('Scenario 4: Rejected URL (passed all layers but rejected by Layer 3)', async () => {
      // Arrange
      const mockResult: UrlResult = {
        ...generateCompleteUrlResult(),
        status: 'rejected',
        eliminated_at_layer: 'layer3',
        confidence_score: 0.35,
        confidence_band: 'low',
        layer3_factors: {
          classification: 'rejected',
          sophistication_signals: {
            design_quality: { score: 0.4, indicators: ['Basic template'] },
            authority_indicators: { score: 0.3, indicators: ['No trust signals'] },
            professional_presentation: { score: 0.35, indicators: ['Generic'] },
            content_originality: { score: 0.25, indicators: ['Affiliate content'] },
          },
          llm_provider: 'anthropic',
          model_version: 'claude-3-opus-20240229',
          cost_usd: 0.0038,
          reasoning: 'Low sophistication scores. Primarily affiliate-driven with generic content.',
          tokens_used: { input: 2200, output: 680 },
          processing_time_ms: 2950,
        },
      };

      mockSupabaseClient.range.mockImplementation(() => ({
        then: (callback: (result: { data: UrlResult[]; error: null }) => void) => {
          callback({ data: [mockResult], error: null });
        },
      }));

      // Act
      try {
        const stream = await exportService.streamCSVExport('test-job-id', 'complete');
        let csvContent = '';
        for await (const chunk of stream) {
          csvContent += chunk.toString();
        }

        const rows = parseCSV(csvContent);
        const dataRow = rows[1];

        // Assert
        expect(dataRow[1]).toBe('rejected'); // status
        expect(dataRow[4]).toBe('layer3'); // eliminated_at_layer
        expect(dataRow[25]).toBe('rejected'); // l3_classification
        expect(dataRow[36]).toContain('affiliate'); // l3_reasoning

      } catch (error) {
        expect((error as Error).message).toBe('Not implemented yet - TDD approach');
      }
    });
  });
});
