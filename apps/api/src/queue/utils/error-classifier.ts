/**
 * Error Classification Helper
 *
 * Classifies errors as transient (should retry) or permanent (should not retry).
 *
 * TRANSIENT ERRORS (return true):
 * - Timeout errors (ETIMEDOUT, timeout, timed out)
 * - Connection errors (ECONNRESET, ECONNABORTED, ENOTFOUND)
 * - Network errors (ENETUNREACH, EHOSTUNREACH)
 * - HTTP 429 (Rate Limit)
 * - HTTP 503 (Service Unavailable)
 * - HTTP 504 (Gateway Timeout)
 * - DNS errors (ENOTFOUND, ENAMERES)
 *
 * PERMANENT ERRORS (return false):
 * - HTTP 400 (Bad Request)
 * - HTTP 401 (Unauthorized)
 * - HTTP 403 (Forbidden)
 * - HTTP 405 (Method Not Allowed)
 * - HTTP 406 (Not Acceptable)
 * - HTTP 408 (Request Timeout) - treated as permanent
 * - HTTP 4xx (any other 4xx validation errors)
 * - Parsing errors (JSON, XML)
 * - Invalid URL format
 * - Certificate validation errors
 * - CORS errors
 * - Unknown/unexpected errors (fail-safe)
 */

/**
 * Determines if an error is transient and should be retried.
 *
 * @param error - The error to classify (Error object, string, or unknown)
 * @returns true if the error is transient (should retry), false if permanent (should not retry)
 *
 * @example
 * ```typescript
 * // Transient errors (will retry)
 * isTransientError(new Error('ETIMEDOUT')) // true
 * isTransientError(new Error('Request timeout')) // true
 * isTransientError({ code: 'ECONNRESET' }) // true
 * isTransientError('HTTP 429: Rate limit exceeded') // true
 * isTransientError('HTTP 503: Service Unavailable') // true
 *
 * // Permanent errors (will NOT retry)
 * isTransientError(new Error('HTTP 401: Unauthorized')) // false
 * isTransientError(new Error('HTTP 400: Bad Request')) // false
 * isTransientError(new Error('Invalid URL format')) // false
 * isTransientError('Parsing error: invalid JSON') // false
 * isTransientError(new Error('Unknown error')) // false (fail-safe)
 * ```
 */
export function isTransientError(error: Error | string | unknown): boolean {
  // Handle null/undefined
  if (!error) {
    return false; // Unknown errors are permanent (fail-safe)
  }

  // Extract error message and code
  let errorMessage = '';
  let errorCode: string | undefined;
  let statusCode: number | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    // Check for error.code property (e.g., Error with code property)
    errorCode = (error as any).code;
    // Check for HTTP status code in various formats
    statusCode = (error as any).status || (error as any).statusCode;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (typeof error === 'object') {
    // Handle axios/fetch error responses
    const errObj = error as any;
    errorMessage = errObj.message || errObj.error || JSON.stringify(error);
    errorCode = errObj.code;
    statusCode = errObj.status || errObj.statusCode || errObj.response?.status;
  }

  const message = errorMessage.toLowerCase();

  // === TRANSIENT ERRORS (return true - should retry) ===

  // 1. Check error codes first (most reliable)
  if (errorCode) {
    const code = errorCode.toUpperCase();

    // Timeout error codes
    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
      return true;
    }

    // Connection error codes
    if (
      code === 'ECONNRESET' ||
      code === 'ECONNABORTED' ||
      code === 'ENOTFOUND' ||
      code === 'ENETUNREACH' ||
      code === 'EHOSTUNREACH' ||
      code === 'EAI_AGAIN'
    ) {
      return true;
    }

    // DNS error codes
    if (code === 'ENAMERES' || code === 'ENODATA') {
      return true;
    }
  }

  // 2. Check HTTP status codes
  if (statusCode !== undefined) {
    // Transient HTTP errors
    if (statusCode === 429 || statusCode === 503 || statusCode === 504) {
      return true;
    }

    // Permanent 4xx errors (except 408, 429 which are transient)
    if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
      return false;
    }
  }

  // 3. Check error message content

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('timeout reached') ||
    message.includes('etimedout')
  ) {
    return true;
  }

  // Connection errors
  if (
    message.includes('econnreset') ||
    message.includes('econnaborted') ||
    message.includes('enotfound') ||
    message.includes('connection reset') ||
    message.includes('connection aborted') ||
    message.includes('connection refused')
  ) {
    return true;
  }

  // Network errors
  if (
    message.includes('enetunreach') ||
    message.includes('ehostunreach') ||
    message.includes('network unreachable') ||
    message.includes('host unreachable')
  ) {
    return true;
  }

  // DNS errors
  if (
    message.includes('enameres') ||
    message.includes('dns') ||
    message.includes('getaddrinfo')
  ) {
    return true;
  }

  // HTTP 429 Rate Limit
  if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
    return true;
  }

  // HTTP 503 Service Unavailable
  if (message.includes('503') || message.includes('service unavailable')) {
    return true;
  }

  // HTTP 504 Gateway Timeout
  if (message.includes('504') || message.includes('gateway timeout')) {
    return true;
  }

  // === PERMANENT ERRORS (return false - should NOT retry) ===

  // HTTP 400 Bad Request
  if (message.includes('400') || message.includes('bad request')) {
    return false;
  }

  // HTTP 401 Unauthorized
  if (message.includes('401') || message.includes('unauthorized')) {
    return false;
  }

  // HTTP 403 Forbidden
  if (message.includes('403') || message.includes('forbidden')) {
    return false;
  }

  // HTTP 405 Method Not Allowed
  if (message.includes('405') || message.includes('method not allowed')) {
    return false;
  }

  // HTTP 406 Not Acceptable
  if (message.includes('406') || message.includes('not acceptable')) {
    return false;
  }

  // HTTP 408 Request Timeout (treated as permanent per spec)
  if (message.includes('408') || message.includes('request timeout')) {
    return false;
  }

  // Other 4xx errors (validation errors)
  if (
    message.includes('4') &&
    (message.includes('client error') ||
      message.includes('validation') ||
      message.includes('invalid'))
  ) {
    return false;
  }

  // Parsing errors
  if (
    message.includes('parse error') ||
    message.includes('parsing failed') ||
    message.includes('invalid json') ||
    message.includes('invalid xml') ||
    message.includes('syntax error')
  ) {
    return false;
  }

  // Invalid URL format
  if (
    message.includes('invalid url') ||
    message.includes('malformed url') ||
    message.includes('url format')
  ) {
    return false;
  }

  // Certificate validation errors
  if (
    message.includes('certificate') ||
    message.includes('cert') ||
    message.includes('ssl') ||
    message.includes('tls')
  ) {
    return false;
  }

  // CORS errors
  if (message.includes('cors') || message.includes('cross-origin')) {
    return false;
  }

  // === FAIL-SAFE: Unknown errors are treated as PERMANENT ===
  // This prevents infinite retry loops on unexpected errors
  return false;
}
