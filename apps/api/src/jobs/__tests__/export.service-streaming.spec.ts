/**
 * Streaming and batch processing tests for ExportService
 * Task T061 [Phase 5 - User Story 3]
 *
 * Tests the streaming architecture and batch processing:
 * - 100-row batches
 * - Stream-based output
 * - Memory efficiency
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from '../services/export.service';
import { JobsService } from '../jobs.service';
import { UrlResult } from '@website-scraper/shared';

/**
 * Generate mock URL result
 */
function generateMockUrlResult(index: number): UrlResult {
  return {
    id: `result-${index}`,
    url: `https://example-${index}.com`,
    job_id: '550e8400-e29b-41d4-a716-446655440000',
    url_id: `url-${index}`,
    status: 'approved',
    confidence_score: 0.85,
    confidence_band: 'high',
    eliminated_at_layer: 'passed_all',
    processing_time_ms: 1000,
    total_cost: 0.001,
    retry_count: 0,
    last_error: null,
    last_retry_at: null,
    processed_at: new Date(),
    layer1_factors: {
      tld_type: 'gtld',
      tld_value: '.com',
      domain_classification: 'commercial',
      pattern_matches: [],
      target_profile: {
        type: 'B2B software',
        confidence: 0.9,
      },
      reasoning: 'Test reasoning',
      passed: true,
    },
    layer2_factors: null,
    layer3_factors: null,
    reviewer_notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Mock JobsService for testing
 */
class MockJobsService {
  private mockResults: UrlResult[] = [];
  private batchSize: number = 100;
  private callLog: Array<{ page: number; pageSize: number }> = [];

  constructor(totalResults: number = 0) {
    // Pre-generate mock results
    this.mockResults = Array.from({ length: totalResults }, (_, i) => generateMockUrlResult(i));
  }

  async getJobById(id: string) {
    if (id === '550e8400-e29b-41d4-a716-446655440000' || id === '550e8400-e29b-41d4-a716-446655440000') {
      return { id, name: 'Test Job', status: 'completed' };
    }
    return null;
  }

  async getJobResults(
    jobId: string,
    page: number,
    pageSize: number,
    filter?: string,
    layer?: string,
    confidence?: string,
  ) {
    // Log the call for verification
    this.callLog.push({ page, pageSize });

    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, this.mockResults.length);
    const results = this.mockResults.slice(start, end);
    const totalPages = Math.ceil(this.mockResults.length / pageSize);

    return {
      results,
      pagination: {
        total: this.mockResults.length,
        page,
        pageSize,
        pages: totalPages,
      },
    };
  }

  getBatchCallLog() {
    return this.callLog;
  }

  resetCallLog() {
    this.callLog = [];
  }
}

describe('ExportService - Streaming Tests (T061)', () => {
  let exportService: ExportService;
  let mockJobsService: MockJobsService;

  beforeEach(async () => {
    mockJobsService = new MockJobsService(250); // 250 results for testing

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

  describe('1. Batch Processing', () => {
    it('should process results in batches of 100', async () => {
      mockJobsService.resetCallLog();

      const stream = await exportService.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      // Consume stream
      let lineCount = 0;
      for await (const chunk of stream) {
        const chunkStr = chunk.toString();
        lineCount += (chunkStr.match(/\r\n/g) || []).length;
      }

      // Verify batching
      const callLog = mockJobsService.getBatchCallLog();

      // Should have made 3 calls: pages 1, 2, 3 (250 results / 100 per page = 3 pages)
      expect(callLog.length).toBe(3);

      // Each call should request 100 results
      callLog.forEach((call) => {
        expect(call.pageSize).toBe(100);
      });

      // Pages should be sequential
      expect(callLog[0].page).toBe(1);
      expect(callLog[1].page).toBe(2);
      expect(callLog[2].page).toBe(3);
    });

    it('should handle exact batch boundary (100 results)', async () => {
      // Create service with exactly 100 results
      const exactBatchService = new MockJobsService(100);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          ExportService,
          {
            provide: JobsService,
            useValue: exactBatchService,
          },
        ],
      }).compile();

      const service = moduleFixture.get<ExportService>(ExportService);
      const stream = await service.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      let lineCount = 0;
      for await (const chunk of stream) {
        const chunkStr = chunk.toString();
        lineCount += (chunkStr.match(/\r\n/g) || []).length;
      }

      // Should have made exactly 1 call
      const callLog = exactBatchService.getBatchCallLog();
      expect(callLog.length).toBe(1);
      expect(callLog[0].pageSize).toBe(100);
    });

    it('should handle partial last batch', async () => {
      // Create service with 250 results (last batch = 50)
      const partialBatchService = new MockJobsService(250);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          ExportService,
          {
            provide: JobsService,
            useValue: partialBatchService,
          },
        ],
      }).compile();

      const service = moduleFixture.get<ExportService>(ExportService);
      const stream = await service.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      let lineCount = 0;
      for await (const chunk of stream) {
        const chunkStr = chunk.toString();
        lineCount += (chunkStr.match(/\r\n/g) || []).length;
      }

      // Should have made 3 calls (100 + 100 + 50)
      const callLog = partialBatchService.getBatchCallLog();
      expect(callLog.length).toBe(3);

      // All should request 100 (even if fewer are returned)
      callLog.forEach((call) => {
        expect(call.pageSize).toBe(100);
      });
    });
  });

  describe('2. Streaming Behavior', () => {
    it('should return a Node.js ReadableStream', async () => {
      const stream = await exportService.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      expect(stream).toBeDefined();
      expect(typeof stream.read).toBe('function');
      expect(typeof stream.on).toBe('function');
      expect(stream.readable).toBe(true);
    });

    it('should emit data in chunks', async () => {
      const stream = await exportService.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      let chunkCount = 0;
      for await (const chunk of stream) {
        chunkCount++;
        expect(chunk).toBeDefined();
        expect(Buffer.isBuffer(chunk) || typeof chunk === 'string').toBe(true);
      }

      // Should emit at least 1 chunk (BOM + header + data)
      expect(chunkCount).toBeGreaterThan(0);
    });

    it('should emit complete CSV structure', async () => {
      const stream = await exportService.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Check structure
      expect(csvContent.charCodeAt(0)).toBe(0xfeff); // BOM
      expect(csvContent).toContain('\r\n'); // CRLF line endings

      // Remove BOM and split lines
      const withoutBOM = csvContent.substring(1);
      const lines = withoutBOM.split('\r\n').filter((line) => line.length > 0);

      // Should have header + 250 data rows
      expect(lines.length).toBe(251);

      // First line is header
      expect(lines[0]).toContain('URL');
      expect(lines[0]).toContain('Status');
    });
  });

  describe('3. Empty Results', () => {
    it('should handle empty result set', async () => {
      // Create service with 0 results
      const emptyService = new MockJobsService(0);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          ExportService,
          {
            provide: JobsService,
            useValue: emptyService,
          },
        ],
      }).compile();

      const service = moduleFixture.get<ExportService>(ExportService);
      const stream = await service.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      let csvContent = '';
      for await (const chunk of stream) {
        csvContent += chunk.toString();
      }

      // Should only have BOM + header
      const withoutBOM = csvContent.substring(1);
      const lines = withoutBOM.split('\r\n').filter((line) => line.length > 0);

      expect(lines.length).toBe(1); // Only header
      expect(lines[0]).toContain('URL');
    });
  });

  describe('4. Memory Efficiency', () => {
    it('should not load all results in memory at once', async () => {
      // This test verifies that we use streaming (not loading all in memory)
      // by checking that batch calls are made sequentially, not all at once

      mockJobsService.resetCallLog();
      const stream = await exportService.streamCSVExport('550e8400-e29b-41d4-a716-446655440000', 'summary');

      // Start consuming stream
      let processedChunks = 0;
      for await (const chunk of stream) {
        processedChunks++;
      }

      // Verify sequential batch processing
      const callLog = mockJobsService.getBatchCallLog();

      // Should have made 3 calls for 250 results
      expect(callLog.length).toBe(3);

      // Calls should be in order
      expect(callLog[0].page).toBe(1);
      expect(callLog[1].page).toBe(2);
      expect(callLog[2].page).toBe(3);
    });
  });
});
