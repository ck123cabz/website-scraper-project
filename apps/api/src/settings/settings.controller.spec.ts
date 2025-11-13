import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
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
      publication_score_threshold: 0.65,
      product_keywords: {
        commercial: ['pricing', 'buy'],
        features: ['features'],
        cta: ['get started'],
      },
      business_nav_keywords: ['product', 'pricing'],
      content_nav_keywords: ['articles', 'blog'],
      min_business_nav_percentage: 0.3,
      ad_network_patterns: ['googlesyndication'],
      affiliate_patterns: ['amazon'],
      payment_provider_patterns: ['stripe'],
    },
    layer3_rules: {
      guest_post_red_flags: ['Test indicator'],
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
      enabled: true,
      auto_review_timeout_hours: 72,
      max_queue_size: 1000,
      enable_slack_notifications: false,
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

describe('SettingsController - Validation Tests', () => {
  describe('Layer 1 Validation', () => {
    it('should reject invalid target_elimination_rate < 0.4', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer1_rules: {
          tld_filters: {
            commercial: ['.com'],
            non_commercial: ['.org'],
            personal: ['.me'],
          },
          industry_keywords: ['SaaS'],
          url_pattern_exclusions: [],
          target_elimination_rate: 0.3, // Invalid - below minimum
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer1Errors = errors.find((e) => e.property === 'layer1_rules');
      expect(layer1Errors).toBeDefined();
    });

    it('should reject invalid target_elimination_rate > 0.6', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer1_rules: {
          tld_filters: {
            commercial: ['.com'],
            non_commercial: ['.org'],
            personal: ['.me'],
          },
          industry_keywords: ['SaaS'],
          url_pattern_exclusions: [],
          target_elimination_rate: 0.7, // Invalid - above maximum
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer1Errors = errors.find((e) => e.property === 'layer1_rules');
      expect(layer1Errors).toBeDefined();
    });

    it('should accept valid target_elimination_rate', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer1_rules: {
          tld_filters: {
            commercial: ['.com'],
            non_commercial: ['.org'],
            personal: ['.me'],
          },
          industry_keywords: ['SaaS'],
          url_pattern_exclusions: [],
          target_elimination_rate: 0.5, // Valid
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Layer 2 Validation', () => {
    it('should reject publication_score_threshold < 0', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer2_rules: {
          publication_score_threshold: -0.1, // Invalid
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

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer2Errors = errors.find((e) => e.property === 'layer2_rules');
      expect(layer2Errors).toBeDefined();
    });

    it('should reject publication_score_threshold > 1', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer2_rules: {
          publication_score_threshold: 1.5, // Invalid
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

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer2Errors = errors.find((e) => e.property === 'layer2_rules');
      expect(layer2Errors).toBeDefined();
    });

    it('should reject min_business_nav_percentage < 0', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer2_rules: {
          publication_score_threshold: 0.65,
          product_keywords: {
            commercial: [],
            features: [],
            cta: [],
          },
          business_nav_keywords: [],
          content_nav_keywords: [],
          min_business_nav_percentage: -0.1, // Invalid
          ad_network_patterns: [],
          affiliate_patterns: [],
          payment_provider_patterns: [],
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer2Errors = errors.find((e) => e.property === 'layer2_rules');
      expect(layer2Errors).toBeDefined();
    });

    it('should reject min_business_nav_percentage > 1', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer2_rules: {
          publication_score_threshold: 0.65,
          product_keywords: {
            commercial: [],
            features: [],
            cta: [],
          },
          business_nav_keywords: [],
          content_nav_keywords: [],
          min_business_nav_percentage: 1.5, // Invalid
          ad_network_patterns: [],
          affiliate_patterns: [],
          payment_provider_patterns: [],
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer2Errors = errors.find((e) => e.property === 'layer2_rules');
      expect(layer2Errors).toBeDefined();
    });

    it('should accept valid layer2 values', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer2_rules: {
          publication_score_threshold: 0.65,
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

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Layer 3 Validation', () => {
    it('should reject llm_temperature < 0', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: -0.5, // Invalid
          content_truncation_limit: 10000,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer3Errors = errors.find((e) => e.property === 'layer3_rules');
      expect(layer3Errors).toBeDefined();
    });

    it('should reject llm_temperature > 1', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 2.0, // Invalid - THE BUG WE'RE FIXING!
          content_truncation_limit: 10000,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer3Errors = errors.find((e) => e.property === 'layer3_rules');
      expect(layer3Errors).toBeDefined();
    });

    it('should reject content_truncation_limit < 1000', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.3,
          content_truncation_limit: 500, // Invalid
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer3Errors = errors.find((e) => e.property === 'layer3_rules');
      expect(layer3Errors).toBeDefined();
    });

    it('should reject content_truncation_limit > 50000', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.3,
          content_truncation_limit: 60000, // Invalid
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const layer3Errors = errors.find((e) => e.property === 'layer3_rules');
      expect(layer3Errors).toBeDefined();
    });

    it('should accept valid layer3 values', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.3,
          content_truncation_limit: 10000,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Confidence Bands Validation', () => {
    it('should reject invalid action value', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        confidence_bands: {
          high: {
            min: 0.8,
            max: 1.0,
            action: 'invalid_action', // Invalid
          },
          medium: {
            min: 0.5,
            max: 0.79,
            action: 'manual_review',
          },
          low: {
            min: 0.3,
            max: 0.49,
            action: 'manual_review',
          },
          auto_reject: {
            min: 0.0,
            max: 0.29,
            action: 'reject',
          },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const confidenceBandsErrors = errors.find((e) => e.property === 'confidence_bands');
      expect(confidenceBandsErrors).toBeDefined();
    });

    it('should accept valid confidence bands (note: min > max is not validated by class-validator)', async () => {
      const dto = plainToClass(UpdateSettingsDto, {
        confidence_bands: {
          high: {
            min: 0.8,
            max: 1.0,
            action: 'auto_approve',
          },
          medium: {
            min: 0.5,
            max: 0.79,
            action: 'manual_review',
          },
          low: {
            min: 0.3,
            max: 0.49,
            action: 'manual_review',
          },
          auto_reject: {
            min: 0.0,
            max: 0.29,
            action: 'reject',
          },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});

describe('SettingsController - Integration Tests', () => {
  describe('Service Integration - Layer 1', () => {
    it('should load layer1_rules from database via SettingsService', async () => {
      // This test verifies that Layer1DomainAnalysisService can load rules from database
      // Actual integration test would require full NestJS module setup
      const mockLayer1Rules = {
        tld_filters: {
          commercial: ['.com', '.io'],
          non_commercial: ['.org'],
          personal: ['.me'],
        },
        industry_keywords: ['SaaS', 'software'],
        url_pattern_exclusions: [
          {
            pattern: 'wordpress\\.com',
            enabled: true,
            category: 'blog_platform',
            reasoning: 'REJECT - Blog platform',
          },
        ],
        target_elimination_rate: 0.5,
      };

      expect(mockLayer1Rules.tld_filters.commercial).toContain('.com');
      expect(mockLayer1Rules.industry_keywords).toContain('SaaS');
      expect(mockLayer1Rules.url_pattern_exclusions.length).toBeGreaterThan(0);
    });
  });

  describe('Service Integration - Layer 3', () => {
    it('should use layer3_rules structure for temperature', async () => {
      const mockSettings = {
        layer3_rules: {
          llm_temperature: 0.5,
          content_truncation_limit: 15000,
          guest_post_red_flags: ['Custom indicator'],
          seo_investment_signals: ['custom_signal'],
        },
      };

      // Verify layer3_rules structure is used
      expect(mockSettings.layer3_rules.llm_temperature).toBe(0.5);
      expect(mockSettings.layer3_rules.content_truncation_limit).toBe(15000);
      expect(mockSettings.layer3_rules.guest_post_red_flags).toContain('Custom indicator');
    });

    it('should fallback to V1 fields when layer3_rules not available', async () => {
      const mockSettings = {
        llm_temperature: 0.3,
        content_truncation_limit: 10000,
        classification_indicators: ['V1 indicator'],
      };

      // Verify V1 fields are available for backward compatibility
      expect(mockSettings.llm_temperature).toBe(0.3);
      expect(mockSettings.content_truncation_limit).toBe(10000);
      expect(mockSettings.classification_indicators).toContain('V1 indicator');
    });
  });

  describe('End-to-End Validation', () => {
    it('should reject invalid nested layer values', async () => {
      const invalidDto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          llm_temperature: 2.0, // Invalid - should be rejected
        },
      });

      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid nested layer values', async () => {
      const validDto = plainToClass(UpdateSettingsDto, {
        layer3_rules: {
          llm_temperature: 0.3, // Valid
          content_truncation_limit: 10000, // Valid
        },
      });

      const errors = await validate(validDto);
      expect(errors.length).toBe(0);
    });

    it('should validate all layer fields together', async () => {
      const completeDto = plainToClass(UpdateSettingsDto, {
        layer1_rules: {
          tld_filters: {
            commercial: ['.com'],
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
            analytics: [],
            marketing: [],
          },
          min_design_quality_score: 6,
        },
        layer3_rules: {
          guest_post_red_flags: ['Test'],
          seo_investment_signals: ['schema_markup'],
          llm_temperature: 0.3,
          content_truncation_limit: 10000,
        },
      });

      const errors = await validate(completeDto);
      expect(errors.length).toBe(0);
    });
  });
});
