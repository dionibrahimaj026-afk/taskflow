/**
 * Safely parse a date value. Returns null if invalid.
 * Handles MongoDB Extended JSON { $date: "..." } and various string formats.
 */
export function parseDate(val) {
  if (val == null || val === '') return null;
  let dateVal = val;
  if (typeof val === 'object' && val.$date) {
    dateVal = val.$date;
  }
  try {
    const d = new Date(dateVal);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export function toDateTimeLocal(val) {
  try {
    const d = parseDate(val);
    return d ? d.toISOString().slice(0, 16) : '';
  } catch {
    return '';
  }
}

/**
 * Format date for display
 */
export function formatDate(val, options = { dateStyle: 'short', timeStyle: 'short' }) {
  try {
    const d = parseDate(val);
    return d ? d.toLocaleString(undefined, options) : '';
  } catch {
    return '';
  }
}
