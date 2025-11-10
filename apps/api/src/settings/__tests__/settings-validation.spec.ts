import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SettingsService } from '../settings.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
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
          high: { min: 0.8, max: 1.0, action: 'auto_approve' as const },
          medium: { min: 0.6, max: 0.79, action: 'manual_review' as const },
          low: { min: 0.3, max: 0.49, action: 'manual_review' as const },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' as const },
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
          guest_post_red_flags: ['Test'],
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
          guest_post_red_flags: ['Test'],
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

  describe('Layer-Specific Field Boundary Validation', () => {
    describe('Layer 2 - blog_freshness_days (30-180)', () => {
      it('should reject blog_freshness_days below minimum (29)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer2_rules: {
            blog_freshness_days: 29,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should reject blog_freshness_days above maximum (181)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer2_rules: {
            blog_freshness_days: 181,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should accept blog_freshness_days at minimum boundary (30)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, blog_freshness_days: 30 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 30,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.blog_freshness_days).toBe(30);
      });

      it('should accept blog_freshness_days at middle value (90)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, blog_freshness_days: 90 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.blog_freshness_days).toBe(90);
      });

      it('should accept blog_freshness_days at maximum boundary (180)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, blog_freshness_days: 180 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 180,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.blog_freshness_days).toBe(180);
      });
    });

    describe('Layer 2 - required_pages_count (1-3)', () => {
      it('should reject required_pages_count below minimum (0)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 0,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should reject required_pages_count above maximum (4)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 4,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should accept required_pages_count at minimum boundary (1)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, required_pages_count: 1 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 1,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.required_pages_count).toBe(1);
      });

      it('should accept required_pages_count at middle value (2)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, required_pages_count: 2 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.required_pages_count).toBe(2);
      });

      it('should accept required_pages_count at maximum boundary (3)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, required_pages_count: 3 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 3,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.required_pages_count).toBe(3);
      });
    });

    describe('Layer 2 - min_design_quality_score (1-10)', () => {
      it('should reject min_design_quality_score below minimum (0)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 0,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should reject min_design_quality_score above maximum (11)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 11,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should accept min_design_quality_score at minimum boundary (1)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, min_design_quality_score: 1 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 1,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.min_design_quality_score).toBe(1);
      });

      it('should accept min_design_quality_score at middle value (5)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, min_design_quality_score: 5 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 5,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.min_design_quality_score).toBe(5);
      });

      it('should accept min_design_quality_score at maximum boundary (10)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer2_rules: { ...mockSettings.layer2_rules, min_design_quality_score: 10 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 10,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer2_rules?.min_design_quality_score).toBe(10);
      });
    });

    describe('Layer 3 - llm_temperature (0-1)', () => {
      it('should reject llm_temperature below minimum (-0.1)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: -0.1,
            content_truncation_limit: 10000,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should reject llm_temperature above maximum (1.1)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 1.1,
            content_truncation_limit: 10000,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should accept llm_temperature at minimum boundary (0)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer3_rules: { ...mockSettings.layer3_rules, llm_temperature: 0 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0,
            content_truncation_limit: 10000,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer3_rules?.llm_temperature).toBe(0);
      });

      it('should accept llm_temperature at middle value (0.5)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer3_rules: { ...mockSettings.layer3_rules, llm_temperature: 0.5 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.5,
            content_truncation_limit: 10000,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer3_rules?.llm_temperature).toBe(0.5);
      });

      it('should accept llm_temperature at maximum boundary (1)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer3_rules: { ...mockSettings.layer3_rules, llm_temperature: 1 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 1,
            content_truncation_limit: 10000,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer3_rules?.llm_temperature).toBe(1);
      });
    });

    describe('Layer 3 - content_truncation_limit (1000-50000)', () => {
      it('should reject content_truncation_limit below minimum (999)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 999,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should reject content_truncation_limit above maximum (50001)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const invalidUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 50001,
          },
        };

        await expect(service.updateSettings(invalidUpdate)).rejects.toThrow(BadRequestException);
      });

      it('should accept content_truncation_limit at minimum boundary (1000)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer3_rules: { ...mockSettings.layer3_rules, content_truncation_limit: 1000 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 1000,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer3_rules?.content_truncation_limit).toBe(1000);
      });

      it('should accept content_truncation_limit at middle value (10000)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer3_rules: { ...mockSettings.layer3_rules, content_truncation_limit: 10000 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 10000,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer3_rules?.content_truncation_limit).toBe(10000);
      });

      it('should accept content_truncation_limit at maximum boundary (50000)', async () => {
        const mockSettings = service.getDefaultSettings();
        mockSingleFn.mockResolvedValue({ data: mockSettings, error: null });

        const updatedSettings = {
          ...mockSettings,
          layer3_rules: { ...mockSettings.layer3_rules, content_truncation_limit: 50000 },
          updated_at: new Date().toISOString(),
        };
        mockUpdateSingleFn.mockResolvedValue({ data: updatedSettings, error: null });

        const validUpdate = {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 50000,
          },
        };

        const result = await service.updateSettings(validUpdate);
        expect(result.layer3_rules?.content_truncation_limit).toBe(50000);
      });
    });
  });

  describe('DTO Validation Pipeline - Layer 2 Boundaries', () => {
    describe('blog_freshness_days DTO validation', () => {
      it('should fail DTO validation for blog_freshness_days = 29', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 29,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer2Errors = errors.find(e => e.property === 'layer2_rules');
        expect(layer2Errors).toBeDefined();
        expect(JSON.stringify(layer2Errors)).toMatch(/blog.*freshness.*days/i);
      });

      it('should fail DTO validation for blog_freshness_days = 181', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 181,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer2Errors = errors.find(e => e.property === 'layer2_rules');
        expect(layer2Errors).toBeDefined();
      });

      it('should pass DTO validation for blog_freshness_days at boundaries (30, 180)', async () => {
        const dto30 = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 30,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const dto180 = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 180,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const errors30 = await validate(dto30);
        const errors180 = await validate(dto180);

        expect(errors30.length).toBe(0);
        expect(errors180.length).toBe(0);
      });
    });

    describe('required_pages_count DTO validation', () => {
      it('should fail DTO validation for required_pages_count = 0', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 0,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer2Errors = errors.find(e => e.property === 'layer2_rules');
        expect(layer2Errors).toBeDefined();
      });

      it('should fail DTO validation for required_pages_count = 4', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 4,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer2Errors = errors.find(e => e.property === 'layer2_rules');
        expect(layer2Errors).toBeDefined();
      });

      it('should pass DTO validation for required_pages_count at boundaries (1, 3)', async () => {
        const dto1 = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 1,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const dto3 = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 3,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 6,
          },
        });

        const errors1 = await validate(dto1);
        const errors3 = await validate(dto3);

        expect(errors1.length).toBe(0);
        expect(errors3.length).toBe(0);
      });
    });

    describe('min_design_quality_score DTO validation', () => {
      it('should fail DTO validation for min_design_quality_score = 0', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 0,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer2Errors = errors.find(e => e.property === 'layer2_rules');
        expect(layer2Errors).toBeDefined();
      });

      it('should fail DTO validation for min_design_quality_score = 11', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 11,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer2Errors = errors.find(e => e.property === 'layer2_rules');
        expect(layer2Errors).toBeDefined();
      });

      it('should pass DTO validation for min_design_quality_score at boundaries (1, 10)', async () => {
        const dto1 = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 1,
          },
        });

        const dto10 = plainToClass(UpdateSettingsDto, {
          layer2_rules: {
            blog_freshness_days: 90,
            required_pages_count: 2,
            min_tech_stack_tools: 2,
            tech_stack_tools: { analytics: [], marketing: [] },
            min_design_quality_score: 10,
          },
        });

        const errors1 = await validate(dto1);
        const errors10 = await validate(dto10);

        expect(errors1.length).toBe(0);
        expect(errors10.length).toBe(0);
      });
    });
  });

  describe('DTO Validation Pipeline - Layer 3 Boundaries', () => {
    describe('llm_temperature DTO validation', () => {
      it('should fail DTO validation for llm_temperature = -0.1', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: -0.1,
            content_truncation_limit: 10000,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer3Errors = errors.find(e => e.property === 'layer3_rules');
        expect(layer3Errors).toBeDefined();
      });

      it('should fail DTO validation for llm_temperature = 1.1', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 1.1,
            content_truncation_limit: 10000,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer3Errors = errors.find(e => e.property === 'layer3_rules');
        expect(layer3Errors).toBeDefined();
      });

      it('should pass DTO validation for llm_temperature at boundaries (0, 1)', async () => {
        const dto0 = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0,
            content_truncation_limit: 10000,
          },
        });

        const dto1 = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 1,
            content_truncation_limit: 10000,
          },
        });

        const errors0 = await validate(dto0);
        const errors1 = await validate(dto1);

        expect(errors0.length).toBe(0);
        expect(errors1.length).toBe(0);
      });

      it('should pass DTO validation for llm_temperature = 0.5', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.5,
            content_truncation_limit: 10000,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('content_truncation_limit DTO validation', () => {
      it('should fail DTO validation for content_truncation_limit = 999', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 999,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer3Errors = errors.find(e => e.property === 'layer3_rules');
        expect(layer3Errors).toBeDefined();
      });

      it('should fail DTO validation for content_truncation_limit = 50001', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 50001,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const layer3Errors = errors.find(e => e.property === 'layer3_rules');
        expect(layer3Errors).toBeDefined();
      });

      it('should pass DTO validation for content_truncation_limit at boundaries (1000, 50000)', async () => {
        const dto1000 = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 1000,
          },
        });

        const dto50000 = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 50000,
          },
        });

        const errors1000 = await validate(dto1000);
        const errors50000 = await validate(dto50000);

        expect(errors1000.length).toBe(0);
        expect(errors50000.length).toBe(0);
      });

      it('should pass DTO validation for content_truncation_limit = 10000', async () => {
        const dto = plainToClass(UpdateSettingsDto, {
          layer3_rules: {
            guest_post_red_flags: ['blog'],
            seo_investment_signals: ['schema_markup'],
            llm_temperature: 0.3,
            content_truncation_limit: 10000,
          },
        });

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('DTO Validation Pipeline - Error Messages', () => {
    it('should provide helpful error message for invalid blog_freshness_days', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer2_rules: {
          blog_freshness_days: 200,
          required_pages_count: 2,
          min_tech_stack_tools: 2,
          tech_stack_tools: { analytics: [], marketing: [] },
          min_design_quality_score: 6,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer2Errors = errors.find(e => e.property === 'layer2_rules');
      expect(layer2Errors).toBeDefined();

      // Verify error message mentions the valid range
      const errorMessage = JSON.stringify(layer2Errors?.constraints || layer2Errors);
      expect(errorMessage).toMatch(/30.*180|blog.*freshness/i);
    });

    it('should provide helpful error message for invalid llm_temperature', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          guest_post_red_flags: ['blog'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 2.0,
          content_truncation_limit: 10000,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer3Errors = errors.find(e => e.property === 'layer3_rules');
      expect(layer3Errors).toBeDefined();

      // Verify error message mentions the valid range
      const errorMessage = JSON.stringify(layer3Errors?.constraints || layer3Errors);
      expect(errorMessage).toMatch(/0.*1|temperature/i);
    });

    it('should provide helpful error message for invalid content_truncation_limit', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          guest_post_red_flags: ['blog'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.3,
          content_truncation_limit: 100,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer3Errors = errors.find(e => e.property === 'layer3_rules');
      expect(layer3Errors).toBeDefined();

      // Verify error message mentions the valid range
      const errorMessage = JSON.stringify(layer3Errors?.constraints || layer3Errors);
      expect(errorMessage).toMatch(/1000|1,000|50000|50,000|truncation/i);
    });
  });
});
