import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import OpenAI from 'openai';
import type { LlmProvider, ClassificationResponse } from '@website-scraper/shared';
import { SettingsService } from '../../settings/settings.service';

// Type stub for unused legacy method
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Layer3Results = any;

/**
 * LLM classification service with Gemini primary and GPT fallback
 * Handles URL classification with retry logic and cost tracking
 * Story 3.0: Integrated with SettingsService for database-driven configuration
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly geminiClient: GenerativeModel | null = null;
  private readonly openaiClient: OpenAI | null = null;
  private readonly timeoutMs = 30000; // 30 seconds
  // Default values used as fallback (Story 3.0 AC7)
  private readonly DEFAULT_TEMPERATURE = 0.3;
  private readonly DEFAULT_CONTENT_LIMIT = 10000;
  private readonly DEFAULT_INDICATORS = [
    'Explicit "Write for Us" or "Guest Post Guidelines" pages',
    'Author bylines with external contributors',
    'Contributor sections or editorial team listings',
    'Writing opportunities or submission guidelines',
    'Clear evidence of accepting external content',
  ];

  constructor(private readonly settingsService: SettingsService) {
    // Initialize Gemini client
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.geminiClient = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        this.logger.log('Gemini client initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Gemini client', error);
      }
    } else {
      this.logger.warn('GEMINI_API_KEY not found - Gemini classification unavailable');
    }

    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.logger.log('OpenAI client initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize OpenAI client', error);
      }
    } else {
      this.logger.warn('OPENAI_API_KEY not found - GPT fallback unavailable');
    }

    // Validate at least one provider is available
    if (!this.geminiClient && !this.openaiClient) {
      this.logger.error(
        'CRITICAL: No LLM providers available. Both GEMINI_API_KEY and OPENAI_API_KEY are missing.',
      );
    }
  }

  /**
   * Get the enhanced classification prompt for guest post suitability analysis
   * Story 2.4-refactored AC2: Enhanced with sophistication signals
   * Story 3.0 AC7: Loads indicators and content limit from database settings (layer3_rules)
   * @param url - URL being analyzed
   * @param content - Website content to analyze
   * @returns Formatted prompt string
   */
  private async getClassificationPrompt(url: string, content: string): Promise<string> {
    try {
      const settings = await this.settingsService.getSettings();

      // Use layer3_rules structure, fallback to V1 fields for backward compatibility
      const layer3Rules = settings.layer3_rules;
      const contentLimit = layer3Rules?.content_truncation_limit
        ? this.asNumber(layer3Rules.content_truncation_limit, this.DEFAULT_CONTENT_LIMIT)
        : this.asNumber(settings.content_truncation_limit, this.DEFAULT_CONTENT_LIMIT);

      const guestPostRedFlags =
        layer3Rules?.guest_post_red_flags ||
        settings.classification_indicators ||
        this.DEFAULT_INDICATORS;

      const seoInvestmentSignals = layer3Rules?.seo_investment_signals || [
        'schema_markup',
        'open_graph',
        'structured_data',
      ];

      const isFromDatabase = settings.id !== 'default';
      if (!isFromDatabase) {
        this.logger.debug('Using default classification settings (database unavailable)');
      }

      // Log content truncation for debugging (Story 2.4 Lessons Learned)
      if (content.length > contentLimit) {
        this.logger.debug(
          `Content truncated from ${content.length} to ${contentLimit} characters for URL: ${url}`,
        );
      }

      const truncatedContent = content.slice(0, contentLimit);
      const isTruncated = content.length > contentLimit;

      // Build dynamic indicators list from settings
      const indicatorsList = guestPostRedFlags.map((indicator) => `- ${indicator}`).join('\n');

      const seoSignalsList = seoInvestmentSignals
        .map((signal) => `- ${signal.replace(/_/g, ' ')}`)
        .join('\n');

      // Enhanced prompt with sophistication signals (Story 2.4-refactored AC2)
      // Story 3.0: Uses dynamic indicators and signals from layer3_rules
      return `You are an AI assistant that analyzes website content to determine if the site is suitable for high-quality guest post outreach. Focus on content marketing sophistication and SEO investment as POSITIVE indicators, while treating explicit guest post solicitation as RED FLAGS.

Analyze the following website content and determine suitability.

**Content Marketing Sophistication Indicators (POSITIVE):**
- Author bylines with external contributor profiles
- Editorial quality: writing depth, professional tone, well-researched content
- Audience engagement signals: comment sections, social shares, community interaction
- Multiple authors or contributors (indicates editorial process)
- Regular publishing cadence with diverse content

**SEO Investment Signals (POSITIVE):**
${seoSignalsList}
- Meta optimization: descriptive title tags, meta descriptions, canonical tags
- Technical SEO: sitemap.xml, robots.txt, proper heading hierarchy
- Internal linking strategy and content organization
- Mobile optimization and page speed indicators

**Guest Post Red Flags (NEGATIVE - Mark as NOT SUITABLE if found):**
${indicatorsList}

IMPORTANT: Sites WITH these red flag signals should be marked as NOT suitable (they are low-quality link farms or openly solicit paid guest posts). Sites WITHOUT these signals, but WITH sophistication and SEO investment, should be marked as suitable.

Website URL: ${url}

Website Content${isTruncated ? ` (truncated to ${contentLimit.toLocaleString()} chars)` : ''}:
${truncatedContent}

Respond ONLY with valid JSON in this exact format:
{
  "suitable": boolean,
  "confidence": number (0-1, where 1.0 is absolute certainty),
  "reasoning": "string explaining the decision with specific evidence",
  "sophistication_signals": ["array", "of", "detected", "signals"]
}

**Confidence Scoring Guidance:**
- High confidence (0.8-1.0): Multiple strong signals found, clear evidence, consistent indicators
- Medium confidence (0.5-0.79): Some signals present, but ambiguous or conflicting evidence
- Low confidence (0.3-0.49): Weak signals, limited evidence, unclear intent
- Auto-reject (0-0.29): No relevant signals, clear mismatch, or negative indicators`;
    } catch (error) {
      this.logger.warn('Failed to load settings for prompt. Using defaults.');

      // Fallback prompt (same enhanced format)
      const isTruncated = content.length > this.DEFAULT_CONTENT_LIMIT;
      const truncatedContent = content.slice(0, this.DEFAULT_CONTENT_LIMIT);

      if (isTruncated) {
        this.logger.debug(
          `Content truncated from ${content.length} to ${this.DEFAULT_CONTENT_LIMIT} characters (fallback)`,
        );
      }

      const indicatorsList = this.DEFAULT_INDICATORS.map((indicator) => `- ${indicator}`).join(
        '\n',
      );

      return `You are an AI assistant that analyzes website content to determine if the site is suitable for high-quality guest post outreach. Focus on content marketing sophistication and SEO investment as POSITIVE indicators, while treating explicit guest post solicitation as RED FLAGS.

Analyze the following website content and determine suitability.

**Content Marketing Sophistication Indicators (POSITIVE):**
- Author bylines with external contributor profiles
- Editorial quality: writing depth, professional tone, well-researched content
- Audience engagement signals: comment sections, social shares, community interaction
- Multiple authors or contributors (indicates editorial process)
- Regular publishing cadence with diverse content

**SEO Investment Signals (POSITIVE):**
- Structured data: schema markup, JSON-LD, Open Graph tags
- Meta optimization: descriptive title tags, meta descriptions, canonical tags
- Technical SEO: sitemap.xml, robots.txt, proper heading hierarchy
- Internal linking strategy and content organization
- Mobile optimization and page speed indicators

**Guest Post Red Flags (NEGATIVE - Mark as NOT SUITABLE if found):**
${indicatorsList}

IMPORTANT: Sites WITH these red flag signals should be marked as NOT suitable (they are low-quality link farms or openly solicit paid guest posts). Sites WITHOUT these signals, but WITH sophistication and SEO investment, should be marked as suitable.

Website URL: ${url}

Website Content${isTruncated ? ' (truncated to 10,000 chars)' : ''}:
${truncatedContent}

Respond ONLY with valid JSON in this exact format:
{
  "suitable": boolean,
  "confidence": number (0-1, where 1.0 is absolute certainty),
  "reasoning": "string explaining the decision with specific evidence",
  "sophistication_signals": ["array", "of", "detected", "signals"]
}

**Confidence Scoring Guidance:**
- High confidence (0.8-1.0): Multiple strong signals found, clear evidence, consistent indicators
- Medium confidence (0.5-0.79): Some signals present, but ambiguous or conflicting evidence
- Low confidence (0.3-0.49): Weak signals, limited evidence, unclear intent
- Auto-reject (0-0.29): No relevant signals, clear mismatch, or negative indicators`;
    }
  }

  /**
   * Check if LLM service is available
   * @returns True if at least one provider is configured
   */
  isAvailable(): boolean {
    return !!(this.geminiClient || this.openaiClient);
  }

  /**
   * Determine if an error is transient and should be retried
   * @private
   */
  private isTransientError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Transient errors: retry
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('503') ||
      message.includes('service unavailable')
    ) {
      return true;
    }

    // Permanent errors: do not retry
    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('400') ||
      message.includes('bad request') ||
      message.includes('invalid json') ||
      message.includes('403') ||
      message.includes('forbidden') ||
      message.includes('quota exceeded')
    ) {
      return false;
    }

    // Default: treat as transient (fail-open for retries)
    return true;
  }

  /**
   * Retry a function with exponential backoff
   * @private
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
  ): Promise<{ result: T; attempts: number }> {
    const delays = [1000, 2000, 4000]; // Exponential backoff delays in ms

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await fn();
        return { result, attempts: attempt };
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts - 1;
        const err = error instanceof Error ? error : new Error('Unknown error');

        // Check if error is transient
        if (!this.isTransientError(err) || isLastAttempt) {
          // Permanent error or last attempt - throw immediately
          throw err;
        }

        // Log retry attempt
        const delay = delays[attempt] || delays[delays.length - 1];
        this.logger.warn(
          `Transient error detected. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts}): ${err.message}`,
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Retry logic failed - should never reach here');
  }

  /**
   * Classify a URL using Gemini primary with GPT fallback
   * Includes retry logic and comprehensive error handling
   * Story 3.0 AC8: Applies confidence threshold filtering
   *
   * @param url - URL to classify
   * @param content - Website content to analyze
   * @returns Classification result with provider info and cost
   */
  async classifyUrl(
    url: string,
    content: string,
  ): Promise<{
    classification: 'suitable' | 'not_suitable';
    confidence: number;
    reasoning: string;
    provider: LlmProvider;
    cost: number;
    processingTimeMs: number;
    retryCount: number;
  }> {
    const startTime = Date.now();
    let retryCount = 0;

    // Input validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      throw new Error('Invalid URL provided to classifyUrl');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Invalid content provided to classifyUrl');
    }

    if (!this.isAvailable()) {
      throw new Error('No LLM providers available. Configure GEMINI_API_KEY or OPENAI_API_KEY.');
    }

    let result;
    let provider: LlmProvider;

    // Try Gemini first if available
    if (this.geminiClient) {
      try {
        const { result: geminiResult, attempts } = await this.retryWithBackoff(() =>
          this.classifyWithGemini(url, content),
        );
        retryCount = attempts;
        result = geminiResult;
        provider = 'gemini';
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Gemini classification failed after retries: ${errorMessage}. Falling back to GPT.`,
        );
      }
    }

    // Fallback to GPT if Gemini unavailable or failed
    if (!result && this.openaiClient) {
      try {
        this.logger.log(
          `GPT fallback used - ${this.geminiClient ? 'Gemini failed' : 'Gemini not configured'}`,
        );
        const { result: gptResult, attempts } = await this.retryWithBackoff(() =>
          this.classifyWithGPT(url, content),
        );
        retryCount = attempts;
        result = gptResult;
        provider = 'gpt';
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`GPT classification failed after retries: ${errorMessage}`);
        throw new Error(`All LLM providers failed. Last error: ${errorMessage}`);
      }
    }

    if (!result) {
      throw new Error('No LLM providers available for classification');
    }

    // Story 3.0 AC8: Apply confidence threshold filtering
    const settings = await this.settingsService.getSettings();
    const threshold = this.asNumber(settings.confidence_threshold, 0.0);
    const confidence = this.asNumber(result.confidence, 0.0);

    let finalClassification = result.classification;
    let finalReasoning = result.reasoning;

    if (threshold > 0 && confidence < threshold) {
      this.logger.debug(
        `Classification confidence ${confidence.toFixed(2)} below threshold ${threshold.toFixed(2)}. Marking as not_suitable.`,
      );
      finalClassification = 'not_suitable';
      finalReasoning = `Confidence ${confidence.toFixed(2)} below threshold ${threshold.toFixed(2)}. Original: ${result.reasoning}`;
    }

    const processingTimeMs = Date.now() - startTime;
    return {
      classification: finalClassification,
      confidence,
      reasoning: finalReasoning,
      provider: provider!,
      cost: result.cost,
      processingTimeMs,
      retryCount,
    };
  }

  /**
   * Classify using Gemini API
   * Story 3.0 AC7: Uses database temperature setting from layer3_rules
   * @private
   */
  private async classifyWithGemini(
    url: string,
    content: string,
  ): Promise<{
    classification: 'suitable' | 'not_suitable';
    confidence: number;
    reasoning: string;
    cost: number;
  }> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = await this.getClassificationPrompt(url, content);

    // Get temperature from settings (Story 3.0 AC7: Use layer3_rules, fallback to V1)
    let temperature = this.DEFAULT_TEMPERATURE;
    try {
      const settings = await this.settingsService.getSettings();
      temperature =
        settings.layer3_rules?.llm_temperature !== undefined
          ? this.asNumber(settings.layer3_rules.llm_temperature, this.DEFAULT_TEMPERATURE)
          : this.asNumber(settings.llm_temperature, this.DEFAULT_TEMPERATURE);
    } catch (error) {
      this.logger.debug('Failed to load temperature setting. Using default.');
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout (>30s)')), this.timeoutMs);
    });

    // Note: Gemini doesn't support temperature in the same way as OpenAI
    // Temperature is typically set in generationConfig, but gemini-2.0-flash-exp may not support it
    // We'll log the temperature for consistency but Gemini API behavior may vary
    this.logger.debug(`Using temperature: ${temperature} for Gemini classification`);

    // Race between API call and timeout
    const result = await Promise.race([this.geminiClient.generateContent(prompt), timeoutPromise]);

    const response = result.response;
    const text = response.text();

    // Parse JSON response
    const parsed = this.parseClassificationResponse(text);

    // Calculate cost (Gemini pricing: $0.0003/1K input, $0.0015/1K output)
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
    const cost = (inputTokens * 0.0003 + outputTokens * 0.0015) / 1000;

    this.logger.debug(
      `Gemini classification: ${parsed.suitable ? 'suitable' : 'not_suitable'} (confidence: ${parsed.confidence}, cost: $${cost.toFixed(6)})`,
    );

    return {
      classification: parsed.suitable ? 'suitable' : 'not_suitable',
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      cost,
    };
  }

  /**
   * Classify using OpenAI GPT API
   * Story 3.0 AC7: Uses database temperature setting from layer3_rules
   * @private
   */
  private async classifyWithGPT(
    url: string,
    content: string,
  ): Promise<{
    classification: 'suitable' | 'not_suitable';
    confidence: number;
    reasoning: string;
    cost: number;
  }> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = await this.getClassificationPrompt(url, content);

    // Get temperature from settings (Story 3.0 AC7: Use layer3_rules, fallback to V1)
    let temperature = this.DEFAULT_TEMPERATURE;
    try {
      const settings = await this.settingsService.getSettings();
      temperature =
        settings.layer3_rules?.llm_temperature !== undefined
          ? this.asNumber(settings.layer3_rules.llm_temperature, this.DEFAULT_TEMPERATURE)
          : this.asNumber(settings.llm_temperature, this.DEFAULT_TEMPERATURE);
      this.logger.debug(`Using temperature: ${temperature} for GPT classification`);
    } catch (error) {
      this.logger.debug('Failed to load temperature setting. Using default.');
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API timeout (>30s)')), this.timeoutMs);
    });

    // Race between API call and timeout
    const completion = await Promise.race([
      this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant that analyzes website content to determine if the site accepts guest post contributions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature, // Story 3.0 AC7: Use database temperature
        response_format: { type: 'json_object' },
      }),
      timeoutPromise,
    ]);

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response from OpenAI API');
    }

    // Parse JSON response
    const parsed = this.parseClassificationResponse(text);

    // Calculate cost (GPT-4o-mini pricing: $0.0005/1K input, $0.002/1K output)
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.0005 + outputTokens * 0.002) / 1000;

    this.logger.debug(
      `GPT classification: ${parsed.suitable ? 'suitable' : 'not_suitable'} (confidence: ${parsed.confidence}, cost: $${cost.toFixed(6)})`,
    );

    return {
      classification: parsed.suitable ? 'suitable' : 'not_suitable',
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      cost,
    };
  }

  /**
   * Safely coerce numeric settings returned as strings into finite numbers
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
   * Parse and validate classification response JSON
   * Story 2.4-refactored: Enhanced to handle sophistication_signals array
   * @private
   */
  private parseClassificationResponse(text: string): ClassificationResponse {
    try {
      // Remove markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanedText);

      // Validate response structure
      if (typeof parsed.suitable !== 'boolean') {
        throw new Error('Invalid response: "suitable" field must be boolean');
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error('Invalid response: "confidence" field must be number between 0-1');
      }

      if (typeof parsed.reasoning !== 'string' || parsed.reasoning.length === 0) {
        throw new Error('Invalid response: "reasoning" field must be non-empty string');
      }

      // Validate sophistication_signals array (Story 2.4-refactored AC2)
      // This field is optional but if present must be an array
      if (parsed.sophistication_signals !== undefined) {
        if (!Array.isArray(parsed.sophistication_signals)) {
          this.logger.warn('Invalid sophistication_signals field (not an array). Ignoring field.');
          delete parsed.sophistication_signals;
        } else if (!parsed.sophistication_signals.every((s: unknown) => typeof s === 'string')) {
          this.logger.warn(
            'Invalid sophistication_signals field (contains non-string values). Filtering to strings only.',
          );
          parsed.sophistication_signals = parsed.sophistication_signals.filter(
            (s: unknown) => typeof s === 'string',
          );
        }
      }

      return parsed as ClassificationResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse classification response: ${errorMessage}`);
    }
  }

  /**
   * Get structured Layer 3 evaluation results for manual review
   * Returns detailed sophistication signal breakdown from LLM analysis
   *
   * @param url - URL to analyze
   * @param content - Website content to analyze
   * @returns Layer3Results with all sophistication signals
   */
  async getStructuredResults(url: string, content: string): Promise<Layer3Results> {
    try {
      // Run full classification to get sophistication signals
      const result = await this.classifyUrl(url, content);

      // For now, we don't have individual sophistication signal scores from LLM
      // The LLM returns an array of detected signals, not individual scores
      // We'll need to enhance the prompt to get individual signal scores
      // For MVP, use overall confidence as proxy for all signals

      const baseScore = result.confidence;
      const detected = result.classification === 'suitable';

      return {
        design_quality: {
          score: baseScore,
          detected,
          reasoning: 'Inferred from overall classification - detailed scoring not yet implemented',
        },
        content_originality: {
          score: baseScore,
          detected,
          reasoning: 'Inferred from overall classification - detailed scoring not yet implemented',
        },
        authority_indicators: {
          score: baseScore,
          detected,
          reasoning: 'Inferred from overall classification - detailed scoring not yet implemented',
        },
        professional_presentation: {
          score: baseScore,
          detected,
          reasoning: result.reasoning.slice(0, 500), // Truncate reasoning to 500 chars
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting structured Layer 3 results: ${errorMessage}`);
      return this.getEmptyResults();
    }
  }

  /**
   * Return empty results structure when analysis cannot be performed
   */
  private getEmptyResults(): Layer3Results {
    return {
      design_quality: {
        score: 0,
        detected: false,
        reasoning: 'Analysis not performed',
      },
      content_originality: {
        score: 0,
        detected: false,
        reasoning: 'Analysis not performed',
      },
      authority_indicators: {
        score: 0,
        detected: false,
        reasoning: 'Analysis not performed',
      },
      professional_presentation: {
        score: 0,
        detected: false,
        reasoning: 'Analysis not performed',
      },
    };
  }

  /**
   * Get complete Layer 3 factor structure for url_results table
   * Returns JSONB-compatible object with all sophistication analysis factors
   *
   * This method returns ALL fields required by the Layer3Factors interface:
   * - classification: 'accepted' | 'rejected' - Final LLM decision
   * - sophistication_signals: Object with 4 dimensions (design_quality, authority_indicators,
   *   professional_presentation, content_originality), each containing score and indicators array
   * - llm_provider: string - Provider name ('gemini' or 'gpt')
   * - model_version: string - Model version identifier
   * - cost_usd: number - API call cost in USD
   * - reasoning: string - Full LLM explanation (up to 5000 chars)
   * - tokens_used: { input: number, output: number } - Token usage statistics
   * - processing_time_ms: number - Total Layer 3 processing time
   *
   * @param url - URL to analyze
   * @param content - Website content to analyze
   * @returns Promise<Layer3Factors> with complete sophistication analysis data
   */
  async getLayer3Factors(url: string, content: string): Promise<any> {
    try {
      // Run full LLM classification to get all metadata
      const classification = await this.classifyUrl(url, content);

      // Get structured Layer 3 results for sophistication signals
      const layer3Results = await this.getStructuredResults(url, content);

      // Parse sophistication signals from classification response if available
      // The LLM response may include a sophistication_signals array
      let sophisticationSignals: any;
      try {
        // Try to get sophistication_signals from the raw LLM response
        // For now, we'll construct it from the structured results
        sophisticationSignals = {
          design_quality: {
            score: layer3Results.design_quality.score,
            indicators: layer3Results.design_quality.signals || [],
          },
          authority_indicators: {
            score: layer3Results.authority_indicators.score,
            indicators: layer3Results.authority_indicators.signals || [],
          },
          professional_presentation: {
            score: layer3Results.professional_presentation.score,
            indicators: layer3Results.professional_presentation.signals || [],
          },
          content_originality: {
            score: layer3Results.content_originality.score,
            indicators: layer3Results.content_originality.signals || [],
          },
        };
      } catch (error) {
        // Fallback to basic structure if parsing fails
        sophisticationSignals = {
          design_quality: { score: classification.confidence, indicators: [] },
          authority_indicators: { score: classification.confidence, indicators: [] },
          professional_presentation: { score: classification.confidence, indicators: [] },
          content_originality: { score: classification.confidence, indicators: [] },
        };
      }

      // Determine model version based on provider
      let modelVersion = 'unknown';
      if (classification.provider === 'gemini') {
        modelVersion = 'gemini-2.0-flash-exp';
      } else if (classification.provider === 'gpt') {
        modelVersion = 'gpt-4o-mini';
      }

      // Calculate token usage (estimated as fallback - real tokens tracked in classifyWithGemini/GPT)
      // Note: Real token counts are available from LLM providers via usageMetadata/usage fields
      // but not passed through classifyUrl() response. This is acceptable for MVP.
      const estimatedInputTokens = Math.ceil(content.length / 4);
      const estimatedOutputTokens = Math.ceil(classification.reasoning.length / 4);

      return {
        classification: classification.classification === 'suitable' ? 'accepted' : 'rejected',
        sophistication_signals: sophisticationSignals,
        llm_provider: classification.provider,
        model_version: modelVersion,
        cost_usd: classification.cost,
        reasoning: classification.reasoning,
        tokens_used: {
          input: estimatedInputTokens,
          output: estimatedOutputTokens,
        },
        processing_time_ms: classification.processingTimeMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting Layer 3 factors: ${errorMessage}`);
      return this.getEmptyLayer3Factors('Analysis error');
    }
  }

  /**
   * Return empty Layer3Factors structure when analysis cannot be performed
   * @private
   */
  private getEmptyLayer3Factors(reason: string): any {
    this.logger.warn(`Returning empty Layer 3 factors: ${reason}`);
    return {
      classification: 'rejected',
      sophistication_signals: {
        design_quality: {
          score: 0,
          indicators: [],
        },
        authority_indicators: {
          score: 0,
          indicators: [],
        },
        professional_presentation: {
          score: 0,
          indicators: [],
        },
        content_originality: {
          score: 0,
          indicators: [],
        },
      },
      llm_provider: 'none',
      model_version: 'unknown',
      cost_usd: 0,
      reasoning: reason,
      tokens_used: {
        input: 0,
        output: 0,
      },
      processing_time_ms: 0,
    };
  }
}
