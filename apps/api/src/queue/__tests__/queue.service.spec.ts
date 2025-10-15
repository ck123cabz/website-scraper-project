import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from '../queue.service';
import { SupabaseService } from '../../supabase/supabase.service';

describe('QueueService', () => {
  let service: QueueService;
  let mockQueue: any;
  let mockSupabase: any;

  beforeEach(async () => {
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
    };

    // Mock Supabase client with full chain support for resumeJob()
    mockSupabase = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('url-processing-queue'),
          useValue: mockQueue,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabase,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  describe('addUrlToQueue', () => {
    it('should add a URL to the queue', async () => {
      const jobData = {
        jobId: 'job-123',
        url: 'https://example.com',
      };

      await service.addUrlToQueue(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith('process-url', jobData, {
        priority: 0,
      });
    });

    it('should use custom priority when provided', async () => {
      const jobData = {
        jobId: 'job-123',
        url: 'https://example.com',
        priority: 10,
      };

      await service.addUrlToQueue(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith('process-url', jobData, {
        priority: 10,
      });
    });
  });

  describe('addUrlsToQueue', () => {
    it('should add multiple URLs in bulk', async () => {
      const jobs = [
        { jobId: 'job-123', url: 'https://example.com/1' },
        { jobId: 'job-123', url: 'https://example.com/2' },
        { jobId: 'job-123', url: 'https://example.com/3' },
      ];

      await service.addUrlsToQueue(jobs);

      expect(mockQueue.addBulk).toHaveBeenCalledWith([
        {
          name: 'process-url',
          data: jobs[0],
          opts: { priority: 0 },
        },
        {
          name: 'process-url',
          data: jobs[1],
          opts: { priority: 0 },
        },
        {
          name: 'process-url',
          data: jobs[2],
          opts: { priority: 0 },
        },
      ]);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(10);
      mockQueue.getFailedCount.mockResolvedValue(1);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 0,
        total: 18,
      });
    });
  });

  describe('pauseQueue', () => {
    it('should pause the queue', async () => {
      await service.pauseQueue();

      expect(mockQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume the queue', async () => {
      await service.resumeQueue();

      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('should drain the queue', async () => {
      await service.clearQueue();

      expect(mockQueue.drain).toHaveBeenCalled();
    });
  });

  describe('pauseJob', () => {
    it('should update job status to paused in database', async () => {
      const jobId = 'job-123';
      await service.pauseJob(jobId);

      expect(mockSupabase.getClient).toHaveBeenCalled();
      const client = mockSupabase.getClient();
      expect(client.from).toHaveBeenCalledWith('jobs');
    });

    it('should throw error if database update fails', async () => {
      mockSupabase.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
          }),
        }),
      });

      await expect(service.pauseJob('job-123')).rejects.toThrow(
        'Failed to pause job: Database error',
      );
    });
  });

  describe('resumeJob', () => {
    it('should update job status to processing in database', async () => {
      const jobId = 'job-123';
      await service.resumeJob(jobId);

      expect(mockSupabase.getClient).toHaveBeenCalled();
      const client = mockSupabase.getClient();
      expect(client.from).toHaveBeenCalledWith('jobs');
    });

    it('should throw error if database update fails', async () => {
      // Mock both the select chain (for unprocessed URLs query) and update chain (for status update)
      const mockFrom = jest.fn();

      // First call to from('results') - for unprocessed URLs query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Second call to from('jobs') - for status update (this one fails)
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
        }),
      });

      mockSupabase.getClient.mockReturnValue({
        from: mockFrom,
      });

      await expect(service.resumeJob('job-123')).rejects.toThrow(
        'Failed to resume job: Database error',
      );
    });
  });
});
