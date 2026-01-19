// Vercel Serverless Function for sending SMS via HighLevel

import { validatePhone, isValidUrl, isNonEmptyString } from './lib/validate';
import { requireAdmin } from './lib/auth';

export default async function handler(req, res) {
  // 1. Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Admin authentication
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  // 3. Environment validation
  const HIGHLEVEL_API_KEY = process.env.HIGHLEVEL_API_KEY;
  const HIGHLEVEL_LOCATION_ID = process.env.HIGHLEVEL_LOCATION_ID;

  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    console.error('HighLevel credentials not configured');
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  // 4. Input validation
  const { phone, url } = req.body || {};

  if (!isNonEmptyString(phone)) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!isNonEmptyString(url)) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const formattedPhone = validatePhone(phone);
  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid phone number format (10 digits required)' });
  }

  if (!isValidUrl(url)) {
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

    // Try multiple phone formats for lookup
    const phoneFormats = [
      formattedPhone,           // +15551234567
      digits,                   // 5551234567
      `1${digits}`,            // 15551234567
    ];

    // Step 1: Try lookup endpoint with different formats
    for (const phone of phoneFormats) {
      const lookupResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/lookup?locationId=${HIGHLEVEL_LOCATION_ID}&phone=${encodeURIComponent(phone)}`,
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

    // Step 2: Try search endpoint
    if (!contactId) {
      const searchResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${HIGHLEVEL_LOCATION_ID}&query=${encodeURIComponent(digits)}`,
        { headers }
      );
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.contacts && searchResult.contacts.length > 0) {
          // Find contact matching our phone
          const match = searchResult.contacts.find(c =>
            c.phone?.replace(/\D/g, '').includes(digits)
          );
          if (match) {
            contactId = match.id;
          }
        }
      }
    }

    // Step 3: Create new contact only if truly not found
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
        throw new Error(createResult.message || 'Failed to create contact');
      }
      contactId = createResult.contact?.id;
    }

    if (!contactId) {
      throw new Error('Could not find or create contact');
    }

    // Step 3: Send SMS to the contact
    const message = `View your Raptor Vending installation progress on your phone: ${url}`;

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
      throw new Error(smsResult.message || 'Failed to send SMS');
    }

    return res.status(200).json({ success: true, messageId: smsResult.messageId || smsResult.id });

  } catch (error) {
    console.error('SMS error:', error);
    return res.status(500).json({ error: error.message });
  }
}
