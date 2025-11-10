import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from '../settings.service';
import { SupabaseService } from '../../supabase/supabase.service';
import type { ClassificationSettings } from '@website-scraper/shared';

describe('SettingsService - Advanced Validation Tests', () => {
  let service: SettingsService;
  let supabaseService: SupabaseService;
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

    const mockSupabaseClient = {
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
      providers: [
        SettingsService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    supabaseService = module.get<SupabaseService>(SupabaseService);

    // Clear cache before each test
    service.invalidateCache();
  });

  describe('Confidence Band Gap Detection', () => {
    it('should reject confidence bands with gaps', async () => {
      // Mock database to return current settings
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Attempt to update with bands that have a gap (0.5-0.6 missing)
      const invalidBands = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.6, max: 0.79, action: 'manual_review' },
          low: { min: 0.3, max: 0.49, action: 'manual_review' },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
        },
      };

      await expect(service.updateSettings(invalidBands)).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings(invalidBands)).rejects.toThrow(/gap or overlap/i);
    });

    it('should reject confidence bands with overlaps', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Bands with overlap (0.7-0.85 overlaps with 0.8-1.0)
      const invalidBands = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.5, max: 0.85, action: 'manual_review' }, // Overlaps with high
          low: { min: 0.3, max: 0.49, action: 'manual_review' },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
        },
      };

      await expect(service.updateSettings(invalidBands)).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings(invalidBands)).rejects.toThrow(/gap or overlap/i);
    });

    it('should reject confidence bands that do not start at 0.0', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const invalidBands = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' },
          low: { min: 0.3, max: 0.49, action: 'manual_review' },
          auto_reject: { min: 0.1, max: 0.29, action: 'reject' }, // Starts at 0.1 instead of 0.0
        },
      };

      await expect(service.updateSettings(invalidBands)).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings(invalidBands)).rejects.toThrow(/must start at 0\.0/i);
    });

    it('should reject confidence bands that do not end at 1.0', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const invalidBands = {
        confidence_bands: {
          high: { min: 0.8, max: 0.95, action: 'auto_approve' }, // Ends at 0.95 instead of 1.0
          medium: { min: 0.5, max: 0.79, action: 'manual_review' },
          low: { min: 0.3, max: 0.49, action: 'manual_review' },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
        },
      };

      await expect(service.updateSettings(invalidBands)).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings(invalidBands)).rejects.toThrow(/must end at 1\.0/i);
    });

    it('should reject confidence bands where min >= max', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Create bands where one has inverted min/max (min > max)
      const invalidBands = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' },
          low: { min: 0.49, max: 0.3, action: 'manual_review' }, // min > max (inverted)
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
        },
      };

      await expect(service.updateSettings(invalidBands)).rejects.toThrow(BadRequestException);
      // This will trigger either gap/overlap or min>max error depending on sorting
      await expect(service.updateSettings(invalidBands)).rejects.toThrow();
    });

    it('should accept valid continuous confidence bands', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const validBands = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.5, max: 0.8, action: 'manual_review' }, // 0.8 matches high.min
          low: { min: 0.3, max: 0.5, action: 'manual_review' }, // 0.5 matches medium.min
          auto_reject: { min: 0.0, max: 0.3, action: 'reject' }, // 0.3 matches low.min
        },
      };

      const updatedSettings = {
        ...mockSettings,
        ...validBands,
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      const result = await service.updateSettings(validBands);
      expect(result).toBeDefined();
      expect(result.confidence_bands).toEqual(validBands.confidence_bands);
    });

    it('should handle floating point precision in confidence band validation', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = { ...mockSettings, updated_at: new Date().toISOString() };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      // Bands with slight floating point differences (within 0.001 tolerance)
      const validBands = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.5, max: 0.7999, action: 'manual_review' }, // 0.7999 instead of 0.79
          low: { min: 0.3, max: 0.4999, action: 'manual_review' },
          auto_reject: { min: 0.0, max: 0.2999, action: 'reject' },
        },
      };

      const result = await service.updateSettings(validBands);
      expect(result).toBeDefined();
    });
  });

  describe('Partial Updates', () => {
    it('should accept partial update with only Layer 2 rules', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = {
        ...mockSettings,
        layer2_rules: {
          ...mockSettings.layer2_rules,
          blog_freshness_days: 120,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      const partialUpdate = {
        layer2_rules: {
          blog_freshness_days: 120,
          required_pages_count: 2,
          min_tech_stack_tools: 2,
          tech_stack_tools: {
            analytics: [],
            marketing: [],
          },
          min_design_quality_score: 6,
        },
      };

      const result = await service.updateSettings(partialUpdate);
      expect(result.layer2_rules?.blog_freshness_days).toBe(120);
      // Other layers should remain unchanged
      expect(result.layer1_rules).toBeDefined();
      expect(result.layer3_rules).toBeDefined();
    });

    it('should accept partial update with only Layer 3 rules', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = {
        ...mockSettings,
        layer3_rules: {
          ...mockSettings.layer3_rules,
          llm_temperature: 0.7,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      const partialUpdate = {
        layer3_rules: {
          content_marketing_indicators: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.7,
          content_truncation_limit: 10000,
        },
      };

      const result = await service.updateSettings(partialUpdate);
      expect(result.layer3_rules?.llm_temperature).toBe(0.7);
    });

    it('should accept partial update with multiple layers', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = {
        ...mockSettings,
        layer2_rules: {
          ...mockSettings.layer2_rules,
          blog_freshness_days: 60,
        },
        layer3_rules: {
          ...mockSettings.layer3_rules,
          llm_temperature: 0.5,
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      const partialUpdate = {
        layer2_rules: {
          blog_freshness_days: 60,
          required_pages_count: 2,
          min_tech_stack_tools: 2,
          tech_stack_tools: {
            analytics: [],
            marketing: [],
          },
          min_design_quality_score: 6,
        },
        layer3_rules: {
          content_marketing_indicators: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.5,
          content_truncation_limit: 10000,
        },
      };

      const result = await service.updateSettings(partialUpdate);
      expect(result.layer2_rules?.blog_freshness_days).toBe(60);
      expect(result.layer3_rules?.llm_temperature).toBe(0.5);
    });

    it('should accept partial update with only confidence bands', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = {
        ...mockSettings,
        confidence_bands: {
          high: { min: 0.9, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.6, max: 0.89, action: 'manual_review' },
          low: { min: 0.3, max: 0.59, action: 'manual_review' },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
        },
        updated_at: new Date().toISOString(),
      };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      const partialUpdate = {
        confidence_bands: {
          high: { min: 0.9, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.6, max: 0.9, action: 'manual_review' }, // 0.9 matches high.min
          low: { min: 0.3, max: 0.6, action: 'manual_review' }, // 0.6 matches medium.min
          auto_reject: { min: 0.0, max: 0.3, action: 'reject' }, // 0.3 matches low.min
        },
      };

      const result = await service.updateSettings(partialUpdate);
      expect(result.confidence_bands?.high.min).toBe(0.9);
    });
  });

  describe('Regex Pattern Validation', () => {
    it('should reject unsafe regex patterns in prefilter rules', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // ReDoS vulnerable pattern
      const unsafePattern = {
        prefilter_rules: [
          {
            category: 'test',
            pattern: '(a+)+b', // ReDoS vulnerable
            reasoning: 'Test',
            enabled: true,
          },
        ],
      };

      await expect(service.updateSettings(unsafePattern)).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings(unsafePattern)).rejects.toThrow(/ReDoS/i);
    });

    it('should reject unsafe regex patterns in Layer 1 URL exclusions', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // ReDoS vulnerable pattern in Layer 1
      const unsafePattern = {
        layer1_rules: {
          tld_filters: {
            commercial: ['.com'],
            non_commercial: ['.org'],
            personal: ['.me'],
          },
          industry_keywords: ['SaaS'],
          url_pattern_exclusions: [
            {
              category: 'test',
              pattern: '(x+)*y', // ReDoS vulnerable
              reasoning: 'Test',
              enabled: true,
            },
          ],
          target_elimination_rate: 0.5,
        },
      };

      await expect(service.updateSettings(unsafePattern)).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings(unsafePattern)).rejects.toThrow(/ReDoS/i);
    });

    it('should accept safe regex patterns', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const updatedSettings = { ...mockSettings, updated_at: new Date().toISOString() };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      const safePattern = {
        prefilter_rules: [
          {
            category: 'test',
            pattern: 'example\\.com',
            reasoning: 'Test',
            enabled: true,
          },
        ],
      };

      const result = await service.updateSettings(safePattern);
      expect(result).toBeDefined();
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSingleFn.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const result = await service.getSettings();
      expect(result.id).toBe('default'); // Should return defaults
    });

    it('should throw BadRequestException on database update failures', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      mockUpdateSingleFn.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const update = {
        layer2_rules: {
          blog_freshness_days: 120,
          required_pages_count: 2,
          min_tech_stack_tools: 2,
          tech_stack_tools: {
            analytics: [],
            marketing: [],
          },
          min_design_quality_score: 6,
        },
      };

      await expect(service.updateSettings(update)).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings(update)).rejects.toThrow(/Database error/i);
    });
  });

  describe('Cache Behavior', () => {
    it('should cache settings after first database load', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // First call - should hit database
      const first = await service.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const second = await service.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1); // Still 1

      expect(first.id).toBe(second.id);
    });

    it('should invalidate cache after update', async () => {
      const mockSettings: ClassificationSettings = service.getDefaultSettings();
      mockSingleFn.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Load settings into cache
      await service.getSettings();
      expect(mockSingleFn).toHaveBeenCalledTimes(1);

      // Update settings
      const updatedSettings = { ...mockSettings, updated_at: new Date().toISOString() };
      mockUpdateSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      const result = await service.updateSettings({
        layer2_rules: {
          blog_freshness_days: 120,
          required_pages_count: 2,
          min_tech_stack_tools: 2,
          tech_stack_tools: {
            analytics: [],
            marketing: [],
          },
          min_design_quality_score: 6,
        },
      });

      // updateSettings invalidates cache AND repopulates it with updated data
      // So the next getSettings should use the cached updated settings
      const cachedSettings = await service.getSettings();
      // Should still be 1 call to mockSingleFn since cache was repopulated by updateSettings
      expect(mockSingleFn).toHaveBeenCalledTimes(1);
      expect(cachedSettings.updated_at).toBe(result.updated_at);

      // Manually invalidate cache to verify next getSettings hits database
      service.invalidateCache();
      mockSingleFn.mockResolvedValue({
        data: updatedSettings,
        error: null,
      });

      await service.getSettings();
      // Now should have been called again (2 times total)
      expect(mockSingleFn).toHaveBeenCalledTimes(2);
    });

    it('should allow manual cache invalidation', () => {
      // This should not throw
      expect(() => service.invalidateCache()).not.toThrow();
    });
  });
});
