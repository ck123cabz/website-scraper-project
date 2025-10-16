import { Test, TestingModule } from '@nestjs/testing';
import { UrlWorkerProcessor } from '../url-worker.processor';
import { SupabaseService } from '../../supabase/supabase.service';
import { ScraperService } from '../../scraper/scraper.service';
import { Layer1DomainAnalysisService } from '../../jobs/services/layer1-domain-analysis.service';
import { Layer2OperationalFilterService } from '../../jobs/services/layer2-operational-filter.service';
import { LlmService } from '../../jobs/services/llm.service';
import { ConfidenceScoringService } from '../../jobs/services/confidence-scoring.service';
import { ManualReviewRouterService } from '../../jobs/services/manual-review-router.service';
import type { Job } from 'bullmq';

/**
 * Unit tests for UrlWorkerProcessor
 * Story 2.5-refactored: 3-Tier Pipeline Orchestration
 */
describe('UrlWorkerProcessor (3-Tier Architecture)', () => {
  let processor: UrlWorkerProcessor;
  let supabaseService: jest.Mocked<SupabaseService>;
  let scraperService: jest.Mocked<ScraperService>;
  let layer1AnalysisService: jest.Mocked<Layer1DomainAnalysisService>;
  let layer2FilterService: jest.Mocked<Layer2OperationalFilterService>;
  let llmService: jest.Mocked<LlmService>;
  let confidenceScoringService: jest.Mocked<ConfidenceScoringService>;
  let manualReviewRouterService: jest.Mocked<ManualReviewRouterService>;

  // Mock Supabase client
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    rpc: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlWorkerProcessor,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn(() => mockSupabaseClient),
          },
        },
        {
          provide: ScraperService,
          useValue: {
            fetchUrl: jest.fn(),
          },
        },
        {
          provide: Layer1DomainAnalysisService,
          useValue: {
            analyzeUrl: jest.fn(),
          },
        },
        {
          provide: Layer2OperationalFilterService,
          useValue: {
            filterUrl: jest.fn(),
            validateOperational: jest.fn(), // Keep for backward compatibility
          },
        },
        {
          provide: LlmService,
          useValue: {
            classifyUrl: jest.fn(),
          },
        },
        {
          provide: ConfidenceScoringService,
          useValue: {
            calculateConfidenceBand: jest.fn().mockResolvedValue('high'),
          },
        },
        {
          provide: ManualReviewRouterService,
          useValue: {
            shouldRouteToManualReview: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    processor = module.get<UrlWorkerProcessor>(UrlWorkerProcessor);
    supabaseService = module.get(SupabaseService) as jest.Mocked<SupabaseService>;
    scraperService = module.get(ScraperService) as jest.Mocked<ScraperService>;
    layer1AnalysisService = module.get(Layer1DomainAnalysisService) as jest.Mocked<Layer1DomainAnalysisService>;
    layer2FilterService = module.get(Layer2OperationalFilterService) as jest.Mocked<Layer2OperationalFilterService>;
    llmService = module.get(LlmService) as jest.Mocked<LlmService>;
    confidenceScoringService = module.get(ConfidenceScoringService) as jest.Mocked<ConfidenceScoringService>;
    manualReviewRouterService = module.get(ManualReviewRouterService) as jest.Mocked<ManualReviewRouterService>;

    jest.clearAllMocks();
  });

  describe('3-Tier Pipeline', () => {
    const mockJob: Partial<Job> = {
      id: 'bull-job-123',
      data: {
        jobId: 'job-123',
        url: 'https://example.com',
        urlId: 'url-456',
      },
    };

    it('should process through all 3 layers when all PASS', async () => {
      // Mock job status check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Layer 1: PASS
      layer1AnalysisService.analyzeUrl.mockReturnValue({
        passed: true,
        reasoning: 'PASS - Valid domain',
        layer: 'layer1',
        processingTimeMs: 5,
      });

      // Layer 2: Scraper + PASS
      scraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: '<html><body>Test content</body></html>',
        title: 'Test Page',
        metaDescription: 'Test description',
        success: true,
        statusCode: 200,
        processingTimeMs: 2000,
      });

      layer2FilterService.filterUrl.mockResolvedValue({
        passed: true,
        reasoning: 'PASS - Operational signals valid',
        signals: {
          company_pages: { has_about: true, has_team: true, has_contact: true, count: 3 },
          blog_data: { has_blog: true, last_post_date: '2025-10-01', days_since_last_post: 15, passes_freshness: true },
          tech_stack: { tools_detected: ['Google Analytics', 'HubSpot'], count: 2 },
          design_quality: { score: 8, has_modern_framework: true, is_responsive: true, has_professional_imagery: true },
        },
        processingTimeMs: 100,
      });

      // Layer 3: LLM classification
      llmService.classifyUrl.mockResolvedValue({
        classification: 'suitable',
        confidence: 0.85,
        reasoning: 'Site accepts guest posts',
        provider: 'gemini',
        cost: 0.00045,
        processingTimeMs: 3000,
        retryCount: 0,
      });

      // Mock job data fetch for counter update
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response for counter increment
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 1,
          successful_urls: 1,
          total_cost: 0.00045,
          scraping_cost: 0.0001,
        },
        error: null,
      });

      // Mock job data fetch for cost savings update
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          layer1_eliminated_count: 0,
          layer2_eliminated_count: 0,
        },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify all 3 layers were called
      expect(layer1AnalysisService.analyzeUrl).toHaveBeenCalledWith('https://example.com');
      expect(scraperService.fetchUrl).toHaveBeenCalledWith('https://example.com');
      expect(layer2FilterService.filterUrl).toHaveBeenCalled();
      expect(llmService.classifyUrl).toHaveBeenCalled();

      // Verify result was stored
      expect(mockSupabaseClient.upsert).toHaveBeenCalled();
    });

    it('should STOP at Layer 1 if REJECT', async () => {
      // Mock job status check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Layer 1: REJECT
      layer1AnalysisService.analyzeUrl.mockReturnValue({
        passed: false,
        reasoning: 'REJECT - Blog platform (medium.com)',
        layer: 'layer1',
        processingTimeMs: 5,
      });

      // Mock job data fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 1,
          layer1_eliminated_count: 1,
        },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify Layer 1 called, but Layer 2 and Layer 3 NOT called
      expect(layer1AnalysisService.analyzeUrl).toHaveBeenCalled();
      expect(scraperService.fetchUrl).not.toHaveBeenCalled();
      expect(layer2FilterService.filterUrl).not.toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();

      // Verify Layer 1 rejection stored
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          elimination_layer: 'layer1',
        }),
        expect.anything(),
      );
    });

    it('should STOP at Layer 2 if scraping fails', async () => {
      // Mock job status check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Layer 1: PASS
      layer1AnalysisService.analyzeUrl.mockReturnValue({
        passed: true,
        reasoning: 'PASS',
        layer: 'layer1',
        processingTimeMs: 5,
      });

      // Layer 2: Scraper FAIL
      scraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: '',
        title: null,
        metaDescription: null,
        success: false,
        error: 'ScrapingBee returned status 404',
        processingTimeMs: 1000,
      });

      // Mock job data fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 1,
          layer2_eliminated_count: 1,
        },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify Layer 1 and scraper called, but NOT Layer 3
      expect(layer1AnalysisService.analyzeUrl).toHaveBeenCalled();
      expect(scraperService.fetchUrl).toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();

      // Verify Layer 2 rejection stored
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          elimination_layer: 'layer2',
        }),
        expect.anything(),
      );
    });

    it('should STOP at Layer 2 if operational filter REJECT', async () => {
      // Mock job status check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Layer 1: PASS
      layer1AnalysisService.analyzeUrl.mockReturnValue({
        passed: true,
        reasoning: 'PASS',
        layer: 'layer1',
        processingTimeMs: 5,
      });

      // Layer 2: Scraper success
      scraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: '<html><body>Content</body></html>',
        title: 'Test',
        metaDescription: 'Test',
        success: true,
        statusCode: 200,
        processingTimeMs: 2000,
      });

      // Layer 2: Operational filter REJECT
      layer2FilterService.filterUrl.mockResolvedValue({
        passed: false,
        reasoning: 'REJECT - No company page found',
        signals: {
          company_pages: { has_about: false, has_team: false, has_contact: false, count: 0 },
          blog_data: { has_blog: false, last_post_date: null, days_since_last_post: null, passes_freshness: false },
          tech_stack: { tools_detected: [], count: 0 },
          design_quality: { score: 3, has_modern_framework: false, is_responsive: false, has_professional_imagery: false },
        },
        processingTimeMs: 100,
      });

      // Mock job data fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 1,
          layer2_eliminated_count: 1,
        },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify Layer 1 and Layer 2 called, but NOT Layer 3
      expect(layer1AnalysisService.analyzeUrl).toHaveBeenCalled();
      expect(scraperService.fetchUrl).toHaveBeenCalled();
      expect(layer2FilterService.filterUrl).toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();

      // Verify Layer 2 rejection stored
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          elimination_layer: 'layer2',
          layer2_signals: expect.anything(),
        }),
        expect.anything(),
      );
    });
  });

  describe('Job controls', () => {
    const mockJob: Partial<Job> = {
      id: 'bull-job-123',
      data: {
        jobId: 'job-123',
        url: 'https://example.com',
        urlId: 'url-456',
      },
    };

    it('should skip processing when job is paused', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'paused' },
        error: null,
      });

      await processor.process(mockJob as Job);

      expect(layer1AnalysisService.analyzeUrl).not.toHaveBeenCalled();
      expect(scraperService.fetchUrl).not.toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();
    });

    it('should skip processing when job is cancelled', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'cancelled' },
        error: null,
      });

      await processor.process(mockJob as Job);

      expect(layer1AnalysisService.analyzeUrl).not.toHaveBeenCalled();
      expect(scraperService.fetchUrl).not.toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();
    });
  });

  describe('Graceful shutdown', () => {
    it('should close worker on module destroy', async () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'log');

      const mockWorker = {
        close: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(processor, 'worker', {
        get: () => mockWorker,
        configurable: true,
      });

      await processor.onModuleDestroy();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Graceful shutdown'));
      expect(mockWorker.close).toHaveBeenCalled();
    });
  });
});
