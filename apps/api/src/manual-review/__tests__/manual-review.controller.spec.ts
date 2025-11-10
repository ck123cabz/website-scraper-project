import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { ManualReviewController } from '../manual-review.controller';
import { ManualReviewService } from '../manual-review.service';
import { ManualReviewRouterService } from '../../jobs/services/manual-review-router.service';
import {
  createMockQueueEntry,
  createHighConfidenceQueueEntry,
  createLowConfidenceQueueEntry,
  createStaleQueueEntry,
  createReviewedQueueEntry,
} from './test-utils';

/**
 * API Contract Tests for Manual Review Controller (Phase 3: T018-TEST-A)
 *
 * Tests all endpoints with:
 * - Pagination and filtering
 * - Queue metrics
 * - Single entry retrieval with 404 handling
 * - Review decision submission with validation
 * - Data persistence
 * - Error handling
 *
 * Success Criteria (SC-001):
 * - Users can approve/reject URLs from queue with decisions persisted in <2 seconds
 *
 * Success Criteria (SC-002):
 * - Queue count displays on dashboard within 1 second
 */
describe('ManualReviewController (T018-TEST-A)', () => {
  let app: INestApplication;
  let controller: ManualReviewController;
  let manualReviewService: ManualReviewService;
  let manualReviewRouterService: ManualReviewRouterService;

  beforeAll(async () => {
    const mockManualReviewService = {
      getQueue: jest.fn(),
      getQueueStatus: jest.fn(),
      getQueueEntry: jest.fn(),
      reviewEntry: jest.fn(),
    };

    const mockManualReviewRouterService = {
      reviewAndSoftDelete: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ManualReviewController],
      providers: [
        {
          provide: ManualReviewService,
          useValue: mockManualReviewService,
        },
        {
          provide: ManualReviewRouterService,
          useValue: mockManualReviewRouterService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    controller = moduleFixture.get<ManualReviewController>(ManualReviewController);
    manualReviewService = moduleFixture.get<ManualReviewService>(ManualReviewService);
    manualReviewRouterService =
      moduleFixture.get<ManualReviewRouterService>(ManualReviewRouterService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/manual-review - List queue items', () => {
    it('should return paginated queue items with default pagination', async () => {
      // Arrange
      const mockItems = [
        createMockQueueEntry({ confidence_band: 'medium' }),
        createMockQueueEntry({ confidence_band: 'low' }),
      ];

      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: mockItems,
        total: 15,
        page: 1,
        limit: 20,
      });

      // Act
      const response = await request(app.getHttpServer()).get('/api/manual-review').expect(200);

      // Assert
      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(15);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(manualReviewService.getQueue).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        is_stale: undefined,
        confidence_band: undefined,
      });
    });

    it('should support custom pagination parameters', async () => {
      // Arrange
      const mockItems = [createMockQueueEntry()];

      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: mockItems,
        total: 50,
        page: 2,
        limit: 10,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review')
        .query({ page: '2', limit: '10' })
        .expect(200);

      // Assert
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
      expect(manualReviewService.getQueue).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        is_stale: undefined,
        confidence_band: undefined,
      });
    });

    it('should enforce maximum limit of 100', async () => {
      // Arrange
      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 100,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review')
        .query({ limit: '999' })
        .expect(200);

      // Assert
      expect(response.body.limit).toBe(100);
      expect(manualReviewService.getQueue).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        is_stale: undefined,
        confidence_band: undefined,
      });
    });

    it('should support is_stale filter', async () => {
      // Arrange
      const staleItems = [createStaleQueueEntry(8), createStaleQueueEntry(10)];

      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: staleItems,
        total: 2,
        page: 1,
        limit: 20,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review')
        .query({ is_stale: 'true' })
        .expect(200);

      // Assert
      expect(response.body.items).toHaveLength(2);
      expect(manualReviewService.getQueue).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        is_stale: true,
        confidence_band: undefined,
      });
    });

    it('should support confidence_band filter', async () => {
      // Arrange
      const mediumBandItems = [createMockQueueEntry({ confidence_band: 'medium' })];

      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: mediumBandItems,
        total: 1,
        page: 1,
        limit: 20,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review')
        .query({ confidence_band: 'medium' })
        .expect(200);

      // Assert
      expect(response.body.items[0].confidence_band).toBe('medium');
      expect(manualReviewService.getQueue).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        is_stale: undefined,
        confidence_band: 'medium',
      });
    });

    it('should support combined filters', async () => {
      // Arrange
      const filteredItems = [createStaleQueueEntry(8, { confidence_band: 'low' })];

      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: filteredItems,
        total: 1,
        page: 1,
        limit: 20,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review')
        .query({ is_stale: 'true', confidence_band: 'low' })
        .expect(200);

      // Assert
      expect(response.body.items).toHaveLength(1);
      expect(manualReviewService.getQueue).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        is_stale: true,
        confidence_band: 'low',
      });
    });

    it('should return empty items array when queue is empty', async () => {
      // Arrange
      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      // Act
      const response = await request(app.getHttpServer()).get('/api/manual-review').expect(200);

      // Assert
      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/manual-review/status - Queue metrics', () => {
    it('should return queue status with metrics', async () => {
      // Arrange
      jest.spyOn(manualReviewService, 'getQueueStatus').mockResolvedValue({
        active_count: 25,
        stale_count: 5,
        by_band: {
          medium: 15,
          low: 10,
        },
        oldest_queued_at: '2025-11-04T10:00:00Z',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review/status')
        .expect(200);

      // Assert
      expect(response.body.active_count).toBe(25);
      expect(response.body.stale_count).toBe(5);
      expect(response.body.by_band).toEqual({
        medium: 15,
        low: 10,
      });
      expect(response.body.oldest_queued_at).toBe('2025-11-04T10:00:00Z');
      expect(manualReviewService.getQueueStatus).toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      // Arrange
      jest.spyOn(manualReviewService, 'getQueueStatus').mockResolvedValue({
        active_count: 0,
        stale_count: 0,
        by_band: {},
        oldest_queued_at: null,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review/status')
        .expect(200);

      // Assert
      expect(response.body.active_count).toBe(0);
      expect(response.body.stale_count).toBe(0);
      expect(response.body.by_band).toEqual({});
      expect(response.body.oldest_queued_at).toBeNull();
    });

    it('should support dashboard badge requirements (SC-002)', async () => {
      // Arrange - Test < 1 second response requirement
      const startTime = Date.now();
      jest.spyOn(manualReviewService, 'getQueueStatus').mockResolvedValue({
        active_count: 12,
        stale_count: 2,
        by_band: { medium: 8, low: 4 },
        oldest_queued_at: '2025-11-10T15:00:00Z',
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/manual-review/status')
        .expect(200);

      const duration = Date.now() - startTime;

      // Assert - SC-002: Queue count displays within 1 second
      expect(duration).toBeLessThan(1000);
      expect(response.body.active_count).toBe(12);
    });
  });

  describe('GET /api/manual-review/:id - Single entry with 404 handling', () => {
    it('should return single queue entry with all details', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${queueEntry.id}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(queueEntry.id);
      expect(response.body.url).toBe(queueEntry.url);
      expect(response.body.confidence_band).toBe(queueEntry.confidence_band);
      expect(response.body.layer1_results).toBeDefined();
      expect(response.body.layer2_results).toBeDefined();
      expect(response.body.layer3_results).toBeDefined();
      expect(manualReviewService.getQueueEntry).toHaveBeenCalledWith(queueEntry.id);
    });

    it('should return 404 when entry not found', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(null);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should include all layer results for factor breakdown display', async () => {
      // Arrange
      const queueEntry = createHighConfidenceQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${queueEntry.id}`)
        .expect(200);

      // Assert - Verify Layer 1 structure
      expect(response.body.layer1_results).toHaveProperty('domain_age');
      expect(response.body.layer1_results).toHaveProperty('tld_type');
      expect(response.body.layer1_results).toHaveProperty('registrar_reputation');
      expect(response.body.layer1_results).toHaveProperty('whois_privacy');
      expect(response.body.layer1_results).toHaveProperty('ssl_certificate');

      // Verify Layer 2 structure
      expect(response.body.layer2_results).toHaveProperty('guest_post_red_flags');
      expect(response.body.layer2_results).toHaveProperty('content_quality');

      // Verify Layer 3 structure
      expect(response.body.layer3_results).toHaveProperty('design_quality');
      expect(response.body.layer3_results).toHaveProperty('content_originality');
      expect(response.body.layer3_results).toHaveProperty('authority_indicators');
      expect(response.body.layer3_results).toHaveProperty('professional_presentation');
    });
  });

  describe('GET /api/manual-review/:id/factors - Factor breakdown retrieval', () => {
    it('should return factor breakdown with all layer results', async () => {
      // Arrange
      const queueEntry = createHighConfidenceQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${queueEntry.id}/factors`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('layer1_results');
      expect(response.body).toHaveProperty('layer2_results');
      expect(response.body).toHaveProperty('layer3_results');
      expect(manualReviewService.getQueueEntry).toHaveBeenCalledWith(queueEntry.id);
    });

    it('should return Layer 1 results with all factor evaluations', async () => {
      // Arrange
      const queueEntry = createHighConfidenceQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${queueEntry.id}/factors`)
        .expect(200);

      // Assert - SC-011: Factor breakdown displays all Layer 1 checks
      expect(response.body.layer1_results).toHaveProperty('domain_age');
      expect(response.body.layer1_results).toHaveProperty('tld_type');
      expect(response.body.layer1_results).toHaveProperty('registrar_reputation');
      expect(response.body.layer1_results).toHaveProperty('whois_privacy');
      expect(response.body.layer1_results).toHaveProperty('ssl_certificate');
    });

    it('should return Layer 2 results with red flags and content quality', async () => {
      // Arrange
      const queueEntry = createHighConfidenceQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${queueEntry.id}/factors`)
        .expect(200);

      // Assert - SC-011: Factor breakdown displays all Layer 2 checks
      expect(response.body.layer2_results).toHaveProperty('guest_post_red_flags');
      expect(response.body.layer2_results).toHaveProperty('content_quality');
    });

    it('should return Layer 3 results with sophistication signals', async () => {
      // Arrange
      const queueEntry = createHighConfidenceQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${queueEntry.id}/factors`)
        .expect(200);

      // Assert - SC-011: Factor breakdown displays all Layer 3 signals
      expect(response.body.layer3_results).toHaveProperty('design_quality');
      expect(response.body.layer3_results).toHaveProperty('content_originality');
      expect(response.body.layer3_results).toHaveProperty('authority_indicators');
      expect(response.body.layer3_results).toHaveProperty('professional_presentation');
    });

    it('should return 404 when entry not found', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(null);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${nonExistentId}/factors`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should fetch factors within 3 seconds (SC-011)', async () => {
      // Arrange
      const queueEntry = createHighConfidenceQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get(`/api/manual-review/${queueEntry.id}/factors`)
        .expect(200);

      const duration = Date.now() - startTime;

      // Assert - SC-011: Factor breakdown displays within <3 seconds
      expect(duration).toBeLessThan(3000);
      expect(response.body.layer1_results).toBeDefined();
      expect(response.body.layer2_results).toBeDefined();
      expect(response.body.layer3_results).toBeDefined();
    });
  });

  describe('POST /api/manual-review/:id/review - Review decision submission', () => {
    it('should accept approval decision and persist it', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const reviewDecision = { decision: 'approved', notes: 'Looks legitimate' };
      const updatedEntry = createReviewedQueueEntry('approved', {
        id: queueEntry.id,
      });

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValueOnce(queueEntry);

      jest.spyOn(manualReviewService, 'reviewEntry').mockResolvedValue(updatedEntry);

      jest.spyOn(manualReviewRouterService, 'reviewAndSoftDelete').mockResolvedValue(undefined);

      // Act
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(reviewDecision)
        .expect(200);

      // Assert - SC-001: Decision persisted in <2 seconds
      expect(response.body.message).toContain('approved');
      expect(response.body.queue_entry.reviewed_at).not.toBeNull();
      expect(response.body.queue_entry.review_decision).toBe('approved');
      expect(manualReviewService.reviewEntry).toHaveBeenCalledWith(
        queueEntry.id,
        'approved',
        'Looks legitimate',
      );
    });

    it('should accept rejection decision with notes', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const reviewDecision = {
        decision: 'rejected',
        notes: 'Clear guest post indicators',
      };
      const updatedEntry = createReviewedQueueEntry('rejected', {
        id: queueEntry.id,
        reviewer_notes: 'Clear guest post indicators',
      });

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValueOnce(queueEntry);

      jest.spyOn(manualReviewService, 'reviewEntry').mockResolvedValue(updatedEntry);

      jest.spyOn(manualReviewRouterService, 'reviewAndSoftDelete').mockResolvedValue(undefined);

      // Act
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(reviewDecision)
        .expect(200);

      // Assert
      expect(response.body.queue_entry.review_decision).toBe('rejected');
      expect(response.body.queue_entry.reviewer_notes).toBe('Clear guest post indicators');
    });

    it('should accept rejection without notes', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const reviewDecision = { decision: 'rejected' };
      const updatedEntry = createReviewedQueueEntry('rejected', {
        id: queueEntry.id,
        reviewer_notes: null,
      });

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValueOnce(queueEntry);

      jest.spyOn(manualReviewService, 'reviewEntry').mockResolvedValue(updatedEntry);

      jest.spyOn(manualReviewRouterService, 'reviewAndSoftDelete').mockResolvedValue(undefined);

      // Act
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(reviewDecision)
        .expect(200);

      // Assert
      expect(response.body.queue_entry.review_decision).toBe('rejected');
    });

    it('should reject invalid decision value', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const invalidDecision = { decision: 'invalid' };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(invalidDecision)
        .expect(400);

      // Should contain error about decision field validation
      expect(
        Array.isArray(response.body.message) || typeof response.body.message === 'string',
      ).toBe(true);
    });

    it('should reject missing decision field', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const missingDecision = { notes: 'Some notes' };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(missingDecision)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject non-string notes', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const invalidNotes = { decision: 'approved', notes: 123 };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(invalidNotes)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 404 when queue entry not found', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValueOnce(null);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${nonExistentId}/review`)
        .send({ decision: 'approved' })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should call both service and router service for persistence', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const reviewDecision = { decision: 'approved', notes: 'Good' };
      const updatedEntry = createReviewedQueueEntry('approved', {
        id: queueEntry.id,
      });

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValueOnce(queueEntry);

      jest.spyOn(manualReviewService, 'reviewEntry').mockResolvedValue(updatedEntry);

      jest.spyOn(manualReviewRouterService, 'reviewAndSoftDelete').mockResolvedValue(undefined);

      // Act
      await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(reviewDecision)
        .expect(200);

      // Assert - Verify both services were called
      expect(manualReviewService.reviewEntry).toHaveBeenCalledWith(
        queueEntry.id,
        'approved',
        'Good',
      );

      expect(manualReviewRouterService.reviewAndSoftDelete).toHaveBeenCalledWith({
        queue_entry_id: queueEntry.id,
        url_id: queueEntry.url_id,
        job_id: queueEntry.job_id,
        decision: 'approved',
        notes: 'Good',
        confidence_band: queueEntry.confidence_band,
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      jest
        .spyOn(manualReviewService, 'getQueue')
        .mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      const response = await request(app.getHttpServer()).get('/api/manual-review').expect(500);

      expect(response.body.message).toBeDefined();
    });

    it('should handle reviewer service failures gracefully', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValueOnce(queueEntry);

      jest
        .spyOn(manualReviewService, 'reviewEntry')
        .mockResolvedValue(createReviewedQueueEntry('approved'));

      jest
        .spyOn(manualReviewRouterService, 'reviewAndSoftDelete')
        .mockRejectedValue(new Error('Router service failed'));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send({ decision: 'approved' })
        .expect(500);

      expect(response.body.message).toBeDefined();
    });

    it('should reject extra fields in request body (forbid non-whitelisted)', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const reviewDecision = {
        decision: 'approved',
        notes: 'Good',
        extra_field: 'should be rejected',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send(reviewDecision)
        .expect(400);

      // Controller uses forbidNonWhitelisted: true, so extra fields cause validation error
      expect(response.body.message).toBeDefined();
    });
  });

  describe('All endpoints response time validation', () => {
    it('should fetch queue items within 500ms', async () => {
      // Arrange
      jest.spyOn(manualReviewService, 'getQueue').mockResolvedValue({
        items: [createMockQueueEntry()],
        total: 1,
        page: 1,
        limit: 20,
      });

      // Act
      const startTime = Date.now();
      await request(app.getHttpServer()).get('/api/manual-review').expect(200);

      const duration = Date.now() - startTime;

      // Assert - Performance requirement
      expect(duration).toBeLessThan(500);
    });

    it('should fetch queue status within 500ms (SC-002)', async () => {
      // Arrange
      jest.spyOn(manualReviewService, 'getQueueStatus').mockResolvedValue({
        active_count: 10,
        stale_count: 2,
        by_band: { medium: 6, low: 4 },
        oldest_queued_at: null,
      });

      // Act
      const startTime = Date.now();
      await request(app.getHttpServer()).get('/api/manual-review/status').expect(200);

      const duration = Date.now() - startTime;

      // Assert - Dashboard badge load time requirement
      expect(duration).toBeLessThan(500);
    });

    it('should fetch single entry within 200ms', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValue(queueEntry);

      // Act
      const startTime = Date.now();
      await request(app.getHttpServer()).get(`/api/manual-review/${queueEntry.id}`).expect(200);

      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(200);
    });

    it('should process review decision within 2 seconds (SC-001)', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();

      jest.spyOn(manualReviewService, 'getQueueEntry').mockResolvedValueOnce(queueEntry);

      jest
        .spyOn(manualReviewService, 'reviewEntry')
        .mockResolvedValue(createReviewedQueueEntry('approved'));

      jest.spyOn(manualReviewRouterService, 'reviewAndSoftDelete').mockResolvedValue(undefined);

      // Act
      const startTime = Date.now();
      await request(app.getHttpServer())
        .post(`/api/manual-review/${queueEntry.id}/review`)
        .send({ decision: 'approved' })
        .expect(200);

      const duration = Date.now() - startTime;

      // Assert - SC-001: Decisions persisted in <2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});
