import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SupabaseService } from '../supabase/supabase.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockSupabaseClient: any;
  let mockSupabaseService: any;

  const mockSettings = {
    id: 'test-id',
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
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };

    // Create mock SupabaseService
    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear cache between tests
    service.invalidateCache();
  });

  describe('getSettings', () => {
    it('should fetch settings from database on cache miss', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const result = await service.getSettings();

      // Normalized settings will have layer fields added from defaults
      expect(result).toMatchObject(mockSettings);
      expect(result.layer1_rules).toBeDefined();
      expect(result.layer2_rules).toBeDefined();
      expect(result.layer3_rules).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('classification_settings');
    });

    it('should return from cache on cache hit', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // First call - cache miss
      await service.getSettings();

      // Second call - should hit cache
      const result = await service.getSettings();

      // Normalized settings will have layer fields added from defaults
      expect(result).toMatchObject(mockSettings);
      expect(result.layer1_rules).toBeDefined();
      // Should only call database once
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);
    });

    it('should return defaults if database error occurs', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await service.getSettings();

      expect(result.id).toBe('default');
      expect(result.prefilter_rules).toHaveLength(16);
      expect(result.classification_indicators).toHaveLength(5);
    });

    it('should return defaults if no data found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.getSettings();

      expect(result.id).toBe('default');
    });

    it('should normalize numeric fields returned as strings', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...mockSettings,
          llm_temperature: '0.65',
          confidence_threshold: '0.25',
          content_truncation_limit: '12000',
        },
        error: null,
      });

      const result = await service.getSettings();

      expect(result.llm_temperature).toBeCloseTo(0.65);
      expect(typeof result.llm_temperature).toBe('number');
      expect(result.confidence_threshold).toBeCloseTo(0.25);
      expect(typeof result.confidence_threshold).toBe('number');
      expect(result.content_truncation_limit).toBe(12000);
    });
  });

  describe('updateSettings', () => {
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

    beforeEach(() => {
      // Mock getSettings to return current settings
      mockSupabaseClient.single.mockResolvedValue({
        data: mockSettings,
        error: null,
      });
    });

    it('should update settings successfully', async () => {
      const updatedSettings = { ...mockSettings, ...validDto };
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockSettings, error: null }) // getSettings call
        .mockResolvedValueOnce({ data: updatedSettings, error: null }); // update call

      const result = await service.updateSettings(validDto);

      expect(result.llm_temperature).toBe(0.7);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('should refresh cache after update', async () => {
      const updatedSettings = { ...mockSettings, ...validDto };
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockSettings, error: null })
        .mockResolvedValueOnce({ data: updatedSettings, error: null });

      // Populate cache
      await service.getSettings();
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);

      // Update settings
      await service.updateSettings(validDto);

      // Next getSettings should return cached updated value without extra database hit
      await service.getSettings();
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2);
    });

    it('should normalize updated settings returned as strings', async () => {
      const updatedSettings = {
        ...mockSettings,
        ...validDto,
        llm_temperature: '0.55',
        confidence_threshold: '0.45',
        content_truncation_limit: '15000',
      };
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockSettings, error: null })
        .mockResolvedValueOnce({ data: updatedSettings, error: null });

      const result = await service.updateSettings(validDto);

      expect(result.llm_temperature).toBeCloseTo(0.55);
      expect(result.confidence_threshold).toBeCloseTo(0.45);
      expect(result.content_truncation_limit).toBe(15000);
    });

    it('should reject unsafe regex patterns', async () => {
      const unsafeDto: UpdateSettingsDto = {
        ...validDto,
        prefilter_rules: [
          {
            category: 'test',
            pattern: '(a+)+$', // ReDoS vulnerable pattern
            reasoning: 'Unsafe',
            enabled: true,
          },
        ],
      };

      await expect(service.updateSettings(unsafeDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if database update fails', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockSettings, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

      await expect(service.updateSettings(validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetToDefaults', () => {
    it('should update existing record to defaults', async () => {
      const defaults = service.getDefaultSettings();
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockSettings, error: null })
        .mockResolvedValueOnce({
          data: { ...defaults, id: mockSettings.id },
          error: null,
        });

      const result = await service.resetToDefaults();

      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
      expect(result.id).toBe(mockSettings.id);
      expect(result.llm_temperature).toBeCloseTo(defaults.llm_temperature!);
      expect(result.confidence_threshold).toBeCloseTo(defaults.confidence_threshold!);
      expect(result.content_truncation_limit).toBe(defaults.content_truncation_limit!);
    });

    it('should insert defaults when no existing record is found', async () => {
      const defaults = service.getDefaultSettings();
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { ...defaults, id: 'new-id' },
          error: null,
        });

      const result = await service.resetToDefaults();

      expect(mockSupabaseClient.insert).toHaveBeenCalled();
      expect(result.id).toBe('new-id');
      expect(result.llm_temperature).toBeCloseTo(defaults.llm_temperature!);
    });

    it('should throw BadRequestException if reset fails', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockSettings, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Reset failed' },
        });

      await expect(service.resetToDefaults()).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDefaultSettings', () => {
    it('should return complete default settings', () => {
      const defaults = service.getDefaultSettings();

      expect(defaults.id).toBe('default');
      expect(defaults.prefilter_rules).toHaveLength(16);
      expect(defaults.classification_indicators).toHaveLength(5);
      expect(defaults.llm_temperature).toBe(0.3);
      expect(defaults.confidence_threshold).toBe(0.0);
      expect(defaults.content_truncation_limit).toBe(10000);
      // Story 3.0: Verify layer-specific defaults exist
      expect(defaults.layer1_rules).toBeDefined();
      expect(defaults.layer2_rules).toBeDefined();
      expect(defaults.layer3_rules).toBeDefined();
      expect(defaults.confidence_bands).toBeDefined();
      expect(defaults.manual_review_settings).toBeDefined();
    });

    it('should include all required rule categories', () => {
      const defaults = service.getDefaultSettings();
      const categories = defaults.prefilter_rules!.map((r) => r.category);

      expect(categories).toContain('blog_platform');
      expect(categories).toContain('social_media');
      expect(categories).toContain('ecommerce');
      expect(categories).toContain('forum');
      expect(categories).toContain('aggregator');
    });

    it('should include custom: [] in layer1_rules tld_filters', () => {
      const defaults = service.getDefaultSettings();

      expect(defaults.layer1_rules).toBeDefined();
      expect(defaults.layer1_rules!.tld_filters).toBeDefined();
      expect(defaults.layer1_rules!.tld_filters!.custom).toEqual([]);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cached settings', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      // Populate cache
      await service.getSettings();
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);

      // Invalidate cache
      service.invalidateCache();

      // Next call should fetch from database
      await service.getSettings();
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2);
    });
  });
});
