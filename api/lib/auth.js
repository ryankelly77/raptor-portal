// JWT authentication utilities using jose library

import { SignJWT, jwtVerify } from 'jose';

const JWT_EXPIRATION = '8h'; // Token expires in 8 hours

/**
 * Get the JWT secret as a Uint8Array (required by jose)
 * @returns {Uint8Array}
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  // jose requires the secret as Uint8Array
  return new TextEncoder().encode(secret);
}

/**
 * Create a signed JWT for admin authentication
 * @param {Object} payload - Data to include in the token
 * @returns {Promise<string>} - Signed JWT
 */
export async function createAdminToken(payload = {}) {
  const secret = getJwtSecret();

  const token = await new SignJWT({
    ...payload,
    role: 'admin'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .setIssuer('raptor-portal')
    .setAudience('raptor-admin')
    .sign(secret);

  return token;
}

/**
 * Verify a JWT and return the payload
 * @param {string} token - JWT to verify
 * @returns {Promise<Object>} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
export async function verifyAdminToken(token) {
  const secret = getJwtSecret();

  const { payload } = await jwtVerify(token, secret, {
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
export function extractToken(req) {
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
 * @returns {Promise<Object>}
 */
export async function requireAdmin(req) {
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
    const payload = await verifyAdminToken(token);
    return {
      authenticated: true,
      payload
    };
  } catch (err) {
    // Differentiate between expired and invalid tokens
    if (err.code === 'ERR_JWT_EXPIRED') {
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
