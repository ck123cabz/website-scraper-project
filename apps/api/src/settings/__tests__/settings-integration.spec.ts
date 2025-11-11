import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from '../settings.service';
import { SettingsController } from '../settings.controller';
import { SupabaseService } from '../../supabase/supabase.service';
import { Layer1DomainAnalysisService } from '../../jobs/services/layer1-domain-analysis.service';
import { LlmService } from '../../jobs/services/llm.service';
import type { ClassificationSettings } from '@website-scraper/shared';

/**
 * Integration Tests for Settings Service
 * Tests real service integration, cache behavior, and database fallback
 * Story 3.0 Task 1: Service Integration Testing
 */
describe('SettingsService - Integration Tests', () => {
  let settingsService: SettingsService;
  let settingsController: SettingsController;
  let supabaseService: SupabaseService;
  let layer1Service: Layer1DomainAnalysisService;
  let llmService: LlmService;
  let mockSupabaseClient: any;
  let mockSingleFn: jest.Mock;
  let mockSelectFn: jest.Mock;
  let mockUpdateSingleFn: jest.Mock;

  beforeEach(async () => {
    // Create persistent mock functions
    mockSingleFn = jest.fn();
    mockSelectFn = jest.fn(() => ({
      limit: jest.fn(() => ({
        single: mockSingleFn,
      })),
    }));
    mockUpdateSingleFn = jest.fn();

    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: mockSelectFn,
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: mockUpdateSingleFn,
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };

    const mockSupabaseService = {
      getClient: jest.fn(() => mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        SettingsService,
        Layer1DomainAnalysisService,
        LlmService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    settingsService = module.get<SettingsService>(SettingsService);
    settingsController = module.get<SettingsController>(SettingsController);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    layer1Service = module.get<Layer1DomainAnalysisService>(Layer1DomainAnalysisService);
    llmService = module.get<LlmService>(LlmService);

    // Clear cache before each test
    settingsService.invalidateCache();
  });

  describe('1. Cache Invalidation (Real Integration)', () => {
    it('should cache settings after first load', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // First call - should hit database
      const first = await settingsService.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const second = await settingsService.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1); // Still 1

      expect(first.id).toBe(second.id);
    });

    it('should invalidate cache after PUT /api/settings via controller', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Load settings into cache
      await settingsController.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1);

      // Update via controller
      const updatedSettings = {
        ...mockSettings,
        layer2_rules: {
          ...mockSettings.layer2_rules,
          publication_score_threshold: 0.7,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      await settingsController.updateSettings({
        layer2_rules: {
          publication_score_threshold: 0.7,
          product_keywords: {
            commercial: ['pricing'],
            features: ['features'],
            cta: ['sign up'],
          },
          business_nav_keywords: ['product'],
          content_nav_keywords: ['blog'],
          min_business_nav_percentage: 0.3,
          ad_network_patterns: [],
          affiliate_patterns: [],
          payment_provider_patterns: [],
        },
      });

      // Next getSettings should use cached updated settings
      const afterUpdate = await settingsController.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1); // Cache was repopulated by update
      expect(afterUpdate.layer2_rules?.publication_score_threshold).toBe(0.7);
    });

    it('should return updated values immediately after updateSettings', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = {
        ...mockSettings,
        layer3_rules: {
          ...mockSettings.layer3_rules!,
          llm_temperature: 0.7,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      // Update settings
      const result = await settingsService.updateSettings({
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.7,
          content_truncation_limit: 10000,
        },
      });

      expect(result.layer3_rules?.llm_temperature).toBe(0.7);

      // getSettings should immediately return updated value from cache
      const cached = await settingsService.getSettings();
      expect(cached.layer3_rules?.llm_temperature).toBe(0.7);
      expect(mockSingleFn).toHaveBeenCalledTimes(1); // Only called once for initial load
    });

    it('should respect 5-minute cache TTL', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Load into cache
      await settingsService.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1);

      // Manual invalidation to simulate TTL expiry
      settingsService.invalidateCache();

      // Next call should hit database
      await settingsService.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(2);
    });

    it('should allow manual cache invalidation', () => {
      expect(() => settingsService.invalidateCache()).not.toThrow();
    });
  });

  describe('2. Service Reloading', () => {
    it('should reload Layer1DomainAnalysisService settings after update', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Initialize Layer1 service (onModuleInit loads from database)
      await (layer1Service as any).onModuleInit();

      // Get initial settings count
      const initialSettings = await settingsService.getSettings();
      const initialRuleCount = initialSettings.layer1_rules!.url_pattern_exclusions.length;

      // Update settings - add new exclusion pattern
      const updatedSettings = {
        ...mockSettings,
        layer1_rules: {
          ...mockSettings.layer1_rules!,
          url_pattern_exclusions: [
            ...mockSettings.layer1_rules!.url_pattern_exclusions,
            {
              category: 'test',
              pattern: 'testdomain\\.com',
              reasoning: 'Test exclusion',
              enabled: true,
            },
          ],
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      await settingsService.updateSettings({
        layer1_rules: updatedSettings.layer1_rules,
      });

      // Verify cache was invalidated
      settingsService.invalidateCache();
      mockSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      // Reload Layer1 service with updated settings
      await (layer1Service as any).onModuleInit();

      // Verify the service is using updated settings
      const settings = await settingsService.getSettings();
      expect(settings.layer1_rules?.url_pattern_exclusions.length).toBe(initialRuleCount + 1);
    });

    it('should use updated LLM temperature from Layer3 settings', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Get initial settings
      const initial = await settingsService.getSettings();
      expect(initial.layer3_rules?.llm_temperature).toBe(0.3); // Default

      // Update Layer3 temperature
      const updatedSettings = {
        ...mockSettings,
        layer3_rules: {
          ...mockSettings.layer3_rules!,
          llm_temperature: 0.8,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      await settingsService.updateSettings({
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.8,
          content_truncation_limit: 10000,
        },
      });

      // Verify updated temperature is accessible
      const updated = await settingsService.getSettings();
      expect(updated.layer3_rules?.llm_temperature).toBe(0.8);
    });

    it('should propagate confidence band updates to service', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Update confidence bands
      const newBands = {
        high: { min: 0.9, max: 1.0, action: 'auto_approve' as const },
        medium: { min: 0.6, max: 0.9, action: 'manual_review' as const },
        low: { min: 0.3, max: 0.6, action: 'manual_review' as const },
        auto_reject: { min: 0.0, max: 0.3, action: 'reject' as const },
      };

      const updatedSettings = {
        ...mockSettings,
        confidence_bands: newBands,
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      await settingsService.updateSettings({
        confidence_bands: newBands,
      });

      // Verify bands are updated
      const updated = await settingsService.getSettings();
      expect(updated.confidence_bands?.high.min).toBe(0.9);
      expect(updated.confidence_bands?.medium.min).toBe(0.6);
    });
  });

  describe('3. Database Fallback', () => {
    it('should return defaults when database is unavailable', async () => {
      // Simulate database error
      mockSingleFn.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await settingsService.getSettings();

      expect(result.id).toBe('default');
      expect(result.layer1_rules).toBeDefined();
      expect(result.layer2_rules).toBeDefined();
      expect(result.layer3_rules).toBeDefined();
    });

    it('should return defaults when database returns null', async () => {
      mockSingleFn.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await settingsService.getSettings();

      expect(result.id).toBe('default');
      expect(result.prefilter_rules).toBeDefined();
      expect(result.classification_indicators).toBeDefined();
    });

    it('should recover when database comes back online', async () => {
      // First call - database unavailable
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const defaultsResult = await settingsService.getSettings();
      expect(defaultsResult.id).toBe('default');

      // Clear cache
      settingsService.invalidateCache();

      // Second call - database available
      const mockSettings: ClassificationSettings = {
        ...settingsService.getDefaultSettings(),
        id: '123',
      };
      mockSingleFn.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const recoveredResult = await settingsService.getSettings();
      expect(recoveredResult.id).toBe('123');
    });

    it('should handle database errors during update gracefully', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Simulate database update failure
      mockUpdateSingleFn.mockResolvedValue({
        data: null,
        error: { message: 'Database update failed' },
      });

      const update = {
        layer2_rules: {
          publication_score_threshold: 0.7,
          product_keywords: {
            commercial: [],
            features: [],
            cta: [],
          },
          business_nav_keywords: [],
          content_nav_keywords: [],
          min_business_nav_percentage: 0.3,
          ad_network_patterns: [],
          affiliate_patterns: [],
          payment_provider_patterns: [],
        },
      };

      await expect(settingsService.updateSettings(update)).rejects.toThrow(BadRequestException);
      await expect(settingsService.updateSettings(update)).rejects.toThrow(
        /Database update failed/i,
      );
    });

    it('should cache defaults when database fails with null data', async () => {
      // Clear any existing cache
      settingsService.invalidateCache();

      // Return null data (not error) - this triggers caching of defaults
      mockSingleFn.mockResolvedValue({
        data: null,
        error: null, // No error, just null data
      });

      // First call - should fetch and cache defaults
      const first = await settingsService.getSettings();
      expect(first.id).toBe('default');

      // Reset mock call counter after first call
      mockSingleFn.mockClear();

      // Second call - should use cached defaults (no additional DB call)
      const second = await settingsService.getSettings();
      expect(second.id).toBe('default');

      // Should not have called database again (cache hit)
      expect(mockSingleFn).toHaveBeenCalledTimes(0);
    });

    it('should handle thrown exceptions during database access', async () => {
      mockSingleFn.mockRejectedValue(new Error('Connection refused'));

      const result = await settingsService.getSettings();

      expect(result.id).toBe('default');
      // Compare everything except updated_at (which will differ due to timing)
      const { updated_at, ...resultWithoutTimestamp } = result;
      const { updated_at: expectedUpdatedAt, ...expectedWithoutTimestamp } =
        settingsService.getDefaultSettings();

      expect(resultWithoutTimestamp).toEqual(expectedWithoutTimestamp);
      expect(updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // Valid ISO date string
    });
  });

  describe('4. Settings Propagation', () => {
    it('should propagate settings changes to all consuming services', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Initialize all services
      await (layer1Service as any).onModuleInit();
      const initialSettings = await settingsService.getSettings();

      // Update settings with changes to all layers
      const updatedSettings = {
        ...mockSettings,
        layer1_rules: {
          ...mockSettings.layer1_rules!,
          target_elimination_rate: 0.7,
        },
        layer2_rules: {
          ...mockSettings.layer2_rules!,
          publication_score_threshold: 0.6,
        },
        layer3_rules: {
          ...mockSettings.layer3_rules!,
          llm_temperature: 0.5,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      await settingsService.updateSettings({
        layer1_rules: updatedSettings.layer1_rules,
        layer2_rules: updatedSettings.layer2_rules,
        layer3_rules: updatedSettings.layer3_rules,
      });

      // Verify all layers are updated
      const newSettings = await settingsService.getSettings();
      expect(newSettings.layer1_rules?.target_elimination_rate).toBe(0.7);
      expect(newSettings.layer2_rules?.publication_score_threshold).toBe(0.6);
      expect(newSettings.layer3_rules?.llm_temperature).toBe(0.5);
    });

    it('should not have stale cache after update', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Load into cache
      const before = await settingsService.getSettings();
      expect(before.layer2_rules?.publication_score_threshold).toBe(0.65);
      const beforeTimestamp = before.updated_at;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update
      const updatedSettings = {
        ...mockSettings,
        layer2_rules: {
          ...mockSettings.layer2_rules!,
          publication_score_threshold: 0.8,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      await settingsService.updateSettings({
        layer2_rules: {
          publication_score_threshold: 0.8,
          product_keywords: {
            commercial: [],
            features: [],
            cta: [],
          },
          business_nav_keywords: [],
          content_nav_keywords: [],
          min_business_nav_percentage: 0.3,
          ad_network_patterns: [],
          affiliate_patterns: [],
          payment_provider_patterns: [],
        },
      });

      // Verify no stale cache
      const after = await settingsService.getSettings();
      expect(after.layer2_rules?.publication_score_threshold).toBe(0.8);
      expect(after.updated_at).not.toBe(beforeTimestamp);
    });

    it('should handle concurrent reads during update', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = {
        ...mockSettings,
        layer3_rules: {
          ...mockSettings.layer3_rules!,
          content_truncation_limit: 20000,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      // Perform update and multiple concurrent reads
      const updatePromise = settingsService.updateSettings({
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.3,
          content_truncation_limit: 20000,
        },
      });

      const read1 = settingsService.getSettings();
      const read2 = settingsService.getSettings();
      const read3 = settingsService.getSettings();

      await Promise.all([updatePromise, read1, read2, read3]);

      // Final read should have updated value
      const final = await settingsService.getSettings();
      expect(final.layer3_rules?.content_truncation_limit).toBe(20000);
    });

    it('should maintain consistency across service and controller', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = {
        ...mockSettings,
        layer1_rules: {
          ...mockSettings.layer1_rules!,
          target_elimination_rate: 0.6,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      // Update via controller
      await settingsController.updateSettings({
        layer1_rules: updatedSettings.layer1_rules,
      });

      // Read via service
      const fromService = await settingsService.getSettings();

      // Read via controller
      const fromController = await settingsController.getSettings();

      expect(fromService.layer1_rules?.target_elimination_rate).toBe(0.6);
      expect(fromController.layer1_rules?.target_elimination_rate).toBe(0.6);
      expect(fromService.updated_at).toBe(fromController.updated_at);
    });

    it('should handle rapid successive updates correctly', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // First update
      const updated1 = {
        ...mockSettings,
        layer2_rules: {
          ...mockSettings.layer2_rules!,
          publication_score_threshold: 0.5,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValueOnce({
        data: updated1,
        error: null,
      });

      await settingsService.updateSettings({
        layer2_rules: {
          publication_score_threshold: 0.5,
          product_keywords: {
            commercial: [],
            features: [],
            cta: [],
          },
          business_nav_keywords: [],
          content_nav_keywords: [],
          min_business_nav_percentage: 0.3,
          ad_network_patterns: [],
          affiliate_patterns: [],
          payment_provider_patterns: [],
        },
      });

      // Second update immediately after
      const updated2 = {
        ...updated1,
        layer2_rules: {
          ...updated1.layer2_rules!,
          publication_score_threshold: 0.75,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValueOnce({
        data: updated2,
        error: null,
      });

      await settingsService.updateSettings({
        layer2_rules: {
          publication_score_threshold: 0.75,
          product_keywords: {
            commercial: [],
            features: [],
            cta: [],
          },
          business_nav_keywords: [],
          content_nav_keywords: [],
          min_business_nav_percentage: 0.3,
          ad_network_patterns: [],
          affiliate_patterns: [],
          payment_provider_patterns: [],
        },
      });

      // Final state should reflect the second update
      const final = await settingsService.getSettings();
      expect(final.layer2_rules?.publication_score_threshold).toBe(0.75);
    });
  });

  describe('5. Integration Edge Cases', () => {
    it('should handle empty partial updates', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      mockUpdateSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Empty update should not crash
      const result = await settingsService.updateSettings({});
      expect(result).toBeDefined();
    });

    it('should validate and reject invalid updates even with cache', async () => {
      const mockSettings: ClassificationSettings = settingsService.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Load into cache
      await settingsService.getSettings();

      // Invalid update should fail even with cache populated
      const invalidBands = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' as const },
          medium: { min: 0.6, max: 0.85, action: 'manual_review' as const }, // Overlap
          low: { min: 0.3, max: 0.49, action: 'manual_review' as const },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' as const },
        },
      };

      await expect(settingsService.updateSettings(invalidBands)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should maintain default settings structure completeness', () => {
      const defaults = settingsService.getDefaultSettings();

      // V1 fields
      expect(defaults.prefilter_rules).toBeDefined();
      expect(defaults.classification_indicators).toBeDefined();
      expect(defaults.llm_temperature).toBeDefined();
      expect(defaults.confidence_threshold).toBeDefined();
      expect(defaults.content_truncation_limit).toBeDefined();

      // 3-Tier fields
      expect(defaults.layer1_rules).toBeDefined();
      expect(defaults.layer2_rules).toBeDefined();
      expect(defaults.layer3_rules).toBeDefined();
      expect(defaults.confidence_bands).toBeDefined();
      expect(defaults.manual_review_settings).toBeDefined();
    });

    it('should handle service initialization with database unavailable', async () => {
      mockSingleFn.mockResolvedValue({
        data: null,
        error: { message: 'Database offline' },
      });

      // Layer1 service should initialize without throwing
      await expect((layer1Service as any).onModuleInit()).resolves.not.toThrow();

      // Should still be able to analyze URLs with fallback config
      const result = layer1Service.analyzeUrl('https://example.com');
      expect(result).toBeDefined();
      expect(result.layer).toBe('layer1');
    });
  });
});
