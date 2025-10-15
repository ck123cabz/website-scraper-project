import { Injectable, Logger } from '@nestjs/common';
import type { LlmProvider } from '@website-scraper/shared';

/**
 * Mock LLM Service for local testing without external API calls
 * Story 3.0 Task 7: Create Mock Services for External APIs
 *
 * Features:
 * - Returns predefined classifications based on URL patterns
 * - Simulates both Gemini and GPT providers
 * - Realistic processing delays (200-800ms)
 * - Mock cost tracking ($0.0004 for Gemini, $0.0012 for GPT)
 * - No external API calls or real costs
 */
@Injectable()
export class MockLlmService {
  private readonly logger = new Logger(MockLlmService.name);

  // Track which provider to use (alternates for testing)
  private callCount = 0;

  // Mock classification rules based on content patterns
  private readonly classificationRules: Array<{
    pattern: RegExp;
    classification: 'suitable' | 'not_suitable';
    confidence: number;
    reasoning: string;
  }> = [
    {
      pattern: /write for us|guest post|contributor|submit.*article|become.*author/i,
      classification: 'suitable',
      confidence: 0.92,
      reasoning:
        'Explicit guest post opportunities detected. Found "Write for Us" or submission guidelines.',
    },
    {
      pattern: /guidelines.*guest|submission.*guidelines|author.*bio/i,
      classification: 'suitable',
      confidence: 0.88,
      reasoning: 'Guest post guidelines found. Site accepts external contributions.',
    },
    {
      pattern: /contribute.*content|share.*expertise|submit.*content/i,
      classification: 'suitable',
      confidence: 0.85,
      reasoning: 'Content contribution opportunities identified. Site welcomes guest authors.',
    },
    {
      pattern: /platform|blogging.*platform|create.*blog|sign up.*blog/i,
      classification: 'not_suitable',
      confidence: 0.78,
      reasoning: 'Blogging platform detected. Not suitable for guest post outreach.',
    },
    {
      pattern: /ecommerce|shop|buy|products|cart|checkout/i,
      classification: 'not_suitable',
      confidence: 0.82,
      reasoning: 'E-commerce site detected. Not suitable for guest blogging.',
    },
    {
      pattern: /news|breaking.*news|latest.*news|editorial.*team/i,
      classification: 'not_suitable',
      confidence: 0.73,
      reasoning:
        'News site with internal editorial team. Limited guest post opportunities.',
    },
    {
      pattern: /paid.*guest.*post|get paid.*write/i,
      classification: 'suitable',
      confidence: 0.95,
      reasoning: 'Paid guest post opportunity detected. Strong indication of acceptance.',
    },
  ];

  constructor() {
    this.logger.log('MockLlmService initialized - NO external LLM API calls will be made');
  }

  /**
   * Check if mock LLM service is available (always true)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Mock classify URL - returns classifications based on content patterns
   *
   * @param url - URL to classify
   * @param content - Website content to analyze
   * @returns Mock classification result with provider and cost
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

    // Input validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      throw new Error('Invalid URL provided to classifyUrl');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Invalid content provided to classifyUrl');
    }

    const sanitizedUrl = url.length > 100 ? url.slice(0, 100) + '...' : url;
    this.logger.log(`[MOCK] Classifying URL: ${sanitizedUrl}`);

    // Simulate realistic processing delay (200-800ms)
    const delay = Math.floor(Math.random() * 600) + 200; // 200-800ms
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Determine which provider to use (alternate between Gemini and GPT)
    // Primary: Gemini (80%), Fallback: GPT (20%)
    const useGemini = this.callCount % 5 !== 0; // Every 5th call uses GPT
    this.callCount++;

    const provider: LlmProvider = useGemini ? 'gemini' : 'gpt';

    // Apply classification rules
    let classification: 'suitable' | 'not_suitable' = 'not_suitable';
    let confidence = 0.5;
    let reasoning = 'No strong indicators found. Default classification: not suitable.';

    // Check content against rules
    for (const rule of this.classificationRules) {
      if (rule.pattern.test(content)) {
        classification = rule.classification;
        confidence = rule.confidence;
        reasoning = rule.reasoning;
        break; // Use first matching rule
      }
    }

    // Calculate mock cost (realistic pricing)
    // Gemini: $0.0003/1K input + $0.0015/1K output (~2K input, 100 output) = ~$0.0004
    // GPT-4o-mini: $0.0005/1K input + $0.002/1K output (~2K input, 100 output) = ~$0.0012
    const cost = provider === 'gemini' ? 0.0004 : 0.0012;

    const processingTimeMs = Date.now() - startTime;

    this.logger.log(
      `[MOCK] Classified URL: ${sanitizedUrl} - ${classification} (${provider}, ${processingTimeMs}ms, $${cost.toFixed(6)})`,
    );

    return {
      classification,
      confidence,
      reasoning,
      provider,
      cost,
      processingTimeMs,
      retryCount: 0,
    };
  }
}
