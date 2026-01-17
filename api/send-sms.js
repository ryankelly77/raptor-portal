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
    let contactId;

    // Step 1: Look up existing contact by phone number
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/lookup?phone=${encodeURIComponent(formattedPhone)}&locationId=${HIGHLEVEL_LOCATION_ID}`,
      { headers }
    );

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.contact?.id) {
        contactId = searchResult.contact.id;
      }
    }

    // Step 2: If lookup failed, try search
    if (!contactId) {
      const altSearchResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${HIGHLEVEL_LOCATION_ID}&query=${encodeURIComponent(formattedPhone)}`,
        { headers }
      );
      if (altSearchResponse.ok) {
        const altResult = await altSearchResponse.json();
        if (altResult.contacts && altResult.contacts.length > 0) {
          contactId = altResult.contacts[0].id;
        }
      }
    }

    // Step 3: Create new contact if still not found
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
        // If duplicate error, try one more lookup
        if (createResult.message?.includes('duplicate')) {
          const retrySearch = await fetch(
            `https://services.leadconnectorhq.com/contacts/?locationId=${HIGHLEVEL_LOCATION_ID}&phone=${encodeURIComponent(formattedPhone)}`,
            { headers }
          );
          if (retrySearch.ok) {
            const retryResult = await retrySearch.json();
            if (retryResult.contacts && retryResult.contacts.length > 0) {
              contactId = retryResult.contacts[0].id;
            }
          }
        }

        if (!contactId) {
          console.error('Create contact error:', createResult);
          throw new Error(createResult.message || 'Failed to create contact');
        }
      } else {
        contactId = createResult.contact?.id;
      }
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
