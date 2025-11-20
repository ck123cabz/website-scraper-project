/**
 * ExportService Tests - T056-T060
 * Tests for CSV export functionality with streaming and batch processing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from '../export.service';
import { JobsService } from '../../jobs.service';
import { UrlResult } from '@website-scraper/shared';
import { Readable } from 'stream';

describe('ExportService', () => {
  let service: ExportService;
  let jobsService: jest.Mocked<JobsService>;

  // Mock URL result with all layer factors
  const mockUrlResult: UrlResult = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    url: 'https://example.com',
    job_id: '123e4567-e89b-12d3-a456-426614174001',
    url_id: '123e4567-e89b-12d3-a456-426614174002',
    confidence_score: 0.85,
    confidence_band: 'high',
    eliminated_at_layer: 'passed_all',
    processing_time_ms: 1500,
    total_cost: 0.05,
    retry_count: 0,
    last_error: null,
    last_retry_at: null,
    updated_at: new Date('2025-01-13T10:00:00Z'),
    status: 'approved',
    reviewer_notes: null,
    created_at: new Date('2025-01-13T09:00:00Z'),
    layer1_factors: {
      tld_type: 'gtld',
      tld_value: '.com',
      domain_classification: 'commercial',
      pattern_matches: ['tech-company', 'enterprise'],
      target_profile: {
        type: 'B2B Software',
        confidence: 0.9,
      },
      reasoning: 'Domain appears to be a legitimate business website',
      passed: true,
    },
    layer2_factors: {
      publication_score: 0.8,
      module_scores: {
        product_offering: 0.75,
        layout_quality: 0.85,
        navigation_complexity: 0.8,
        monetization_indicators: 0.7,
      },
      keywords_found: ['blog', 'resources', 'documentation'],
      ad_networks_detected: [],
      content_signals: {
        has_blog: true,
        has_press_releases: true,
        has_whitepapers: false,
        has_case_studies: true,
      },
      reasoning: 'Strong publication indicators with professional content',
      passed: true,
    },
    layer3_factors: {
      classification: 'accepted',
      sophistication_signals: {
        design_quality: {
          score: 0.9,
          indicators: ['modern-ui', 'responsive-design', 'professional-typography'],
        },
        authority_indicators: {
          score: 0.85,
          indicators: ['industry-certifications', 'client-testimonials', 'case-studies'],
        },
        professional_presentation: {
          score: 0.88,
          indicators: ['well-structured', 'clear-branding', 'professional-copy'],
        },
        content_originality: {
          score: 0.8,
          indicators: ['unique-insights', 'original-research'],
        },
      },
      llm_provider: 'openai',
      model_version: 'gpt-4-turbo',
      cost_usd: 0.02,
      reasoning: 'High-quality professional website with strong sophistication signals',
      tokens_used: {
        input: 1000,
        output: 500,
      },
      processing_time_ms: 800,
    },
  };

  beforeEach(async () => {
    const mockJobsService = {
      getJobById: jest.fn(),
      getJobResults: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    jobsService = module.get(JobsService) as jest.Mocked<JobsService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('T057 - Complete CSV Format (48 columns)', () => {
    it('should generate 48 columns for complete format', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'complete',
      );

      // Assert
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n');

      // Remove BOM if present
      const firstLine = lines[0].replace(/^\uFEFF/, '');
      const headers = firstLine.split(',');

      expect(headers).toHaveLength(48);
      expect(headers[0]).toBe('URL');
      expect(headers[10]).toBe('L1: TLD Type');
      expect(headers[15]).toBe('L2: Publication Score');
      expect(headers[25]).toBe('L3: Classification');
    });

    it('should include all layer factors in complete format', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'complete',
      );

      // Assert
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n').filter((line) => line.trim());

      expect(lines).toHaveLength(2); // Header + 1 data row
      expect(lines[1]).toContain('https://example.com');
      expect(lines[1]).toContain('approved');
      expect(lines[1]).toContain('0.85');
      expect(lines[1]).toContain('gtld');
      expect(lines[1]).toContain('.com');
      expect(lines[1]).toContain('0.8'); // Layer 2 publication score
      expect(lines[1]).toContain('accepted'); // Layer 3 classification
    });
  });

  describe('T058 - All Format Options', () => {
    it('should generate 7 columns for summary format', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'summary',
      );

      // Assert
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n');

      const firstLine = lines[0].replace(/^\uFEFF/, '');
      const headers = firstLine.split(',');

      expect(headers).toHaveLength(7);
      expect(headers).toContain('URL');
      expect(headers).toContain('Status');
      expect(headers).toContain('Summary Reason');
    });

    it('should generate 15 columns for layer1 format', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'layer1',
      );

      // Assert
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n');

      const firstLine = lines[0].replace(/^\uFEFF/, '');
      const headers = firstLine.split(',');

      expect(headers).toHaveLength(15); // 10 core + 5 L1
    });

    it('should generate 25 columns for layer2 format', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'layer2',
      );

      // Assert
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n');

      const firstLine = lines[0].replace(/^\uFEFF/, '');
      const headers = firstLine.split(',');

      expect(headers).toHaveLength(25); // 10 core + 5 L1 + 10 L2
    });

    it('should generate 40 columns for layer3 format', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'layer3',
      );

      // Assert
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n');

      const firstLine = lines[0].replace(/^\uFEFF/, '');
      const headers = firstLine.split(',');

      expect(headers).toHaveLength(40); // 10 core + 5 L1 + 10 L2 + 15 L3
    });
  });

  describe('T059 - CSV Escaping (RFC 4180)', () => {
    it('should escape commas with quotes', () => {
      const result = service.escapeCSVField('Hello, World');
      expect(result).toBe('"Hello, World"');
    });

    it('should escape double quotes by doubling them', () => {
      const result = service.escapeCSVField('Say "Hello"');
      expect(result).toBe('"Say ""Hello"""');
    });

    it('should escape newlines with quotes', () => {
      const result = service.escapeCSVField('Line 1\nLine 2');
      expect(result).toBe('"Line 1\nLine 2"');
    });

    it('should escape carriage returns with quotes', () => {
      const result = service.escapeCSVField('Text\rText');
      expect(result).toBe('"Text\rText"');
    });

    it('should handle null and undefined', () => {
      expect(service.escapeCSVField(null)).toBe('');
      expect(service.escapeCSVField(undefined)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(service.escapeCSVField('')).toBe('');
    });

    it('should not add quotes to simple text', () => {
      expect(service.escapeCSVField('SimpleText')).toBe('SimpleText');
    });
  });

  describe('T065 - Batch Processing with Streaming', () => {
    it('should process results in 100-row batches', async () => {
      // Arrange - Create 250 mock results (should require 3 batches)
      const mockResults = Array(250)
        .fill(null)
        .map((_, i) => ({
          ...mockUrlResult,
          id: `result-${i}`,
          url: `https://example-${i}.com`,
        }));

      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);

      // Mock 3 pages of results
      jobsService.getJobResults.mockImplementation((jobId, page = 1) => {
        const startIdx = (page - 1) * 100;
        const endIdx = Math.min(startIdx + 100, mockResults.length);
        const pageResults = mockResults.slice(startIdx, endIdx);

        return Promise.resolve({
          results: pageResults,
          pagination: {
            page,
            per_page: 100,
            total: 250,
            pages: 3,
          },
        } as any);
      });

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'summary',
      );

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      // Assert
      expect(jobsService.getJobResults).toHaveBeenCalledTimes(3);
      expect(jobsService.getJobResults).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        1,
        100,
        undefined,
        undefined,
        undefined,
      );
      expect(jobsService.getJobResults).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        2,
        100,
        undefined,
        undefined,
        undefined,
      );
      expect(jobsService.getJobResults).toHaveBeenNthCalledWith(
        3,
        expect.any(String),
        3,
        100,
        undefined,
        undefined,
        undefined,
      );

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n').filter((line) => line.trim());

      expect(lines).toHaveLength(251); // Header + 250 data rows
    });

    it('should pass filters to JobsService', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      const filters = {
        filter: 'approved' as const,
        layer: 'layer3' as const,
        confidence: 'high' as const,
      };

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'complete',
        filters,
      );

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      // Assert
      expect(jobsService.getJobResults).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174001',
        1,
        100,
        'approved',
        'layer3',
        'high',
      );
    });

    it('should use CRLF line endings for Excel compatibility', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [mockUrlResult],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'summary',
      );

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');

      // Assert - Check for CRLF line endings
      expect(csv).toMatch(/\r\n/);
      expect(csv.split('\n').length - 1).toBe(csv.split('\r\n').length - 1);
    });

    it('should emit UTF-8 BOM at start of stream', async () => {
      // Arrange
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [],
        pagination: { page: 1, per_page: 100, total: 0, pages: 0 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'summary',
      );

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const buffer = Buffer.concat(chunks);

      // Assert - Check for UTF-8 BOM (EF BB BF)
      expect(buffer[0]).toBe(0xef);
      expect(buffer[1]).toBe(0xbb);
      expect(buffer[2]).toBe(0xbf);
    });

    it('should handle NULL layer factors gracefully', async () => {
      // Arrange - Create result with NULL factors
      const resultWithNullFactors: UrlResult = {
        ...mockUrlResult,
        layer1_factors: null,
        layer2_factors: null,
        layer3_factors: null,
      };

      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockResolvedValue({
        results: [resultWithNullFactors],
        pagination: { page: 1, per_page: 100, total: 1, pages: 1 },
      } as any);

      // Act
      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'complete',
      );

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve) => stream.on('end', resolve));

      const csv = Buffer.concat(chunks).toString('utf-8');
      const lines = csv.split('\r\n').filter((line) => line.trim());

      // Assert - Should still produce valid CSV with empty values
      expect(lines).toHaveLength(2); // Header + 1 data row
      expect(lines[1]).toContain('https://example.com');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid UUID format', async () => {
      await expect(service.streamCSVExport('invalid-uuid', 'complete')).rejects.toThrow(
        'Invalid job ID format',
      );
    });

    it('should throw error for invalid format', async () => {
      await expect(
        service.streamCSVExport('123e4567-e89b-12d3-a456-426614174001', 'invalid' as any),
      ).rejects.toThrow('Invalid format');
    });

    it('should throw error if job not found', async () => {
      jobsService.getJobById.mockResolvedValue(null);

      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'complete',
      );

      await expect(
        new Promise((resolve, reject) => {
          stream.on('error', reject);
          stream.on('end', resolve);
        }),
      ).rejects.toThrow('Job not found');
    });

    it('should handle errors during batch processing', async () => {
      jobsService.getJobById.mockResolvedValue({ id: 'test-job', status: 'completed' } as any);
      jobsService.getJobResults.mockRejectedValue(new Error('Database connection error'));

      const stream = await service.streamCSVExport(
        '123e4567-e89b-12d3-a456-426614174001',
        'complete',
      );

      await expect(
        new Promise((resolve, reject) => {
          stream.on('error', reject);
          stream.on('end', resolve);
        }),
      ).rejects.toThrow('Database connection error');
    });
  });
});
