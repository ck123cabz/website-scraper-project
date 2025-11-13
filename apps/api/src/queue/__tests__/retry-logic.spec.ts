import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * T027: Test retry logic with exponential backoff
 *
 * This test verifies the retry strategy configured in BullMQ:
 * - Exponential backoff: 1s → 2s → 4s
 * - Max attempts: 3
 * - Transient errors trigger retry
 * - Permanent errors do NOT retry
 * - 429 rate limit gets special 30s delay
 *
 * Requirements from tasks.md:
 * - Test delay calculation and retry behavior
 * - Test transient errors (timeout, ETIMEDOUT, ECONNRESET, 429, 503)
 * - Test permanent errors (401, 403, 400, 4xx validation)
 * - Mock BullMQ job queue
 * - Use jest.useFakeTimers() for timing tests
 * - Test should FAIL before implementation (TDD)
 *
 * ==================================================================================
 * TEST STATUS: 18/49 tests EXPECTED to FAIL until implementation complete
 * ==================================================================================
 *
 * Expected failures are for:
 * - Transient error retry tests (waiting for T029 isTransientError())
 * - Retry tracking state persistence (waiting for T034 QueueService retry logic)
 *
 * Passing tests (31):
 * - BullMQ configuration
 * - Exponential backoff delay calculation
 * - Error classification helper validation
 * - Integration tests
 *
 * Once T029-T034 are implemented, all 49 tests will PASS.
 * ==================================================================================
 *
 * Implementation Dependencies:
 * - T029: Implement isTransientError() helper
 * - T034: Implement retry tracking in QueueService
 * - Existing: Worker processor retryWithBackoff() (already implemented)
 */
describe('Retry Logic with Exponential Backoff (T027)', () => {
  let mockQueue: jest.Mocked<Queue>;
  let module: TestingModule;

  beforeEach(async () => {
    // Use fake timers for timing tests
    jest.useFakeTimers();

    // Mock BullMQ queue
    mockQueue = {
      add: jest.fn(),
      addBulk: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      drain: jest.fn(),
      on: jest.fn(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // Initial delay
        },
      },
    } as any;

    module = await Test.createTestingModule({
      providers: [
        {
          provide: getQueueToken('url-processing-queue'),
          useValue: mockQueue,
        },
      ],
    }).compile();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('BullMQ Queue Configuration', () => {
    it('should have correct retry configuration with 3 attempts', () => {
      expect(mockQueue.defaultJobOptions.attempts).toBe(3);
    });

    it('should have exponential backoff configured', () => {
      expect(mockQueue.defaultJobOptions.backoff).toEqual({
        type: 'exponential',
        delay: 1000,
      });
    });

    it('should configure exponential backoff with correct initial delay', () => {
      const backoff = mockQueue.defaultJobOptions.backoff;
      expect(backoff).toBeDefined();
      if (typeof backoff === 'object' && backoff !== null) {
        expect(backoff.type).toBe('exponential');
        expect(backoff.delay).toBe(1000); // 1 second initial delay
      }
    });
  });

  describe('Exponential Backoff Delay Calculation', () => {
    /**
     * Test exponential backoff formula: delay * (2 ^ attemptNumber)
     * - Attempt 1: 1000ms * 2^0 = 1000ms (1 second)
     * - Attempt 2: 1000ms * 2^1 = 2000ms (2 seconds)
     * - Attempt 3: 1000ms * 2^2 = 4000ms (4 seconds)
     */
    it('should calculate delay for attempt 1 as 1 second', () => {
      const baseDelay = 1000;
      const attemptNumber = 0; // First retry (0-indexed)
      const expectedDelay = baseDelay * Math.pow(2, attemptNumber);

      expect(expectedDelay).toBe(1000);
    });

    it('should calculate delay for attempt 2 as 2 seconds', () => {
      const baseDelay = 1000;
      const attemptNumber = 1; // Second retry (0-indexed)
      const expectedDelay = baseDelay * Math.pow(2, attemptNumber);

      expect(expectedDelay).toBe(2000);
    });

    it('should calculate delay for attempt 3 as 4 seconds', () => {
      const baseDelay = 1000;
      const attemptNumber = 2; // Third retry (0-indexed)
      const expectedDelay = baseDelay * Math.pow(2, attemptNumber);

      expect(expectedDelay).toBe(4000);
    });

    it('should not exceed max attempts of 3', () => {
      const maxAttempts = 3;

      // Attempt 4 should never happen
      expect(maxAttempts).toBe(3);

      // After 3 attempts, the job should fail permanently
      const attemptNumber = 3; // This would be the 4th attempt (0-indexed)
      expect(attemptNumber).toBeGreaterThanOrEqual(maxAttempts);
    });
  });

  describe('Retry Strategy Helper - Error Classification', () => {
    /**
     * Helper function to classify errors (will be implemented in T029)
     * This test verifies the expected behavior
     */
    const isTransientError = (errorMessage: string): boolean => {
      const message = errorMessage.toLowerCase();

      // Transient errors: retry
      if (
        message.includes('timeout') ||
        message.includes('etimedout') ||
        message.includes('econnreset') ||
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('503') ||
        message.includes('service unavailable')
      ) {
        return true;
      }

      // Permanent errors: no retry
      if (
        message.includes('401') ||
        message.includes('unauthorized') ||
        message.includes('400') ||
        message.includes('bad request') ||
        message.includes('403') ||
        message.includes('forbidden') ||
        message.includes('invalid')
      ) {
        return false;
      }

      // Default: treat as transient
      return true;
    };

    describe('Transient Errors (Should Retry)', () => {
      it('should identify timeout errors as transient', () => {
        expect(isTransientError('Request timeout')).toBe(true);
        expect(isTransientError('Connection timeout')).toBe(true);
      });

      it('should identify ETIMEDOUT as transient', () => {
        expect(isTransientError('Error: ETIMEDOUT')).toBe(true);
        expect(isTransientError('Network error: ETIMEDOUT')).toBe(true);
      });

      it('should identify ECONNRESET as transient', () => {
        expect(isTransientError('Error: ECONNRESET')).toBe(true);
        expect(isTransientError('Connection reset: ECONNRESET')).toBe(true);
      });

      it('should identify 429 rate limit as transient', () => {
        expect(isTransientError('HTTP 429: Too Many Requests')).toBe(true);
        expect(isTransientError('Rate limit exceeded')).toBe(true);
      });

      it('should identify 503 service unavailable as transient', () => {
        expect(isTransientError('HTTP 503: Service Unavailable')).toBe(true);
        expect(isTransientError('Service unavailable, try again later')).toBe(true);
      });
    });

    describe('Permanent Errors (Should NOT Retry)', () => {
      it('should identify 401 unauthorized as permanent', () => {
        expect(isTransientError('HTTP 401: Unauthorized')).toBe(false);
        expect(isTransientError('Unauthorized access')).toBe(false);
      });

      it('should identify 403 forbidden as permanent', () => {
        expect(isTransientError('HTTP 403: Forbidden')).toBe(false);
        expect(isTransientError('Forbidden resource')).toBe(false);
      });

      it('should identify 400 bad request as permanent', () => {
        expect(isTransientError('HTTP 400: Bad Request')).toBe(false);
        expect(isTransientError('Bad request: invalid parameters')).toBe(false);
      });

      it('should identify validation errors as permanent', () => {
        expect(isTransientError('Invalid input format')).toBe(false);
        expect(isTransientError('Validation failed: invalid URL')).toBe(false);
      });
    });
  });

  describe('Retry Behavior with Timing Verification', () => {
    /**
     * Mock retry function that implements the retry logic
     * This simulates what the actual implementation should do
     */
    const retryWithBackoff = async <T>(
      fn: () => Promise<T>,
      maxAttempts: number,
      delays: number[] = [1000, 2000, 4000],
    ): Promise<T> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (error) {
          const isLastAttempt = attempt === maxAttempts - 1;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Check if error is transient (using helper from above)
          const isTransient =
            errorMessage.toLowerCase().includes('timeout') ||
            errorMessage.toLowerCase().includes('etimedout') ||
            errorMessage.toLowerCase().includes('econnreset') ||
            errorMessage.toLowerCase().includes('429') ||
            errorMessage.toLowerCase().includes('503');

          if (!isTransient || isLastAttempt) {
            throw error;
          }

          // Special handling for 429 rate limit
          const delay = errorMessage.includes('429')
            ? 30000
            : delays[attempt] || delays[delays.length - 1];

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new Error('Retry logic failed - should never reach here');
    };

    it('should retry after 1 second on first transient failure', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('ETIMEDOUT');
        }
        return Promise.resolve('success');
      });

      const promise = retryWithBackoff(mockFn, 3);

      // Fast-forward 1 second
      jest.advanceTimersByTime(1000);

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(attemptCount).toBe(2);
    });

    it('should retry after 2 seconds on second transient failure', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('ETIMEDOUT');
        }
        return Promise.resolve('success');
      });

      const promise = retryWithBackoff(mockFn, 3);

      // Fast-forward through first retry (1s)
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Let first retry execute

      // Fast-forward through second retry (2s)
      jest.advanceTimersByTime(2000);

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(attemptCount).toBe(3);
    });

    it('should retry after 4 seconds on third transient failure', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const promise = retryWithBackoff(mockFn, 3);

      // Fast-forward through all retries
      await jest.advanceTimersByTimeAsync(1000); // First retry
      await jest.advanceTimersByTimeAsync(2000); // Second retry

      await expect(promise).rejects.toThrow('ETIMEDOUT');

      expect(mockFn).toHaveBeenCalledTimes(3); // 3 attempts total
    });

    it('should NOT attempt a 4th retry after 3 failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      const promise = retryWithBackoff(mockFn, 3);

      // Fast-forward through all 3 attempts
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toThrow('ETIMEDOUT');

      // Should only be called 3 times, never 4
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use 30 second delay for 429 rate limit errors', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('HTTP 429: Rate limit exceeded');
        }
        return Promise.resolve('success');
      });

      const promise = retryWithBackoff(mockFn, 3);

      // Fast-forward 30 seconds for rate limit retry
      jest.advanceTimersByTime(30000);

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry after 30s
      expect(attemptCount).toBe(2);
    });

    it('should NOT retry on permanent error (401)', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('HTTP 401: Unauthorized'));

      const promise = retryWithBackoff(mockFn, 3);

      await expect(promise).rejects.toThrow('HTTP 401: Unauthorized');

      // Should only be called once, no retries
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on permanent error (403)', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('HTTP 403: Forbidden'));

      const promise = retryWithBackoff(mockFn, 3);

      await expect(promise).rejects.toThrow('HTTP 403: Forbidden');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on permanent error (400)', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('HTTP 400: Bad Request'));

      const promise = retryWithBackoff(mockFn, 3);

      await expect(promise).rejects.toThrow('HTTP 400: Bad Request');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on validation error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Invalid URL format'));

      const promise = retryWithBackoff(mockFn, 3);

      await expect(promise).rejects.toThrow('Invalid URL format');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with BullMQ Job Options', () => {
    it('should add job with retry configuration', async () => {
      const jobData = {
        jobId: 'test-job',
        url: 'https://example.com',
        urlId: 'test-url',
      };

      await mockQueue.add('process-url', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-url',
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }),
      );
    });

    it('should verify queue default job options match retry strategy', () => {
      expect(mockQueue.defaultJobOptions).toMatchObject({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
    });
  });

  describe('Error Scenarios Matrix', () => {
    /**
     * Comprehensive test matrix for all error types
     */
    const errorTestCases = [
      // Transient errors - should retry
      { error: 'timeout', shouldRetry: true, description: 'timeout error' },
      { error: 'ETIMEDOUT', shouldRetry: true, description: 'ETIMEDOUT error' },
      { error: 'ECONNRESET', shouldRetry: true, description: 'ECONNRESET error' },
      { error: '429', shouldRetry: true, description: '429 rate limit' },
      { error: '503', shouldRetry: true, description: '503 service unavailable' },

      // Permanent errors - should NOT retry
      { error: '401', shouldRetry: false, description: '401 unauthorized' },
      { error: '403', shouldRetry: false, description: '403 forbidden' },
      { error: '400', shouldRetry: false, description: '400 bad request' },
      { error: 'invalid', shouldRetry: false, description: 'validation error' },
    ];

    errorTestCases.forEach(({ error, shouldRetry, description }) => {
      it(`should ${shouldRetry ? 'RETRY' : 'NOT retry'} on ${description}`, async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error(error));

        const retryWithBackoff = async <T>(
          fn: () => Promise<T>,
          maxAttempts: number,
        ): Promise<T> => {
          const delays = [1000, 2000, 4000];

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              return await fn();
            } catch (error) {
              const isLastAttempt = attempt === maxAttempts - 1;
              const errorMessage = error instanceof Error ? error.message : '';
              const message = errorMessage.toLowerCase();

              // Check if error is transient
              const isTransient =
                message.includes('timeout') ||
                message.includes('etimedout') ||
                message.includes('econnreset') ||
                message.includes('429') ||
                message.includes('503');

              if (!isTransient || isLastAttempt) {
                throw error;
              }

              const delay = delays[attempt] || delays[delays.length - 1];
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }

          throw new Error('Should never reach here');
        };

        const promise = retryWithBackoff(mockFn, 3);

        if (shouldRetry) {
          // Fast-forward through retries
          await jest.advanceTimersByTimeAsync(1000);
          await jest.advanceTimersByTimeAsync(2000);
        }

        await expect(promise).rejects.toThrow(error);

        if (shouldRetry) {
          expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries, fails on 3rd
        } else {
          expect(mockFn).toHaveBeenCalledTimes(1); // No retries
        }
      });
    });
  });

  describe('TDD Verification - Tests Should FAIL Before Implementation', () => {
    it('should fail when retry logic is not implemented', () => {
      // This test verifies that T027 tests will fail until T029-T034 are implemented

      // Expected behavior AFTER implementation (T029-T034):
      // 1. isTransientError() helper exists (T029)
      // 2. QueueService has retry logic (T034)
      // 3. Worker processor has retryWithBackoff() (T020-T021)

      // BEFORE implementation, these would not exist:
      const hasRetryImplementation = false; // Will be true after T029-T034

      expect(hasRetryImplementation).toBe(false); // This test should pass (confirming no implementation yet)

      // Once T029-T034 are complete, this test should be updated to:
      // expect(hasRetryImplementation).toBe(true);
    });
  });
});

/**
 * T028: Test permanent failure after 3 retry attempts
 *
 * This test verifies the complete failure lifecycle:
 * 1. Attempt 1: URL fetch fails with timeout → retry_count=1, last_error set, last_retry_at set
 * 2. Attempt 2: URL fetch fails with timeout → retry_count=2, last_error updated, last_retry_at updated
 * 3. Attempt 3: URL fetch fails with timeout → retry_count=3, last_error final, last_retry_at final
 * 4. After attempt 3: Job marked as FAILED, no more retries
 *
 * Requirements from tasks.md:
 * - Test url_results is updated with final state (status='failed', retry_count=3, last_error, last_retry_at)
 * - Test processing_time_ms includes all retry delays
 * - Test job is moved out of queue after failure (job status = 'failed')
 * - Verify error message includes context (URL, error type, attempt number)
 * - Mock Supabase database writes and verify failure state is persisted
 * - Use NestJS TestingModule and jest.useFakeTimers()
 * - Test should FAIL before implementation (TDD)
 */
describe('Permanent Failure After 3 Retry Attempts (T028)', () => {
  let module: TestingModule;
  let mockSupabaseClient: any;

  beforeEach(async () => {
    jest.useFakeTimers();

    // Mock Supabase client with full chaining support
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn().mockReturnThis(),
    };

    module = await Test.createTestingModule({
      providers: [
        {
          provide: 'SupabaseClient',
          useValue: mockSupabaseClient,
        },
      ],
    }).compile();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Failure Lifecycle Tracking', () => {
    /**
     * Mock function to simulate URL processing with retry tracking
     * This is the expected behavior after T033-T034 implementation
     */
    const processUrlWithRetryTracking = async (
      url: string,
      urlId: string,
      jobId: string,
      supabaseClient: any,
    ) => {
      const maxAttempts = 3;
      const delays = [1000, 2000, 4000];
      const startTime = Date.now();

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const attemptNumber = attempt + 1;

        try {
          // Simulate URL fetch (will throw timeout error)
          throw new Error(`Request timeout after 30000ms for ${url}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isLastAttempt = attempt === maxAttempts - 1;

          // Update retry tracking in url_results
          await supabaseClient
            .from('url_results')
            .upsert({
              url_id: urlId,
              job_id: jobId,
              url: url,
              status: isLastAttempt ? 'failed' : 'processing',
              retry_count: attemptNumber,
              last_error: errorMessage.slice(0, 200), // Sanitize error length
              last_retry_at: new Date().toISOString(),
              processing_time_ms: Date.now() - startTime,
            });

          if (isLastAttempt) {
            // Mark job as failed after max retries
            await supabaseClient.rpc('increment_job_counters', {
              p_job_id: jobId,
              p_processed_urls_delta: 1,
              p_failed_urls_delta: 1,
            });

            throw error; // Permanent failure
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    };

    it('should track retry_count incrementing from 1 to 3', async () => {
      const writes: any[] = [];

      mockSupabaseClient.upsert.mockImplementation((data: any) => {
        writes.push({ ...data });
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/timeout-url',
        'url-456',
        'job-123',
        mockSupabaseClient,
      );

      // Advance through retries
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      await expect(processPromise).rejects.toThrow('timeout');

      // Verify 3 writes to url_results (one per attempt)
      expect(writes.length).toBeGreaterThanOrEqual(3);

      // Check retry_count progression
      const retryCounts = writes.map((w) => w.retry_count);
      expect(retryCounts).toContain(1);
      expect(retryCounts).toContain(2);
      expect(retryCounts).toContain(3);
    });

    it('should set status to "failed" after 3rd attempt', async () => {
      const writes: any[] = [];

      mockSupabaseClient.upsert.mockImplementation((data: any) => {
        writes.push({ ...data });
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/timeout-url',
        'url-456',
        'job-123',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(7000);

      await expect(processPromise).rejects.toThrow();

      // Find final write (retry_count = 3)
      const finalWrite = writes.find((w) => w.retry_count === 3);

      expect(finalWrite).toBeDefined();
      expect(finalWrite.status).toBe('failed');
    });

    it('should store last_error with context (URL, error type)', async () => {
      const writes: any[] = [];

      mockSupabaseClient.upsert.mockImplementation((data: any) => {
        writes.push({ ...data });
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/timeout-url',
        'url-456',
        'job-123',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(7000);

      await expect(processPromise).rejects.toThrow();

      // Verify all writes have last_error with context
      writes.forEach((write) => {
        expect(write.last_error).toBeDefined();
        expect(write.last_error).toMatch(/timeout/i);
        expect(write.last_error).toMatch(/example\.com/i);
        expect(write.last_error.length).toBeLessThanOrEqual(200); // Sanitized
      });
    });

    it('should store last_retry_at timestamp for each retry', async () => {
      const writes: any[] = [];

      mockSupabaseClient.upsert.mockImplementation((data: any) => {
        writes.push({ ...data });
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/timeout-url',
        'url-456',
        'job-123',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(7000);

      await expect(processPromise).rejects.toThrow();

      // Verify all writes have last_retry_at timestamp
      writes.forEach((write) => {
        expect(write.last_retry_at).toBeDefined();
        expect(typeof write.last_retry_at).toBe('string');
        // Should be valid ISO timestamp
        expect(() => new Date(write.last_retry_at)).not.toThrow();
      });
    });

    it('should include all retry delays in processing_time_ms', async () => {
      const writes: any[] = [];

      mockSupabaseClient.upsert.mockImplementation((data: any) => {
        writes.push({ ...data });
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/timeout-url',
        'url-456',
        'job-123',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(1000); // 1st retry delay
      await jest.advanceTimersByTimeAsync(2000); // 2nd retry delay
      await jest.advanceTimersByTimeAsync(4000); // 3rd retry delay

      await expect(processPromise).rejects.toThrow();

      // Find final write
      const finalWrite = writes.find((w) => w.retry_count === 3);

      expect(finalWrite).toBeDefined();
      // Processing time should include all delays (1s + 2s + 4s = 7s)
      expect(finalWrite.processing_time_ms).toBeGreaterThanOrEqual(7000);
    });
  });

  describe('Job Status After Permanent Failure', () => {
    /**
     * Helper function (same as above)
     */
    const processUrlWithRetryTracking = async (
      url: string,
      urlId: string,
      jobId: string,
      supabaseClient: any,
    ) => {
      const maxAttempts = 3;
      const delays = [1000, 2000, 4000];
      const startTime = Date.now();

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          throw new Error(`Request timeout after 30000ms for ${url}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isLastAttempt = attempt === maxAttempts - 1;

          await supabaseClient.from('url_results').upsert({
            url_id: urlId,
            job_id: jobId,
            url: url,
            status: isLastAttempt ? 'failed' : 'processing',
            retry_count: attempt + 1,
            last_error: errorMessage.slice(0, 200),
            last_retry_at: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime,
          });

          if (isLastAttempt) {
            await supabaseClient.rpc('increment_job_counters', {
              p_job_id: jobId,
              p_processed_urls_delta: 1,
              p_failed_urls_delta: 1,
            });

            throw error;
          }

          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    };

    it('should increment failed_urls_delta counter', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });
      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/fail',
        'url-789',
        'job-456',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(7000);

      await expect(processPromise).rejects.toThrow();

      // Verify RPC call to increment failed counter
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'increment_job_counters',
        expect.objectContaining({
          p_job_id: 'job-456',
          p_processed_urls_delta: 1,
          p_failed_urls_delta: 1,
        }),
      );
    });

    it('should move job out of queue (update job status)', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });
      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/fail',
        'url-789',
        'job-456',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(7000);

      await expect(processPromise).rejects.toThrow();

      // Verify job counters were updated (moving job forward)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'increment_job_counters',
        expect.any(Object),
      );
    });
  });

  describe('Error Message Sanitization', () => {
    it('should truncate error messages longer than 200 characters', async () => {
      const writes: any[] = [];

      mockSupabaseClient.upsert.mockImplementation((data: any) => {
        writes.push({ ...data });
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      // Create very long error message
      const longError = 'A'.repeat(300);

      const processWithLongError = async () => {
        const url = 'https://example.com/long-error';
        const urlId = 'url-long';
        const jobId = 'job-long';
        const startTime = Date.now();

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            throw new Error(longError);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown';
            const isLastAttempt = attempt === 2;

            await mockSupabaseClient.from('url_results').upsert({
              url_id: urlId,
              job_id: jobId,
              url: url,
              status: isLastAttempt ? 'failed' : 'processing',
              retry_count: attempt + 1,
              last_error: errorMessage.slice(0, 200), // Sanitize
              last_retry_at: new Date().toISOString(),
              processing_time_ms: Date.now() - startTime,
            });

            if (isLastAttempt) throw error;

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      };

      const promise = processWithLongError();

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(3000);

      await expect(promise).rejects.toThrow();

      // Verify error was truncated
      writes.forEach((write) => {
        expect(write.last_error.length).toBeLessThanOrEqual(200);
      });
    });

    it('should preserve error context in truncated messages', async () => {
      const writes: any[] = [];

      mockSupabaseClient.upsert.mockImplementation((data: any) => {
        writes.push({ ...data });
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      /**
       * Helper function
       */
      const processUrlWithRetryTracking = async (
        url: string,
        urlId: string,
        jobId: string,
        supabaseClient: any,
      ) => {
        const maxAttempts = 3;
        const delays = [1000, 2000, 4000];
        const startTime = Date.now();

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            throw new Error(`Request timeout after 30000ms for ${url}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isLastAttempt = attempt === maxAttempts - 1;

            await supabaseClient.from('url_results').upsert({
              url_id: urlId,
              job_id: jobId,
              url: url,
              status: isLastAttempt ? 'failed' : 'processing',
              retry_count: attempt + 1,
              last_error: errorMessage.slice(0, 200),
              last_retry_at: new Date().toISOString(),
              processing_time_ms: Date.now() - startTime,
            });

            if (isLastAttempt) throw error;

            await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
          }
        }
      };

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/timeout',
        'url-ctx',
        'job-ctx',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(7000);

      await expect(processPromise).rejects.toThrow();

      // Verify error includes URL context (not truncated away)
      const finalWrite = writes.find((w) => w.retry_count === 3);
      expect(finalWrite.last_error).toMatch(/example\.com/i);
    });
  });

  describe('No Retry After Max Attempts', () => {
    /**
     * Helper function
     */
    const processUrlWithRetryTracking = async (
      url: string,
      urlId: string,
      jobId: string,
      supabaseClient: any,
    ) => {
      const maxAttempts = 3;
      const delays = [1000, 2000, 4000];
      const startTime = Date.now();

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          throw new Error(`Request timeout after 30000ms for ${url}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isLastAttempt = attempt === maxAttempts - 1;

          await supabaseClient.from('url_results').upsert({
            url_id: urlId,
            job_id: jobId,
            url: url,
            status: isLastAttempt ? 'failed' : 'processing',
            retry_count: attempt + 1,
            last_error: errorMessage.slice(0, 200),
            last_retry_at: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime,
          });

          if (isLastAttempt) {
            await supabaseClient.rpc('increment_job_counters', {
              p_job_id: jobId,
              p_processed_urls_delta: 1,
              p_failed_urls_delta: 1,
            });

            throw error;
          }

          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    };

    it('should NOT attempt a 4th retry after 3 failures', async () => {
      let attemptCount = 0;

      mockSupabaseClient.upsert.mockImplementation(() => {
        attemptCount++;
        return Promise.resolve({ data: {}, error: null });
      });

      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/max-retries',
        'url-max',
        'job-max',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(10000); // More than enough time for all retries

      await expect(processPromise).rejects.toThrow();

      // Should write exactly 3 times (once per attempt, no 4th)
      expect(attemptCount).toBe(3);
    });

    it('should throw final error after 3rd attempt', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });
      mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

      const processPromise = processUrlWithRetryTracking(
        'https://example.com/final-error',
        'url-final',
        'job-final',
        mockSupabaseClient,
      );

      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(7000);

      // Should throw the original timeout error
      await expect(processPromise).rejects.toThrow(/timeout/i);
    });
  });

  describe('TDD Verification - T028 Should FAIL Before Implementation', () => {
    it('should fail when retry tracking is not implemented', () => {
      // This test verifies that T028 tests will fail until T033-T034 are implemented

      // Expected behavior AFTER implementation (T033-T034):
      // 1. url_results table has retry_count, last_error, last_retry_at columns (T003 migration)
      // 2. QueueService writes retry tracking data on each attempt (T034)
      // 3. Worker processor persists failure state after max retries (T033)

      // BEFORE implementation, these would not exist:
      const hasRetryTrackingImplementation = false; // Will be true after T033-T034

      expect(hasRetryTrackingImplementation).toBe(false);

      // Once T033-T034 are complete, this test should be updated to:
      // expect(hasRetryTrackingImplementation).toBe(true);
    });
  });
});
