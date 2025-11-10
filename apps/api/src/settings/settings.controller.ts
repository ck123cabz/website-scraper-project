import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import type { ClassificationSettings } from '@website-scraper/shared';

/**
 * Settings controller for classification parameters
 * Provides GET and PUT endpoints for settings management
 */
@Controller('api/settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/settings
   * Returns current classification settings
   * Returns defaults if no settings exist in database
   */
  @Get()
  async getSettings(): Promise<ClassificationSettings> {
    this.logger.log('GET /api/settings - Fetching classification settings');

    try {
      const settings = await this.settingsService.getSettings();
      this.logger.log(`Settings retrieved successfully (source: ${settings.id === 'default' ? 'defaults' : 'database'})`);
      return settings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch settings: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * PUT /api/settings
   * Updates classification settings with validation
   * Returns updated settings object on success
   * Returns 400 with validation errors if invalid data
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true, // CRITICAL: Enable transformation for nested DTO validation
  }))
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto): Promise<ClassificationSettings> {
    this.logger.log('PUT /api/settings - Updating classification settings');
    this.logger.debug(`Update payload: ${JSON.stringify({
      ruleCount: updateSettingsDto.prefilter_rules?.length,
      indicatorCount: updateSettingsDto.classification_indicators?.length,
      temperature: updateSettingsDto.llm_temperature,
      threshold: updateSettingsDto.confidence_threshold,
      limit: updateSettingsDto.content_truncation_limit,
      hasLayer1: !!updateSettingsDto.layer1_rules,
      hasLayer2: !!updateSettingsDto.layer2_rules,
      hasLayer3: !!updateSettingsDto.layer3_rules,
    })}`);

    try {
      const updatedSettings = await this.settingsService.updateSettings(updateSettingsDto);
      this.logger.log('Settings updated successfully');
      return updatedSettings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update settings: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * POST /api/settings/reset
   * Resets settings back to default values
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetSettings(): Promise<ClassificationSettings> {
    this.logger.log('POST /api/settings/reset - Resetting classification settings to defaults');

    try {
      const defaults = await this.settingsService.resetToDefaults();
      this.logger.log('Settings reset to defaults successfully');
      return defaults;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reset settings: ${errorMessage}`);
      throw error;
    }
  }
}
