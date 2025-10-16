import { Injectable, Logger } from '@nestjs/common';
import type { ConfidenceBand } from '@website-scraper/shared';
import { SettingsService } from '../../settings/settings.service';

/**
 * Confidence scoring service for Layer 3 classification results
 * Story 2.4-refactored: Calculates confidence bands from 0-1 score
 *
 * Confidence Bands:
 * - high: 0.8-1.0 (auto-approve as suitable)
 * - medium: 0.5-0.79 (route to manual review)
 * - low: 0.3-0.49 (route to manual review)
 * - auto_reject: 0-0.29 (auto-reject as not_suitable)
 */
@Injectable()
export class ConfidenceScoringService {
  private readonly logger = new Logger(ConfidenceScoringService.name);

  // Default thresholds (fallback if database unavailable)
  private readonly DEFAULT_THRESHOLDS = {
    high: 0.8,
    medium: 0.5,
    low: 0.3,
  };

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Calculate confidence band from 0-1 confidence score
   * Story 3.0 AC8: Loads thresholds from database configuration
   *
   * @param confidence - Confidence score (0-1) from LLM
   * @param sophisticationSignals - Optional array of detected signals for signal strength analysis
   * @returns ConfidenceBand enum value
   */
  async calculateConfidenceBand(
    confidence: number,
    sophisticationSignals?: string[],
  ): Promise<ConfidenceBand> {
    // Input validation - treat non-finite values as 0 for clamping
    let validConfidence = confidence;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
      this.logger.warn(`Invalid confidence score: ${confidence}. Treating as 0.`);
      validConfidence = 0;
    }

    // Clamp confidence to 0-1 range
    const clampedConfidence = Math.max(0, Math.min(1, validConfidence));

    if (clampedConfidence !== validConfidence) {
      this.logger.warn(
        `Confidence score ${validConfidence} out of range. Clamped to ${clampedConfidence}.`,
      );
    }

    // Load thresholds from database settings (Story 3.0 integration)
    const thresholds = await this.loadThresholds();

    // Analyze signal strength if signals are provided
    const signalBoost = this.analyzeSignalStrength(sophisticationSignals);
    const adjustedConfidence = Math.min(1.0, clampedConfidence + signalBoost);

    if (signalBoost > 0) {
      this.logger.debug(
        `Signal strength analysis: ${sophisticationSignals?.length || 0} signals detected. ` +
        `Confidence boosted from ${clampedConfidence.toFixed(2)} to ${adjustedConfidence.toFixed(2)}`,
      );
    }

    // Calculate band based on thresholds
    if (adjustedConfidence >= thresholds.high) {
      return 'high';
    } else if (adjustedConfidence >= thresholds.medium) {
      return 'medium';
    } else if (adjustedConfidence >= thresholds.low) {
      return 'low';
    } else {
      return 'auto_reject';
    }
  }

  /**
   * Analyze signal strength based on detected sophistication signals
   * Stronger signals (more and higher quality) increase confidence
   *
   * @param signals - Array of detected signals
   * @returns Confidence boost (0-0.1 range)
   * @private
   */
  private analyzeSignalStrength(signals?: string[]): number {
    if (!signals || signals.length === 0) {
      return 0;
    }

    // Signal quality weights (higher quality signals boost more)
    const highValueSignals = [
      'write for us',
      'guest post guidelines',
      'submission form',
      'contributor program',
    ];

    const mediumValueSignals = [
      'author bylines',
      'schema markup',
      'structured data',
      'meta optimization',
    ];

    let qualityScore = 0;
    let highValueCount = 0;
    let mediumValueCount = 0;

    signals.forEach((signal) => {
      const lowerSignal = signal.toLowerCase();

      if (highValueSignals.some(hv => lowerSignal.includes(hv))) {
        highValueCount++;
        qualityScore += 0.03; // High-value signals boost by 3%
      } else if (mediumValueSignals.some(mv => lowerSignal.includes(mv))) {
        mediumValueCount++;
        qualityScore += 0.01; // Medium-value signals boost by 1%
      }
    });

    // Cap the boost at 0.1 (10% max confidence increase)
    const boost = Math.min(0.1, qualityScore);

    this.logger.debug(
      `Signal analysis: ${signals.length} total, ${highValueCount} high-value, ` +
      `${mediumValueCount} medium-value. Boost: ${(boost * 100).toFixed(1)}%`,
    );

    return boost;
  }

  /**
   * Load confidence thresholds from database settings
   * Falls back to defaults if database unavailable
   * Story 2.4-refactored Task 7.3: Load from classification_settings table
   * @private
   */
  private async loadThresholds(): Promise<{
    high: number;
    medium: number;
    low: number;
  }> {
    try {
      const settings = await this.settingsService.getSettings();

      // Check if settings came from database (not default fallback)
      const isFromDatabase = settings.id !== 'default';

      if (!isFromDatabase) {
        this.logger.debug('Using default confidence thresholds (database unavailable)');
        return this.DEFAULT_THRESHOLDS;
      }

      // Extract thresholds from settings (Story 2.4-refactored Task 7)
      // Settings now include confidence_threshold_high/medium/low fields
      const thresholds = {
        high: this.asNumber(settings.confidence_threshold_high, this.DEFAULT_THRESHOLDS.high),
        medium: this.asNumber(settings.confidence_threshold_medium, this.DEFAULT_THRESHOLDS.medium),
        low: this.asNumber(settings.confidence_threshold_low, this.DEFAULT_THRESHOLDS.low),
      };

      this.logger.debug(
        `Loaded confidence thresholds from database: high=${thresholds.high}, medium=${thresholds.medium}, low=${thresholds.low}`,
      );

      return thresholds;

    } catch (error) {
      this.logger.warn('Failed to load thresholds from database. Using defaults.');
      return this.DEFAULT_THRESHOLDS;
    }
  }

  /**
   * Safely coerce numeric settings returned as strings into finite numbers
   * Matches pattern from LlmService and SettingsService
   * @private
   */
  private asNumber(value: unknown, fallback: number): number {
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
   * Get confidence band description for logging/UI
   * @param band - Confidence band
   * @returns Human-readable description
   */
  getConfidenceBandDescription(band: ConfidenceBand): string {
    switch (band) {
      case 'high':
        return 'High confidence (0.8-1.0): Auto-approved as suitable';
      case 'medium':
        return 'Medium confidence (0.5-0.79): Routed to manual review';
      case 'low':
        return 'Low confidence (0.3-0.49): Routed to manual review';
      case 'auto_reject':
        return 'Auto-reject (0-0.29): Marked as not suitable';
      default:
        return 'Unknown confidence band';
    }
  }

  /**
   * Check if a confidence band requires manual review
   * @param band - Confidence band
   * @returns True if medium or low confidence
   */
  requiresManualReview(band: ConfidenceBand): boolean {
    return band === 'medium' || band === 'low';
  }

  /**
   * Get expected classification result based on confidence band
   * @param band - Confidence band
   * @returns Expected classification ('suitable' or 'not_suitable')
   */
  getExpectedClassification(band: ConfidenceBand): 'suitable' | 'not_suitable' {
    if (band === 'high') {
      return 'suitable';
    } else if (band === 'auto_reject') {
      return 'not_suitable';
    } else {
      // Medium and low confidence require manual review
      // We'll mark them as 'suitable' pending review
      return 'suitable';
    }
  }
}
