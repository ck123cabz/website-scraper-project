import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { UserPreferences } from '@website-scraper/shared';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('preferences')
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({
    status: 200,
    description: 'User preferences retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            theme: { type: 'string', enum: ['light', 'dark', 'system'] },
            sidebarCollapsed: { type: 'boolean' },
            defaultView: { type: 'string', enum: ['cards', 'table'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async getPreferences(@Req() req: any): Promise<{ data: UserPreferences }> {
    // In a real implementation, get userId from auth context
    // For now, use a fixed UUID for testing (ensures preferences persist across sessions)
    const userId = req.user?.id || process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';
    const preferences = await this.preferencesService.getPreferences(userId);
    return { data: preferences };
  }

  @Patch()
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({
    status: 200,
    description: 'User preferences updated successfully',
  })
  async updatePreferences(
    @Req() req: any,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<{ data: UserPreferences }> {
    // In a real implementation, get userId from auth context
    const userId = req.user?.id || process.env.DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000001';
    const preferences = await this.preferencesService.updatePreferences(
      userId,
      updatePreferencesDto,
    );
    return { data: preferences };
  }
}
