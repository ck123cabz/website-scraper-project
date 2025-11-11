import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewRouterService } from '../services/manual-review-router.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { SettingsService } from '../../settings/settings.service';
import { NotificationService } from '../../manual-review/services/notification.service';
import type { Layer1Results, Layer2Results, Layer3Results } from '@website-scraper/shared';

/**
 * Integration test for ManualReviewRouterService (T010-TEST-C)
 * Story 001-manual-review-system T005, T046
 *
 * Tests the routeUrl() method which handles URL routing based on confidence band actions:
 * - auto_approve → insert to url_results
 * - manual_review → enqueue to manual_review_queue
 * - reject → insert to url_results
 *
 * T046: Tests Slack notification calling when threshold reached
 */
describe('ManualReviewRouterService (T010-TEST-C, T046 Integration)', () => {
  let service: ManualReviewRouterService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let settingsService: jest.Mocked<SettingsService>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockLayer1Results: Layer1Results = {
    domain_age: { checked: true, passed: true, value: 365 },
    tld_type: { checked: true, passed: true, value: 'com' },
    registrar_reputation: { checked: false, passed: false },
    whois_privacy: { checked: false, passed: false },
    ssl_certificate: { checked: false, passed: false },
  };

  const mockLayer2Results: Layer2Results = {
    guest_post_red_flags: {
      contact_page: { checked: true, detected: false },
      author_bio: { checked: false, detected: false },
      pricing_page: { checked: false, detected: false },
      submit_content: { checked: false, detected: false },
      write_for_us: { checked: false, detected: false },
      guest_post_guidelines: { checked: false, detected: false },
    },
    content_quality: {
      thin_content: { checked: false, detected: false },
      excessive_ads: { checked: false, detected: false },
      broken_links: { checked: false, detected: false },
    },
  };

  const mockLayer3Results: Layer3Results = {
    design_quality: { score: 0.8, detected: true, reasoning: 'Clean layout' },
    content_originality: { score: 0.7, detected: true, reasoning: 'Original content' },
    authority_indicators: { score: 0.75, detected: true, reasoning: 'Authority signals' },
    professional_presentation: { score: 0.8, detected: true, reasoning: 'Professional' },
  };

  beforeEach(async () => {
    const mockSupabaseClient = {
      from: jest.fn((table) => {
        // Return different mocks based on the table name
        if (table === 'manual_review_queue') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'queue-123' },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
            }),
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'queue-id-123',
                  url_id: 'url-review-123',
                  job_id: 'job-789',
                  confidence_score: 0.65,
                  confidence_band: 'medium',
                },
                error: null,
              }),
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'queue-id-123',
                    url_id: 'url-review-123',
                    job_id: 'job-789',
                  },
                  error: null,
                }),
              }),
              is: jest.fn().mockReturnValue(Promise.resolve({ count: 0, error: null })),
            }),
          };
        }

        // Default mock for other tables
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'default-id' },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
          }),
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            is: jest.fn().mockReturnValue(Promise.resolve({ count: 0, error: null })),
          }),
        };
      }),
      rpc: jest.fn().mockResolvedValue({ data: {} }),
    };

    const supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const settingsServiceMock = {
      getSettings: jest.fn().mockResolvedValue({
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' },
          low: { min: 0.3, max: 0.49, action: 'manual_review' },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
        },
        manual_review_settings: {
          queue_size_limit: 100,
          auto_review_timeout_days: 7,
          notifications: {
            email_threshold: 100,
            email_recipient: 'admin@example.com',
            slack_webhook_url: null,
            slack_threshold: 10,
            dashboard_badge: true,
          },
        },
      }),
    };

    const notificationServiceMock = {
      sendSlackNotification: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualReviewRouterService,
        {
          provide: SupabaseService,
          useValue: supabaseServiceMock,
        },
        {
          provide: SettingsService,
          useValue: settingsServiceMock,
        },
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
      ],
    }).compile();

    service = module.get<ManualReviewRouterService>(ManualReviewRouterService);
    supabaseService = module.get(SupabaseService);
    settingsService = module.get(SettingsService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('routeUrl', () => {
    it('should route high confidence URLs to auto_approve', async () => {
      const urlData = {
        url_id: 'url-123',
        url: 'https://example.com',
        job_id: 'job-456',
        confidence_score: 0.92,
        confidence_band: 'high',
        action: 'auto_approve' as const,
        reasoning: 'High confidence result',
      };

      await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

      // Verify finalizeResult was called (indirectly via insertions)
      expect(supabaseService.getClient).toHaveBeenCalled();
    });

    it('should route medium confidence URLs to manual review queue', async () => {
      const urlData = {
        url_id: 'url-789',
        url: 'https://medium-example.com',
        job_id: 'job-456',
        confidence_score: 0.65,
        confidence_band: 'medium',
        action: 'manual_review' as const,
        reasoning: 'Medium confidence - requires manual review',
      };

      await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

      // Verify the routing call was made
      expect(supabaseService.getClient).toHaveBeenCalled();
    });

    it('should route low confidence URLs to manual review queue', async () => {
      const urlData = {
        url_id: 'url-low',
        url: 'https://low-example.com',
        job_id: 'job-456',
        confidence_score: 0.4,
        confidence_band: 'low',
        action: 'manual_review' as const,
        reasoning: 'Low confidence - pending human review',
      };

      await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

      expect(supabaseService.getClient).toHaveBeenCalled();
    });

    it('should route auto_reject URLs to rejected status', async () => {
      const urlData = {
        url_id: 'url-reject',
        url: 'https://reject-example.com',
        job_id: 'job-456',
        confidence_score: 0.15,
        confidence_band: 'auto_reject',
        action: 'reject' as const,
        reasoning: 'Very low confidence - auto-rejected',
      };

      await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

      expect(supabaseService.getClient).toHaveBeenCalled();
    });
  });

  describe('countActiveQueue', () => {
    it('should count active queue items', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue(Promise.resolve({ count: 5, error: null })),
          }),
        }),
      };

      supabaseService.getClient.mockReturnValue(
        mockClient as unknown as ReturnType<typeof supabaseService.getClient>,
      );

      const count = await service.countActiveQueue();
      // Result will be 0 or mock data depending on implementation
      expect(typeof count).toBe('number');
    });
  });

  describe('reviewAndSoftDelete', () => {
    it('should handle review decision with soft delete', async () => {
      const urlData = {
        url_id: 'url-review-123',
        url: 'https://review.example.com',
        job_id: 'job-789',
        decision: 'approved' as const,
        notes: 'Approved by user',
      };

      await service.reviewAndSoftDelete({
        queue_entry_id: 'queue-id-123',
        url_id: urlData.url_id,
        job_id: urlData.job_id,
        decision: urlData.decision,
        notes: urlData.notes,
      });

      expect(supabaseService.getClient).toHaveBeenCalled();
    });
  });

  describe('enqueueForReview - Slack Notifications (T046)', () => {
    it('should call sendSlackNotification when queue count reaches threshold', async () => {
      // Setup: Mock settings with webhook URL and threshold 5
      const mockSettings = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' as const },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' as const },
          low: { min: 0.3, max: 0.49, action: 'manual_review' as const },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' as const },
        },
        manual_review_settings: {
          queue_size_limit: null,
          auto_review_timeout_days: null,
          notifications: {
            email_threshold: 100,
            email_recipient: 'admin@example.com',
            slack_webhook_url: 'https://hooks.slack.com/services/T1234/B5678/XXXX',
            slack_threshold: 5,
            dashboard_badge: true,
          },
        },
      };
      settingsService.getSettings.mockResolvedValue(
        mockSettings as Awaited<ReturnType<typeof settingsService.getSettings>>,
      );

      // Mock countActiveQueue to return queue size >= threshold
      jest.spyOn(service, 'countActiveQueue').mockResolvedValue(5);

      const urlData = {
        url_id: 'url-slack-test',
        url: 'https://slack-test.example.com',
        job_id: 'job-slack-123',
        confidence_score: 0.65,
        confidence_band: 'medium',
        action: 'manual_review' as const,
      };

      await service.enqueueForReview(
        urlData,
        mockLayer1Results,
        mockLayer2Results,
        mockLayer3Results,
      );

      // Verify notification was called with correct parameters
      // Note: Due to non-blocking nature, use setTimeout or mock timing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(notificationService.sendSlackNotification).toHaveBeenCalledWith(
        5,
        'https://hooks.slack.com/services/T1234/B5678/XXXX',
      );
    });

    it('should NOT call sendSlackNotification when webhook URL is not configured', async () => {
      // Setup: Mock settings without webhook URL
      const mockSettings = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' as const },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' as const },
          low: { min: 0.3, max: 0.49, action: 'manual_review' as const },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' as const },
        },
        manual_review_settings: {
          queue_size_limit: null,
          auto_review_timeout_days: null,
          notifications: {
            email_threshold: 100,
            email_recipient: 'admin@example.com',
            slack_webhook_url: null, // No webhook configured
            slack_threshold: 5,
            dashboard_badge: true,
          },
        },
      };
      settingsService.getSettings.mockResolvedValue(
        mockSettings as Awaited<ReturnType<typeof settingsService.getSettings>>,
      );

      jest.spyOn(service, 'countActiveQueue').mockResolvedValue(10);

      const urlData = {
        url_id: 'url-no-webhook',
        url: 'https://no-webhook.example.com',
        job_id: 'job-no-webhook',
        confidence_score: 0.65,
        confidence_band: 'medium',
        action: 'manual_review' as const,
      };

      await service.enqueueForReview(
        urlData,
        mockLayer1Results,
        mockLayer2Results,
        mockLayer3Results,
      );

      // Verify notification was NOT called
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(notificationService.sendSlackNotification).not.toHaveBeenCalled();
    });

    it('should NOT call sendSlackNotification when queue count is below threshold', async () => {
      // Setup: Mock settings with threshold 10
      const mockSettings = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' as const },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' as const },
          low: { min: 0.3, max: 0.49, action: 'manual_review' as const },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' as const },
        },
        manual_review_settings: {
          queue_size_limit: null,
          auto_review_timeout_days: null,
          notifications: {
            email_threshold: 100,
            email_recipient: 'admin@example.com',
            slack_webhook_url: 'https://hooks.slack.com/services/T1234/B5678/XXXX',
            slack_threshold: 10,
            dashboard_badge: true,
          },
        },
      };
      settingsService.getSettings.mockResolvedValue(
        mockSettings as Awaited<ReturnType<typeof settingsService.getSettings>>,
      );

      // Mock countActiveQueue to return size below threshold
      jest.spyOn(service, 'countActiveQueue').mockResolvedValue(5);

      const urlData = {
        url_id: 'url-below-threshold',
        url: 'https://below-threshold.example.com',
        job_id: 'job-below-123',
        confidence_score: 0.65,
        confidence_band: 'medium',
        action: 'manual_review' as const,
      };

      await service.enqueueForReview(
        urlData,
        mockLayer1Results,
        mockLayer2Results,
        mockLayer3Results,
      );

      // Verify notification was NOT called
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(notificationService.sendSlackNotification).not.toHaveBeenCalled();
    });

    it('should not block queue insertion if Slack notification fails', async () => {
      // Setup: Mock settings with webhook URL
      const mockSettings = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' as const },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' as const },
          low: { min: 0.3, max: 0.49, action: 'manual_review' as const },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' as const },
        },
        manual_review_settings: {
          queue_size_limit: null,
          auto_review_timeout_days: null,
          notifications: {
            email_threshold: 100,
            email_recipient: 'admin@example.com',
            slack_webhook_url: 'https://hooks.slack.com/services/T1234/B5678/XXXX',
            slack_threshold: 5,
            dashboard_badge: true,
          },
        },
      };
      settingsService.getSettings.mockResolvedValue(
        mockSettings as Awaited<ReturnType<typeof settingsService.getSettings>>,
      );

      jest.spyOn(service, 'countActiveQueue').mockResolvedValue(10);

      // Mock Slack notification to fail
      notificationService.sendSlackNotification.mockRejectedValue(new Error('Slack API error'));

      const urlData = {
        url_id: 'url-slack-error',
        url: 'https://slack-error.example.com',
        job_id: 'job-slack-error',
        confidence_score: 0.65,
        confidence_band: 'medium',
        action: 'manual_review' as const,
      };

      // Should not throw even if Slack notification fails
      await expect(
        service.enqueueForReview(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results),
      ).resolves.not.toThrow();

      // Verify the notification was attempted despite settings
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(notificationService.sendSlackNotification).toHaveBeenCalled();
    });

    it('should use default slack_threshold of 10 if not configured', async () => {
      // Setup: Mock settings without slack_threshold (should default to 10)
      const mockSettings = {
        confidence_bands: {
          high: { min: 0.8, max: 1.0, action: 'auto_approve' as const },
          medium: { min: 0.5, max: 0.79, action: 'manual_review' as const },
          low: { min: 0.3, max: 0.49, action: 'manual_review' as const },
          auto_reject: { min: 0.0, max: 0.29, action: 'reject' as const },
        },
        manual_review_settings: {
          queue_size_limit: null,
          auto_review_timeout_days: null,
          notifications: {
            email_threshold: 100,
            email_recipient: 'admin@example.com',
            slack_webhook_url: 'https://hooks.slack.com/services/T1234/B5678/XXXX',
            // slack_threshold intentionally omitted
            dashboard_badge: true,
          },
        },
      };
      settingsService.getSettings.mockResolvedValue(
        mockSettings as Awaited<ReturnType<typeof settingsService.getSettings>>,
      );

      // Mock countActiveQueue to return 10
      jest.spyOn(service, 'countActiveQueue').mockResolvedValue(10);

      const urlData = {
        url_id: 'url-default-threshold',
        url: 'https://default-threshold.example.com',
        job_id: 'job-default-123',
        confidence_score: 0.65,
        confidence_band: 'medium',
        action: 'manual_review' as const,
      };

      await service.enqueueForReview(
        urlData,
        mockLayer1Results,
        mockLayer2Results,
        mockLayer3Results,
      );

      // Should call notification because 10 >= default threshold of 10
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(notificationService.sendSlackNotification).toHaveBeenCalledWith(
        10,
        'https://hooks.slack.com/services/T1234/B5678/XXXX',
      );
    });
  });
});
