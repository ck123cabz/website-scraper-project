import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import NodeCache from 'node-cache';
import safeRegex from 'safe-regex';
import { UpdateSettingsDto, PreFilterRuleDto } from './dto/update-settings.dto';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Classification settings interface matching database schema
 */
export interface ClassificationSettings {
  id: string;
  prefilter_rules: PreFilterRuleDto[];
  classification_indicators: string[];
  llm_temperature: number;
  confidence_threshold: number;
  content_truncation_limit: number;
  updated_at: string;
}

/**
 * Settings service for managing classification parameters
 * Implements in-memory caching with 5-minute TTL
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly cache: NodeCache;
  private readonly CACHE_KEY = 'classification_settings';
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly DEFAULT_TEMPERATURE = 0.3;
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.0;
  private readonly DEFAULT_CONTENT_LIMIT = 10000;

  constructor(private readonly supabaseService: SupabaseService) {
    // Initialize cache with 5-minute TTL
    this.cache = new NodeCache({
      stdTTL: this.CACHE_TTL,
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: true, // Return clones to prevent external mutations
    });

    this.logger.log('SettingsService initialized with 5-minute cache TTL');
  }

  /**
   * Get current classification settings
   * Returns from cache if available, otherwise fetches from database
   * Falls back to hardcoded defaults if database unavailable
   */
  async getSettings(): Promise<ClassificationSettings> {
    // Check cache first
    const cached = this.cache.get<ClassificationSettings>(this.CACHE_KEY);
    if (cached) {
      this.logger.debug('Settings retrieved from cache');
      return cached;
    }

    // Cache miss - load from database
    this.logger.debug('Cache miss - loading settings from database');

    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase
        .from('classification_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        this.logger.warn(`Database error loading settings: ${error.message}. Using defaults.`);
        return this.getDefaultSettings();
      }

      if (!data) {
        this.logger.warn('No settings found in database. Using defaults.');
        const defaults = this.getDefaultSettings();
        this.cache.set(this.CACHE_KEY, defaults);
        return defaults;
      }

      const normalized = this.normalizeSettings(data);

      // Store in cache
      this.cache.set(this.CACHE_KEY, normalized);
      this.logger.log('Settings loaded from database and cached');

      return normalized;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load settings from database: ${errorMessage}. Using defaults.`);
      const defaults = this.getDefaultSettings();
      this.cache.set(this.CACHE_KEY, defaults);
      return defaults;
    }
  }

  /**
   * Update classification settings
   * Validates regex patterns and range constraints
   * Invalidates cache on success
   */
  async updateSettings(dto: UpdateSettingsDto): Promise<ClassificationSettings> {
    // Validate regex patterns for ReDoS safety
    this.validateRegexPatterns(dto.prefilter_rules);

    try {
      // Get current settings to extract ID
      const current = await this.getSettings();
      const supabase = this.supabaseService.getClient();

      // Update settings in database
      const { data, error } = await supabase
        .from('classification_settings')
        .update({
          prefilter_rules: dto.prefilter_rules,
          classification_indicators: dto.classification_indicators,
          llm_temperature: dto.llm_temperature,
          confidence_threshold: dto.confidence_threshold,
          content_truncation_limit: dto.content_truncation_limit,
        })
        .eq('id', current.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Failed to update settings: ${error.message}`);
      }

      // Invalidate cache
      this.cache.del(this.CACHE_KEY);
      this.logger.log('Settings updated successfully. Cache invalidated.');

      const normalized = this.normalizeSettings(data);
      this.cache.set(this.CACHE_KEY, normalized);

      return normalized;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to update settings: ${errorMessage}`);
    }
  }

  /**
   * Reset settings back to default values and persist to database
   */
  async resetToDefaults(): Promise<ClassificationSettings> {
    const defaults = this.getDefaultSettings();
    const payload = {
      prefilter_rules: defaults.prefilter_rules,
      classification_indicators: defaults.classification_indicators,
      llm_temperature: defaults.llm_temperature,
      confidence_threshold: defaults.confidence_threshold,
      content_truncation_limit: defaults.content_truncation_limit,
    };

    // Ensure next getSettings call queries database
    this.invalidateCache();

    try {
      const supabase = this.supabaseService.getClient();
      const current = await this.getSettings();

      let response: { data: any; error: { message: string } | null };

      if (current.id === 'default') {
        response = await supabase
          .from('classification_settings')
          .insert(payload)
          .select()
          .single();
      } else {
        response = await supabase
          .from('classification_settings')
          .update(payload)
          .eq('id', current.id)
          .select()
          .single();
      }

      if (response.error) {
        throw new BadRequestException(`Failed to reset settings: ${response.error.message}`);
      }

      if (!response.data) {
        throw new BadRequestException('Failed to reset settings: No data returned from database');
      }

      const normalized = this.normalizeSettings(response.data);
      this.cache.set(this.CACHE_KEY, normalized);
      this.logger.log('Settings reset to defaults and cache refreshed.');

      return normalized;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to reset settings: ${errorMessage}`);
    }
  }

  /**
   * Get hardcoded default settings as fallback
   * Extracted from current implementation
   */
  getDefaultSettings(): ClassificationSettings {
    return {
      id: 'default',
      prefilter_rules: [
        {
          category: 'blog_platform',
          pattern: 'wordpress\\.com/.*',
          reasoning: 'REJECT - Blog platform domain (WordPress.com)',
          enabled: true,
        },
        {
          category: 'blog_platform',
          pattern: 'blogspot\\.com',
          reasoning: 'REJECT - Blog platform domain (Blogspot)',
          enabled: true,
        },
        {
          category: 'blog_platform',
          pattern: 'medium\\.com/@',
          reasoning: 'REJECT - Blog platform domain (Medium personal blog)',
          enabled: true,
        },
        {
          category: 'blog_platform',
          pattern: 'substack\\.com',
          reasoning: 'REJECT - Blog platform domain (Substack)',
          enabled: true,
        },
        {
          category: 'social_media',
          pattern: 'facebook\\.com',
          reasoning: 'REJECT - Social media platform (Facebook)',
          enabled: true,
        },
        {
          category: 'social_media',
          pattern: 'twitter\\.com',
          reasoning: 'REJECT - Social media platform (Twitter/X)',
          enabled: true,
        },
        {
          category: 'social_media',
          pattern: 'x\\.com',
          reasoning: 'REJECT - Social media platform (X/Twitter)',
          enabled: true,
        },
        {
          category: 'social_media',
          pattern: 'linkedin\\.com/in/',
          reasoning: 'REJECT - Social media profile (LinkedIn)',
          enabled: true,
        },
        {
          category: 'social_media',
          pattern: 'instagram\\.com',
          reasoning: 'REJECT - Social media platform (Instagram)',
          enabled: true,
        },
        {
          category: 'ecommerce',
          pattern: 'amazon\\.com',
          reasoning: 'REJECT - E-commerce platform (Amazon)',
          enabled: true,
        },
        {
          category: 'ecommerce',
          pattern: 'ebay\\.com',
          reasoning: 'REJECT - E-commerce platform (eBay)',
          enabled: true,
        },
        {
          category: 'ecommerce',
          pattern: 'shopify\\.com',
          reasoning: 'REJECT - E-commerce platform (Shopify)',
          enabled: true,
        },
        {
          category: 'forum',
          pattern: 'reddit\\.com',
          reasoning: 'REJECT - Forum/discussion platform (Reddit)',
          enabled: true,
        },
        {
          category: 'forum',
          pattern: 'quora\\.com',
          reasoning: 'REJECT - Q&A platform (Quora)',
          enabled: true,
        },
        {
          category: 'aggregator',
          pattern: 'wikipedia\\.org',
          reasoning: 'REJECT - Large knowledge aggregator (Wikipedia)',
          enabled: true,
        },
        {
          category: 'aggregator',
          pattern: 'youtube\\.com',
          reasoning: 'REJECT - Video aggregator (YouTube)',
          enabled: true,
        },
      ],
      classification_indicators: [
        'Explicit "Write for Us" or "Guest Post Guidelines" pages',
        'Author bylines with external contributors',
        'Contributor sections or editorial team listings',
        'Writing opportunities or submission guidelines',
        'Clear evidence of accepting external content',
      ],
      llm_temperature: this.DEFAULT_TEMPERATURE,
      confidence_threshold: this.DEFAULT_CONFIDENCE_THRESHOLD,
      content_truncation_limit: this.DEFAULT_CONTENT_LIMIT,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Normalize settings payload by converting numeric fields to numbers and ensuring required arrays exist
   */
  private normalizeSettings(data: any): ClassificationSettings {
    const defaults = this.getDefaultSettings();
    return {
      id: typeof data?.id === 'string' ? data.id : defaults.id,
      prefilter_rules: Array.isArray(data?.prefilter_rules)
        ? data.prefilter_rules
        : defaults.prefilter_rules,
      classification_indicators: Array.isArray(data?.classification_indicators)
        ? data.classification_indicators
        : defaults.classification_indicators,
      llm_temperature: this.toNumber(data?.llm_temperature, defaults.llm_temperature),
      confidence_threshold: this.toNumber(data?.confidence_threshold, defaults.confidence_threshold),
      content_truncation_limit: Math.round(
        this.toNumber(data?.content_truncation_limit, defaults.content_truncation_limit),
      ),
      updated_at:
        typeof data?.updated_at === 'string'
          ? data.updated_at
          : defaults.updated_at,
    };
  }

  /**
   * Convert Supabase numeric/string values into finite numbers with fallback
   */
  private toNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    return fallback;
  }

  /**
   * Validate regex patterns for ReDoS vulnerabilities
   * @throws BadRequestException if any pattern is unsafe
   */
  private validateRegexPatterns(rules: PreFilterRuleDto[]): void {
    for (const rule of rules) {
      if (!safeRegex(rule.pattern)) {
        throw new BadRequestException(
          `Invalid regex pattern "${rule.pattern}" in rule "${rule.category}": Potential ReDoS vulnerability detected`,
        );
      }
    }
  }

  /**
   * Manually invalidate settings cache
   * Used when settings are updated externally
   */
  invalidateCache(): void {
    this.cache.del(this.CACHE_KEY);
    this.logger.log('Settings cache manually invalidated');
  }
}
