/**
 * Performance Monitor Decorator Tests
 * Task T107 [Phase 8 - Polish]
 *
 * Verifies that the @PerfMonitor decorator correctly tracks method execution time
 */

import { Logger } from '@nestjs/common';
import { PerfMonitor } from '../perf-monitor.decorator';

// Mock Logger
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('PerfMonitor Decorator', () => {
  let loggerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerInstance = new Logger('test');
  });

  describe('Async method monitoring', () => {
    class TestService {
      @PerfMonitor({ warn: 100, error: 200 })
      async fastMethod(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'fast';
      }

      @PerfMonitor({ warn: 100, error: 200 })
      async slowMethod(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return 'slow';
      }

      @PerfMonitor({ warn: 100, error: 200 })
      async verySlowMethod(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return 'very-slow';
      }

      @PerfMonitor({ warn: 100, error: 200 })
      async errorMethod(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 50));
        throw new Error('Test error');
      }
    }

    it('should log completion for fast methods', async () => {
      const service = new TestService();
      const result = await service.fastMethod();

      expect(result).toBe('fast');
      // Verify logger.log was called (not warn or error)
      expect(loggerInstance.log).toHaveBeenCalled();
    });

    it('should log warning for slow methods', async () => {
      const service = new TestService();
      const result = await service.slowMethod();

      expect(result).toBe('slow');
      // Verify logger.warn was called
      expect(loggerInstance.warn).toHaveBeenCalled();
    });

    it('should log error for very slow methods', async () => {
      const service = new TestService();
      const result = await service.verySlowMethod();

      expect(result).toBe('very-slow');
      // Verify logger.error was called
      expect(loggerInstance.error).toHaveBeenCalled();
    });

    it('should log error on method failure', async () => {
      const service = new TestService();

      await expect(service.errorMethod()).rejects.toThrow('Test error');
      // Verify logger.error was called for the failure
      expect(loggerInstance.error).toHaveBeenCalled();
    });
  });

  describe('Default thresholds', () => {
    class TestServiceDefaults {
      @PerfMonitor()
      async defaultMethod(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'default';
      }
    }

    it('should use default thresholds (warn: 5000ms, error: 30000ms)', async () => {
      const service = new TestServiceDefaults();
      const result = await service.defaultMethod();

      expect(result).toBe('default');
      // Should log completion (not warn or error) since 10ms < 5000ms
      expect(loggerInstance.log).toHaveBeenCalled();
    });
  });
});
