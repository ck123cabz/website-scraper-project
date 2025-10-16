import { Test, TestingModule } from '@nestjs/testing';
import { ConfidenceScoringService } from '../services/confidence-scoring.service';
import { SettingsService } from '../../settings/settings.service';

/**
 * Unit tests for ConfidenceScoringService
 * Story 2.4-refactored: Confidence band calculation and signal strength analysis
 */
describe('ConfidenceScoringService', () => {
  let service: ConfidenceScoringService;
  let settingsService: jest.Mocked<SettingsService>;

  beforeEach(async () => {
    const settingsServiceMock = {
      getSettings: jest.fn().mockResolvedValue({
        id: 'default',
        llm_temperature: 0.3,
        confidence_threshold: 0,
        content_truncation_limit: 10000,
        classification_indicators: [],
        prefilter_rules: [],
        updated_at: null,
      }),
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
