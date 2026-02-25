/**
 * Date utilities for consistent timezone handling across the app.
 *
 * Philosophy: For a personal expense tracking app, dates should reflect
 * the user's local perception of time. When a user says "I spent $50 today",
 * we store that as today's date in their local timezone, not UTC.
 */

/**
 * Format a Date object as YYYY-MM-DD string in local timezone.
 * Avoids UTC conversion issues that occur with toISOString().
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the start and end dates for a given month in YYYY-MM-DD format.
 * Useful for date range queries.
 */
export function getMonthDateRange(date: Date = new Date()): { startDate: string; endDate: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate(); // Gets last day of month
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate };
}

/**
 * Get the user's timezone identifier (e.g., "Asia/Hong_Kong", "America/New_York").
 * Can be used for analytics or stored in user profile.
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Parse a date string (YYYY-MM-DD) into a Date object.
 * Sets time to noon to avoid timezone edge cases.
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Check if a date string falls within a specific month/year.
 */
export function isInMonth(dateString: string, month: number, year: number): boolean {
  const date = parseLocalDate(dateString);
  return date.getMonth() === month && date.getFullYear() === year;
}

/**
 * Get month name from month index (0-11).
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month];
}

/**
 * Format a date for display (e.g., "Jan 31" or "Today").
 */
export function formatDateForDisplay(dateString: string): string {
  const date = parseLocalDate(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatLocalDate(date) === formatLocalDate(today)) {
    return 'Today';
  } else if (formatLocalDate(date) === formatLocalDate(yesterday)) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
