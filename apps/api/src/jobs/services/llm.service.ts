import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import OpenAI from 'openai';
import type { LlmProvider, ClassificationResponse } from '@website-scraper/shared';

/**
 * LLM classification service with Gemini primary and GPT fallback
 * Handles URL classification with retry logic and cost tracking
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly geminiClient: GenerativeModel | null = null;
  private readonly openaiClient: OpenAI | null = null;
  private readonly timeoutMs = 30000; // 30 seconds

  constructor() {
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
   * @param url - URL being analyzed
   * @param content - Website content to analyze
   * @returns Formatted prompt string
   */
  private getClassificationPrompt(url: string, content: string): string {
    return `Analyze the following website content and determine if it accepts guest post contributions.

Consider these indicators:
- Explicit "Write for Us" or "Guest Post Guidelines" pages
- Author bylines with external contributors
- Contributor sections or editorial team listings
- Writing opportunities or submission guidelines
- Clear evidence of accepting external content

Website URL: ${url}

Website Content:
${content.slice(0, 10000)} ${content.length > 10000 ? '...(truncated)' : ''}

Respond ONLY with valid JSON in this exact format:
{
  "suitable": boolean,
  "confidence": number (0-1),
  "reasoning": "string"
}`;
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

    // Try Gemini first if available
    if (this.geminiClient) {
      try {
        const { result, attempts } = await this.retryWithBackoff(() =>
          this.classifyWithGemini(url, content),
        );
        retryCount = attempts;
        const processingTimeMs = Date.now() - startTime;
        return {
          ...result,
          provider: 'gemini',
          processingTimeMs,
          retryCount,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Gemini classification failed after retries: ${errorMessage}. Falling back to GPT.`,
        );

        // Fall through to GPT fallback
      }
    }

    // Fallback to GPT if Gemini unavailable or failed
    if (this.openaiClient) {
      try {
        this.logger.log(
          `GPT fallback used - ${this.geminiClient ? 'Gemini failed' : 'Gemini not configured'}`,
        );
        const { result, attempts } = await this.retryWithBackoff(() =>
          this.classifyWithGPT(url, content),
        );
        retryCount = attempts;
        const processingTimeMs = Date.now() - startTime;
        return {
          ...result,
          provider: 'gpt',
          processingTimeMs,
          retryCount,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`GPT classification failed after retries: ${errorMessage}`);
        throw new Error(`All LLM providers failed. Last error: ${errorMessage}`);
      }
    }

    throw new Error('No LLM providers available for classification');
  }

  /**
   * Classify using Gemini API
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

    const prompt = this.getClassificationPrompt(url, content);

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout (>30s)')), this.timeoutMs);
    });

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

    const prompt = this.getClassificationPrompt(url, content);

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
        temperature: 0.3,
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
