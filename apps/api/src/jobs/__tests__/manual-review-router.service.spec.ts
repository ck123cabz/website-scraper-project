import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewRouterService } from '../services/manual-review-router.service';

/**
 * Unit tests for ManualReviewRouterService
 * Story 2.4-refactored: Manual review routing logic for medium/low confidence results
 */
describe('ManualReviewRouterService', () => {
  let service: ManualReviewRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ManualReviewRouterService],
    }).compile();

    service = module.get<ManualReviewRouterService>(ManualReviewRouterService);
    service.resetQueueSize(); // Reset queue size before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldRouteToManualReview', () => {
    it('should return true for medium confidence', () => {
      const result = service.shouldRouteToManualReview('medium', 0.65, 'https://example.com');
      expect(result).toBe(true);
    });

    it('should return true for low confidence', () => {
      const result = service.shouldRouteToManualReview('low', 0.4, 'https://example.com');
      expect(result).toBe(true);
    });

    it('should return false for high confidence', () => {
      const result = service.shouldRouteToManualReview('high', 0.9, 'https://example.com');
      expect(result).toBe(false);
    });

    it('should return false for auto_reject', () => {
      const result = service.shouldRouteToManualReview('auto_reject', 0.1, 'https://example.com');
      expect(result).toBe(false);
    });

    it('should increment queue size when routing to manual review', () => {
      expect(service.getQueueSize()).toBe(0);

      service.shouldRouteToManualReview('medium', 0.6, 'https://example1.com');
      expect(service.getQueueSize()).toBe(1);

      service.shouldRouteToManualReview('low', 0.4, 'https://example2.com');
      expect(service.getQueueSize()).toBe(2);
    });

    it('should not increment queue size when not routing to manual review', () => {
      expect(service.getQueueSize()).toBe(0);

      service.shouldRouteToManualReview('high', 0.9, 'https://example1.com');
      expect(service.getQueueSize()).toBe(0);

      service.shouldRouteToManualReview('auto_reject', 0.1, 'https://example2.com');
      expect(service.getQueueSize()).toBe(0);
    });
  });

  describe('createManualReviewEntry', () => {
    it('should create valid manual review entry with all required fields', () => {
      const entry = service.createManualReviewEntry(
        'https://example.com',
        0.65,
        'medium',
        'Some signals detected but ambiguous',
        ['author bylines', 'schema markup'],
      );

      expect(entry).toEqual({
        url: 'https://example.com',
        confidence: 0.65,
        confidence_band: 'medium',
        reasoning: 'Some signals detected but ambiguous',
        sophistication_signals: ['author bylines', 'schema markup'],
        manual_review_required: true,
        queued_at: expect.any(String),
      });

      // Verify queued_at is valid ISO timestamp
      expect(new Date(entry.queued_at).toISOString()).toBe(entry.queued_at);
    });

    it('should create manual review entry without sophistication_signals', () => {
      const entry = service.createManualReviewEntry(
        'https://example.com',
        0.4,
        'low',
        'Weak signals, limited evidence',
      );

      expect(entry.manual_review_required).toBe(true);
      expect(entry.sophistication_signals).toBeUndefined();
    });
  });

  describe('getQueueSize', () => {
    it('should track queue size correctly', () => {
      expect(service.getQueueSize()).toBe(0);

      service.shouldRouteToManualReview('medium', 0.6, 'https://example1.com');
      service.shouldRouteToManualReview('low', 0.4, 'https://example2.com');
      service.shouldRouteToManualReview('medium', 0.7, 'https://example3.com');

      expect(service.getQueueSize()).toBe(3);
    });
  });

  describe('resetQueueSize', () => {
    it('should reset queue size to 0', () => {
      service.shouldRouteToManualReview('medium', 0.6, 'https://example1.com');
      service.shouldRouteToManualReview('low', 0.4, 'https://example2.com');
      expect(service.getQueueSize()).toBe(2);

      service.resetQueueSize();
      expect(service.getQueueSize()).toBe(0);
    });
  });

  describe('calculateManualReviewPercentage', () => {
    it('should calculate correct percentage', () => {
      service.shouldRouteToManualReview('medium', 0.6, 'https://example1.com');
      service.shouldRouteToManualReview('low', 0.4, 'https://example2.com');
      service.shouldRouteToManualReview('medium', 0.7, 'https://example3.com');

      const percentage = service.calculateManualReviewPercentage(10);
      expect(percentage).toBe(30.0); // 3/10 = 30%
    });

    it('should return 0 for empty queue', () => {
      const percentage = service.calculateManualReviewPercentage(10);
      expect(percentage).toBe(0);
    });

    it('should return 0 when totalClassified is 0', () => {
      service.shouldRouteToManualReview('medium', 0.6, 'https://example.com');
      const percentage = service.calculateManualReviewPercentage(0);
      expect(percentage).toBe(0);
    });

    it('should round to 1 decimal place', () => {
      service.shouldRouteToManualReview('medium', 0.6, 'https://example1.com');
      service.shouldRouteToManualReview('low', 0.4, 'https://example2.com');

      const percentage = service.calculateManualReviewPercentage(7);
      expect(percentage).toBe(28.6); // 2/7 = 28.571... → 28.6
    });
  });

  describe('getRoutingDecisionSummary', () => {
    it('should return correct summary for each confidence band', () => {
      const highSummary = service.getRoutingDecisionSummary('high', 0.9);
      expect(highSummary).toContain('AUTO-APPROVE');
      expect(highSummary).toContain('0.90');

      const mediumSummary = service.getRoutingDecisionSummary('medium', 0.65);
      expect(mediumSummary).toContain('MANUAL REVIEW');
      expect(mediumSummary).toContain('0.65');

      const lowSummary = service.getRoutingDecisionSummary('low', 0.4);
      expect(lowSummary).toContain('MANUAL REVIEW');
      expect(lowSummary).toContain('0.40');

      const rejectSummary = service.getRoutingDecisionSummary('auto_reject', 0.1);
      expect(rejectSummary).toContain('AUTO-REJECT');
      expect(rejectSummary).toContain('0.10');
    });
  });
});
