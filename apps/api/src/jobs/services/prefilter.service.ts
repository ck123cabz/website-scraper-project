import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import safeRegex from 'safe-regex';
import type { PreFilterRule, PreFilterResult, PreFilterConfig } from '@website-scraper/shared';

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
 */
@Injectable()
export class PreFilterService {
  private readonly logger = new Logger(PreFilterService.name);
  private readonly compiledRules: CompiledRule[] = [];

  constructor() {
    this.loadRules();
  }

  /**
   * Load and compile filter rules from configuration file
   * Rules are compiled at service initialization for optimal performance
   */
  private loadRules(): void {
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

      this.logger.log(`Loaded ${this.compiledRules.length} pre-filter rules`);
    } catch (error) {
      this.logger.error('Failed to load pre-filter rules. Pre-filtering will be disabled.', error);
    }
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
