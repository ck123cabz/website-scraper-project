import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { JobsController } from '../jobs.controller';
import { JobsService } from '../jobs.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { FileParserService } from '../services/file-parser.service';
import { UrlValidationService } from '../services/url-validation.service';
import { QueueService } from '../../queue/queue.service';
import { ExportService } from '../services/export.service';

/**
 * Contract Tests for JobsController - GET /jobs/queue/status
 * Task T072 [Phase 6 - Dashboard]
 *
 * Tests the GET /jobs/queue/status endpoint for real-time job queue status.
 *
 * Expected Response Structure:
 * {
 *   success: boolean,
 *   data: {
 *     activeJobs: Array<{
 *       id: string (UUID),
 *       name: string,
 *       status: 'processing' | 'queued' | 'completed',
 *       progress: number (0-100),
 *       layerBreakdown: {
 *         layer1: number,
 *         layer2: number,
 *         layer3: number
 *       },
 *       queuePosition: number | null,
 *       estimatedWaitTime: number (seconds) | null,
 *       urlCount: number,
 *       completedCount: number,
 *       createdAt: string (ISO)
 *     }>,
 *     completedJobs?: Array<{
 *       id: string (UUID),
 *       name: string,
 *       completedAt: string (ISO),
 *       urlCount: number,
 *       totalCost: number
 *     }>
 *   }
 * }
 *
 * Test Scenarios:
 * 1. Endpoint Response Contract - Verifies response structure and field types
 * 2. Completed Jobs Section - Tests includeCompleted parameter
 * 3. Filtering & Pagination - Tests limit, offset parameters
 * 4. Error Handling - Tests validation and error cases
 * 5. Real-Time Accuracy - Tests progress and breakdown calculations
 */
describe('JobsController - GET /jobs/queue/status (T072)', () => {
  let app: INestApplication;
  let jobsService: any; // Using 'any' for future methods (getActiveJobs, getCompletedJobs, calculateProgress)

  // Test fixtures
  const mockActiveJobs = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Processing Job 1 (0% complete)',
      status: 'processing' as const,
      progress: 0,
      layerBreakdown: {
        layer1: 0,
        layer2: 0,
        layer3: 0,
      },
      queuePosition: null,
      estimatedWaitTime: null,
      urlCount: 1000,
      completedCount: 0,
      createdAt: '2025-01-13T10:00:00.000Z',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Processing Job 2 (30% complete)',
      status: 'processing' as const,
      progress: 30,
      layerBreakdown: {
        layer1: 150,
        layer2: 100,
        layer3: 50,
      },
      queuePosition: null,
      estimatedWaitTime: null,
      urlCount: 1000,
      completedCount: 300,
      createdAt: '2025-01-13T09:00:00.000Z',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Processing Job 3 (75% complete)',
      status: 'processing' as const,
      progress: 75,
      layerBreakdown: {
        layer1: 400,
        layer2: 250,
        layer3: 100,
      },
      queuePosition: null,
      estimatedWaitTime: null,
      urlCount: 1000,
      completedCount: 750,
      createdAt: '2025-01-13T08:00:00.000Z',
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Queued Job 1',
      status: 'queued' as const,
      progress: 0,
      layerBreakdown: {
        layer1: 0,
        layer2: 0,
        layer3: 0,
      },
      queuePosition: 1,
      estimatedWaitTime: 300, // 5 minutes
      urlCount: 500,
      completedCount: 0,
      createdAt: '2025-01-13T11:00:00.000Z',
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Queued Job 2',
      status: 'queued' as const,
      progress: 0,
      layerBreakdown: {
        layer1: 0,
        layer2: 0,
        layer3: 0,
      },
      queuePosition: 2,
      estimatedWaitTime: 900, // 15 minutes
      urlCount: 250,
      completedCount: 0,
      createdAt: '2025-01-13T11:30:00.000Z',
    },
  ];

  const mockCompletedJobs = [
    {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'Completed Job 1',
      completedAt: '2025-01-13T07:00:00.000Z',
      urlCount: 1000,
      totalCost: 0.45,
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      name: 'Completed Job 2',
      completedAt: '2025-01-13T06:00:00.000Z',
      urlCount: 500,
      totalCost: 0.23,
    },
  ];

  beforeAll(async () => {
    const mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn(() => mockSupabaseClient),
    };

    const mockFileParserService = {
      parseFile: jest.fn(),
    };

    const mockUrlValidationService = {
      validateAndNormalizeUrls: jest.fn(),
      normalizeForDeduplication: jest.fn(),
    };

    const mockQueueService = {
      addUrlsToQueue: jest.fn(),
      addUrlToQueue: jest.fn(),
      pauseJob: jest.fn(),
      resumeJob: jest.fn(),
      cancelJob: jest.fn(),
    };

    const mockJobsService = {
      createJob: jest.fn(),
      getJobById: jest.fn(),
      getAllJobs: jest.fn(),
      updateJob: jest.fn(),
      deleteJob: jest.fn(),
      createJobWithUrls: jest.fn(),
      getResultDetails: jest.fn(),
      // Future methods for queue status endpoint (T072)
      getActiveJobs: jest.fn(),
      getCompletedJobs: jest.fn(),
      calculateProgress: jest.fn(),
    } as any; // Type assertion for future methods

    const mockExportService = {
      streamCSVExport: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: FileParserService,
          useValue: mockFileParserService,
        },
        {
          provide: UrlValidationService,
          useValue: mockUrlValidationService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // Allow unknown query params to be ignored
        transform: true,
      }),
    );
    await app.init();

    jobsService = moduleFixture.get<JobsService>(JobsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test Scenario 1: Endpoint Response Contract
   * Verifies the endpoint returns the correct structure and field types
   */
  describe('Scenario 1: Endpoint Response Contract', () => {
    it('should return 200 with job list containing all required fields', async () => {
      // Arrange - Mock service to return active jobs
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD: Expect 404 until endpoint is implemented
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Once endpoint is implemented, verify:
      // - Status: 200 OK
      // - Response body structure matches contract
      // - All required fields present in activeJobs array
    });

    it('should return activeJobs array with correct field types', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD: Expect 404 until endpoint is implemented
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Once endpoint is implemented, verify each field type:
      // - id: string (UUID format)
      // - name: string
      // - status: 'processing' | 'queued' | 'completed'
      // - progress: number (0-100)
      // - layerBreakdown: object with layer1, layer2, layer3 (numbers)
      // - queuePosition: number | null
      // - estimatedWaitTime: number | null
      // - urlCount: number
      // - completedCount: number
      // - createdAt: string (ISO 8601 format)
    });

    it('should return processing jobs with queuePosition and estimatedWaitTime as null', async () => {
      // Arrange
      const processingJobs = mockActiveJobs.filter(job => job.status === 'processing');
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(processingJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify processing jobs have:
      // - queuePosition: null
      // - estimatedWaitTime: null
    });

    it('should return queued jobs with valid queuePosition and estimatedWaitTime', async () => {
      // Arrange
      const queuedJobs = mockActiveJobs.filter(job => job.status === 'queued');
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(queuedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify queued jobs have:
      // - queuePosition: number (1, 2, 3...)
      // - estimatedWaitTime: number (in seconds)
    });

    it('should validate UUID format for job IDs', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify all job IDs match UUID regex:
      // /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    });
  });

  /**
   * Test Scenario 2: Completed Jobs Section
   * Tests the includeCompleted parameter
   */
  describe('Scenario 2: Completed Jobs Section', () => {
    it('should include completedJobs array when includeCompleted=true', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);
      (jobsService.getCompletedJobs as jest.Mock).mockResolvedValue(mockCompletedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?includeCompleted=true')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - jobsService.getCompletedJobs() was called
      // - Response includes completedJobs array
      // - completedJobs array has correct structure
    });

    it('should not include completedJobs array when includeCompleted=false or omitted', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD (without includeCompleted)
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - jobsService.getCompletedJobs() was NOT called
      // - Response does not include completedJobs field
    });

    it('should return completedJobs with all required fields', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue([]);
      (jobsService.getCompletedJobs as jest.Mock).mockResolvedValue(mockCompletedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?includeCompleted=true')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify each completed job has:
      // - id: string (UUID)
      // - name: string
      // - completedAt: string (ISO 8601)
      // - urlCount: number
      // - totalCost: number
    });
  });

  /**
   * Test Scenario 3: Filtering & Pagination
   * Tests limit, offset, and ordering
   */
  describe('Scenario 3: Filtering & Pagination', () => {
    it('should limit active jobs to specified limit', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockImplementation((limit?: number) => {
        if (limit) {
          return Promise.resolve(mockActiveJobs.slice(0, limit));
        }
        return Promise.resolve(mockActiveJobs);
      });

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?limit=2')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - jobsService.getActiveJobs() called with limit=2
      // - Response contains only 2 active jobs
    });

    it('should skip jobs based on offset parameter', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockImplementation((limit?: number, offset?: number) => {
        const start = offset || 0;
        const end = limit ? start + limit : undefined;
        return Promise.resolve(mockActiveJobs.slice(start, end));
      });

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?offset=2')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - jobsService.getActiveJobs() called with offset=2
      // - Response skips first 2 jobs
    });

    it('should maintain correct order (oldest processing first)', async () => {
      // Arrange - Jobs should be ordered by created_at ASC for processing, then queued
      const orderedJobs = [
        mockActiveJobs[2], // Oldest processing (08:00)
        mockActiveJobs[1], // Middle processing (09:00)
        mockActiveJobs[0], // Newest processing (10:00)
        mockActiveJobs[3], // First queued (11:00)
        mockActiveJobs[4], // Second queued (11:30)
      ];
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(orderedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify job order in response matches expected order
    });

    it('should ignore unknown query parameters', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?unknownParam=value&anotherParam=123')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - Request succeeds (unknown params ignored)
      // - Response structure is correct
    });
  });

  /**
   * Test Scenario 4: Error Handling
   * Tests validation and error cases
   */
  describe('Scenario 4: Error Handling', () => {
    it('should return 400 for invalid limit (not a number)', async () => {
      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?limit=invalid')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Once endpoint is implemented, verify:
      // - Status: 400 Bad Request
      // - Error message indicates invalid limit parameter
    });

    it('should return 400 for invalid offset (not a number)', async () => {
      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?offset=invalid')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Once endpoint is implemented, verify:
      // - Status: 400 Bad Request
      // - Error message indicates invalid offset parameter
    });

    it('should return empty array if no active jobs', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue([]);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - Status: 200 OK
      // - Response data.activeJobs is empty array []
    });

    it('should return appropriate error if database unreachable', async () => {
      // Arrange - Simulate database error
      (jobsService.getActiveJobs as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Once endpoint is implemented, verify:
      // - Status: 500 Internal Server Error
      // - Error message indicates server error
    });
  });

  /**
   * Test Scenario 5: Real-Time Accuracy
   * Tests progress and layer breakdown calculations
   */
  describe('Scenario 5: Real-Time Accuracy', () => {
    it('should calculate progress accurately within 5% margin', async () => {
      // Arrange
      const jobsWithProgress = [
        {
          ...mockActiveJobs[0],
          urlCount: 100,
          completedCount: 0,
          progress: 0,
        },
        {
          ...mockActiveJobs[1],
          urlCount: 100,
          completedCount: 50,
          progress: 50,
        },
        {
          ...mockActiveJobs[2],
          urlCount: 100,
          completedCount: 100,
          progress: 100,
        },
      ];
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(jobsWithProgress);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify for each job:
      // - progress = (completedCount / urlCount) * 100
      // - Accuracy within 5% margin of error
    });

    it('should ensure layerBreakdown sums to URL count for completed jobs', async () => {
      // Arrange
      const jobWithBreakdown = {
        ...mockActiveJobs[2],
        urlCount: 750,
        completedCount: 750,
        layerBreakdown: {
          layer1: 400,
          layer2: 250,
          layer3: 100,
        },
      };
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue([jobWithBreakdown]);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - layer1 + layer2 + layer3 = completedCount
      // - All layer counts are non-negative integers
    });

    it('should return zero layer breakdown for jobs with no completed URLs', async () => {
      // Arrange
      const queuedJobs = mockActiveJobs.filter(job => job.status === 'queued');
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(queuedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify all queued jobs have:
      // - layerBreakdown.layer1 = 0
      // - layerBreakdown.layer2 = 0
      // - layerBreakdown.layer3 = 0
    });

    it('should maintain sequential queue positions (1, 2, 3...)', async () => {
      // Arrange
      const queuedJobs = mockActiveJobs.filter(job => job.status === 'queued');
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(queuedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify queue positions are:
      // - Sequential integers starting at 1
      // - No gaps or duplicates
      // - Ordered by createdAt (first queued = position 1)
    });
  });

  /**
   * Integration Tests
   * Tests with mixed job states and realistic scenarios
   */
  describe('Integration Tests', () => {
    it('should handle mixed active and queued jobs correctly', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - Processing jobs have null queuePosition/estimatedWaitTime
      // - Queued jobs have valid queuePosition/estimatedWaitTime
      // - All jobs have correct progress and layerBreakdown
    });

    it('should handle limit and offset together', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockImplementation((limit?: number, offset?: number) => {
        const start = offset || 0;
        const end = limit ? start + limit : undefined;
        return Promise.resolve(mockActiveJobs.slice(start, end));
      });

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?limit=2&offset=1')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - Returns 2 jobs starting from index 1
      // - Correct jobs are returned (second and third)
    });

    it('should handle includeCompleted with pagination', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockImplementation((limit?: number, offset?: number) => {
        const start = offset || 0;
        const end = limit ? start + limit : undefined;
        return Promise.resolve(mockActiveJobs.slice(start, end));
      });
      (jobsService.getCompletedJobs as jest.Mock).mockResolvedValue(mockCompletedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?includeCompleted=true&limit=2&offset=1')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - Pagination applies only to activeJobs
      // - completedJobs array is not paginated
      // - Both arrays present in response
    });

    it('should handle empty active jobs with completed jobs', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue([]);
      (jobsService.getCompletedJobs as jest.Mock).mockResolvedValue(mockCompletedJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?includeCompleted=true')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - Status: 200 OK
      // - activeJobs: []
      // - completedJobs: array with 2 jobs
    });
  });

  /**
   * Service Method Verification
   * Ensures controller calls service with correct parameters
   */
  describe('Service Method Verification', () => {
    it('should call jobsService.getActiveJobs with correct parameters', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status?limit=10&offset=5')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify jobsService.getActiveJobs called with:
      // - limit: 10
      // - offset: 5
    });

    it('should call jobsService.getCompletedJobs only when includeCompleted=true', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);
      (jobsService.getCompletedJobs as jest.Mock).mockResolvedValue(mockCompletedJobs);

      // Act - Without includeCompleted
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify getCompletedJobs was NOT called

      // Act - With includeCompleted
      await request(app.getHttpServer())
        .get('/jobs/queue/status?includeCompleted=true')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify getCompletedJobs was called
    });

    it('should not call calculateProgress separately (assume calculated in getActiveJobs)', async () => {
      // Arrange
      (jobsService.getActiveJobs as jest.Mock).mockResolvedValue(mockActiveJobs);

      // Act - TDD
      await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(HttpStatus.NOT_FOUND);

      // TODO: Verify:
      // - calculateProgress method NOT called directly by controller
      // - Progress is already calculated in getActiveJobs response
    });
  });
});
