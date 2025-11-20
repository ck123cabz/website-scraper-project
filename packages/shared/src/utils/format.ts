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

/**
 * Formats a timestamp to a human-readable date and time format
 * @param timestamp - ISO 8601 timestamp string or Date object
 * @param options - Formatting options
 * @returns Formatted string (e.g., "Nov 20, 2025, 2:30:45 PM")
 * @example
 * formatTimestamp("2025-10-14T16:30:45.123Z") // "Oct 14, 2025, 4:30:45 PM"
 * formatTimestamp("2025-10-14T09:05:02.000Z") // "Oct 14, 2025, 9:05:02 AM"
 */
export function formatTimestamp(
  timestamp: string | Date,
  options?: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    // Check if date is valid
    if (!Number.isFinite(date.getTime())) {
      return "Invalid date";
    }

    // Default to medium date and time style
    const dateStyle = options?.dateStyle || 'medium';
    const timeStyle = options?.timeStyle || 'medium';

    return new Intl.DateTimeFormat('en-US', {
      dateStyle,
      timeStyle,
    }).format(date);
  } catch (error) {
    return "Invalid date";
  }
}

/**
 * Formats a timestamp to just the time portion (HH:MM:SS format)
 * @param timestamp - ISO 8601 timestamp string or Date object
 * @returns Formatted string in HH:MM:SS format
 * @example
 * formatTime("2025-10-14T16:30:45.123Z") // "16:30:45"
 * formatTime("2025-10-14T09:05:02.000Z") // "09:05:02"
 */
export function formatTime(timestamp: string | Date): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    // Check if date is valid
    if (!Number.isFinite(date.getTime())) {
      return "00:00:00";
    }

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return "00:00:00";
  }
}

/**
 * Formats a currency amount in USD with appropriate precision
 * @param amount - Amount to format (can be null/undefined)
 * @param precision - Number of decimal places (default: auto-detect based on amount)
 * @returns Formatted string in USD format
 * @example
 * formatCurrency(10.50) // "$10.50"
 * formatCurrency(0.00045, 5) // "$0.00045"
 * formatCurrency(123.456) // "$123.46"
 * formatCurrency(null) // "$0.00"
 * formatCurrency(0) // "$0.00"
 */
export function formatCurrency(amount: number | null | undefined, precision?: number): string {
  // Handle null, undefined, or non-finite values
  if (amount == null || !Number.isFinite(amount)) {
    return "$0.00";
  }

  // Handle negative amounts
  if (amount < 0) {
    return "-" + formatCurrency(Math.abs(amount), precision);
  }

  // Auto-detect precision if not provided
  if (precision === undefined) {
    // Use high precision for micro-costs (< $0.01)
    if (amount > 0 && amount < 0.01) {
      precision = 5;
    } else {
      precision = 2;
    }
  }

  // Format with fixed precision
  const formatted = amount.toFixed(precision);

  // Add thousands separators for the integer part
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return '$' + parts.join('.');
}
