// Vercel Serverless Function for sending SMS via HighLevel

const FROM_PHONE_NUMBER = '+13854386325'; // Raptor Vending A2P validated number

export default async function handler(req, res) {
  // Read env vars inside handler to ensure they're available
  const HIGHLEVEL_API_KEY = process.env.HIGHLEVEL_API_KEY;
  const HIGHLEVEL_LOCATION_ID = process.env.HIGHLEVEL_LOCATION_ID;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!HIGHLEVEL_API_KEY) {
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  const { phone, url } = req.body;

  if (!phone || !url) {
    return res.status(400).json({ error: 'Missing phone number or URL' });
  }

  // Validate phone number (10 digits)
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const formattedPhone = `+1${digits}`;

  try {
    const message = `View your Raptor Vending installation progress on your phone: ${url}`;

    // HighLevel API v2 - Send SMS
    const response = await fetch(
      'https://services.leadconnectorhq.com/conversations/messages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HIGHLEVEL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          type: 'SMS',
          phone: formattedPhone,
          message: message,
          ...(HIGHLEVEL_LOCATION_ID && { locationId: HIGHLEVEL_LOCATION_ID })
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('HighLevel error:', result);
      throw new Error(result.message || result.error || 'Failed to send SMS');
    }

    return res.status(200).json({ success: true, messageId: result.messageId || result.id });

  } catch (error) {
    console.error('SMS error:', error);
    return res.status(500).json({ error: error.message });
  }
}
