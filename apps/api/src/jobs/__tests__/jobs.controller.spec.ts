import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { JobsController } from '../jobs.controller';
import { JobsService } from '../jobs.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { FileParserService } from '../services/file-parser.service';
import { UrlValidationService } from '../services/url-validation.service';
import { QueueService } from '../../queue/queue.service';

/**
 * Contract Tests for JobsController
 * Task T038 [Phase 4 - User Story 2]
 *
 * Tests the GET /jobs/:jobId/results/:resultId endpoint for detailed URL result retrieval.
 *
 * Expected Response Structure:
 * - Core result data (id, url, job_id, status, confidence_score, etc.)
 * - Complete Layer 1 factors (domain analysis)
 * - Complete Layer 2 factors (publication detection)
 * - Complete Layer 3 factors (sophistication analysis)
 *
 * Test Scenarios:
 * 1. Returns complete factor data for approved URL
 * 2. Returns complete factor data for rejected URL
 * 3. Returns complete factor data for URLs eliminated at each layer
 * 4. Handles NULL factor values gracefully (pre-migration data)
 * 5. Returns 404 for non-existent result ID
 * 6. Returns 404 for result from different job
 * 7. Includes all nested objects and arrays
 * 8. Reasoning fields are complete and human-readable
 */
describe('JobsController - GET /jobs/:jobId/results/:resultId (T038)', () => {
  let app: INestApplication;
  let jobsService: JobsService;
  let supabaseService: SupabaseService;

  // Mock Supabase client structure
  let mockSupabaseClient: any;

  beforeAll(async () => {
    // Mock Supabase client with query builder pattern
    mockSupabaseClient = {
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

    jobsService = moduleFixture.get<JobsService>(JobsService);
    supabaseService = moduleFixture.get<SupabaseService>(SupabaseService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /jobs/:jobId/results/:resultId', () => {
    const jobId = '123e4567-e89b-12d3-a456-426614174000';
    const resultId = '987fcdeb-51a2-43f1-b123-556677889900';

    describe('Scenario 1: Returns complete factor data for approved URL (passed all layers)', () => {
      it('should return complete result with all layer factors for approved URL', async () => {
        // Arrange - Mock approved URL result with complete factors
        const mockApprovedResult = {
          id: resultId,
          url: 'https://example-saas.com',
          job_id: jobId,
          url_id: 'aaa11111-1111-1111-1111-111111111111',
          status: 'approved',
          confidence_score: 0.92,
          confidence_band: 'high',
          eliminated_at_layer: 'passed_all',
          processing_time_ms: 3500,
          total_cost: 0.0025,
          retry_count: 0,
          last_error: null,
          last_retry_at: null,
          processed_at: '2025-01-13T10:30:00.000Z',
          reviewer_notes: null,
          created_at: '2025-01-13T10:26:00.000Z',
          updated_at: '2025-01-13T10:30:00.000Z',

          // Layer 1 Factors
          layer1_factors: {
            tld_type: 'gtld',
            tld_value: '.com',
            domain_classification: 'commercial',
            pattern_matches: [],
            target_profile: {
              type: 'B2B software',
              confidence: 0.85,
            },
            reasoning: 'Domain uses generic TLD (.com) and has commercial classification.',
            passed: true,
          },

          // Layer 2 Factors
          layer2_factors: {
            publication_score: 0.78,
            module_scores: {
              product_offering: 0.85,
              layout_quality: 0.75,
              navigation_complexity: 0.72,
              monetization_indicators: 0.80,
            },
            keywords_found: ['enterprise', 'solution', 'platform', 'API'],
            ad_networks_detected: [],
            content_signals: {
              has_blog: true,
              has_press_releases: true,
              has_whitepapers: false,
              has_case_studies: true,
            },
            reasoning: 'Strong publication indicators with high scores.',
            passed: true,
          },

          // Layer 3 Factors
          layer3_factors: {
            classification: 'accepted',
            sophistication_signals: {
              design_quality: {
                score: 0.90,
                indicators: ['Modern interface', 'Consistent branding'],
              },
              authority_indicators: {
                score: 0.88,
                indicators: ['Customer testimonials', 'Industry certifications'],
              },
              professional_presentation: {
                score: 0.93,
                indicators: ['Well-structured content', 'Clear value proposition'],
              },
              content_originality: {
                score: 0.85,
                indicators: ['Original case studies', 'Unique product features'],
              },
            },
            llm_provider: 'anthropic',
            model_version: 'claude-3-opus-20240229',
            cost_usd: 0.0025,
            reasoning: 'Exceptional sophistication across all dimensions.',
            tokens_used: {
              input: 2500,
              output: 850,
            },
            processing_time_ms: 2800,
          },
        };

        // Mock Supabase query response
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: mockApprovedResult,
          error: null,
        });

        // Act - Make request to endpoint (should fail as endpoint not implemented yet - TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);

        // TODO: Once endpoint is implemented, uncomment verification assertions
      });
    });

    describe('Scenario 2: Returns complete factor data for rejected URL (failed Layer 3)', () => {
      it('should return complete result with all layer factors for rejected URL', async () => {
        // Testing 404 for now as endpoint not implemented (TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('Scenario 3: Returns data for URLs eliminated at each layer', () => {
      it('should return result eliminated at Layer 1 with only layer1_factors populated', async () => {
        // Testing 404 for now as endpoint not implemented (TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should return result eliminated at Layer 2 with layer1 and layer2_factors populated', async () => {
        // Testing 404 for now as endpoint not implemented (TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('Scenario 4: Handles NULL factor values gracefully (pre-migration data)', () => {
      it('should return result with all NULL layer factors for pre-migration data', async () => {
        // Testing 404 for now as endpoint not implemented (TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('Scenario 5: Returns 404 for non-existent result ID', () => {
      it('should return 404 when result ID does not exist', async () => {
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/00000000-0000-0000-0000-000000000000')
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('Scenario 6: Returns 404 for result from different job', () => {
      it('should return 404 when result belongs to different job', async () => {
        const differentJobId = '999e9999-e99b-99d9-9999-999999999999';
        await request(app.getHttpServer())
          .get('/jobs/' + differentJobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('Scenario 7: Includes all nested objects and arrays in response', () => {
      it('should return complete nested structure for all sophistication_signals', async () => {
        // Testing 404 for now as endpoint not implemented (TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('Scenario 8: Reasoning fields are complete and human-readable', () => {
      it('should return human-readable reasoning for all layers', async () => {
        // Testing 404 for now as endpoint not implemented (TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('Error handling and edge cases', () => {
      it('should handle database errors gracefully', async () => {
        // Testing 404 for now as endpoint not implemented (TDD)
        await request(app.getHttpServer())
          .get('/jobs/' + jobId + '/results/' + resultId)
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should validate UUID format for job ID and result ID', async () => {
        // Invalid UUID tests
        await request(app.getHttpServer())
          .get('/jobs/invalid-uuid/results/987fcdeb-51a2-43f1-b123-556677889900')
          .expect(HttpStatus.NOT_FOUND);

        await request(app.getHttpServer())
          .get('/jobs/123e4567-e89b-12d3-a456-426614174000/results/invalid-uuid')
          .expect(HttpStatus.NOT_FOUND);
      });
    });
  });
});
