// Vercel Serverless Function for admin authentication
// Validates admin password server-side to prevent client-side bypass

const crypto = require('crypto');
const { isNonEmptyString } = require('./lib/validate');
const { createAdminToken } = require('./lib/auth');

// ============================================
// RATE LIMITING
// In-memory store - resets on cold start but provides protection within instance lifecycle
// For production-grade rate limiting, consider Upstash Redis or Vercel KV
// ============================================
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_ATTEMPTS = 5; // 5 attempts per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  // Cleanup old entries (simple garbage collection)
  if (rateLimitStore.size > 1000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  }

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  record.count++;
  if (record.count > MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

module.exports = async (req, res) => {
  // 1. Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.socket?.remoteAddress ||
                   'unknown';

  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter);
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: rateLimit.retryAfter
    });
  }
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));

  // 3. Environment validation
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!ADMIN_PASSWORD || !JWT_SECRET) {
    console.error('ADMIN_PASSWORD or JWT_SECRET not configured');
    return res.status(500).json({ error: 'Service not configured' });
  }

  // 4. Input validation
  const { password } = req.body || {};
  if (!isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Prevent overly long passwords (DoS protection)
  if (password.length > 256) {
    return res.status(400).json({ error: 'Invalid password' });
  }

  // Constant-time comparison to prevent timing attacks
  const passwordBuffer = Buffer.from(password);
  const adminPasswordBuffer = Buffer.from(ADMIN_PASSWORD);

  const isValidPassword = passwordBuffer.length === adminPasswordBuffer.length &&
    crypto.timingSafeEqual(passwordBuffer, adminPasswordBuffer);

  if (isValidPassword) {
    try {
      // Generate JWT with 8-hour expiration
      const token = createAdminToken({
        authenticatedAt: Date.now()
      });

      return res.status(200).json({
        success: true,
        token,
        expiresIn: '8h'
      });
    } catch (err) {
      console.error('Token generation error:', err.message);
      return res.status(500).json({ error: 'Failed to generate token' });
    }
  }

  // Invalid password - don't reveal whether password exists
  return res.status(401).json({ error: 'Invalid credentials' });
};
