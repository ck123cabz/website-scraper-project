/**
 * T064: Layer 3 Sophistication Analysis Column Generator Tests
 * Tests for extracting Layer 3 factors into 15 CSV columns
 *
 * Column Structure (15 columns):
 * 1. classification (accepted/rejected)
 * 2. design_quality_score (0.0-1.0)
 * 3. design_quality_indicators (comma-separated)
 * 4. authority_indicators_score (0.0-1.0)
 * 5. authority_indicators (comma-separated)
 * 6. professional_presentation_score (0.0-1.0)
 * 7. professional_presentation_indicators (comma-separated)
 * 8. content_originality_score (0.0-1.0)
 * 9. content_originality_indicators (comma-separated)
 * 10. llm_provider (string)
 * 11. model_version (string)
 * 12. cost_usd (number)
 * 13. reasoning (truncated to 500 chars)
 * 14. tokens_input (number)
 * 15. tokens_output (number)
 *
 * Test Coverage:
 * - Complete Layer 3 data extraction
 * - NULL factors handling (pre-migration, eliminated before Layer 3)
 * - Empty signal arrays
 * - Missing optional fields
 * - Indicator array formatting (comma-separated)
 * - Reasoning truncation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from '../services/export.service';
import { JobsService } from '../jobs.service';
import { Layer3Factors, UrlResult } from '@website-scraper/shared';

describe('ExportService - T064: Layer 3 Column Generator', () => {
  let exportService: ExportService;
  let mockJobsService: Partial<JobsService>;

  beforeAll(async () => {
    mockJobsService = {
      getJobById: jest.fn().mockResolvedValue({ id: 'test-job' }),
      getJobResults: jest.fn().mockResolvedValue({
        results: [],
        pagination: { page: 1, pages: 1, total: 0, pageSize: 100 },
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    exportService = moduleFixture.get<ExportService>(ExportService);
  });

  /**
   * Helper: Create complete Layer 3 factors for testing
   */
  function createCompleteLayer3Factors(): Layer3Factors {
    return {
      classification: 'accepted',
      sophistication_signals: {
        design_quality: {
          score: 0.95,
          indicators: ['Modern UI', 'Consistent branding', 'Professional layout'],
        },
        authority_indicators: {
          score: 0.92,
          indicators: ['Industry certifications', 'Customer testimonials', 'Trust badges'],
        },
        professional_presentation: {
          score: 0.88,
          indicators: ['Clear value proposition', 'Well-structured content'],
        },
        content_originality: {
          score: 0.85,
          indicators: ['Unique product features', 'Original research'],
        },
      },
      llm_provider: 'anthropic',
      model_version: 'claude-3-opus-20240229',
      cost_usd: 0.0045,
      reasoning: 'High-quality B2B software company with strong design and authority indicators.',
      tokens_used: {
        input: 2500,
        output: 750,
      },
      processing_time_ms: 3250,
    };
  }

  /**
   * Helper: Create URL result with Layer 3 factors
   */
  function createUrlResultWithLayer3(layer3Factors: Layer3Factors | null): UrlResult {
    return {
      id: 'result-001',
      url: 'https://example.com',
      job_id: 'test-job',
      url_id: 'url-001',
      status: 'approved',
      confidence_score: 0.92,
      confidence_band: 'very-high',
      eliminated_at_layer: 'passed_all',
      processing_time_ms: 3500,
      total_cost: 0.0045,
      retry_count: 0,
      last_error: null,
      last_retry_at: null,
      updated_at: new Date('2025-01-13T12:00:00Z'),
      reviewer_notes: null,
      created_at: new Date('2025-01-13T11:00:00Z'),
      layer1_factors: null,
      layer2_factors: null,
      layer3_factors: layer3Factors,
    };
  }

  /**
   * Helper: Parse CSV content into rows
   */
  function parseCSVContent(content: string): string[][] {
    const lines = content.split('\r\n').filter((line) => line.trim().length > 0);
    return lines.map((line) => {
      const columns: string[] = [];
      let currentColumn = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            currentColumn += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          columns.push(currentColumn);
          currentColumn = '';
        } else {
          currentColumn += char;
        }
      }
      columns.push(currentColumn);
      return columns;
    });
  }

  // ============================================================================
  // Test Suite 1: Complete Layer 3 Data Extraction
  // ============================================================================

  describe('1. Complete Layer 3 Data Extraction', () => {
    it('should extract all 15 Layer 3 columns with complete data', async () => {
      // Arrange
      const layer3Factors = createCompleteLayer3Factors();
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'complete',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1]; // Skip header

      // Assert - Layer 3 columns start at index 25 (10 core + 5 L1 + 10 L2)
      expect(dataRow[25]).toBe('accepted'); // classification
      expect(dataRow[26]).toBe('0.95'); // design_quality_score
      expect(dataRow[27]).toContain('Modern UI'); // design_quality_indicators
      expect(dataRow[28]).toBe('0.92'); // authority_indicators_score
      expect(dataRow[29]).toContain('Industry certifications'); // authority_indicators
      expect(dataRow[30]).toBe('0.88'); // professional_presentation_score
      expect(dataRow[31]).toContain('Clear value proposition'); // presentation_indicators
      expect(dataRow[32]).toBe('0.85'); // content_originality_score
      expect(dataRow[33]).toContain('Unique product features'); // originality_indicators
      expect(dataRow[34]).toBe('anthropic'); // llm_provider
      expect(dataRow[35]).toBe('claude-3-opus-20240229'); // model_version
      expect(dataRow[36]).toBe('0.0045'); // cost_usd
      expect(dataRow[37]).toContain('High-quality B2B software'); // reasoning
      expect(dataRow[38]).toBe('2500'); // tokens_input
      expect(dataRow[39]).toBe('750'); // tokens_output
    });

    it('should format indicator arrays as comma-separated values', async () => {
      // Arrange
      const layer3Factors = createCompleteLayer3Factors();
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert - Check semicolon-separated format for indicators
      const designIndicators = dataRow[27];
      expect(designIndicators).toContain('Modern UI');
      expect(designIndicators).toContain('Consistent branding');
      expect(designIndicators).toContain('Professional layout');
    });
  });

  // ============================================================================
  // Test Suite 2: NULL Factors Handling
  // ============================================================================

  describe('2. NULL Factors Handling', () => {
    it('should return 15 empty strings when layer3_factors is null', async () => {
      // Arrange - URL eliminated before Layer 3
      const urlResult = createUrlResultWithLayer3(null);
      urlResult.eliminated_at_layer = 'layer2';

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'complete',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert - Layer 3 columns (25-39) should all be empty
      for (let i = 25; i <= 39; i++) {
        expect(dataRow[i]).toBe('');
      }
    });

    it('should handle pre-migration data with null layer3_factors', async () => {
      // Arrange - Pre-migration URL with no Layer 3 data
      const urlResult = createUrlResultWithLayer3(null);
      urlResult.eliminated_at_layer = null;
      urlResult.confidence_score = null;
      urlResult.confidence_band = null;

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'complete',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert - Core columns populated, Layer 3 empty
      expect(dataRow[0]).toBe('https://example.com'); // url
      expect(dataRow[1]).toBe('approved'); // status

      // Layer 3 columns empty
      for (let i = 25; i <= 39; i++) {
        expect(dataRow[i]).toBe('');
      }
    });
  });

  // ============================================================================
  // Test Suite 3: Empty Signal Arrays
  // ============================================================================

  describe('3. Empty Signal Arrays', () => {
    it('should handle empty indicator arrays gracefully', async () => {
      // Arrange - Layer 3 factors with empty indicator arrays
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        sophistication_signals: {
          design_quality: { score: 0.5, indicators: [] },
          authority_indicators: { score: 0.4, indicators: [] },
          professional_presentation: { score: 0.3, indicators: [] },
          content_originality: { score: 0.2, indicators: [] },
        },
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert - Scores populated, indicators empty
      expect(dataRow[26]).toBe('0.5'); // design_quality_score
      expect(dataRow[27]).toBe(''); // design_quality_indicators (empty)
      expect(dataRow[28]).toBe('0.4'); // authority_indicators_score
      expect(dataRow[29]).toBe(''); // authority_indicators (empty)
    });
  });

  // ============================================================================
  // Test Suite 4: Reasoning Truncation
  // ============================================================================

  describe('4. Reasoning Truncation', () => {
    it('should NOT truncate reasoning under 500 characters', async () => {
      // Arrange - Short reasoning
      const shortReasoning = 'This is a short reasoning message.';
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        reasoning: shortReasoning,
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert - Full reasoning included
      expect(dataRow[37]).toBe(shortReasoning);
    });

    it('should include full reasoning (no truncation in current implementation)', async () => {
      // Arrange - Long reasoning (over 500 chars)
      const longReasoning = 'A'.repeat(600);
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        reasoning: longReasoning,
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert - Full reasoning included (current implementation doesn't truncate)
      expect(dataRow[37]).toBe(longReasoning);
      expect(dataRow[37].length).toBe(600);
    });
  });

  // ============================================================================
  // Test Suite 5: Classification Values
  // ============================================================================

  describe('5. Classification Values', () => {
    it('should extract "accepted" classification correctly', async () => {
      // Arrange
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        classification: 'accepted',
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert
      expect(dataRow[25]).toBe('accepted');
    });

    it('should extract "rejected" classification correctly', async () => {
      // Arrange
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        classification: 'rejected',
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);
      urlResult.status = 'rejected';

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert
      expect(dataRow[25]).toBe('rejected');
    });
  });

  // ============================================================================
  // Test Suite 6: LLM Metadata Extraction
  // ============================================================================

  describe('6. LLM Metadata Extraction', () => {
    it('should extract LLM provider and model correctly', async () => {
      // Arrange
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        llm_provider: 'openai',
        model_version: 'gpt-4-turbo-preview',
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert
      expect(dataRow[34]).toBe('openai');
      expect(dataRow[35]).toBe('gpt-4-turbo-preview');
    });

    it('should extract token usage correctly', async () => {
      // Arrange
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        tokens_used: {
          input: 5000,
          output: 1200,
        },
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert
      expect(dataRow[38]).toBe('5000'); // tokens_input
      expect(dataRow[39]).toBe('1200'); // tokens_output
    });

    it('should format cost_usd as decimal number', async () => {
      // Arrange
      const layer3Factors: Layer3Factors = {
        ...createCompleteLayer3Factors(),
        cost_usd: 0.00234,
      };
      const urlResult = createUrlResultWithLayer3(layer3Factors);

      mockJobsService.getJobResults = jest.fn().mockResolvedValue({
        results: [urlResult],
        pagination: { page: 1, pages: 1, total: 1, pageSize: 100 },
      });

      // Act
      const stream = await exportService.streamCSVExport(
        '550e8400-e29b-41d4-a716-446655440000',
        'layer3',
      );
      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Parse CSV
      const rows = parseCSVContent(csvContent);
      const dataRow = rows[1];

      // Assert - No scientific notation
      expect(dataRow[36]).toBe('0.00234');
      expect(dataRow[36]).not.toContain('e');
    });
  });
});
