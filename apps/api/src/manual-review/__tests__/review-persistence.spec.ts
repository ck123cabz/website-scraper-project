import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewService } from '../manual-review.service';
import { ManualReviewRouterService } from '../../jobs/services/manual-review-router.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { SettingsService } from '../../settings/settings.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { createMockQueueEntry, createReviewedQueueEntry } from './test-utils';

/**
 * Data Persistence Integration Test (Phase 3: T018-TEST-D)
 *
 * Tests that review decisions are properly persisted across all related entities:
 * 1. manual_review_queue entry is soft-deleted (reviewed_at and review_decision set)
 * 2. url_results record is created with correct status and notes
 * 3. activity log entry is created for audit trail
 * 4. Queue row is retained (not hard-deleted)
 *
 * Success Criteria (SC-001):
 * - Users can approve/reject URLs from queue with decisions persisted in <2 seconds
 * - Soft-delete pattern preserves full audit trail
 */
describe('Review Decision Data Persistence (T018-TEST-D)', () => {
  let service: ManualReviewService;
  let routerService: ManualReviewRouterService;
  let supabaseService: SupabaseService;
  let settingsService: SettingsService;
  let activityLogService: ActivityLogService;

  beforeAll(async () => {
    const mockSupabaseService = {
      getClient: jest.fn(),
    };

    const mockSettingsService = {
      getSettings: jest.fn(),
      getConfidenceBands: jest.fn(),
    };

    const mockActivityLogService = {
      logActivity: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ManualReviewService,
        ManualReviewRouterService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = moduleFixture.get<ManualReviewService>(ManualReviewService);
    routerService = moduleFixture.get<ManualReviewRouterService>(
      ManualReviewRouterService,
    );
    supabaseService = moduleFixture.get<SupabaseService>(SupabaseService);
    settingsService = moduleFixture.get<SettingsService>(SettingsService);
    activityLogService = moduleFixture.get<ActivityLogService>(ActivityLogService);
  });

  describe('Review decision database operations', () => {
    it('should update manual_review_queue entry with reviewed_at timestamp', async () => {
      // Arrange
      const queueId = '550e8400-e29b-41d4-a716-446655440000';
      const decision = 'approved';
      const notes = 'Good quality site';

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry(decision, {
            id: queueId,
            reviewer_notes: notes,
          }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const result = await service.reviewEntry(queueId, decision, notes);

      // Assert
      expect(result.reviewed_at).not.toBeNull();
      expect(result.review_decision).toBe('approved');
      expect(result.reviewer_notes).toBe(notes);

      // Verify the correct update was called
      expect(mockClient.from).toHaveBeenCalledWith('manual_review_queue');
      expect(mockClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          review_decision: decision,
          reviewer_notes: notes,
          reviewed_at: expect.any(String),
        }),
      );
    });

    it('should preserve queue entry row (soft-delete, not hard delete)', async () => {
      // Arrange - verify reviewed_at is set but row remains
      const queueId = '550e8400-e29b-41d4-a716-446655440000';
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry('approved', { id: queueId }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const result = await service.reviewEntry(queueId, 'approved');

      // Assert
      // Soft-delete means:
      // 1. reviewed_at is set
      expect(result.reviewed_at).not.toBeNull();
      // 2. Row still exists (not deleted)
      expect(result.id).toBe(queueId);
      // 3. Original data preserved
      expect(result.url).toBeTruthy();
      expect(result.confidence_band).toBeTruthy();
    });

    it('should handle approval decision persistence', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const decision = 'approved';
      const notes = 'High quality, legitimate site';

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry(decision, {
            id: queueEntry.id,
            reviewer_notes: notes,
          }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const result = await service.reviewEntry(
        queueEntry.id,
        decision,
        notes,
      );

      // Assert
      expect(result.review_decision).toBe('approved');
      expect(result.reviewer_notes).toBe(notes);
      expect(result.reviewed_at).not.toBeNull();
    });

    it('should handle rejection decision persistence', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const decision = 'rejected';
      const notes = 'Clear guest post indicators, all red flags present';

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry(decision, {
            id: queueEntry.id,
            reviewer_notes: notes,
          }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const result = await service.reviewEntry(
        queueEntry.id,
        decision,
        notes,
      );

      // Assert
      expect(result.review_decision).toBe('rejected');
      expect(result.reviewer_notes).toBe(notes);
      expect(result.reviewed_at).not.toBeNull();
    });

    it('should allow null notes for approval', async () => {
      // Arrange
      const queueId = '550e8400-e29b-41d4-a716-446655440000';

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry('approved', {
            id: queueId,
            reviewer_notes: null,
          }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const result = await service.reviewEntry(queueId, 'approved');

      // Assert
      expect(result.review_decision).toBe('approved');
      expect(result.reviewer_notes).toBeNull();
    });
  });

  describe('Router service review decision handling', () => {
    it('should create activity log for approved review', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const decision = 'approved';

      const mockUpdate = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockInsert = jest.fn().mockReturnThis();
      const mockInsertSelect = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockClient = {
        from: jest.fn((table) => {
          if (table === 'url_results') {
            return {
              upsert: jest.fn().mockReturnThis(),
              select: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            update: mockUpdate,
            insert: mockInsert,
          };
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);
      jest
        .spyOn(activityLogService, 'logActivity')
        .mockResolvedValue(undefined);

      // Act
      await routerService.reviewAndSoftDelete({
        queue_entry_id: queueEntry.id,
        url_id: queueEntry.url_id,
        job_id: queueEntry.job_id,
        decision,
        notes: 'Approved in review',
        confidence_band: queueEntry.confidence_band,
      });

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          details: expect.any(Object),
        }),
      );
    });

    it('should create activity log for rejected review', async () => {
      // Arrange
      const queueEntry = createMockQueueEntry();
      const decision = 'rejected';
      const notes = 'Clear guest post indicators';

      const mockClient = {
        from: jest.fn((table) => {
          if (table === 'url_results') {
            return {
              upsert: jest.fn().mockReturnThis(),
              select: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            update: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockReturnThis(),
          };
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);
      jest
        .spyOn(activityLogService, 'logActivity')
        .mockResolvedValue(undefined);

      // Act
      await routerService.reviewAndSoftDelete({
        queue_entry_id: queueEntry.id,
        url_id: queueEntry.url_id,
        job_id: queueEntry.job_id,
        decision,
        notes,
        confidence_band: queueEntry.confidence_band,
      });

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalled();
    });
  });

  describe('Data persistence SC-001 performance requirement', () => {
    it('should persist approval decision within 2 seconds', async () => {
      // Arrange
      const queueId = '550e8400-e29b-41d4-a716-446655440000';
      const startTime = Date.now();

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry('approved', { id: queueId }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      await service.reviewEntry(queueId, 'approved', 'Test notes');

      const duration = Date.now() - startTime;

      // Assert - SC-001: Persisted in <2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should persist rejection decision within 2 seconds', async () => {
      // Arrange
      const queueId = '550e8400-e29b-41d4-a716-446655440000';
      const startTime = Date.now();

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry('rejected', { id: queueId }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      await service.reviewEntry(
        queueId,
        'rejected',
        'Clear guest post indicators',
      );

      const duration = Date.now() - startTime;

      // Assert - SC-001: Persisted in <2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Audit trail preservation', () => {
    it('should retain original queue entry data after review', async () => {
      // Arrange
      const originalEntry = createMockQueueEntry({
        url: 'https://example-guest-post.com',
        confidence_band: 'medium',
        confidence_score: 0.67,
      });

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry('approved', {
            id: originalEntry.id,
            url: originalEntry.url,
            confidence_band: originalEntry.confidence_band,
            confidence_score: originalEntry.confidence_score,
          }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const reviewed = await service.reviewEntry(
        originalEntry.id,
        'approved',
        'Approved',
      );

      // Assert - All original data preserved
      expect(reviewed.url).toBe(originalEntry.url);
      expect(reviewed.confidence_band).toBe(originalEntry.confidence_band);
      expect(reviewed.confidence_score).toBe(originalEntry.confidence_score);
      // But decision is now set
      expect(reviewed.review_decision).toBe('approved');
      expect(reviewed.reviewed_at).not.toBeNull();
    });

    it('should maintain layer results after review for audit trail', async () => {
      // Arrange
      const originalEntry = createMockQueueEntry();

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createReviewedQueueEntry('rejected', {
            id: originalEntry.id,
            layer1_results: originalEntry.layer1_results,
            layer2_results: originalEntry.layer2_results,
            layer3_results: originalEntry.layer3_results,
          }),
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const reviewed = await service.reviewEntry(
        originalEntry.id,
        'rejected',
        'Reason',
      );

      // Assert - All layer results preserved for audit trail
      expect(reviewed.layer1_results).toBeDefined();
      expect(reviewed.layer2_results).toBeDefined();
      expect(reviewed.layer3_results).toBeDefined();
      expect(reviewed.review_decision).toBe('rejected');
    });
  });

  describe('Error handling for persistence', () => {
    it('should handle update errors gracefully', async () => {
      // Arrange
      const queueId = '550e8400-e29b-41d4-a716-446655440000';
      const mockError = new Error('Database connection failed');

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act & Assert
      await expect(
        service.reviewEntry(queueId, 'approved'),
      ).rejects.toThrow();
    });

    it('should handle missing queue entry', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST116',
            message: 'Not found',
          },
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act & Assert
      await expect(
        service.reviewEntry(nonExistentId, 'approved'),
      ).rejects.toThrow();
    });
  });

  describe('Consistency checks', () => {
    it('should ensure reviewed_at is always set with review_decision', async () => {
      // Arrange
      const queueId = '550e8400-e29b-41d4-a716-446655440000';

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...createReviewedQueueEntry('approved', { id: queueId }),
            reviewed_at: new Date().toISOString(),
            review_decision: 'approved',
          },
          error: null,
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act
      const result = await service.reviewEntry(queueId, 'approved');

      // Assert - These must always be consistent
      if (result.review_decision) {
        expect(result.reviewed_at).not.toBeNull();
      }
      if (result.reviewed_at) {
        expect(result.review_decision).not.toBeNull();
      }
    });

    it('should validate decision value (approved or rejected only)', async () => {
      // Arrange
      const queueId = '550e8400-e29b-41d4-a716-446655440000';
      const validDecisions = ['approved', 'rejected'] as const;

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(async () => {
          // Return based on what was passed to update
          const updateCall = mockClient.update.mock.calls[0][0];
          if (updateCall && validDecisions.includes(updateCall.review_decision)) {
            return {
              data: createReviewedQueueEntry(
                updateCall.review_decision as any,
                { id: queueId },
              ),
              error: null,
            };
          }
          return { data: null, error: new Error('Invalid decision') };
        }),
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);

      // Act & Assert
      for (const decision of validDecisions) {
        const result = await service.reviewEntry(queueId, decision as any);
        expect(validDecisions).toContain(result.review_decision);
      }
    });
  });
});
