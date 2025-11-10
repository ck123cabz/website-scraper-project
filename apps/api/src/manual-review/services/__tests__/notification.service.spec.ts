import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification.service';
import * as slackWebhook from '@slack/webhook';

/**
 * Unit Tests for NotificationService (Phase 6: T047-TEST-B)
 *
 * Tests sendSlackNotification() method with mocked @slack/webhook:
 * - Verify correct message format with queue size and link
 * - Test error handling (non-blocking, logged)
 * - Test webhook validation
 * - Test success/failure response format
 *
 * Success Criteria (SC-006):
 * - sendSlackNotification() posts correct message format
 * - Error handling is non-blocking
 * - Queue size and review page link included in message
 */
describe('NotificationService (T047-TEST-B)', () => {
  let service: NotificationService;
  let mockWebhookSend: jest.Mock;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Mock the IncomingWebhook
    mockWebhookSend = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(slackWebhook, 'IncomingWebhook').mockImplementation(
      () =>
        ({
          send: mockWebhookSend,
        }) as any,
    );

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'APP_BASE_URL') {
          return 'http://localhost:3000';
        }
        return defaultValue;
      }),
    } as any;

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

      const result = await service.sendSlackNotification(queueSize, null as any);

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
});
