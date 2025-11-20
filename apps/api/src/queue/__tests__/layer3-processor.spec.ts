/**
 * Layer 3 Processor Unit Tests
 * Task T024 from Phase 3 (User Story 1) - Batch Processing Refactor
 *
 * Tests the LLMService.getLayer3Factors() method in isolation to verify:
 * - Complete Layer3Factors structure with ALL required fields
 * - Sophistication signals structure with all 4 dimensions
 * - Token counting and cost tracking
 * - Error handling and graceful degradation on LLM failure
 *
 * Test Strategy: UNIT tests - Mock all LLM API calls, test structure in isolation
 * Expected: Tests should FAIL before implementation (TDD)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../../jobs/services/llm.service';
import { SettingsService } from '../../settings/settings.service';
import type { Layer3Factors } from '@website-scraper/shared';

// Mock the external LLM clients to avoid real API calls
jest.mock('@google/generative-ai');
jest.mock('openai');

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

describe('Layer3Processor - getLayer3Factors() Structure Tests', () => {
  let llmService: LlmService;
  let mockGeminiClient: any;
  let mockOpenAIClient: any;
  let mockSettingsService: any;

  const TEST_URL = 'https://example.com/blog';
  const TEST_CONTENT =
    'Example website content with sufficient text for LLM analysis and token counting.';

  beforeEach(async () => {
    // Set environment variables for LLM clients
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    // Reset all mocks
    jest.clearAllMocks();

    // Mock Gemini client
    mockGeminiClient = {
      generateContent: jest.fn(),
    };

    (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(
      () =>
        ({
          getGenerativeModel: jest.fn(() => mockGeminiClient),
        }) as any,
    );

    // Mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIClient as any);

    // Mock SettingsService with layer3_rules configuration
    mockSettingsService = {
      getSettings: jest.fn().mockResolvedValue({
        id: 'test-settings',
        layer3_rules: {
          llm_temperature: 0.3,
          content_truncation_limit: 10000,
          guest_post_red_flags: [
            'Explicit "Write for Us" or "Guest Post Guidelines" pages',
            'Author bylines with external contributors',
          ],
          seo_investment_signals: ['schema_markup', 'open_graph', 'structured_data'],
        },
        confidence_threshold: 0.0,
        updated_at: new Date().toISOString(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    llmService = module.get<LlmService>(LlmService);
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('Complete Layer3Factors Structure Test', () => {
    it('should return ALL required Layer3Factors fields', async () => {
      // Mock successful Gemini response
      const mockGeminiResponse = {
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.85,
              reasoning:
                'High-quality publication with professional content and strong SEO investment',
              sophistication_signals: [
                'modern layout',
                'author bylines',
                'professional presentation',
                'original content',
              ],
            }),
          usageMetadata: {
            promptTokenCount: 2500,
            candidatesTokenCount: 250,
          },
        },
      };

      mockGeminiClient.generateContent.mockResolvedValue(mockGeminiResponse);

      // Execute the method under test
      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Verify ALL required fields exist (Task T024 requirement)
      expect(layer3Factors).toBeDefined();
      expect(layer3Factors).toHaveProperty('classification');
      expect(layer3Factors).toHaveProperty('sophistication_signals');
      expect(layer3Factors).toHaveProperty('llm_provider');
      expect(layer3Factors).toHaveProperty('model_version');
      expect(layer3Factors).toHaveProperty('cost_usd');
      expect(layer3Factors).toHaveProperty('reasoning');
      expect(layer3Factors).toHaveProperty('tokens_used');
      expect(layer3Factors).toHaveProperty('processing_time_ms');

      // Verify field types
      expect(['accepted', 'rejected']).toContain(layer3Factors.classification);
      expect(typeof layer3Factors.llm_provider).toBe('string');
      expect(typeof layer3Factors.model_version).toBe('string');
      expect(typeof layer3Factors.cost_usd).toBe('number');
      expect(typeof layer3Factors.reasoning).toBe('string');
      expect(typeof layer3Factors.processing_time_ms).toBe('number');

      // Verify cost is non-negative
      expect(layer3Factors.cost_usd).toBeGreaterThanOrEqual(0);

      // Verify processing time is non-negative
      expect(layer3Factors.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should return complete sophistication_signals structure with all 4 dimensions', async () => {
      // Mock successful classification
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.9,
              reasoning: 'Excellent content quality and authority indicators',
              sophistication_signals: ['design excellence', 'thought leadership'],
            }),
          usageMetadata: {
            promptTokenCount: 3000,
            candidatesTokenCount: 300,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Verify sophistication_signals structure
      expect(layer3Factors.sophistication_signals).toBeDefined();
      expect(typeof layer3Factors.sophistication_signals).toBe('object');

      // Verify all 4 required dimensions exist (Task T024 requirement)
      expect(layer3Factors.sophistication_signals).toHaveProperty('design_quality');
      expect(layer3Factors.sophistication_signals).toHaveProperty('authority_indicators');
      expect(layer3Factors.sophistication_signals).toHaveProperty('professional_presentation');
      expect(layer3Factors.sophistication_signals).toHaveProperty('content_originality');

      // Verify each dimension has required structure: score (0.0-1.0) and indicators (string array)
      const dimensions = [
        'design_quality',
        'authority_indicators',
        'professional_presentation',
        'content_originality',
      ];

      dimensions.forEach((dimension) => {
        const signal = layer3Factors.sophistication_signals[dimension];

        // Verify signal structure
        expect(signal).toHaveProperty('score');
        expect(signal).toHaveProperty('indicators');

        // Verify score is a number between 0.0 and 1.0
        expect(typeof signal.score).toBe('number');
        expect(signal.score).toBeGreaterThanOrEqual(0);
        expect(signal.score).toBeLessThanOrEqual(1);

        // Verify indicators is a string array
        expect(Array.isArray(signal.indicators)).toBe(true);
        signal.indicators.forEach((indicator: any) => {
          expect(typeof indicator).toBe('string');
        });
      });
    });

    it('should return valid tokens_used structure with input and output counts', async () => {
      // Mock Gemini response with known token counts
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.8,
              reasoning: 'Solid content with good indicators',
            }),
          usageMetadata: {
            promptTokenCount: 1500,
            candidatesTokenCount: 200,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Verify tokens_used structure (Task T024 requirement)
      expect(layer3Factors.tokens_used).toBeDefined();
      expect(layer3Factors.tokens_used).toHaveProperty('input');
      expect(layer3Factors.tokens_used).toHaveProperty('output');

      // Verify both are non-negative numbers
      expect(typeof layer3Factors.tokens_used.input).toBe('number');
      expect(typeof layer3Factors.tokens_used.output).toBe('number');
      expect(layer3Factors.tokens_used.input).toBeGreaterThanOrEqual(0);
      expect(layer3Factors.tokens_used.output).toBeGreaterThanOrEqual(0);

      // Token counts should be reasonable (not zero for actual content)
      expect(layer3Factors.tokens_used.input).toBeGreaterThan(0);
      expect(layer3Factors.tokens_used.output).toBeGreaterThan(0);
    });

    it('should return correct classification for accepted URLs', async () => {
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.92,
              reasoning: 'High-quality publication suitable for guest posts',
            }),
          usageMetadata: {
            promptTokenCount: 2000,
            candidatesTokenCount: 250,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      expect(layer3Factors.classification).toBe('accepted');
    });

    it('should return correct classification for rejected URLs', async () => {
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: false,
              confidence: 0.75,
              reasoning: 'Low-quality content with spam indicators',
            }),
          usageMetadata: {
            promptTokenCount: 1800,
            candidatesTokenCount: 180,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      expect(layer3Factors.classification).toBe('rejected');
    });

    it('should include valid LLM provider and model version', async () => {
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.85,
              reasoning: 'Test reasoning',
            }),
          usageMetadata: {
            promptTokenCount: 1000,
            candidatesTokenCount: 100,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Verify provider is set
      expect(layer3Factors.llm_provider).toBeTruthy();
      expect(typeof layer3Factors.llm_provider).toBe('string');
      expect(layer3Factors.llm_provider).not.toBe('');

      // Verify model version is set
      expect(layer3Factors.model_version).toBeTruthy();
      expect(typeof layer3Factors.model_version).toBe('string');
      expect(layer3Factors.model_version).not.toBe('');

      // Should be Gemini since that's our primary provider
      expect(layer3Factors.llm_provider).toBe('gemini');
      expect(layer3Factors.model_version).toContain('gemini');
    });

    it('should calculate cost_usd correctly for Gemini API calls', async () => {
      const inputTokens = 2000;
      const outputTokens = 250;

      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.85,
              reasoning: 'Test',
            }),
          usageMetadata: {
            promptTokenCount: inputTokens,
            candidatesTokenCount: outputTokens,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Gemini pricing: $0.0003/1K input, $0.0015/1K output
      const expectedCost = (inputTokens * 0.0003 + outputTokens * 0.0015) / 1000;
      expect(layer3Factors.cost_usd).toBeCloseTo(expectedCost, 6);
    });

    it('should include full reasoning text up to 5000 characters', async () => {
      const longReasoning = 'A'.repeat(4500); // Create long reasoning string

      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.85,
              reasoning: longReasoning,
            }),
          usageMetadata: {
            promptTokenCount: 2000,
            candidatesTokenCount: 1500,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      expect(layer3Factors.reasoning).toBeTruthy();
      expect(typeof layer3Factors.reasoning).toBe('string');
      expect(layer3Factors.reasoning.length).toBeGreaterThan(0);
      // Reasoning should not be empty
      expect(layer3Factors.reasoning.length).toBeGreaterThan(100);
    });

    it('should track processing time in milliseconds', async () => {
      // Simulate processing delay
      mockGeminiClient.generateContent.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              response: {
                text: () =>
                  JSON.stringify({
                    suitable: true,
                    confidence: 0.85,
                    reasoning: 'Test',
                  }),
                usageMetadata: {
                  promptTokenCount: 1000,
                  candidatesTokenCount: 100,
                },
              },
            });
          }, 50); // 50ms delay
        });
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Use tolerance for timing tests to avoid flakiness
      expect(layer3Factors.processing_time_ms).toBeGreaterThan(40);
      expect(layer3Factors.processing_time_ms).toBeLessThan(100);
    });
  });

  describe('Error Handling - Graceful Degradation on LLM Failure', () => {
    // Set longer timeout for error handling tests (retry logic with backoff takes time)
    jest.setTimeout(15000);

    it('should return empty Layer3Factors structure on LLM API failure', async () => {
      // Simulate LLM API failure
      mockGeminiClient.generateContent.mockRejectedValue(new Error('LLM API connection timeout'));
      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API also failed'),
      );

      // Execute method - should not throw, should degrade gracefully
      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Verify graceful degradation (Task T024 requirement)
      expect(layer3Factors).toBeDefined();
      expect(layer3Factors.classification).toBe('rejected');
      expect(layer3Factors.llm_provider).toBe('none');
      expect(layer3Factors.cost_usd).toBe(0);
      expect(layer3Factors.processing_time_ms).toBeGreaterThanOrEqual(0);

      // Reasoning should indicate error
      expect(layer3Factors.reasoning).toBeTruthy();
      expect(layer3Factors.reasoning.toLowerCase()).toContain('error');

      // Sophistication signals should still have valid structure
      expect(layer3Factors.sophistication_signals).toBeDefined();
      expect(layer3Factors.sophistication_signals.design_quality).toBeDefined();
      expect(layer3Factors.sophistication_signals.design_quality.score).toBe(0);
      expect(Array.isArray(layer3Factors.sophistication_signals.design_quality.indicators)).toBe(
        true,
      );

      // Tokens should be zero
      expect(layer3Factors.tokens_used.input).toBe(0);
      expect(layer3Factors.tokens_used.output).toBe(0);
    });

    it('should handle network timeout errors gracefully', async () => {
      mockGeminiClient.generateContent.mockRejectedValue(new Error('ETIMEDOUT'));
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('ETIMEDOUT'));

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      expect(layer3Factors).toBeDefined();
      expect(layer3Factors.classification).toBe('rejected');
      expect(layer3Factors.llm_provider).toBe('none');
      expect(layer3Factors.cost_usd).toBe(0);
    });

    it('should handle invalid JSON response from LLM gracefully', async () => {
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () => 'This is not valid JSON!',
          usageMetadata: {
            promptTokenCount: 1000,
            candidatesTokenCount: 100,
          },
        },
      });

      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('OpenAI also failed'));

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      expect(layer3Factors).toBeDefined();
      expect(layer3Factors.classification).toBe('rejected');
      expect(layer3Factors.llm_provider).toBe('none');
    });

    it('should handle rate limit errors gracefully', async () => {
      mockGeminiClient.generateContent.mockRejectedValue(new Error('429 Rate limit exceeded'));
      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('429 Rate limit exceeded'),
      );

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      expect(layer3Factors).toBeDefined();
      expect(layer3Factors.classification).toBe('rejected');
      expect(layer3Factors.reasoning).toContain('error');
    });

    it('should return all required fields even on complete failure', async () => {
      mockGeminiClient.generateContent.mockRejectedValue(new Error('Complete failure'));
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('Complete failure'));

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // ALL fields must be present even on failure
      expect(layer3Factors).toHaveProperty('classification');
      expect(layer3Factors).toHaveProperty('sophistication_signals');
      expect(layer3Factors).toHaveProperty('llm_provider');
      expect(layer3Factors).toHaveProperty('model_version');
      expect(layer3Factors).toHaveProperty('cost_usd');
      expect(layer3Factors).toHaveProperty('reasoning');
      expect(layer3Factors).toHaveProperty('tokens_used');
      expect(layer3Factors).toHaveProperty('processing_time_ms');

      // Sophistication signals must have all 4 dimensions
      expect(layer3Factors.sophistication_signals).toHaveProperty('design_quality');
      expect(layer3Factors.sophistication_signals).toHaveProperty('authority_indicators');
      expect(layer3Factors.sophistication_signals).toHaveProperty('professional_presentation');
      expect(layer3Factors.sophistication_signals).toHaveProperty('content_originality');
    });
  });

  describe('Type Safety and Schema Compliance', () => {
    it('should return object that conforms to Layer3Factors interface', async () => {
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.85,
              reasoning: 'Test',
            }),
          usageMetadata: {
            promptTokenCount: 1000,
            candidatesTokenCount: 100,
          },
        },
      });

      const layer3Factors: Layer3Factors = await llmService.getLayer3Factors(
        TEST_URL,
        TEST_CONTENT,
      );

      // TypeScript should compile this without errors
      expect(layer3Factors).toBeDefined();

      // Verify the object can be used as Layer3Factors
      const classification: 'accepted' | 'rejected' = layer3Factors.classification;
      const provider: string = layer3Factors.llm_provider;
      const cost: number = layer3Factors.cost_usd;
      const tokens: { input: number; output: number } = layer3Factors.tokens_used;

      expect(classification).toBeTruthy();
      expect(provider).toBeTruthy();
      expect(cost).toBeGreaterThanOrEqual(0);
      expect(tokens.input).toBeGreaterThanOrEqual(0);
      expect(tokens.output).toBeGreaterThanOrEqual(0);
    });

    it('should be serializable to JSON for database storage', async () => {
      mockGeminiClient.generateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              suitable: true,
              confidence: 0.85,
              reasoning: 'Test',
            }),
          usageMetadata: {
            promptTokenCount: 1000,
            candidatesTokenCount: 100,
          },
        },
      });

      const layer3Factors = await llmService.getLayer3Factors(TEST_URL, TEST_CONTENT);

      // Should be serializable to JSON
      const jsonString = JSON.stringify(layer3Factors);
      expect(jsonString).toBeTruthy();

      // Should be deserializable from JSON
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(layer3Factors);
    });
  });
});
