/**
 * Unit tests for isTransientError() helper function
 *
 * This test suite verifies that the error classifier correctly identifies
 * transient vs permanent errors based on error codes, status codes, and messages.
 */

import { isTransientError } from '../error-classifier';

describe('isTransientError()', () => {
  describe('Transient Errors - Error Codes', () => {
    it('should identify ETIMEDOUT as transient', () => {
      const error = new Error('Request failed');
      (error as any).code = 'ETIMEDOUT';
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ECONNRESET as transient', () => {
      const error = new Error('Connection error');
      (error as any).code = 'ECONNRESET';
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ECONNABORTED as transient', () => {
      const error = new Error('Connection error');
      (error as any).code = 'ECONNABORTED';
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ENOTFOUND as transient', () => {
      const error = new Error('DNS error');
      (error as any).code = 'ENOTFOUND';
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ENETUNREACH as transient', () => {
      const error = new Error('Network error');
      (error as any).code = 'ENETUNREACH';
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify EHOSTUNREACH as transient', () => {
      const error = new Error('Network error');
      (error as any).code = 'EHOSTUNREACH';
      expect(isTransientError(error)).toBe(true);
    });
  });

  describe('Transient Errors - HTTP Status Codes', () => {
    it('should identify HTTP 429 as transient', () => {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify HTTP 503 as transient', () => {
      const error = new Error('Service unavailable');
      (error as any).statusCode = 503;
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify HTTP 504 as transient', () => {
      const error = new Error('Gateway timeout');
      (error as any).status = 504;
      expect(isTransientError(error)).toBe(true);
    });
  });

  describe('Transient Errors - Error Messages', () => {
    it('should identify timeout in message as transient', () => {
      expect(isTransientError('Request timeout after 30000ms')).toBe(true);
      expect(isTransientError(new Error('Connection timeout'))).toBe(true);
      expect(isTransientError(new Error('Request timed out'))).toBe(true);
    });

    it('should identify ETIMEDOUT in message as transient', () => {
      expect(isTransientError('Error: ETIMEDOUT')).toBe(true);
      expect(isTransientError(new Error('Network error: ETIMEDOUT'))).toBe(true);
    });

    it('should identify ECONNRESET in message as transient', () => {
      expect(isTransientError('Error: ECONNRESET')).toBe(true);
      expect(isTransientError(new Error('Connection reset: ECONNRESET'))).toBe(true);
    });

    it('should identify 429 in message as transient', () => {
      expect(isTransientError('HTTP 429: Too Many Requests')).toBe(true);
      expect(isTransientError(new Error('Rate limit exceeded (429)'))).toBe(true);
    });

    it('should identify 503 in message as transient', () => {
      expect(isTransientError('HTTP 503: Service Unavailable')).toBe(true);
      expect(isTransientError(new Error('Service unavailable, try again later'))).toBe(true);
    });

    it('should identify 504 in message as transient', () => {
      expect(isTransientError('HTTP 504: Gateway Timeout')).toBe(true);
      expect(isTransientError(new Error('Gateway timeout occurred'))).toBe(true);
    });
  });

  describe('Permanent Errors - HTTP Status Codes', () => {
    it('should identify HTTP 400 as permanent', () => {
      const error = new Error('Bad request');
      (error as any).status = 400;
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify HTTP 401 as permanent', () => {
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify HTTP 403 as permanent', () => {
      const error = new Error('Forbidden');
      (error as any).status = 403;
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify HTTP 405 as permanent', () => {
      const error = new Error('Method not allowed');
      (error as any).status = 405;
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify other 4xx as permanent', () => {
      const error = new Error('Client error');
      (error as any).status = 422;
      expect(isTransientError(error)).toBe(false);
    });
  });

  describe('Permanent Errors - Error Messages', () => {
    it('should identify 400 in message as permanent', () => {
      expect(isTransientError('HTTP 400: Bad Request')).toBe(false);
      expect(isTransientError(new Error('Bad request: invalid parameters'))).toBe(false);
    });

    it('should identify 401 in message as permanent', () => {
      expect(isTransientError('HTTP 401: Unauthorized')).toBe(false);
      expect(isTransientError(new Error('Unauthorized access'))).toBe(false);
    });

    it('should identify 403 in message as permanent', () => {
      expect(isTransientError('HTTP 403: Forbidden')).toBe(false);
      expect(isTransientError(new Error('Forbidden resource'))).toBe(false);
    });

    it('should identify validation errors as permanent', () => {
      expect(isTransientError('Invalid input format')).toBe(false);
      expect(isTransientError(new Error('Validation failed: invalid URL'))).toBe(false);
    });

    it('should identify parsing errors as permanent', () => {
      expect(isTransientError('Parse error: invalid JSON')).toBe(false);
      expect(isTransientError(new Error('Parsing failed: invalid XML'))).toBe(false);
    });

    it('should identify invalid URL as permanent', () => {
      expect(isTransientError('Invalid URL format')).toBe(false);
      expect(isTransientError(new Error('Malformed URL'))).toBe(false);
    });

    it('should identify certificate errors as permanent', () => {
      expect(isTransientError('Certificate validation failed')).toBe(false);
      expect(isTransientError(new Error('SSL certificate error'))).toBe(false);
    });

    it('should identify CORS errors as permanent', () => {
      expect(isTransientError('CORS policy blocked request')).toBe(false);
      expect(isTransientError(new Error('Cross-origin request blocked'))).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined as permanent (fail-safe)', () => {
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
    });

    it('should handle unknown errors as permanent (fail-safe)', () => {
      expect(isTransientError(new Error('Unknown error occurred'))).toBe(false);
      expect(isTransientError('Some random error')).toBe(false);
    });

    it('should handle object errors with response property', () => {
      const axiosError = {
        message: 'Request failed',
        response: {
          status: 429,
        },
      };
      expect(isTransientError(axiosError)).toBe(true);
    });

    it('should handle error objects without Error class', () => {
      const plainError = {
        message: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
      };
      expect(isTransientError(plainError)).toBe(true);
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle uppercase error messages', () => {
      expect(isTransientError('REQUEST TIMEOUT')).toBe(true);
      expect(isTransientError('ETIMEDOUT')).toBe(true);
    });

    it('should handle mixed case error messages', () => {
      expect(isTransientError('Request TimeOut')).toBe(true);
      expect(isTransientError('EtimedOut')).toBe(true);
    });
  });

  describe('Complex Error Scenarios', () => {
    it('should prioritize error codes over messages', () => {
      const error = new Error('Bad request'); // message suggests permanent
      (error as any).code = 'ETIMEDOUT'; // but code indicates transient
      expect(isTransientError(error)).toBe(true); // Code takes precedence
    });

    it('should prioritize status codes over messages', () => {
      const error = new Error('Unknown error'); // message suggests permanent
      (error as any).status = 503; // but status indicates transient
      expect(isTransientError(error)).toBe(true); // Status takes precedence
    });

    it('should handle 408 Request Timeout as permanent (per spec)', () => {
      const error = new Error('Request Timeout');
      (error as any).status = 408;
      // 408 is NOT in the transient list (400-499 except 429)
      expect(isTransientError(error)).toBe(false);
    });
  });
});
