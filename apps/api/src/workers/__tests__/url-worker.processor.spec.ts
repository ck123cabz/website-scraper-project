import { Test, TestingModule } from '@nestjs/testing';
import { UrlWorkerProcessor } from '../url-worker.processor';
import { SupabaseService } from '../../supabase/supabase.service';
import { ScraperService } from '../../scraper/scraper.service';
import { PreFilterService } from '../../jobs/services/prefilter.service';
import { LlmService } from '../../jobs/services/llm.service';
import type { Job } from 'bullmq';

describe('UrlWorkerProcessor', () => {
  let processor: UrlWorkerProcessor;
  let supabaseService: jest.Mocked<SupabaseService>;
  let scraperService: jest.Mocked<ScraperService>;
  let preFilterService: jest.Mocked<PreFilterService>;
  let llmService: jest.Mocked<LlmService>;

  // Mock Supabase client
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(), // Added for Bug #3 fix (Story 3.1 - prevent duplicates on resume)
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    rpc: jest.fn().mockReturnThis(), // Added for atomic counter updates (Story 3.0 fix)
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
          provide: PreFilterService,
          useValue: {
            filterUrl: jest.fn(),
          },
        },
        {
          provide: LlmService,
          useValue: {
            classifyUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<UrlWorkerProcessor>(UrlWorkerProcessor);
    supabaseService = module.get(SupabaseService) as jest.Mocked<SupabaseService>;
    scraperService = module.get(ScraperService) as jest.Mocked<ScraperService>;
    preFilterService = module.get(PreFilterService) as jest.Mocked<PreFilterService>;
    llmService = module.get(LlmService) as jest.Mocked<LlmService>;

    jest.clearAllMocks();
  });

  describe('process', () => {
    const mockJob: Partial<Job> = {
      id: 'bull-job-123',
      data: {
        jobId: 'job-123',
        url: 'https://example.com',
        urlId: 'url-456',
      },
    };

    it('should successfully process URL with LLM classification', async () => {
      // Mock job status check (not paused)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Mock scraper success
      scraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: '<html><body>Test content</body></html>',
        title: 'Test Page',
        metaDescription: 'Test description',
        success: true,
        statusCode: 200,
        processingTimeMs: 2000,
      });

      // Mock pre-filter pass
      (preFilterService.filterUrl as jest.Mock).mockResolvedValue({
        passed: true,
        reasoning: 'URL passed pre-filter',
      });

      // Mock LLM classification
      llmService.classifyUrl.mockResolvedValue({
        classification: 'suitable',
        confidence: 0.85,
        reasoning: 'Site accepts guest posts',
        provider: 'gemini',
        cost: 0.00045,
        processingTimeMs: 3000,
        retryCount: 0,
      });

      // Mock job data fetch for counter updates (total_urls)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response for atomic counter increment
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 1,
          successful_urls: 1,
          failed_urls: 0,
          prefilter_rejected_count: 0,
          prefilter_passed_count: 1,
          total_cost: 0.00045,
          gemini_cost: 0.00045,
          gpt_cost: 0,
        },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify scraper was called
      expect(scraperService.fetchUrl).toHaveBeenCalledWith('https://example.com');

      // Verify pre-filter was called
      expect(preFilterService.filterUrl).toHaveBeenCalledWith('https://example.com');

      // Verify LLM was called
      expect(llmService.classifyUrl).toHaveBeenCalled();

      // Verify result was inserted
      expect(mockSupabaseClient.insert).toHaveBeenCalled();

      // Verify job was updated
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('should skip processing when job is paused', async () => {
      // Mock job status as paused
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'paused' },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify no processing occurred
      expect(scraperService.fetchUrl).not.toHaveBeenCalled();
      expect(preFilterService.filterUrl).not.toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();
    });

    it('should skip processing when job is cancelled', async () => {
      // Mock job status as cancelled
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'cancelled' },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify no processing occurred
      expect(scraperService.fetchUrl).not.toHaveBeenCalled();
      expect(preFilterService.filterUrl).not.toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();
    });

    it('should handle scraping failure', async () => {
      // Mock job status check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Mock scraper failure
      scraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: '',
        title: null,
        metaDescription: null,
        success: false,
        error: 'ScrapingBee returned status 404',
        processingTimeMs: 1000,
      });

      // Mock job data for failure handling (total_urls)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response for atomic counter increment
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 1,
          successful_urls: 0,
          failed_urls: 1,
          prefilter_rejected_count: 0,
          prefilter_passed_count: 0,
        },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify scraper was called
      expect(scraperService.fetchUrl).toHaveBeenCalled();

      // Verify pre-filter and LLM were NOT called
      expect(preFilterService.filterUrl).not.toHaveBeenCalled();
      expect(llmService.classifyUrl).not.toHaveBeenCalled();

      // Verify failed result was inserted
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should skip LLM classification when pre-filter rejects', async () => {
      // Create a mock job with Twitter URL
      const twitterJob: Partial<Job> = {
        id: 'bull-job-123',
        data: {
          jobId: 'job-123',
          url: 'https://twitter.com',
          urlId: 'url-456',
        },
      };

      // Mock job status check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Mock scraper success
      scraperService.fetchUrl.mockResolvedValue({
        url: 'https://twitter.com',
        content: '<html><body>Twitter content</body></html>',
        title: 'Twitter',
        metaDescription: 'Social media',
        success: true,
        statusCode: 200,
        processingTimeMs: 2000,
      });

      // Mock pre-filter reject
      (preFilterService.filterUrl as jest.Mock).mockResolvedValue({
        passed: false,
        reasoning: 'Social media platform - does not accept guest posts',
        matched_rule: 'social_media',
      });

      // Mock job data for pre-filter rejection (total_urls)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response for atomic counter increment
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 1,
          successful_urls: 0,
          failed_urls: 0,
          prefilter_rejected_count: 1,
          prefilter_passed_count: 0,
        },
        error: null,
      });

      await processor.process(twitterJob as Job);

      // Verify pre-filter was called
      expect(preFilterService.filterUrl).toHaveBeenCalledWith('https://twitter.com');

      // Verify LLM was NOT called
      expect(llmService.classifyUrl).not.toHaveBeenCalled();

      // Verify result with rejected_prefilter was inserted
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should complete job when all URLs processed', async () => {
      // Mock job status check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'processing' },
        error: null,
      });

      // Mock successful processing
      scraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: '<html><body>Content</body></html>',
        title: 'Test',
        metaDescription: 'Test',
        success: true,
        statusCode: 200,
        processingTimeMs: 2000,
      });

      (preFilterService.filterUrl as jest.Mock).mockResolvedValue({
        passed: true,
        reasoning: 'Passed',
      });

      llmService.classifyUrl.mockResolvedValue({
        classification: 'suitable',
        confidence: 0.9,
        reasoning: 'Suitable',
        provider: 'gemini',
        cost: 0.0005,
        processingTimeMs: 3000,
        retryCount: 0,
      });

      // Mock job data - this is the last URL (total_urls)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { total_urls: 10 },
        error: null,
      });

      // Mock RPC response for atomic counter increment (last URL, processedUrls = 10)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          processed_urls: 10,
          successful_urls: 10,
          failed_urls: 0,
          prefilter_rejected_count: 0,
          prefilter_passed_count: 10,
          total_cost: 0.005,
          gemini_cost: 0.005,
          gpt_cost: 0,
        },
        error: null,
      });

      // Mock final job data for completion
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          id: 'job-123',
          processed_urls: 10,
          total_urls: 10,
          successful_urls: 10,
          failed_urls: 0,
          total_cost: 0.005,
          prefilter_rejected_count: 0,
        },
        error: null,
      });

      await processor.process(mockJob as Job);

      // Verify job status was updated to completed
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        }),
      );
    });
  });

  describe('graceful shutdown', () => {
    it('should log shutdown message and close worker', async () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'log');

      // Mock the worker property (normally provided by WorkerHost)
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
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Worker closed gracefully'));
    });

    it('should handle worker close error gracefully', async () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'error');

      // Mock worker that throws an error on close
      const mockWorker = {
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      };
      Object.defineProperty(processor, 'worker', {
        get: () => mockWorker,
        configurable: true,
      });

      await processor.onModuleDestroy();

      expect(mockWorker.close).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during graceful shutdown'),
      );
    });

    it('should handle missing worker gracefully', async () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'log');

      // Mock undefined worker (not yet initialized)
      Object.defineProperty(processor, 'worker', {
        get: () => undefined,
        configurable: true,
      });

      await processor.onModuleDestroy();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Graceful shutdown'));
      // Should not throw, just log the shutdown initiation
    });
  });
});
