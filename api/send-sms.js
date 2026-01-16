// Vercel Serverless Function for sending SMS via HighLevel

export default async function handler(req, res) {
  const HIGHLEVEL_API_KEY = process.env.HIGHLEVEL_API_KEY;
  const HIGHLEVEL_LOCATION_ID = process.env.HIGHLEVEL_LOCATION_ID;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  const { phone, url } = req.body;

  if (!phone || !url) {
    return res.status(400).json({ error: 'Missing phone number or URL' });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const formattedPhone = `+1${digits}`;
  const headers = {
    'Authorization': `Bearer ${HIGHLEVEL_API_KEY}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28'
  };

  try {
    // Step 1: Look up existing contact by phone number
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/search?query=${encodeURIComponent(formattedPhone)}&locationId=${HIGHLEVEL_LOCATION_ID}`,
      { headers }
    );
    const searchResult = await searchResponse.json();

    let contactId;

    if (searchResult.contacts && searchResult.contacts.length > 0) {
      // Use existing contact
      contactId = searchResult.contacts[0].id;
    } else {
      // Step 2: Create new contact if not found
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
