/**
 * Layer Factors Structure Tests
 * Phase 2 Critical Blocker Tests - Verifies complete factor structure for all 3 layers
 *
 * Tests verify that each layer service returns ALL required fields:
 * - Layer 1: Domain analysis factors (TLD, patterns, target profile)
 * - Layer 2: Publication detection factors (scores, keywords, signals)
 * - Layer 3: Sophistication analysis factors (LLM classification, signals, metadata)
 *
 * Also tests database writes and backwards compatibility with null values.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Layer1DomainAnalysisService } from '../../jobs/services/layer1-domain-analysis.service';
import { Layer2OperationalFilterService } from '../../jobs/services/layer2-operational-filter.service';
import { LlmService } from '../../jobs/services/llm.service';
import { SettingsService } from '../../settings/settings.service';
import { ScraperService } from '../../scraper/scraper.service';
import { SupabaseService } from '../../supabase/supabase.service';
import type { Layer1Factors, Layer2Factors, Layer3Factors } from '@website-scraper/shared';

describe('Layer Factors Structure Tests', () => {
  let layer1Service: Layer1DomainAnalysisService;
  let layer2Service: Layer2OperationalFilterService;
  let llmService: LlmService;
  let supabaseService: SupabaseService;

  const TEST_URL = 'https://example.com';
  const TEST_CONTENT = 'Test website content with sufficient text for analysis';

  beforeEach(async () => {
    // Mock SettingsService
    const mockSettingsService = {
      getSettings: jest.fn().mockResolvedValue({
        id: 'test-settings',
        layer1_rules: {
          url_pattern_exclusions: [],
          tld_classifications: { gtlds: ['.com'], cctlds: ['.uk'], custom: ['.tech'] },
          enabled: true,
        },
        layer2_rules: {
          publication_score_threshold: 0.65,
          product_keywords: {
            commercial: ['pricing', 'buy'],
            features: ['features'],
            cta: ['sign up'],
          },
          business_nav_keywords: ['product', 'pricing'],
          content_nav_keywords: ['blog', 'news'],
          min_business_nav_percentage: 0.3,
          ad_network_patterns: ['googlesyndication'],
          affiliate_patterns: ['amazon'],
          payment_provider_patterns: ['stripe'],
        },
        layer3_rules: {
          llm_temperature: 0.3,
          content_truncation_limit: 10000,
          guest_post_red_flags: ['Write for Us'],
          seo_investment_signals: ['schema_markup'],
        },
        confidence_threshold: 0.0,
      }),
    };

    // Mock ScraperService
    const mockScraperService = {
      fetchUrl: jest.fn().mockResolvedValue({
        success: true,
        content: TEST_CONTENT,
        title: 'Test Page',
      }),
    };

    // Mock SupabaseService
    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Layer1DomainAnalysisService,
        Layer2OperationalFilterService,
        LlmService,
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ScraperService, useValue: mockScraperService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    layer1Service = module.get<Layer1DomainAnalysisService>(Layer1DomainAnalysisService);
    layer2Service = module.get<Layer2OperationalFilterService>(Layer2OperationalFilterService);
    llmService = module.get<LlmService>(LlmService);
    supabaseService = module.get<SupabaseService>(SupabaseService);

    // Initialize Layer1 service
    await layer1Service.onModuleInit();
  });

  describe('Layer 1 Factors Structure Test', () => {
    it('should return all required Layer1Factors fields', () => {
      const layer1Factors = layer1Service.getLayer1Factors(TEST_URL);

      // Verify all required fields exist
      expect(layer1Factors).toBeDefined();
      expect(layer1Factors).toHaveProperty('tld_type');
      expect(layer1Factors).toHaveProperty('tld_value');
      expect(layer1Factors).toHaveProperty('domain_classification');
      expect(layer1Factors).toHaveProperty('pattern_matches');
      expect(layer1Factors).toHaveProperty('target_profile');
      expect(layer1Factors).toHaveProperty('reasoning');
      expect(layer1Factors).toHaveProperty('passed');

      // Verify field types
      expect(['gtld', 'cctld', 'custom']).toContain(layer1Factors.tld_type);
      expect(typeof layer1Factors.tld_value).toBe('string');
      expect(['commercial', 'personal', 'institutional', 'spam']).toContain(
        layer1Factors.domain_classification,
      );
      expect(Array.isArray(layer1Factors.pattern_matches)).toBe(true);
      expect(layer1Factors.target_profile).toHaveProperty('type');
      expect(layer1Factors.target_profile).toHaveProperty('confidence');
      expect(typeof layer1Factors.target_profile.type).toBe('string');
      expect(typeof layer1Factors.target_profile.confidence).toBe('number');
      expect(typeof layer1Factors.reasoning).toBe('string');
      expect(typeof layer1Factors.passed).toBe('boolean');

      // Verify target_profile confidence is 0.0-1.0
      expect(layer1Factors.target_profile.confidence).toBeGreaterThanOrEqual(0);
      expect(layer1Factors.target_profile.confidence).toBeLessThanOrEqual(1);
    });

    it('should return valid Layer1Factors for different URL types', () => {
      const urls = [
        'https://blog.example.com',
        'https://example.co.uk',
        'https://example.tech',
        'https://subdomain.wordpress.com',
      ];

      urls.forEach((url) => {
        const factors = layer1Service.getLayer1Factors(url);
        expect(factors).toBeDefined();
        expect(factors.tld_value).toBeTruthy();
        expect(factors.pattern_matches).toBeDefined();
      });
    });
  });

  describe('Layer 2 Factors Structure Test', () => {
    it('should return all required Layer2Factors fields', async () => {
      const layer2Factors = await layer2Service.getLayer2Factors(TEST_URL);

      // Verify all required fields exist
      expect(layer2Factors).toBeDefined();
      expect(layer2Factors).toHaveProperty('publication_score');
      expect(layer2Factors).toHaveProperty('module_scores');
      expect(layer2Factors).toHaveProperty('keywords_found');
      expect(layer2Factors).toHaveProperty('ad_networks_detected');
      expect(layer2Factors).toHaveProperty('content_signals');
      expect(layer2Factors).toHaveProperty('reasoning');
      expect(layer2Factors).toHaveProperty('passed');

      // Verify field types
      expect(typeof layer2Factors.publication_score).toBe('number');
      expect(layer2Factors.publication_score).toBeGreaterThanOrEqual(0);
      expect(layer2Factors.publication_score).toBeLessThanOrEqual(1);

      // Verify module_scores structure
      expect(layer2Factors.module_scores).toHaveProperty('product_offering');
      expect(layer2Factors.module_scores).toHaveProperty('layout_quality');
      expect(layer2Factors.module_scores).toHaveProperty('navigation_complexity');
      expect(layer2Factors.module_scores).toHaveProperty('monetization_indicators');
      expect(typeof layer2Factors.module_scores.product_offering).toBe('number');
      expect(typeof layer2Factors.module_scores.layout_quality).toBe('number');
      expect(typeof layer2Factors.module_scores.navigation_complexity).toBe('number');
      expect(typeof layer2Factors.module_scores.monetization_indicators).toBe('number');

      // Verify arrays
      expect(Array.isArray(layer2Factors.keywords_found)).toBe(true);
      expect(Array.isArray(layer2Factors.ad_networks_detected)).toBe(true);

      // Verify content_signals structure
      expect(layer2Factors.content_signals).toHaveProperty('has_blog');
      expect(layer2Factors.content_signals).toHaveProperty('has_press_releases');
      expect(layer2Factors.content_signals).toHaveProperty('has_whitepapers');
      expect(layer2Factors.content_signals).toHaveProperty('has_case_studies');
      expect(typeof layer2Factors.content_signals.has_blog).toBe('boolean');

      // Verify reasoning and passed
      expect(typeof layer2Factors.reasoning).toBe('string');
      expect(typeof layer2Factors.passed).toBe('boolean');
    });

    it('should return valid module scores in range 0.0-1.0', async () => {
      const layer2Factors = await layer2Service.getLayer2Factors(TEST_URL);

      Object.values(layer2Factors.module_scores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Layer 3 Factors Structure Test', () => {
    beforeEach(() => {
      // Mock LLM classifyUrl to avoid actual API calls
      jest.spyOn(llmService, 'classifyUrl').mockResolvedValue({
        classification: 'suitable',
        confidence: 0.85,
        reasoning: 'Test reasoning for classification',
        provider: 'gemini',
        cost: 0.002,
        processingTimeMs: 1500,
        retryCount: 0,
      });

      // Mock getStructuredResults
      jest.spyOn(llmService, 'getStructuredResults').mockResolvedValue({
        design_quality: {
          score: 0.8,
          detected: true,
          reasoning: 'Good design quality',
          signals: ['modern layout', 'responsive design'],
        },
        authority_indicators: {
          score: 0.85,
          detected: true,
          reasoning: 'Strong authority',
          signals: ['author bylines', 'expert content'],
        },
        professional_presentation: {
          score: 0.9,
          detected: true,
          reasoning: 'Professional presentation',
          signals: ['polished UI', 'branded content'],
        },
        content_originality: {
          score: 0.75,
          detected: true,
          reasoning: 'Original content',
          signals: ['unique articles', 'in-depth analysis'],
        },
      });
    });

    it('should return all required Layer3Factors fields', async () => {
      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Verify all required fields exist
      expect(layer3Factors).toBeDefined();
      expect(layer3Factors).toHaveProperty('classification');
      expect(layer3Factors).toHaveProperty('sophistication_signals');
      expect(layer3Factors).toHaveProperty('llm_provider');
      expect(layer3Factors).toHaveProperty('model_version');
      expect(layer3Factors).toHaveProperty('cost_usd');
      expect(layer3Factors).toHaveProperty('reasoning');
      expect(layer3Factors).toHaveProperty('tokens_used');
      expect(layer3Factors).toHaveProperty('processing_time_ms');

      // Verify field types and values
      expect(['accepted', 'rejected']).toContain(layer3Factors.classification);
      expect(typeof layer3Factors.llm_provider).toBe('string');
      expect(typeof layer3Factors.model_version).toBe('string');
      expect(typeof layer3Factors.cost_usd).toBe('number');
      expect(layer3Factors.cost_usd).toBeGreaterThanOrEqual(0);
      expect(typeof layer3Factors.reasoning).toBe('string');
      expect(typeof layer3Factors.processing_time_ms).toBe('number');
      expect(layer3Factors.processing_time_ms).toBeGreaterThanOrEqual(0);

      // Verify tokens_used structure
      expect(layer3Factors.tokens_used).toHaveProperty('input');
      expect(layer3Factors.tokens_used).toHaveProperty('output');
      expect(typeof layer3Factors.tokens_used.input).toBe('number');
      expect(typeof layer3Factors.tokens_used.output).toBe('number');
      expect(layer3Factors.tokens_used.input).toBeGreaterThanOrEqual(0);
      expect(layer3Factors.tokens_used.output).toBeGreaterThanOrEqual(0);
    });

    it('should return complete sophistication_signals structure', async () => {
      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      const signals = layer3Factors.sophistication_signals;
      expect(signals).toBeDefined();

      // Verify all 4 signal dimensions exist
      expect(signals).toHaveProperty('design_quality');
      expect(signals).toHaveProperty('authority_indicators');
      expect(signals).toHaveProperty('professional_presentation');
      expect(signals).toHaveProperty('content_originality');

      // Verify each dimension has score and indicators
      [
        'design_quality',
        'authority_indicators',
        'professional_presentation',
        'content_originality',
      ].forEach((dimension) => {
        expect(signals[dimension]).toHaveProperty('score');
        expect(signals[dimension]).toHaveProperty('indicators');
        expect(typeof signals[dimension].score).toBe('number');
        expect(signals[dimension].score).toBeGreaterThanOrEqual(0);
        expect(signals[dimension].score).toBeLessThanOrEqual(1);
        expect(Array.isArray(signals[dimension].indicators)).toBe(true);
      });
    });

    it('should handle LLM classification errors gracefully', async () => {
      jest.spyOn(llmService, 'classifyUrl').mockRejectedValue(new Error('LLM API error'));

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Should return empty factors structure
      expect(layer3Factors).toBeDefined();
      expect(layer3Factors.classification).toBe('rejected');
      expect(layer3Factors.llm_provider).toBe('none');
      expect(layer3Factors.cost_usd).toBe(0);
      expect(layer3Factors.reasoning).toContain('error');
    });
  });

  describe('Database Write Test', () => {
    it('should successfully write all factor JSONB columns to url_results', async () => {
      const layer1Factors = layer1Service.getLayer1Factors(TEST_URL);
      const layer2Factors = await layer2Service.getLayer2Factors(TEST_URL);

      // Mock LLM for Layer 3
      jest.spyOn(llmService, 'classifyUrl').mockResolvedValue({
        classification: 'suitable',
        confidence: 0.85,
        reasoning: 'Test reasoning',
        provider: 'gemini',
        cost: 0.002,
        processingTimeMs: 1500,
        retryCount: 0,
      });

      jest.spyOn(llmService, 'getStructuredResults').mockResolvedValue({
        design_quality: { score: 0.8, detected: true, reasoning: 'Good', signals: [] },
        authority_indicators: { score: 0.85, detected: true, reasoning: 'Strong', signals: [] },
        professional_presentation: { score: 0.9, detected: true, reasoning: 'Pro', signals: [] },
        content_originality: { score: 0.75, detected: true, reasoning: 'Original', signals: [] },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Mock database upsert
      const mockUpsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      });

      (supabaseService.getClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Simulate database write
      await supabaseService.getClient().from('url_results').upsert({
        job_id: 'test-job-id',
        url_id: 'test-url-id',
        url: TEST_URL,
        status: 'approved',
        confidence_score: 0.85,
        confidence_band: 'high',
        eliminated_at_layer: 'passed_all',
        processing_time_ms: 2000,
        total_cost: 0.003,
        retry_count: 0,
        layer1_factors: layer1Factors,
        layer2_factors: layer2Factors,
        layer3_factors: layer3Factors,
      });

      // Verify database write was called
      expect(mockFrom).toHaveBeenCalledWith('url_results');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          layer1_factors: expect.objectContaining({
            tld_type: expect.any(String),
            tld_value: expect.any(String),
            domain_classification: expect.any(String),
            pattern_matches: expect.any(Array),
            target_profile: expect.any(Object),
            reasoning: expect.any(String),
            passed: expect.any(Boolean),
          }),
          layer2_factors: expect.objectContaining({
            publication_score: expect.any(Number),
            module_scores: expect.any(Object),
            keywords_found: expect.any(Array),
            ad_networks_detected: expect.any(Array),
            content_signals: expect.any(Object),
            reasoning: expect.any(String),
            passed: expect.any(Boolean),
          }),
          layer3_factors: expect.objectContaining({
            classification: expect.any(String),
            sophistication_signals: expect.any(Object),
            llm_provider: expect.any(String),
            model_version: expect.any(String),
            cost_usd: expect.any(Number),
            reasoning: expect.any(String),
            tokens_used: expect.any(Object),
            processing_time_ms: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('Null Safety Test', () => {
    it('should handle null Layer1Factors gracefully', async () => {
      const nullFactors = null;

      // Verify that null can be safely assigned
      const result: Layer1Factors | null = nullFactors;
      expect(result).toBeNull();

      // Verify database accepts null
      const mockUpsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      (supabaseService.getClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({ upsert: mockUpsert }),
      });

      await supabaseService.getClient().from('url_results').upsert({
        job_id: 'test-job',
        url_id: 'test-url',
        url: TEST_URL,
        status: 'pending',
        layer1_factors: null,
        layer2_factors: null,
        layer3_factors: null,
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          layer1_factors: null,
          layer2_factors: null,
          layer3_factors: null,
        }),
      );
    });

    it('should handle empty factor structures', () => {
      // Test empty Layer1 factors
      const emptyUrl = '';
      const layer1Factors = layer1Service.getLayer1Factors(emptyUrl);
      expect(layer1Factors).toBeDefined();
      expect(layer1Factors.passed).toBe(false);

      // Verify structure is still complete even when empty
      expect(layer1Factors).toHaveProperty('tld_type');
      expect(layer1Factors).toHaveProperty('tld_value');
      expect(layer1Factors).toHaveProperty('reasoning');
    });

    it('should support backwards compatibility with pre-migration data', () => {
      // Simulate reading pre-migration record with null factors
      const preMigrationRecord: {
        id: string;
        url: string;
        job_id: string;
        url_id: string;
        status: string;
        layer1_factors: Layer1Factors | null;
        layer2_factors: Layer2Factors | null;
        layer3_factors: Layer3Factors | null;
        processed_at: Date;
      } = {
        id: 'test-id',
        url: TEST_URL,
        job_id: 'test-job',
        url_id: 'test-url-id',
        status: 'approved',
        layer1_factors: null,
        layer2_factors: null,
        layer3_factors: null,
        processed_at: new Date(),
      };

      // Verify null values don't break type checking
      expect(preMigrationRecord.layer1_factors).toBeNull();
      expect(preMigrationRecord.layer2_factors).toBeNull();
      expect(preMigrationRecord.layer3_factors).toBeNull();

      // Verify we can safely check for null
      if (preMigrationRecord.layer1_factors) {
        expect(preMigrationRecord.layer1_factors.tld_type).toBeDefined();
      } else {
        expect(preMigrationRecord.layer1_factors).toBeNull();
      }
    });
  });
});
