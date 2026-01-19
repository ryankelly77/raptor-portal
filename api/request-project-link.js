// Public API endpoint for "Text me a link" feature
// Rate limited, hardcoded message template - no admin auth required

const { validatePhone, isValidUrl, isNonEmptyString } = require('./lib/validate');

// Rate limiting (same approach as admin-auth)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 3; // 3 SMS requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (rateLimitStore.size > 1000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  }

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  record.count++;
  if (record.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}

module.exports = async function handler(req, res) {
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
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: rateLimit.retryAfter
    });
  }

  // 3. Environment validation
  const HIGHLEVEL_API_KEY = process.env.HIGHLEVEL_API_KEY;
  const HIGHLEVEL_LOCATION_ID = process.env.HIGHLEVEL_LOCATION_ID;

  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    console.error('HighLevel credentials not configured');
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  // 4. Input validation
  const { phone, projectUrl } = req.body || {};

  if (!isNonEmptyString(phone)) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!isNonEmptyString(projectUrl)) {
    return res.status(400).json({ error: 'Project URL is required' });
  }

  const formattedPhone = validatePhone(phone);
  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  // Validate URL is from our domain (security check)
  if (!isValidUrl(projectUrl)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const url = new URL(projectUrl);
    const allowedHosts = ['portal.raptor-vending.com', 'localhost'];
    if (!allowedHosts.some(host => url.hostname.includes(host))) {
      return res.status(400).json({ error: 'Invalid project URL' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const digits = phone.replace(/\D/g, '');
  const headers = {
    'Authorization': `Bearer ${HIGHLEVEL_API_KEY}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28'
  };

  try {
    let contactId;

    // Try to find existing contact
    const phoneFormats = [formattedPhone, digits, `1${digits}`];

    for (const phoneFormat of phoneFormats) {
      const lookupResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/lookup?locationId=${HIGHLEVEL_LOCATION_ID}&phone=${encodeURIComponent(phoneFormat)}`,
        { headers }
      );

      if (lookupResponse.ok) {
        const lookupResult = await lookupResponse.json();
        if (lookupResult.contact?.id) {
          contactId = lookupResult.contact.id;
          break;
        }
      }
    }

    // Create contact if not found
    if (!contactId) {
      const createResponse = await fetch(
        'https://services.leadconnectorhq.com/contacts/',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone: formattedPhone,
            locationId: HIGHLEVEL_LOCATION_ID,
            name: 'Portal Visitor'
          })
        }
      );
      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        console.error('Create contact error:', createResult);
        throw new Error('Failed to create contact');
      }
      contactId = createResult.contact?.id;
    }

    if (!contactId) {
      throw new Error('Could not find or create contact');
    }

    // Send SMS with hardcoded template
    const message = `View your Raptor Vending installation progress on your phone: ${projectUrl}`;

    const smsResponse = await fetch(
      'https://services.leadconnectorhq.com/conversations/messages',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'SMS',
          contactId: contactId,
          message: message
        })
      }
    );

    const smsResult = await smsResponse.json();

    if (!smsResponse.ok) {
      console.error('SMS error:', smsResult);
      throw new Error('Failed to send SMS');
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Request project link error:', error.message);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
};
