import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification.service';
import * as slackWebhook from '@slack/webhook';

/**
 * Unit Tests for NotificationService (Phase 6: T047-TEST-B, Phase 8: T048-TEST-C & T049-TEST-D)
 *
 * Tests sendSlackNotification() method with mocked @slack/webhook:
 * - Verify correct message format with queue size and link (T047-TEST-B)
 * - Test error handling (non-blocking, logged) (T048-TEST-C)
 * - Test retry logic with exponential backoff (T049-TEST-D)
 * - Test webhook validation
 * - Test success/failure response format
 *
 * Success Criteria (SC-006, SC-008, SC-009):
 * - sendSlackNotification() posts correct message format
 * - Error handling is non-blocking and comprehensive
 * - Queue size and review page link included in message
 * - Retry logic with exponential backoff (1s, 2s, 4s)
 * - Only transient errors are retried
 */
describe('NotificationService (T047-TEST-B, T048-TEST-C, T049-TEST-D)', () => {
  let service: NotificationService;
  let mockWebhookSend: jest.Mock;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Use fake timers to speed up retry tests
    jest.useFakeTimers();

    // Mock the IncomingWebhook
    mockWebhookSend = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(slackWebhook, 'IncomingWebhook').mockImplementation(
      () =>
        ({
          send: mockWebhookSend,
        }) as unknown as InstanceType<typeof slackWebhook.IncomingWebhook>,
    );

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'APP_BASE_URL') {
          return 'http://localhost:3000';
        }
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('sendSlackNotification()', () => {
    it('should send message with queue size when webhook is configured', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 12;

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(true);
      expect(mockWebhookSend).toHaveBeenCalledTimes(1);

      // Verify the message contains queue size information
      const sentMessage = mockWebhookSend.mock.calls[0][0];
      expect(sentMessage.blocks).toBeDefined();
      expect(JSON.stringify(sentMessage)).toContain(String(queueSize));
    });

    it('should include manual review page link in message', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 5;

      await service.sendSlackNotification(queueSize, webhookUrl);

      const sentMessage = mockWebhookSend.mock.calls[0][0];
      const messageText = JSON.stringify(sentMessage);

      expect(messageText).toContain('http://localhost:3000/manual-review');
      expect(messageText).toContain('Review Queue');
    });

    it('should format message with blocks including queue info, status, and button', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 7;

      await service.sendSlackNotification(queueSize, webhookUrl);

      const sentMessage = mockWebhookSend.mock.calls[0][0];

      // Verify blocks structure
      expect(sentMessage.blocks).toBeInstanceOf(Array);
      expect(sentMessage.blocks.length).toBeGreaterThan(0);

      // Verify key elements
      const messageJson = JSON.stringify(sentMessage);
      expect(messageJson).toContain('Manual Review Queue Alert');
      expect(messageJson).toContain('Queue Size');
      expect(messageJson).toContain('Status');
      expect(messageJson).toContain('Threshold Reached');
    });

    it('should handle singular "item" and plural "items" correctly', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';

      // Test singular
      mockWebhookSend.mockClear();
      await service.sendSlackNotification(1, webhookUrl);
      let sentMessage = mockWebhookSend.mock.calls[0][0];
      let messageText = sentMessage.blocks[0].text.text;
      expect(messageText).toMatch(/\*1\* item requiring/);

      // Test plural
      mockWebhookSend.mockClear();
      await service.sendSlackNotification(5, webhookUrl);
      sentMessage = mockWebhookSend.mock.calls[0][0];
      messageText = sentMessage.blocks[0].text.text;
      expect(messageText).toMatch(/\*5\* items requiring/);
    });

    it('should return success: true when webhook send succeeds', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle webhook send failure gracefully (non-blocking)', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 15;
      const error = new Error('Webhook timeout');

      // This is a non-retryable error (unknown type), so it fails immediately
      mockWebhookSend.mockRejectedValueOnce(error);

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Webhook timeout');
    });

    it('should log error but return gracefully when webhook fails', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      // Verify it's a valid error response, not a thrown exception
      expect(typeof result.error).toBe('string');
    });

    it('should return error when webhook URL is not configured', async () => {
      const queueSize = 10;

      const result = await service.sendSlackNotification(queueSize, '');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockWebhookSend).not.toHaveBeenCalled();
    });

    it('should return error when webhook URL is null', async () => {
      const queueSize = 10;

      const result = await service.sendSlackNotification(queueSize, null as unknown as string);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockWebhookSend).not.toHaveBeenCalled();
    });

    it('should return error for negative queue size', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = -1;

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid queue size');
      expect(mockWebhookSend).not.toHaveBeenCalled();
    });

    it('should handle zero queue size', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 0;

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(true);
      const sentMessage = mockWebhookSend.mock.calls[0][0];
      const messageText = sentMessage.blocks[0].text.text;
      expect(messageText).toMatch(/\*0\* items requiring/);
    });

    it('should include timestamp in message', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 8;

      await service.sendSlackNotification(queueSize, webhookUrl);

      const sentMessage = mockWebhookSend.mock.calls[0][0];
      const messageText = JSON.stringify(sentMessage);

      expect(messageText).toContain('Last updated:');
      // Should contain ISO timestamp pattern
      expect(messageText).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should initialize IncomingWebhook with correct URL', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      await service.sendSlackNotification(queueSize, webhookUrl);

      expect(slackWebhook.IncomingWebhook).toHaveBeenCalledWith(webhookUrl);
    });

    it('should handle errors with Error objects correctly', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;
      const error = new Error('Invalid webhook URL');

      mockWebhookSend.mockRejectedValueOnce(error);

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook URL');
    });

    it('should handle non-Error objects thrown by webhook', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce('Unknown error');

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle large queue sizes', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 1000;

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(true);
      const sentMessage = mockWebhookSend.mock.calls[0][0];
      const messageText = JSON.stringify(sentMessage);
      expect(messageText).toContain('1000');
    });

    it('should return response without throwing even if webhook setup fails', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      jest.spyOn(slackWebhook, 'IncomingWebhook').mockImplementationOnce(() => {
        throw new Error('Failed to initialize webhook');
      });

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize webhook');
    });
  });

  describe('Retry Logic and Exponential Backoff (T049-TEST-D)', () => {
    it('should return retries: 0 when first attempt succeeds (no retries needed)', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 12;

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(true);
      expect(result.retries).toBe(0);
      expect(mockWebhookSend).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 4xx HTTP errors (client errors)', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce(new Error('HTTP 401: Unauthorized'));

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
      expect(result.retries).toBe(3); // maxRetries, but not actually retried
      expect(mockWebhookSend).toHaveBeenCalledTimes(1);
    });

    it('should not retry on validation errors', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce(new Error('Invalid webhook URL format'));

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook URL format');
      expect(mockWebhookSend).toHaveBeenCalledTimes(1);
    });

    it('should identify retryable errors (ETIMEDOUT)', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend
        .mockRejectedValueOnce(new Error('ETIMEDOUT: connection timed out'))
        .mockResolvedValueOnce(undefined);

      const resultPromise = service.sendSlackNotification(queueSize, webhookUrl);

      // Fast-forward through the retry delay (1000ms for first retry)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      // Should attempt retry
      expect(mockWebhookSend).toHaveBeenCalledTimes(2);
    });

    it('should identify retryable errors (ECONNREFUSED)', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend
        .mockRejectedValueOnce(new Error('ECONNREFUSED: connection refused'))
        .mockResolvedValueOnce(undefined);

      const resultPromise = service.sendSlackNotification(queueSize, webhookUrl);

      // Fast-forward through the retry delay (1000ms for first retry)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(mockWebhookSend).toHaveBeenCalledTimes(2);
    });

    it('should identify retryable errors (5xx HTTP)', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend
        .mockRejectedValueOnce(new Error('HTTP 503: Service Unavailable'))
        .mockResolvedValueOnce(undefined);

      const resultPromise = service.sendSlackNotification(queueSize, webhookUrl);

      // Fast-forward through the retry delay (1000ms for first retry)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(mockWebhookSend).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 404 not found error', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce(new Error('HTTP 404: Not Found'));

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(mockWebhookSend).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 429 rate limit error', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce(new Error('HTTP 429: Too Many Requests'));

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(mockWebhookSend).toHaveBeenCalledTimes(1);
    });

    it('should accept custom maxRetries parameter', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(undefined);

      const resultPromise = service.sendSlackNotification(
        queueSize,
        webhookUrl,
        1, // custom maxRetries of 1
      );

      // Fast-forward through the retry delay (1000ms for first retry)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result.retries).toBe(1);
      expect(mockWebhookSend).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });
  });

  describe('Error Handling (T048-TEST-C)', () => {
    it('should handle string errors thrown by webhook', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce('String error message');

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error message');
      expect(result.retries).toBe(3);
    });

    it('should handle object errors thrown by webhook', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce({ code: 'ERR_INVALID' });

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.retries).toBe(3);
    });

    it('should handle null or undefined errors gracefully', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;

      mockWebhookSend.mockRejectedValueOnce(null);

      const result = await service.sendSlackNotification(queueSize, webhookUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should include error context in logger output', async () => {
      const webhookUrl = 'https://hooks.slack.com/services/T1234/B5678/XXXX';
      const queueSize = 10;
      const testError = new Error('Test error with stack');

      mockWebhookSend.mockRejectedValueOnce(testError);

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendSlackNotification(queueSize, webhookUrl);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send Slack notification'),
        expect.objectContaining({
          queueSize,
          retriesAttempted: 3,
        }),
      );

      loggerErrorSpy.mockRestore();
    });
  });
});
