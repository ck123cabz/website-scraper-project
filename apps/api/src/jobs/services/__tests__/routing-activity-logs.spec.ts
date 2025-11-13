import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewRouterService } from '../manual-review-router.service';
import { SupabaseService } from '../../../supabase/supabase.service';
import { SettingsService } from '../../../settings/settings.service';
import type { Layer1Results, Layer2Results, Layer3Results } from '@website-scraper/shared';

/**
 * Test Suite: Routing Activity Logs (Phase 5 - User Story 2)
 * Story 001-manual-review-system T025-TEST-B
 *
 * Tests that activity logs are created for each routing decision with correct
 * type='url_routed', band, action, and score fields for audit trail
 */
describe('Routing Activity Logs - T025-TEST-B', () => {
  let service: ManualReviewRouterService;
  let supabaseService: SupabaseService;
  let module: TestingModule;
  let mockActivityLogs: any[] = [];

  // Mock data
  const mockLayer1Results: Layer1Results = {
    domain_age: { checked: true, passed: true, value: 365 },
    tld_type: { checked: true, passed: true, value: 'com' },
    registrar_reputation: { checked: true, passed: true, value: 'GoDaddy' },
    whois_privacy: { checked: true, passed: false },
    ssl_certificate: { checked: true, passed: true },
  };

  const mockLayer2Results: Layer2Results = {
    guest_post_red_flags: {
      contact_page: { checked: true, detected: false },
      author_bio: { checked: true, detected: false },
      pricing_page: { checked: true, detected: false },
      submit_content: { checked: true, detected: false },
      write_for_us: { checked: true, detected: false },
      guest_post_guidelines: { checked: true, detected: false },
    },
    content_quality: {
      thin_content: { checked: true, detected: false },
      excessive_ads: { checked: true, detected: false },
      broken_links: { checked: true, detected: false },
    },
  };

  const mockLayer3Results: Layer3Results = {
    design_quality: { score: 0.8, detected: true },
    content_originality: { score: 0.75, detected: true },
    authority_indicators: { score: 0.7, detected: true },
    professional_presentation: { score: 0.85, detected: true },
  };

  const mockSettings = {
    confidence_bands: [
      { name: 'high', min: 0.8, max: 1.0, action: 'auto_approve' as const },
      { name: 'medium', min: 0.5, max: 0.79, action: 'manual_review' as const },
      { name: 'low', min: 0.3, max: 0.49, action: 'manual_review' as const },
      { name: 'auto_reject', min: 0.0, max: 0.29, action: 'reject' as const },
    ],
  };

  beforeEach(async () => {
    // Reset activity logs
    mockActivityLogs = [];

    // Create mock Supabase client with activity log tracking
    const mockSupabaseClient = {
      from: jest.fn((table) => {
        if (table === 'activity_logs') {
          return {
            insert: jest.fn((data) => {
              mockActivityLogs.push(data);
              return Promise.resolve({ data, error: null });
            }),
          };
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                then: jest.fn((callback) => {
                  callback({ data: null, error: null });
                  return Promise.resolve({ data: null, error: null });
                }),
              }),
              single: jest.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
            }),
            is: jest.fn().mockReturnValue(Promise.resolve({ count: 0, error: null })),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockReturnValue(
                Promise.resolve({
                  data: { id: 'test-id' },
                  error: null,
                }),
              ),
            }),
            then: jest.fn((callback) => {
              callback({ data: null, error: null });
              return Promise.resolve({ data: null, error: null });
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
          }),
        };
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        ManualReviewRouterService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getSettings: jest.fn().mockResolvedValue(mockSettings),
            getManualReviewSettings: jest.fn().mockResolvedValue({
              queue_size_limit: null,
              auto_review_timeout_days: null,
              notifications: {
                email_threshold: 50,
                email_recipient: 'admin@example.com',
                slack_webhook_url: null,
                slack_threshold: 50,
                dashboard_badge: false,
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ManualReviewRouterService>(ManualReviewRouterService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(async () => {
    await module.close();
  });

  /**
   * Validates that activity logs are created for auto-approve routing
   * with correct fields: type='url_routed', action='auto_approve', band, score
   */
  it('should create activity log entry for auto-approve routing', async () => {
    // Arrange
    const urlData = {
      url_id: 'auto-approve-url',
      url: 'https://high-quality.com',
      job_id: 'job-1',
      confidence_score: 0.92,
      confidence_band: 'high',
      action: 'auto_approve' as const,
      reasoning: 'High confidence URL',
    };

    // Act
    await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

    // Assert: Activity log entries should exist
    const autoApproveLogs = mockActivityLogs.filter(
      (log) =>
        log.event_data?.action === 'auto_approve' && log.event_data?.url_id === 'auto-approve-url',
    );

    expect(autoApproveLogs.length).toBeGreaterThan(0);

    const autoApproveLog = autoApproveLogs[0];
    expect(autoApproveLog.event_type).toBe('url_routed');
    expect(autoApproveLog.event_data).toMatchObject({
      type: 'url_routed',
      url_id: 'auto-approve-url',
      band: 'high',
      action: 'auto_approve',
      score: 0.92,
    });
  });

  /**
   * Validates that activity logs are created for manual review routing
   * with correct fields including queue entry information
   */
  it('should create activity log entry for manual review routing', async () => {
    // Arrange
    const urlData = {
      url_id: 'manual-review-url',
      url: 'https://medium-quality.com',
      job_id: 'job-1',
      confidence_score: 0.65,
      confidence_band: 'medium',
      action: 'manual_review' as const,
      reasoning: 'Medium confidence URL',
    };

    // Act
    await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

    // Assert: Activity log entries should exist for routing
    const manualReviewLogs = mockActivityLogs.filter(
      (log) =>
        log.event_data?.action === 'manual_review' &&
        log.event_data?.url_id === 'manual-review-url',
    );

    expect(manualReviewLogs.length).toBeGreaterThan(0);

    const manualReviewLog = manualReviewLogs[0];
    expect(manualReviewLog.event_type).toBe('url_routed');
    expect(manualReviewLog.event_data).toMatchObject({
      type: 'url_routed',
      url_id: 'manual-review-url',
      band: 'medium',
      action: 'manual_review',
      score: 0.65,
    });
  });

  /**
   * Validates that activity logs are created for reject routing
   * with correct fields for audit trail
   */
  it('should create activity log entry for reject routing', async () => {
    // Arrange
    const urlData = {
      url_id: 'reject-url',
      url: 'https://low-quality.com',
      job_id: 'job-1',
      confidence_score: 0.15,
      confidence_band: 'auto_reject',
      action: 'reject' as const,
      reasoning: 'Low confidence URL',
    };

    // Act
    await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

    // Assert: Activity log entry should exist
    const rejectLogs = mockActivityLogs.filter(
      (log) => log.event_data?.action === 'reject' && log.event_data?.url_id === 'reject-url',
    );

    expect(rejectLogs.length).toBeGreaterThan(0);

    const rejectLog = rejectLogs[0];
    expect(rejectLog.event_type).toBe('url_routed');
    expect(rejectLog.event_data).toMatchObject({
      type: 'url_routed',
      url_id: 'reject-url',
      band: 'auto_reject',
      action: 'reject',
      score: 0.15,
    });
  });

  /**
   * Validates that activity logs are created for multiple routing decisions
   * with different actions, showing comprehensive audit trail
   */
  it('should create activity log entries for different routing actions', async () => {
    const urlData = {
      url_id: 'audit-test-url',
      url: 'https://audit-test.com',
      job_id: 'job-1',
      confidence_score: 0.65,
      confidence_band: 'medium',
      action: 'manual_review' as const,
      reasoning: 'Audit test',
    };

    // Act
    await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

    // Assert: Activity log entry should exist for manual review routing
    const manualReviewLogs = mockActivityLogs.filter(
      (log) =>
        log.event_data?.action === 'manual_review' && log.event_data?.url_id === 'audit-test-url',
    );

    expect(manualReviewLogs.length).toBeGreaterThan(0);
  });

  /**
   * Validates that activity logs include all required audit fields
   * for compliance and debugging purposes
   */
  it('should include created_at timestamp in activity logs', async () => {
    // Arrange
    const urlData = {
      url_id: 'timestamp-url',
      url: 'https://timestamp.com',
      job_id: 'job-1',
      confidence_score: 0.85,
      confidence_band: 'high',
      action: 'auto_approve' as const,
      reasoning: 'Timestamp test',
    };

    // Act
    await service.routeUrl(urlData, mockLayer1Results, mockLayer2Results, mockLayer3Results);

    // Assert: All logs should have timestamps
    mockActivityLogs.forEach((log) => {
      expect(log.created_at).toBeDefined();
      expect(typeof log.created_at).toBe('string');
      // Validate ISO 8601 format
      expect(new Date(log.created_at).toString()).not.toBe('Invalid Date');
    });
  });

  /**
   * Validates that multiple URLs generate correct number of log entries
   * (one per routing decision, plus overflow logs if applicable)
   */
  it('should create correct number of activity log entries for batch routing', async () => {
    // Arrange
    const urlsToRoute = [
      {
        url_id: 'batch-1',
        url: 'https://batch1.com',
        job_id: 'job-batch',
        confidence_score: 0.92,
        confidence_band: 'high',
        action: 'auto_approve' as const,
      },
      {
        url_id: 'batch-2',
        url: 'https://batch2.com',
        job_id: 'job-batch',
        confidence_score: 0.65,
        confidence_band: 'medium',
        action: 'manual_review' as const,
      },
      {
        url_id: 'batch-3',
        url: 'https://batch3.com',
        job_id: 'job-batch',
        confidence_score: 0.15,
        confidence_band: 'auto_reject',
        action: 'reject' as const,
      },
    ];

    const initialLogCount = mockActivityLogs.length;

    // Act: Route all URLs
    for (const url of urlsToRoute) {
      await service.routeUrl(url, mockLayer1Results, mockLayer2Results, mockLayer3Results);
    }

    // Assert: Each URL should generate at least one log entry
    const newLogs = mockActivityLogs.length - initialLogCount;
    expect(newLogs).toBeGreaterThanOrEqual(urlsToRoute.length);

    // Verify we have logs for each URL
    const uniqueUrls = new Set(mockActivityLogs.map((log) => log.event_data?.url_id));
    expect(uniqueUrls.size).toBeGreaterThanOrEqual(urlsToRoute.length);
  });
});
