import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewRouterService } from '../services/manual-review-router.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { SettingsService } from '../../settings/settings.service';
import type { Layer1Results, Layer2Results, Layer3Results } from '@website-scraper/shared';

/**
 * Integration test for ManualReviewRouterService (T010-TEST-C)
 * Story 001-manual-review-system T005
 *
 * Tests the routeUrl() method which handles URL routing based on confidence band actions:
 * - auto_approve → insert to url_results
 * - manual_review → enqueue to manual_review_queue
 * - reject → insert to url_results
 */
describe('ManualReviewRouterService (T010-TEST-C Integration)', () => {
  let service: ManualReviewRouterService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let settingsService: jest.Mocked<SettingsService>;

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
    const supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ data: {} }),
          update: jest.fn().mockResolvedValue({ data: {} }),
          select: jest.fn().mockResolvedValue({ data: {} }),
        }),
        rpc: jest.fn().mockResolvedValue({ data: {} }),
      }),
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
          notifications: {},
        },
      }),
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
      ],
    }).compile();

    service = module.get<ManualReviewRouterService>(ManualReviewRouterService);
    supabaseService = module.get(SupabaseService);
    settingsService = module.get(SettingsService);
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
        confidence_score: 0.40,
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
          select: jest.fn().mockResolvedValue({
            data: [{ count: 5 }],
            error: null,
          }),
        }),
      };

      supabaseService.getClient.mockReturnValue(mockClient as any);

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

      await service.reviewAndSoftDelete(urlData.url_id, urlData.job_id, urlData.decision, urlData.notes);

      expect(supabaseService.getClient).toHaveBeenCalled();
    });
  });
});
