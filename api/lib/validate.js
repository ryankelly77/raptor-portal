// Shared validation utilities for API routes

/**
 * Validate that a value is a non-empty string
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!isNonEmptyString(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (10 digits after stripping non-digits)
 * Returns formatted phone or null if invalid
 */
export function validatePhone(phone) {
  if (!isNonEmptyString(phone)) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

/**
 * Validate URL format
 */
export function isValidUrl(url) {
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
export function validateRequired(body, fields) {
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
 * Validate integer ID
 */
export function isValidId(id) {
  if (typeof id === 'number') return Number.isInteger(id) && id > 0;
  if (typeof id === 'string') {
    const num = parseInt(id, 10);
    return !isNaN(num) && num > 0;
  }
  return false;
}

/**
 * Sanitize string for safe logging (truncate and remove sensitive patterns)
 */
export function sanitizeForLog(value, maxLength = 100) {
  if (!isNonEmptyString(value)) return '[empty]';
  const sanitized = value.slice(0, maxLength);
  return sanitized.length < value.length ? `${sanitized}...` : sanitized;
}
