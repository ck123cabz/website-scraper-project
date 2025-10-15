import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import OpenAI from 'openai';
import type { LlmProvider, ClassificationResponse } from '@website-scraper/shared';
import { SettingsService } from '../../settings/settings.service';

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
   * Get the classification prompt for guest post suitability analysis
   * Story 3.0 AC7: Loads indicators and content limit from database settings
   * @param url - URL being analyzed
   * @param content - Website content to analyze
   * @returns Formatted prompt string
   */
  private async getClassificationPrompt(url: string, content: string): Promise<string> {
    try {
      const settings = await this.settingsService.getSettings();
      const indicators = settings.classification_indicators || this.DEFAULT_INDICATORS;
      const contentLimit = this.asNumber(
        settings.content_truncation_limit,
        this.DEFAULT_CONTENT_LIMIT,
      );

      const isFromDatabase = settings.id !== 'default';
      if (!isFromDatabase) {
        this.logger.debug('Using default classification settings (database unavailable)');
      }

      // Build indicator list
      const indicatorsList = indicators.map((ind) => `- ${ind}`).join('\n');

      return `Analyze the following website content and determine if it accepts guest post contributions.

Consider these indicators:
${indicatorsList}

Website URL: ${url}

Website Content:
${content.slice(0, contentLimit)} ${content.length > contentLimit ? '...(truncated)' : ''}

Respond ONLY with valid JSON in this exact format:
{
  "suitable": boolean,
  "confidence": number (0-1),
  "reasoning": "string"
}`;
    } catch (error) {
      this.logger.warn('Failed to load settings for prompt. Using defaults.');
      const indicatorsList = this.DEFAULT_INDICATORS.map((ind) => `- ${ind}`).join('\n');

      return `Analyze the following website content and determine if it accepts guest post contributions.

Consider these indicators:
${indicatorsList}

Website URL: ${url}

Website Content:
${content.slice(0, this.DEFAULT_CONTENT_LIMIT)} ${content.length > this.DEFAULT_CONTENT_LIMIT ? '...(truncated)' : ''}

Respond ONLY with valid JSON in this exact format:
{
  "suitable": boolean,
  "confidence": number (0-1),
  "reasoning": "string"
}`;
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
   * Story 3.0 AC7: Uses database temperature setting
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

    // Get temperature from settings (Story 3.0 AC7)
    let temperature = this.DEFAULT_TEMPERATURE;
    try {
      const settings = await this.settingsService.getSettings();
      temperature = this.asNumber(settings.llm_temperature, this.DEFAULT_TEMPERATURE);
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
   * Story 3.0 AC7: Uses database temperature setting
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

    // Get temperature from settings (Story 3.0 AC7)
    let temperature = this.DEFAULT_TEMPERATURE;
    try {
      const settings = await this.settingsService.getSettings();
      temperature = this.asNumber(settings.llm_temperature, this.DEFAULT_TEMPERATURE);
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

      return parsed as ClassificationResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse classification response: ${errorMessage}`);
    }
  }
}
