// JWT authentication utilities using jsonwebtoken library
// Force rebuild: 2026-01-18

const jwt = require('jsonwebtoken');

const JWT_EXPIRATION = '8h'; // Token expires in 8 hours

/**
 * Get the JWT secret
 * @returns {string}
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  return secret;
}

/**
 * Create a signed JWT for admin authentication
 * @param {Object} payload - Data to include in the token
 * @returns {string} - Signed JWT
 */
function createAdminToken(payload = {}) {
  const secret = getJwtSecret();

  const token = jwt.sign(
    {
      ...payload,
      role: 'admin'
    },
    secret,
    {
      expiresIn: JWT_EXPIRATION,
      issuer: 'raptor-portal',
      audience: 'raptor-admin'
    }
  );

  return token;
}

/**
 * Verify a JWT and return the payload
 * @param {string} token - JWT to verify
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
function verifyAdminToken(token) {
  const secret = getJwtSecret();

  const payload = jwt.verify(token, secret, {
    issuer: 'raptor-portal',
    audience: 'raptor-admin'
  });

  if (payload.role !== 'admin') {
    throw new Error('Invalid token role');
  }

  return payload;
}

/**
 * Extract JWT from Authorization header
 * @param {Object} req - Request object
 * @returns {string|null} - JWT or null if not found
 */
function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Also support raw token
  return authHeader;
}

/**
 * Middleware to require admin authentication
 * Returns { authenticated: true, payload } or { authenticated: false, error, status }
 * @param {Object} req - Request object
 * @returns {Object}
 */
function requireAdmin(req) {
  // Check if JWT_SECRET is configured
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return {
      authenticated: false,
      error: 'Authentication service not configured',
      status: 500
    };
  }

  const token = extractToken(req);

  if (!token) {
    return {
      authenticated: false,
      error: 'Authorization header required',
      status: 401
    };
  }

  try {
    const payload = verifyAdminToken(token);
    return {
      authenticated: true,
      payload
    };
  } catch (err) {
    // Differentiate between expired and invalid tokens
    if (err.name === 'TokenExpiredError') {
      return {
        authenticated: false,
        error: 'Token expired. Please log in again.',
        status: 401
      };
    }

    console.error('Token verification failed:', err.message);
    return {
      authenticated: false,
      error: 'Invalid token',
      status: 401
    };
  }
}

module.exports = {
  createAdminToken,
  verifyAdminToken,
  extractToken,
  requireAdmin
};
