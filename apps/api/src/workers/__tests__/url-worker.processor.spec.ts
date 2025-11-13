import { Test, TestingModule } from '@nestjs/testing';
import { UrlWorkerProcessor } from '../url-worker.processor';
import { SupabaseService } from '../../supabase/supabase.service';
import { ScraperService } from '../../scraper/scraper.service';
import { Layer1DomainAnalysisService } from '../../jobs/services/layer1-domain-analysis.service';
import { Layer2OperationalFilterService } from '../../jobs/services/layer2-operational-filter.service';
import { LlmService } from '../../jobs/services/llm.service';
import { ConfidenceScoringService } from '../../jobs/services/confidence-scoring.service';
import type { Job } from 'bullmq';

/**
 * Unit tests for UrlWorkerProcessor
 * Story 2.5-refactored: 3-Tier Pipeline Orchestration
 */
describe('UrlWorkerProcessor (3-Tier Architecture)', () => {
  let processor: UrlWorkerProcessor;
  let scraperService: jest.Mocked<ScraperService>;
  let layer1AnalysisService: jest.Mocked<Layer1DomainAnalysisService>;
  let layer2FilterService: jest.Mocked<Layer2OperationalFilterService>;
  let llmService: jest.Mocked<LlmService>;

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
      ],
    }).compile();

    processor = module.get<UrlWorkerProcessor>(UrlWorkerProcessor);
    scraperService = module.get(ScraperService) as jest.Mocked<ScraperService>;
    layer1AnalysisService = module.get(
      Layer1DomainAnalysisService,
    ) as jest.Mocked<Layer1DomainAnalysisService>;
    layer2FilterService = module.get(
      Layer2OperationalFilterService,
    ) as jest.Mocked<Layer2OperationalFilterService>;
    llmService = module.get(LlmService) as jest.Mocked<LlmService>;

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
        reasoning: 'PASS - Business signals detected, publication score below threshold',
        signals: {
          has_product_offering: true,
          product_confidence: 0.85,
          detected_product_keywords: ['pricing', 'demo', 'free trial'],
          homepage_is_blog: false,
          layout_type: 'marketing',
          layout_confidence: 0.9,
          has_business_nav: true,
          business_nav_percentage: 0.6,
          nav_items_classified: {
            business: ['product', 'pricing', 'about', 'contact'],
            content: ['blog'],
            other: [],
          },
          monetization_type: 'business',
          ad_networks_detected: [],
          affiliate_patterns_detected: [],
          publication_score: 0.25,
          module_scores: {
            product_offering: 0.85,
            layout: 0.9,
            navigation: 0.6,
            monetization: 1.0,
          },
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
        reasoning: 'REJECT - Publication score above threshold (0.85 >= 0.65)',
        signals: {
          has_product_offering: false,
          product_confidence: 0.1,
          detected_product_keywords: [],
          homepage_is_blog: true,
          layout_type: 'blog',
          layout_confidence: 0.95,
          has_business_nav: false,
          business_nav_percentage: 0.1,
          nav_items_classified: {
            business: [],
            content: ['articles', 'blog', 'archives', 'topics'],
            other: [],
          },
          monetization_type: 'ads',
          ad_networks_detected: ['googlesyndication', 'adsense'],
          affiliate_patterns_detected: ['amazon', 'aff='],
          publication_score: 0.85,
          module_scores: {
            product_offering: 0.1,
            layout: 0.95,
            navigation: 0.1,
            monetization: 0.9,
          },
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

    beforeEach(() => {
      // Clear all mocks including Supabase client
      jest.clearAllMocks();
      mockSupabaseClient.single.mockReset();
    });

    it('should skip processing when job is paused', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { status: 'paused' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {},
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
