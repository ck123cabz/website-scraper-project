/**
 * Supabase Realtime Integration Test
 * Story 2.5: AC 2.5.4 - Database updates trigger Supabase Realtime events
 *
 * This integration test verifies that:
 * 1. Database updates to jobs table trigger Realtime events
 * 2. Database inserts to results table trigger Realtime events
 * 3. Database inserts to activity_logs table trigger Realtime events
 *
 * NOTE: This test requires a real Supabase connection with Realtime enabled.
 * It's marked as skipped by default to prevent failures in CI without Supabase.
 * To run: ENABLE_REALTIME_TESTS=true npm test
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../../../supabase/supabase.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Skip entire test suite if ENABLE_REALTIME_TESTS is not set
const shouldRunTests = process.env.ENABLE_REALTIME_TESTS === 'true';
const describeOrSkip = shouldRunTests ? describe : describe.skip;

describeOrSkip('Supabase Realtime Integration (Integration)', () => {
  let supabaseService: SupabaseService;
  let supabaseClient: SupabaseClient;
  let testJobId: string;

  beforeAll(async () => {
    // Validate Supabase environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY required for Realtime integration tests',
      );
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseService],
    }).compile();

    supabaseService = module.get<SupabaseService>(SupabaseService);
    supabaseClient = supabaseService.getClient();

    // Create a test job for integration testing
    const { data: job, error } = await supabaseClient
      .from('jobs')
      .insert({
        status: 'pending',
        total_urls: 10,
        processed_urls: 0,
        successful_urls: 0,
        failed_urls: 0,
      })
      .select()
      .single();

    if (error || !job) {
      throw new Error(`Failed to create test job: ${error?.message}`);
    }

    testJobId = job.id;
  });

  afterAll(async () => {
    // Clean up test job
    if (testJobId) {
      await supabaseClient.from('results').delete().eq('job_id', testJobId);
      await supabaseClient.from('activity_logs').delete().eq('job_id', testJobId);
      await supabaseClient.from('jobs').delete().eq('id', testJobId);
    }
  });

  describe('Jobs Table Realtime Events', () => {
    it('should trigger UPDATE event when job status changes', (done: jest.DoneCallback) => {
      const timeout = setTimeout(() => {
        done(new Error('Timeout: Realtime event not received within 5 seconds'));
      }, 5000);

      // Subscribe to jobs table changes
      const channel = supabaseClient
        .channel('jobs-realtime-test')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: `id=eq.${testJobId}`,
          },
          (payload) => {
            clearTimeout(timeout);
            expect(payload.new).toBeDefined();
            expect(payload.new.id).toBe(testJobId);
            expect(payload.new.status).toBe('processing');
            channel.unsubscribe();
            done();
          },
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Update job status to trigger Realtime event
            await supabaseClient
              .from('jobs')
              .update({ status: 'processing', processed_urls: 1 })
              .eq('id', testJobId);
          }
        });
    }, 10000); // 10s timeout for this test

    it('should trigger UPDATE event when job progress changes', (done: jest.DoneCallback) => {
      const timeout = setTimeout(() => {
        done(new Error('Timeout: Realtime event not received within 5 seconds'));
      }, 5000);

      const channel = supabaseClient
        .channel('jobs-progress-test')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: `id=eq.${testJobId}`,
          },
          (payload) => {
            clearTimeout(timeout);
            expect(payload.new).toBeDefined();
            expect(payload.new.processed_urls).toBe(5);
            expect(payload.new.progress_percentage).toBeGreaterThan(0);
            channel.unsubscribe();
            done();
          },
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await supabaseClient
              .from('jobs')
              .update({
                processed_urls: 5,
                progress_percentage: 50.0,
              })
              .eq('id', testJobId);
          }
        });
    }, 10000);
  });

  describe('Results Table Realtime Events', () => {
    it('should trigger INSERT event when result is stored', (done: jest.DoneCallback) => {
      const timeout = setTimeout(() => {
        done(new Error('Timeout: Realtime event not received within 5 seconds'));
      }, 5000);

      const testUrl = 'https://example.com/test-realtime';

      const channel = supabaseClient
        .channel('results-insert-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'results',
          },
          (payload) => {
            if (payload.new.job_id === testJobId) {
              clearTimeout(timeout);
              expect(payload.new).toBeDefined();
              expect(payload.new.url).toBe(testUrl);
              expect(payload.new.status).toBe('success');
              channel.unsubscribe();
              done();
            }
          },
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await supabaseClient.from('results').insert({
              job_id: testJobId,
              url: testUrl,
              status: 'success',
              classification_result: 'suitable',
              classification_score: 0.95,
              llm_provider: 'gemini',
              llm_cost: 0.00045,
              processing_time_ms: 2500,
            });
          }
        });
    }, 10000);
  });

  describe('Activity Logs Table Realtime Events', () => {
    it('should trigger INSERT event when activity log is created', (done: jest.DoneCallback) => {
      const timeout = setTimeout(() => {
        done(new Error('Timeout: Realtime event not received within 5 seconds'));
      }, 5000);

      const testMessage = 'Realtime integration test log';

      const channel = supabaseClient
        .channel('logs-insert-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs',
          },
          (payload) => {
            if (payload.new.job_id === testJobId) {
              clearTimeout(timeout);
              expect(payload.new).toBeDefined();
              expect(payload.new.message).toBe(testMessage);
              expect(payload.new.severity).toBe('info');
              channel.unsubscribe();
              done();
            }
          },
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await supabaseClient.from('activity_logs').insert({
              job_id: testJobId,
              severity: 'info',
              message: testMessage,
            });
          }
        });
    }, 10000);
  });

  describe('End-to-End Realtime Flow', () => {
    it('should receive multiple Realtime events during simulated worker processing', (done: jest.DoneCallback) => {
      const receivedEvents: string[] = [];
      const expectedEvents = ['job-update', 'result-insert', 'log-insert'];

      const timeout = setTimeout(() => {
        done(
          new Error(
            `Timeout: Not all events received. Got: ${receivedEvents.join(', ')}. Expected: ${expectedEvents.join(', ')}`,
          ),
        );
      }, 10000);

      // Subscribe to all relevant tables
      const jobChannel = supabaseClient
        .channel('e2e-jobs')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: `id=eq.${testJobId}`,
          },
          () => {
            if (!receivedEvents.includes('job-update')) {
              receivedEvents.push('job-update');
              checkCompletion();
            }
          },
        )
        .subscribe();

      const resultChannel = supabaseClient
        .channel('e2e-results')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'results',
          },
          (payload) => {
            if (payload.new.job_id === testJobId && !receivedEvents.includes('result-insert')) {
              receivedEvents.push('result-insert');
              checkCompletion();
            }
          },
        )
        .subscribe();

      const logChannel = supabaseClient
        .channel('e2e-logs')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs',
          },
          (payload) => {
            if (payload.new.job_id === testJobId && !receivedEvents.includes('log-insert')) {
              receivedEvents.push('log-insert');
              checkCompletion();
            }
          },
        )
        .subscribe();

      function checkCompletion() {
        if (receivedEvents.length === expectedEvents.length) {
          clearTimeout(timeout);
          jobChannel.unsubscribe();
          resultChannel.unsubscribe();
          logChannel.unsubscribe();
          expect(receivedEvents).toContain('job-update');
          expect(receivedEvents).toContain('result-insert');
          expect(receivedEvents).toContain('log-insert');
          done();
        }
      }

      // Simulate worker processing after all subscriptions are ready
      setTimeout(async () => {
        // 1. Update job
        await supabaseClient
          .from('jobs')
          .update({ status: 'processing', processed_urls: 1 })
          .eq('id', testJobId);

        // 2. Insert result
        await supabaseClient.from('results').insert({
          job_id: testJobId,
          url: 'https://example.com/e2e-test',
          status: 'success',
          classification_result: 'suitable',
          classification_score: 0.92,
          llm_provider: 'gpt',
          llm_cost: 0.0007,
          processing_time_ms: 3200,
        });

        // 3. Insert activity log
        await supabaseClient.from('activity_logs').insert({
          job_id: testJobId,
          severity: 'success',
          message: 'E2E test completed',
        });
      }, 1000); // Wait 1s for all subscriptions to be ready
    }, 15000); // 15s timeout for E2E test
  });
});
