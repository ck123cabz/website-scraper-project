import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';

/**
 * T111a: Open Access Model Integration Tests (E2E)
 *
 * This test suite verifies the architectural decision to use an open access model
 * for the website scraper project. Key principles:
 *
 * 1. All endpoints are accessible without authentication
 * 2. All jobs and results are visible to all users
 * 3. No user ID or organization filtering is applied
 * 4. No authorization checks are performed
 *
 * These tests document and validate this design decision to prevent
 * accidental introduction of user isolation or authentication in the future.
 */
describe('Open Access Model Integration Tests (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Job Access - Open Access Model', () => {
    let jobId1: string;
    let jobId2: string;

    beforeEach(async () => {
      // Create two test jobs (simulating different users)
      const job1Response = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Job 1 - User A',
          totalUrls: 2,
        });

      jobId1 = job1Response.body.data.id;

      const job2Response = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Job 2 - User B',
          totalUrls: 2,
        });

      jobId2 = job2Response.body.data.id;
    });

    it('should allow GET /jobs to list ALL jobs without filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs')
        .expect(200);

      const jobIds = response.body.data.map((job: any) => job.id);

      // Both jobs should be returned regardless of "user"
      expect(jobIds).toContain(jobId1);
      expect(jobIds).toContain(jobId2);

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow GET /jobs/:jobId for any job', async () => {
      // Get job created by "User A"
      const response1 = await request(app.getHttpServer())
        .get(`/jobs/${jobId1}`)
        .expect(200);

      expect(response1.body.data.id).toBe(jobId1);
      expect(response1.body.data.name).toBe('Job 1 - User A');

      // Get job created by "User B"
      const response2 = await request(app.getHttpServer())
        .get(`/jobs/${jobId2}`)
        .expect(200);

      expect(response2.body.data.id).toBe(jobId2);
      expect(response2.body.data.name).toBe('Job 2 - User B');
    });

    it('should allow GET /jobs/:jobId/results for any job', async () => {
      // Get results from job created by "User A"
      const response1 = await request(app.getHttpServer())
        .get(`/jobs/${jobId1}/results`)
        .expect(200);

      expect(response1.body).toHaveProperty('data');

      // Get results from job created by "User B"
      const response2 = await request(app.getHttpServer())
        .get(`/jobs/${jobId2}/results`)
        .expect(200);

      expect(response2.body).toHaveProperty('data');
    });

    it('should allow POST /jobs/:jobId/export for any job', async () => {
      // Export results from job created by "User A"
      const response1 = await request(app.getHttpServer())
        .post(`/jobs/${jobId1}/export`)
        .query({ format: 'summary' })
        .expect(200);

      expect(response1.text).toContain('url'); // CSV header

      // Export results from job created by "User B"
      const response2 = await request(app.getHttpServer())
        .post(`/jobs/${jobId2}/export`)
        .query({ format: 'summary' })
        .expect(200);

      expect(response2.text).toContain('url'); // CSV header
    });

    it('should allow GET /jobs/queue/status to show ALL active jobs', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(200);

      const jobIds = response.body.data.activeJobs.map((job: any) => job.jobId);

      // Both jobs should be visible in queue status
      expect(jobIds).toContain(jobId1);
      expect(jobIds).toContain(jobId2);
    });
  });

  describe('Results Access - No User Filtering', () => {
    let jobId: string;
    let resultId: string;

    beforeEach(async () => {
      // Create a test job
      const jobResponse = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Test Job',
          totalUrls: 1,
        });

      jobId = jobResponse.body.data.id;

      // Get first result (if any exist)
      const resultsResponse = await request(app.getHttpServer())
        .get(`/jobs/${jobId}/results?page=1`);

      if (resultsResponse.body.data && resultsResponse.body.data.length > 0) {
        resultId = resultsResponse.body.data[0].id;
      }
    });

    it('should allow GET /jobs/:jobId/results/:resultId for any result', async () => {
      if (!resultId) {
        // Skip if no results available
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/jobs/${jobId}/results/${resultId}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', resultId);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('status');
    });
  });

  describe('No Authentication Required', () => {
    it('should accept requests without authentication headers', async () => {
      // Make request without any auth headers
      const response = await request(app.getHttpServer())
        .get('/jobs')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should accept requests with invalid auth headers (gracefully ignore)', async () => {
      // Make request with invalid auth headers
      const response = await request(app.getHttpServer())
        .get('/jobs')
        .set('Authorization', 'Bearer invalid_token')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should allow anonymous CSV export', async () => {
      // Create a job
      const jobResponse = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Anonymous Export Test',
          totalUrls: 1,
        });

      const jobId = jobResponse.body.data.id;

      // Export without any auth
      const exportResponse = await request(app.getHttpServer())
        .post(`/jobs/${jobId}/export`)
        .query({ format: 'summary' })
        .expect(200);

      expect(exportResponse.text).toContain('url');
    });
  });

  describe('Open Access Design Verification', () => {
    it('should confirm no user_id filtering in job queries', async () => {
      // This test verifies the architectural decision:
      // All jobs are returned regardless of who created them

      const response = await request(app.getHttpServer())
        .get('/jobs')
        .expect(200);

      // Response should return all jobs without user filtering
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify response structure doesn't include user filtering
      expect(response.body).not.toHaveProperty('user_id');
      expect(response.body).not.toHaveProperty('owner_id');
    });

    it('should confirm no organization filtering in results', async () => {
      // Create multiple jobs and verify all results are accessible

      const job1 = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Org A Job',
          totalUrls: 1,
        });

      const job2 = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Org B Job',
          totalUrls: 1,
        });

      // Results from job1 should be accessible
      const results1 = await request(app.getHttpServer())
        .get(`/jobs/${job1.body.data.id}/results`)
        .expect(200);

      // Results from job2 should be accessible
      const results2 = await request(app.getHttpServer())
        .get(`/jobs/${job2.body.data.id}/results`)
        .expect(200);

      // No filtering occurred
      expect(results1.body).toHaveProperty('data');
      expect(results2.body).toHaveProperty('data');
    });

    it('should confirm job operations work without user context', async () => {
      // Create a job
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Test Job Operations',
          totalUrls: 1,
        });

      const jobId = createResponse.body.data.id;

      // Pause job without user context
      const pauseResponse = await request(app.getHttpServer())
        .patch(`/jobs/${jobId}/pause`)
        .expect(200);

      expect(pauseResponse.body.data.status).toBe('paused');

      // Resume job without user context
      const resumeResponse = await request(app.getHttpServer())
        .patch(`/jobs/${jobId}/resume`)
        .expect(200);

      expect(resumeResponse.body.data.status).toBe('processing');

      // Cancel job without user context
      const cancelResponse = await request(app.getHttpServer())
        .delete(`/jobs/${jobId}/cancel`)
        .expect(200);

      expect(cancelResponse.body.data.status).toBe('cancelled');
    });

    it('should confirm queue status is not filtered by user', async () => {
      // Create multiple jobs
      await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Queue Test 1',
          totalUrls: 1,
        });

      await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Queue Test 2',
          totalUrls: 1,
        });

      // Get queue status without any user context
      const response = await request(app.getHttpServer())
        .get('/jobs/queue/status')
        .expect(200);

      // All jobs should be visible in queue
      expect(response.body.data).toHaveProperty('activeJobs');
      expect(Array.isArray(response.body.data.activeJobs)).toBe(true);

      // No user filtering should be applied
      expect(response.body.data.activeJobs.length).toBeGreaterThan(0);
    });
  });

  describe('Data Isolation Does Not Exist', () => {
    it('should prove that jobs from different "sources" are all accessible', async () => {
      // Create jobs with different "simulated sources"
      const sources = ['Source A', 'Source B', 'Source C'];
      const jobIds: string[] = [];

      for (const source of sources) {
        const response = await request(app.getHttpServer())
          .post('/jobs')
          .send({
            name: `Job from ${source}`,
            totalUrls: 1,
          });

        jobIds.push(response.body.data.id);
      }

      // Verify all jobs are accessible through GET /jobs
      const allJobsResponse = await request(app.getHttpServer())
        .get('/jobs')
        .expect(200);

      const retrievedJobIds = allJobsResponse.body.data.map((job: any) => job.id);

      // All created jobs should be in the response
      for (const jobId of jobIds) {
        expect(retrievedJobIds).toContain(jobId);
      }

      // Verify each job is individually accessible
      for (const jobId of jobIds) {
        await request(app.getHttpServer())
          .get(`/jobs/${jobId}`)
          .expect(200);
      }
    });

    it('should confirm no API endpoint requires authentication', async () => {
      // Test all major endpoints without auth headers
      const endpoints = [
        { method: 'get', path: '/jobs' },
        { method: 'get', path: '/jobs/queue/status' },
        { method: 'get', path: '/health' },
      ];

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'get') {
          response = await request(app.getHttpServer()).get(endpoint.path);
        } else if (endpoint.method === 'post') {
          response = await request(app.getHttpServer()).post(endpoint.path);
        }

        // Should not return 401 Unauthorized or 403 Forbidden
        expect(response?.status).not.toBe(401);
        expect(response?.status).not.toBe(403);
      }
    });

    it('should confirm POST endpoints work without user identification', async () => {
      // Create job without any user identification
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'No User Context Job',
          totalUrls: 1,
        });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data).toHaveProperty('id');

      // Job should be immediately accessible without auth
      const jobId = createResponse.body.data.id;
      const getResponse = await request(app.getHttpServer())
        .get(`/jobs/${jobId}`)
        .expect(200);

      expect(getResponse.body.data.id).toBe(jobId);
    });
  });

  describe('Cross-Job Operations', () => {
    it('should allow accessing any job regardless of creation order', async () => {
      // Create first job
      const job1Response = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'First Job',
          totalUrls: 1,
        });

      const jobId1 = job1Response.body.data.id;

      // Create second job
      const job2Response = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Second Job',
          totalUrls: 1,
        });

      const jobId2 = job2Response.body.data.id;

      // Access first job from "different context"
      await request(app.getHttpServer())
        .get(`/jobs/${jobId1}`)
        .expect(200);

      // Access second job from "different context"
      await request(app.getHttpServer())
        .get(`/jobs/${jobId2}`)
        .expect(200);

      // Verify both jobs appear in list
      const listResponse = await request(app.getHttpServer())
        .get('/jobs')
        .expect(200);

      const jobIds = listResponse.body.data.map((job: any) => job.id);
      expect(jobIds).toContain(jobId1);
      expect(jobIds).toContain(jobId2);
    });

    it('should allow exporting results from any job', async () => {
      // Create two jobs
      const job1 = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Export Test 1',
          totalUrls: 1,
        });

      const job2 = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Export Test 2',
          totalUrls: 1,
        });

      const jobId1 = job1.body.data.id;
      const jobId2 = job2.body.data.id;

      // Export from first job
      const export1 = await request(app.getHttpServer())
        .post(`/jobs/${jobId1}/export`)
        .query({ format: 'summary' })
        .expect(200);

      expect(export1.headers['content-type']).toContain('text/csv');

      // Export from second job
      const export2 = await request(app.getHttpServer())
        .post(`/jobs/${jobId2}/export`)
        .query({ format: 'summary' })
        .expect(200);

      expect(export2.headers['content-type']).toContain('text/csv');
    });
  });

  describe('API Endpoint Accessibility', () => {
    it('should confirm all documented endpoints are accessible without auth', async () => {
      // Test that all major API endpoints respond without requiring authentication
      const testJob = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          name: 'Auth Test Job',
          totalUrls: 1,
        });

      const jobId = testJob.body.data.id;

      const endpoints = [
        { method: 'get', path: '/health', expectedStatus: 200 },
        { method: 'get', path: '/jobs', expectedStatus: 200 },
        { method: 'get', path: `/jobs/${jobId}`, expectedStatus: 200 },
        { method: 'get', path: `/jobs/${jobId}/results`, expectedStatus: 200 },
        { method: 'get', path: '/jobs/queue/status', expectedStatus: 200 },
        { method: 'post', path: `/jobs/${jobId}/export`, query: { format: 'summary' }, expectedStatus: 200 },
        { method: 'patch', path: `/jobs/${jobId}/pause`, expectedStatus: 200 },
      ];

      for (const endpoint of endpoints) {
        let req;
        if (endpoint.method === 'get') {
          req = request(app.getHttpServer()).get(endpoint.path);
        } else if (endpoint.method === 'post') {
          req = request(app.getHttpServer()).post(endpoint.path);
        } else if (endpoint.method === 'patch') {
          req = request(app.getHttpServer()).patch(endpoint.path);
        }

        if (endpoint.query && req) {
          req = req.query(endpoint.query);
        }

        if (req) {
          const response = await req;
          expect(response.status).toBe(endpoint.expectedStatus);
        }
      }
    });
  });
});
