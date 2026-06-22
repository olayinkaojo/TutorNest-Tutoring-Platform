// All times in Knowledge Fons Academy are West Africa Time (WAT) = GMT+1

export const WAT_TIMEZONE = 'Africa/Lagos';
export const WAT_OFFSET   = '+01:00';
export const WAT_LABEL    = 'WAT';

/**
 * Parse a booking date + time string as WAT.
 * Prevents JavaScript from treating naive strings as UTC or browser-local.
 * e.g. parseWAT("2026-04-25", "14:00") → Date object = 2 PM WAT
 */
export function parseWAT(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time; // ensure HH:MM:SS
  return new Date(`${date}T${t}${WAT_OFFSET}`);
}

/**
 * Parse a date-only string as noon WAT (avoids off-by-one-day from UTC conversion).
 * e.g. parseDateWAT("2026-04-25") → Date at 12:00 WAT
 */
export function parseDateWAT(date: string): Date {
  return new Date(`${date}T12:00:00${WAT_OFFSET}`);
}

/**
 * Current time (always correct regardless of browser timezone).
 */
export const nowWAT = (): Date => new Date();

/**
 * Format a Date for display in WAT.
 */
export function formatDateWAT(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }
): string {
  const d = typeof date === 'string' ? parseDateWAT(date) : date;
  return d.toLocaleDateString('en-GB', { timeZone: WAT_TIMEZONE, ...options });
}

/**
 * Format a time for display in WAT, appending the WAT label.
 * e.g. formatTimeWAT(date) → "14:00 WAT"
 */
export function formatTimeWAT(date: Date): string {
  const t = date.toLocaleTimeString('en-GB', {
    timeZone: WAT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${t} ${WAT_LABEL}`;
}

/**
 * Format a raw HH:MM string for display, appending WAT label.
 * e.g. formatRawTimeWAT("14:00") → "14:00 WAT"
 */
export function formatRawTimeWAT(time: string): string {
  return `${time} ${WAT_LABEL}`;
}

/**
 * Is a WAT-parsed booking date today in WAT?
 */
export function isTodayWAT(dateStr: string): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: WAT_TIMEZONE }); // YYYY-MM-DD
  return dateStr === today;
}

/**
 * Is a WAT-parsed booking date tomorrow in WAT?
 */
export function isTomorrowWAT(dateStr: string): boolean {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomorrow = d.toLocaleDateString('en-CA', { timeZone: WAT_TIMEZONE });
  return dateStr === tomorrow;
}

/**
 * Human-readable date label for a booking ("Today", "Tomorrow", "Mon 25 Apr").
 */
export function bookingDateLabel(dateStr: string): string {
  if (isTodayWAT(dateStr)) return 'Today';
  if (isTomorrowWAT(dateStr)) return 'Tomorrow';
  return formatDateWAT(parseDateWAT(dateStr), { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * How long until a booking starts, as a human string.
 */
export function timeUntilWAT(dateStr: string, startTime: string): string {
  const booking = parseWAT(dateStr, startTime);
  const hours = (booking.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hours < 1) {
    const mins = Math.max(0, Math.floor(hours * 60));
    return `in ${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    return `in ${h} hour${h !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Today's date string in WAT (YYYY-MM-DD), for disabling past dates in calendars.
 */
export function todayStringWAT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: WAT_TIMEZONE });
}
