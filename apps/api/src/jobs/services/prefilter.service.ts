import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import safeRegex from 'safe-regex';
import type { PreFilterRule, PreFilterResult, PreFilterConfig } from '@website-scraper/shared';
import { SettingsService } from '../../settings/settings.service';

/**
 * Compiled filter rule with RegExp pattern
 */
interface CompiledRule {
  category: string;
  pattern: RegExp;
  reasoning: string;
}

/**
 * Pre-filter service to reject URLs based on regex patterns before LLM classification
 * Reduces LLM API costs by 40-60% by filtering out known unsuitable URL patterns
 * Story 3.0: Now loads rules from database via SettingsService, falls back to JSON file
 */
@Injectable()
export class PreFilterService implements OnModuleInit {
  private readonly logger = new Logger(PreFilterService.name);
  private compiledRules: CompiledRule[] = [];

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Initialize service by loading rules from database
   */
  async onModuleInit() {
    await this.loadRulesFromDatabase();
  }

  /**
   * Load rules from database via SettingsService
   * Falls back to JSON file if database unavailable
   * Story 3.0 AC6: Load rules from database
   */
  private async loadRulesFromDatabase(): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();

      // Check if settings came from database or defaults
      const isFromDatabase = settings.id !== 'default';
      const rules = settings.prefilter_rules;

      // Filter only enabled rules (Story 3.0 AC6)
      const enabledRules = rules.filter((rule) => rule.enabled);

      // Reset compiled rules
      this.compiledRules = [];

      for (const rule of enabledRules) {
        try {
          // Validate regex for ReDoS vulnerability before compilation
          if (!safeRegex(rule.pattern)) {
            this.logger.warn(
              `Potentially unsafe regex pattern (ReDoS risk) in rule "${rule.category}": ${rule.pattern}. Skipping rule.`,
            );
            continue;
          }

          // Compile regex pattern for performance
          const compiledPattern = new RegExp(rule.pattern, 'i'); // Case-insensitive
          this.compiledRules.push({
            category: rule.category,
            pattern: compiledPattern,
            reasoning: rule.reasoning,
          });
        } catch (error) {
          this.logger.warn(
            `Invalid regex pattern in rule "${rule.category}": ${rule.pattern}. Skipping rule.`,
          );
        }
      }

      if (isFromDatabase) {
        this.logger.log(
          `Loaded ${this.compiledRules.length} pre-filter rules from database (${enabledRules.length} enabled out of ${rules.length} total)`,
        );
      } else {
        this.logger.warn(
          `Loaded ${this.compiledRules.length} pre-filter rules from defaults (database unavailable)`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load rules from database: ${errorMessage}. Falling back to file.`);
      this.loadRulesFromFile();
    }
  }

  /**
   * Fallback: Load and compile filter rules from configuration file
   * Used when database is unavailable
   * Story 3.0 AC6: Fallback to hardcoded defaults
   */
  private loadRulesFromFile(): void {
    try {
      // Use absolute path resolution from project root to avoid path traversal issues
      // Priority: 1) CONFIG_PATH env var (production), 2) Relative to __dirname (development/test)
      let configPath: string;
      if (process.env.CONFIG_PATH) {
        // Production: use explicit CONFIG_PATH environment variable
        configPath = join(process.env.CONFIG_PATH, 'default-filter-rules.json');
      } else if (process.env.NODE_ENV === 'production') {
        // Production fallback: expect config in dist/config/
        configPath = join(process.cwd(), 'dist/config/default-filter-rules.json');
      } else {
        // Development/Test: resolve relative to this file's location
        configPath = join(__dirname, '../../config/default-filter-rules.json');
      }

      const configJson = readFileSync(configPath, 'utf-8');
      const config: PreFilterConfig = JSON.parse(configJson);

      this.compiledRules = [];

      for (const rule of config.rules) {
        try {
          // Validate regex for ReDoS vulnerability before compilation
          if (!safeRegex(rule.pattern)) {
            this.logger.warn(
              `Potentially unsafe regex pattern (ReDoS risk) in rule "${rule.category}": ${rule.pattern}. Skipping rule.`,
            );
            continue;
          }

          // Compile regex pattern for performance
          const compiledPattern = new RegExp(rule.pattern, 'i'); // Case-insensitive
          this.compiledRules.push({
            category: rule.category,
            pattern: compiledPattern,
            reasoning: rule.reasoning,
          });
        } catch (error) {
          this.logger.warn(
            `Invalid regex pattern in rule "${rule.category}": ${rule.pattern}. Skipping rule.`,
          );
        }
      }

      this.logger.log(`Loaded ${this.compiledRules.length} pre-filter rules from file (fallback)`);
    } catch (error) {
      this.logger.error('Failed to load pre-filter rules from file. Pre-filtering will be disabled.', error);
    }
  }

  /**
   * Refresh rules from database
   * Called when settings are updated
   * Story 3.0 AC6: Refresh rules when settings change
   */
  async refreshRules(): Promise<void> {
    this.logger.log('Refreshing pre-filter rules from database');
    await this.loadRulesFromDatabase();
  }

  /**
   * Filter a URL against all pre-filter rules
   * Returns early on first match for optimal performance
   *
   * @param url - URL to evaluate
   * @returns PreFilterResult with passed status and reasoning
   */
  filterUrl(url: string): PreFilterResult {
    const startTime = Date.now();

    try {
      // Input validation: reject null, undefined, empty, or non-string URLs
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        this.logger.warn(
          'Invalid URL input to filterUrl: received null, undefined, or empty string',
        );
        return {
          passed: true,
          reasoning: 'PASS - Invalid input, defaulting to LLM for validation',
        };
      }

      // Sanitize URL for logging: truncate long URLs and strip potential control characters
      const sanitizedUrl = url.slice(0, 200).replace(/[\x00-\x1F\x7F-\x9F]/g, '');

      // Iterate through all compiled rules
      for (const rule of this.compiledRules) {
        if (rule.pattern.test(url)) {
          const processingTime = Date.now() - startTime;

          // Log slow operations (>50ms as per story requirements)
          if (processingTime > 50) {
            this.logger.warn(
              `Slow pre-filter operation: ${processingTime}ms for URL: ${sanitizedUrl}`,
            );
          }

          // Early exit on first match - REJECT
          return {
            passed: false,
            reasoning: rule.reasoning,
            matched_rule: rule.category,
          };
        }
      }

      const processingTime = Date.now() - startTime;

      // Log slow operations (>50ms)
      if (processingTime > 50) {
        this.logger.warn(`Slow pre-filter operation: ${processingTime}ms for URL: ${sanitizedUrl}`);
      }

      // No rules matched - PASS to LLM
      return {
        passed: true,
        reasoning: 'PASS - Sending to LLM',
      };
    } catch (error) {
      // On error, pass through to LLM (fail-open strategy)
      const sanitizedUrl = url
        ? url.slice(0, 200).replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        : 'undefined';
      this.logger.error(`Error filtering URL ${sanitizedUrl}:`, error);
      return {
        passed: true,
        reasoning: 'PASS - Error in pre-filter, defaulting to LLM',
      };
    }
  }

  /**
   * Get all loaded rules (for debugging/admin purposes)
   */
  getRules(): PreFilterRule[] {
    return this.compiledRules.map((rule) => ({
      category: rule.category,
      pattern: rule.pattern.source,
      reasoning: rule.reasoning,
    }));
  }

  /**
   * Get count of loaded rules
   */
  getRuleCount(): number {
    return this.compiledRules.length;
  }
}
