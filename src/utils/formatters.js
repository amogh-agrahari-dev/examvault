/**
 * Formatting utilities for ExamVault
 */

/**
 * Format raw byte size into human-readable representation.
 * Handles null, undefined, 0, and non-numeric values safely.
 *
 * @param {number|string|null|undefined} bytes
 * @returns {string} e.g. "1.2 MB", "450 KB", or "Document" if unknown.
 */
export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(Number(bytes)) || Number(bytes) <= 0) {
    return "Document";
  }
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(0)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Safely format an ISO timestamp into localized date.
 *
 * @param {string|Date|null|undefined} timestamp
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(timestamp, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!timestamp) return "Recently";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString(undefined, options);
  } catch {
    return "Recently";
  }
}

/**
 * Format duration in seconds to mm:ss or human-readable format.
 *
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
