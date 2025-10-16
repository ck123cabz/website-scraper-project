import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import type { ClassificationSettings } from '@website-scraper/shared';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettings: ClassificationSettings = {
    id: 'test-id',
    // V1 fields (backward compatibility)
    prefilter_rules: [
      {
        category: 'test',
        pattern: 'test\\.com',
        reasoning: 'Test rule',
        enabled: true,
      },
    ],
    classification_indicators: ['Test indicator'],
    llm_temperature: 0.5,
    confidence_threshold: 0.3,
    content_truncation_limit: 5000,
    confidence_threshold_high: 0.8,
    confidence_threshold_medium: 0.5,
    confidence_threshold_low: 0.3,
    // 3-Tier Architecture fields (Story 3.0)
    layer1_rules: {
      tld_filters: {
        commercial: ['.com', '.io'],
        non_commercial: ['.org'],
        personal: ['.me'],
      },
      industry_keywords: ['SaaS'],
      url_pattern_exclusions: [],
      target_elimination_rate: 0.5,
    },
    layer2_rules: {
      blog_freshness_days: 90,
      required_pages_count: 2,
      min_tech_stack_tools: 2,
      tech_stack_tools: {
        analytics: ['google-analytics', 'mixpanel'],
        marketing: ['hubspot', 'marketo'],
      },
      min_design_quality_score: 6,
    },
    layer3_rules: {
      content_marketing_indicators: ['Test indicator'],
      seo_investment_signals: ['schema_markup'],
      llm_temperature: 0.3,
      content_truncation_limit: 10000,
    },
    confidence_bands: {
      high: { min: 0.8, max: 1.0, action: 'auto_approve' },
      medium: { min: 0.5, max: 0.79, action: 'manual_review' },
      low: { min: 0.3, max: 0.49, action: 'manual_review' },
      auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
    },
    manual_review_settings: {
      queue_size_limit: null,
      auto_review_timeout_days: null,
      notifications: {
        email_threshold: 100,
        dashboard_badge: true,
        slack_integration: false,
      },
    },
    updated_at: new Date().toISOString(),
  };

  const mockSettingsService = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    resetToDefaults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('should return current settings', async () => {
      mockSettingsService.getSettings.mockResolvedValue(mockSettings);

      const result = await controller.getSettings();

      expect(result).toEqual(mockSettings);
      expect(service.getSettings).toHaveBeenCalledTimes(1);
    });

    it('should return defaults when database settings not found', async () => {
      const defaultSettings = { ...mockSettings, id: 'default' };
      mockSettingsService.getSettings.mockResolvedValue(defaultSettings);

      const result = await controller.getSettings();

      expect(result.id).toBe('default');
      expect(service.getSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      mockSettingsService.getSettings.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getSettings()).rejects.toThrow('Database connection failed');
    });
  });

  describe('PUT /api/settings', () => {
    const validDto: UpdateSettingsDto = {
      prefilter_rules: [
        {
          category: 'test',
          pattern: 'valid\\.pattern',
          reasoning: 'Test',
          enabled: true,
        },
      ],
      classification_indicators: ['Indicator 1'],
      llm_temperature: 0.7,
      confidence_threshold: 0.5,
      content_truncation_limit: 8000,
    };

    it('should update settings successfully', async () => {
      const updatedSettings = { ...mockSettings, ...validDto };
      mockSettingsService.updateSettings.mockResolvedValue(updatedSettings);

      const result = await controller.updateSettings(validDto);

      expect(result.llm_temperature).toBe(0.7);
      expect(service.updateSettings).toHaveBeenCalledWith(validDto);
    });

    it('should handle validation errors from service', async () => {
      mockSettingsService.updateSettings.mockRejectedValue(
        new BadRequestException('Invalid regex pattern'),
      );

      await expect(controller.updateSettings(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle database update errors', async () => {
      mockSettingsService.updateSettings.mockRejectedValue(
        new BadRequestException('Failed to update settings: Database error'),
      );

      await expect(controller.updateSettings(validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /api/settings/reset', () => {
    it('should reset settings to defaults', async () => {
      const defaultSettings = { ...mockSettings, id: 'default' };
      mockSettingsService.resetToDefaults.mockResolvedValue(defaultSettings);

      const result = await controller.resetSettings();

      expect(result).toEqual(defaultSettings);
      expect(service.resetToDefaults).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from service', async () => {
      mockSettingsService.resetToDefaults.mockRejectedValue(
        new BadRequestException('Reset failed'),
      );

      await expect(controller.resetSettings()).rejects.toThrow(BadRequestException);
    });
  });
});
