import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService, ClassificationSettings } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettings: ClassificationSettings = {
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
