import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { UserPreferences } from '@website-scraper/shared';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
  );

  async getPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, create defaults
        return this.createDefaultPreferences(userId);
      }
      throw error;
    }

    return this.formatPreferences(data);
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .update({
        theme: dto.theme,
        sidebar_collapsed: dto.sidebarCollapsed,
        default_view: dto.defaultView,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Preferences don't exist, create them
        return this.createPreferences(userId, dto);
      }
      throw error;
    }

    return this.formatPreferences(data);
  }

  private async createDefaultPreferences(
    userId: string,
  ): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        theme: 'system',
        sidebar_collapsed: false,
        default_view: 'cards',
      })
      .select()
      .single();

    if (error) throw error;

    return this.formatPreferences(data);
  }

  private async createPreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        theme: dto.theme || 'system',
        sidebar_collapsed: dto.sidebarCollapsed ?? false,
        default_view: dto.defaultView || 'cards',
      })
      .select()
      .single();

    if (error) throw error;

    return this.formatPreferences(data);
  }

  private formatPreferences(data: any): UserPreferences {
    return {
      id: data.id,
      userId: data.user_id,
      theme: data.theme,
      sidebarCollapsed: data.sidebar_collapsed,
      defaultView: data.default_view,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
