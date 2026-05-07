/**
 * Simple validation helpers for the booking system.
 */

// Check if a string is a valid ISO datetime (good enough for our purposes)
function isValidDatetime(str) {
  if (!str || typeof str !== 'string') return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

// Check if a date string is valid (YYYY-MM-DD format)
function isValidDate(str) {
  if (!str || typeof str !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

module.exports = { isValidDatetime, isValidDate };
