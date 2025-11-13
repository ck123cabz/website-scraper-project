import { Test, TestingModule } from '@nestjs/testing';
import { ConfidenceScoringService } from '../services/confidence-scoring.service';
import { SettingsService } from '../../settings/settings.service';
import type { ClassificationSettings } from '@website-scraper/shared';

// Helper to create valid test settings with all required fields
const createTestSettings = (
  overrides?: Partial<ClassificationSettings>,
): ClassificationSettings => ({
  id: 'default',
  // V1 fields
  llm_temperature: 0.3,
  confidence_threshold: 0,
  content_truncation_limit: 10000,
  confidence_threshold_high: 0.8,
  confidence_threshold_medium: 0.5,
  confidence_threshold_low: 0.3,
  classification_indicators: [],
  prefilter_rules: [],
  // 3-Tier fields
  layer1_rules: {
    tld_filters: { commercial: ['.com'], non_commercial: [], personal: [] },
    industry_keywords: [],
    url_pattern_exclusions: [],
    target_elimination_rate: 0.5,
  },
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
  layer3_rules: {
    guest_post_red_flags: [],
    seo_investment_signals: [],
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
      email_recipient: 'test@example.com',
      slack_webhook_url: null,
      slack_threshold: 100,
      dashboard_badge: true,
    },
  },
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Unit tests for ConfidenceScoringService
 * Story 2.4-refactored: Confidence band calculation and signal strength analysis
 */
describe('ConfidenceScoringService', () => {
  let service: ConfidenceScoringService;
  let settingsService: jest.Mocked<SettingsService>;

  beforeEach(async () => {
    const settingsServiceMock = {
      getSettings: jest.fn().mockResolvedValue(createTestSettings()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfidenceScoringService,
        {
          provide: SettingsService,
          useValue: settingsServiceMock,
        },
      ],
    }).compile();

    service = module.get<ConfidenceScoringService>(ConfidenceScoringService);
    settingsService = module.get(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateConfidenceBand', () => {
    it('should return "high" for confidence >= 0.8', async () => {
      const band = await service.calculateConfidenceBand(0.8);
      expect(band).toBe('high');

      const band2 = await service.calculateConfidenceBand(0.9);
      expect(band2).toBe('high');

      const band3 = await service.calculateConfidenceBand(1.0);
      expect(band3).toBe('high');
    });

    it('should return "medium" for confidence >= 0.5 and < 0.8', async () => {
      const band = await service.calculateConfidenceBand(0.5);
      expect(band).toBe('medium');

      const band2 = await service.calculateConfidenceBand(0.65);
      expect(band2).toBe('medium');

      const band3 = await service.calculateConfidenceBand(0.79);
      expect(band3).toBe('medium');
    });

    it('should return "low" for confidence >= 0.3 and < 0.5', async () => {
      const band = await service.calculateConfidenceBand(0.3);
      expect(band).toBe('low');

      const band2 = await service.calculateConfidenceBand(0.4);
      expect(band2).toBe('low');

      const band3 = await service.calculateConfidenceBand(0.49);
      expect(band3).toBe('low');
    });

    it('should return "auto_reject" for confidence < 0.3', async () => {
      const band = await service.calculateConfidenceBand(0.0);
      expect(band).toBe('auto_reject');

      const band2 = await service.calculateConfidenceBand(0.1);
      expect(band2).toBe('auto_reject');

      const band3 = await service.calculateConfidenceBand(0.29);
      expect(band3).toBe('auto_reject');
    });

    it('should handle invalid confidence values gracefully', async () => {
      const band1 = await service.calculateConfidenceBand(NaN);
      expect(band1).toBe('auto_reject'); // NaN treated as 0, clamped to 0.0

      const band2 = await service.calculateConfidenceBand(Infinity);
      expect(band2).toBe('auto_reject'); // Infinity treated as 0, clamped to 0.0

      const band3 = await service.calculateConfidenceBand(-0.5);
      expect(band3).toBe('auto_reject'); // Clamped to 0.0
    });

    it('should boost confidence with high-value sophistication signals', async () => {
      const signals = ['write for us', 'guest post guidelines', 'submission form'];
      const band = await service.calculateConfidenceBand(0.75, signals);
      // 0.75 + (3 * 0.03) = 0.84 → high
      expect(band).toBe('high');
    });

    it('should boost confidence with medium-value sophistication signals', async () => {
      const signals = ['author bylines', 'schema markup'];
      const band = await service.calculateConfidenceBand(0.77, signals);
      // 0.77 + (2 * 0.01) = 0.79 → medium (still below 0.8)
      expect(band).toBe('medium');
    });

    it('should cap signal boost at 0.1 (10%)', async () => {
      // Many signals that would boost beyond 10%
      const signals = [
        'write for us',
        'guest post guidelines',
        'submission form',
        'contributor program',
        'author bylines',
        'schema markup',
      ];
      const band = await service.calculateConfidenceBand(0.75, signals);
      // Max boost: 0.1 → 0.75 + 0.1 = 0.85 → high
      expect(band).toBe('high');
    });

    it('should load custom confidence thresholds from database settings (Task 7.3)', async () => {
      // Mock settings service to return custom thresholds
      settingsService.getSettings.mockResolvedValue(
        createTestSettings({
          id: 'test-settings-id',
          confidence_threshold_high: 0.9, // Custom: raised from 0.8
          confidence_threshold_medium: 0.6, // Custom: raised from 0.5
          confidence_threshold_low: 0.4, // Custom: raised from 0.3
        }),
      );

      // Test with confidence 0.85 - should be "medium" with custom thresholds (< 0.9)
      const band1 = await service.calculateConfidenceBand(0.85);
      expect(band1).toBe('medium');

      // Test with confidence 0.65 - should be "medium" with custom thresholds (>= 0.6, < 0.9)
      const band2 = await service.calculateConfidenceBand(0.65);
      expect(band2).toBe('medium');

      // Test with confidence 0.45 - should be "low" with custom thresholds (>= 0.4, < 0.6)
      const band3 = await service.calculateConfidenceBand(0.45);
      expect(band3).toBe('low');

      // Test with confidence 0.35 - should be "auto_reject" with custom thresholds (< 0.4)
      const band4 = await service.calculateConfidenceBand(0.35);
      expect(band4).toBe('auto_reject');
    });

    it('should fall back to default thresholds when database unavailable (Task 7.2)', async () => {
      // Mock settings service to return default settings (id = 'default')
      settingsService.getSettings.mockResolvedValue(createTestSettings());

      // Test with default thresholds
      const band1 = await service.calculateConfidenceBand(0.8);
      expect(band1).toBe('high');

      const band2 = await service.calculateConfidenceBand(0.5);
      expect(band2).toBe('medium');

      const band3 = await service.calculateConfidenceBand(0.3);
      expect(band3).toBe('low');
    });

    it('should handle string-encoded thresholds from Supabase (Task 7.2)', async () => {
      // Mock settings service to return string-encoded numerics (Supabase DECIMAL behavior)
      settingsService.getSettings.mockResolvedValue(
        createTestSettings({
          id: 'test-settings-id',
          llm_temperature: '0.3' as any,
          confidence_threshold: '0' as any,
          confidence_threshold_high: '0.85' as any, // String-encoded
          confidence_threshold_medium: '0.55' as any,
          confidence_threshold_low: '0.35' as any,
        }),
      );

      // Should parse strings correctly and use as thresholds
      const band1 = await service.calculateConfidenceBand(0.86);
      expect(band1).toBe('high'); // >= 0.85

      const band2 = await service.calculateConfidenceBand(0.6);
      expect(band2).toBe('medium'); // >= 0.55, < 0.85

      const band3 = await service.calculateConfidenceBand(0.4);
      expect(band3).toBe('low'); // >= 0.35, < 0.55
    });
  });

  describe('getConfidenceBandDescription', () => {
    it('should return correct description for each band', () => {
      expect(service.getConfidenceBandDescription('high')).toContain('High confidence');
      expect(service.getConfidenceBandDescription('medium')).toContain('Medium confidence');
      expect(service.getConfidenceBandDescription('low')).toContain('Low confidence');
      expect(service.getConfidenceBandDescription('auto_reject')).toContain('Auto-reject');
    });
  });

  describe('requiresManualReview', () => {
    it('should return true for medium confidence', () => {
      expect(service.requiresManualReview('medium')).toBe(true);
    });

    it('should return true for low confidence', () => {
      expect(service.requiresManualReview('low')).toBe(true);
    });

    it('should return false for high confidence', () => {
      expect(service.requiresManualReview('high')).toBe(false);
    });

    it('should return false for auto_reject', () => {
      expect(service.requiresManualReview('auto_reject')).toBe(false);
    });
  });

  describe('getExpectedClassification', () => {
    it('should return "suitable" for high confidence', () => {
      expect(service.getExpectedClassification('high')).toBe('suitable');
    });

    it('should return "suitable" for medium confidence (pending review)', () => {
      expect(service.getExpectedClassification('medium')).toBe('suitable');
    });

    it('should return "suitable" for low confidence (pending review)', () => {
      expect(service.getExpectedClassification('low')).toBe('suitable');
    });

    it('should return "not_suitable" for auto_reject', () => {
      expect(service.getExpectedClassification('auto_reject')).toBe('not_suitable');
    });
  });
});
