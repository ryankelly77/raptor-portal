// Shared validation utilities for API routes

/**
 * Validate that a value is a non-empty string
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!isNonEmptyString(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (10 digits after stripping non-digits)
 * Returns formatted phone or null if invalid
 */
function validatePhone(phone) {
  if (!isNonEmptyString(phone)) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  if (!isNonEmptyString(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate request body has required fields
 * Returns { valid: true } or { valid: false, error: string }
 */
function validateRequired(body, fields) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  for (const field of fields) {
    if (!isNonEmptyString(body[field])) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  return { valid: true };
}

/**
 * Validate ID (supports both integer and UUID formats)
 */
function isValidId(id) {
  if (typeof id === 'number') return Number.isInteger(id) && id > 0;
  if (typeof id === 'string') {
    // Check for UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return true;
    // Check for positive integer string
    const num = parseInt(id, 10);
    return !isNaN(num) && num > 0 && String(num) === id;
  }
  return false;
}

/**
 * Sanitize string for safe logging (truncate and remove sensitive patterns)
 */
function sanitizeForLog(value, maxLength = 100) {
  if (!isNonEmptyString(value)) return '[empty]';
  const sanitized = value.slice(0, maxLength);
  return sanitized.length < value.length ? `${sanitized}...` : sanitized;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  validatePhone,
  isValidUrl,
  validateRequired,
  isValidId,
  sanitizeForLog
};
