/**
 * Format utilities for displaying job metrics and progress information
 */

/**
 * Formats a duration in seconds to HH:MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted string in HH:MM:SS format
 * @example
 * formatDuration(3661) // "01:01:01"
 * formatDuration(45) // "00:00:45"
 * formatDuration(0) // "00:00:00"
 */
export function formatDuration(seconds: number): string {
  // Handle negative numbers and non-finite values
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [hours, minutes, secs]
    .map(val => val.toString().padStart(2, '0'))
    .join(':');
}

/**
 * Formats a number with comma separators for readability
 * @param num - Number to format
 * @returns Formatted string with comma separators
 * @example
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(42) // "42"
 * formatNumber(0) // "0"
 */
export function formatNumber(num: number): string {
  // Handle non-finite values
  if (!Number.isFinite(num)) {
    return "0";
  }

  // Round to nearest integer and format with commas
  return Math.floor(num).toLocaleString('en-US');
}

/**
 * Calculates processing rate in URLs per minute
 * @param processed - Number of URLs processed
 * @param elapsedSeconds - Time elapsed in seconds
 * @returns Processing rate in URLs/min
 * @example
 * calculateProcessingRate(120, 60) // 120.0 (120 URLs in 60 seconds = 120/min)
 * calculateProcessingRate(50, 30) // 100.0 (50 URLs in 30 seconds = 100/min)
 * calculateProcessingRate(0, 0) // 0.0
 */
export function calculateProcessingRate(processed: number, elapsedSeconds: number): number {
  // Handle edge cases
  if (!Number.isFinite(processed) || !Number.isFinite(elapsedSeconds) ||
      processed <= 0 || elapsedSeconds <= 0) {
    return 0;
  }

  // Convert to URLs per minute
  const rate = (processed / elapsedSeconds) * 60;

  // Round to 1 decimal place
  return Math.round(rate * 10) / 10;
}
