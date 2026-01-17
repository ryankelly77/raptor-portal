// Vercel Serverless Function for syncing contacts with HighLevel

export default async function handler(req, res) {
  const HIGHLEVEL_API_KEY = process.env.HIGHLEVEL_API_KEY;
  const HIGHLEVEL_LOCATION_ID = process.env.HIGHLEVEL_LOCATION_ID;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    return res.status(500).json({ error: 'HighLevel not configured' });
  }

  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const headers = {
    'Authorization': `Bearer ${HIGHLEVEL_API_KEY}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28'
  };

  try {
    // Search for existing contact by email
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/search?query=${encodeURIComponent(email)}&locationId=${HIGHLEVEL_LOCATION_ID}`,
      { headers }
    );
    const searchResult = await searchResponse.json();

    let contactId;

    if (searchResult.contacts && searchResult.contacts.length > 0) {
      // Contact exists, update if needed
      contactId = searchResult.contacts[0].id;

      // Update contact with latest info
      await fetch(
        `https://services.leadconnectorhq.com/contacts/${contactId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name,
            email,
            phone: phone ? `+1${phone.replace(/\D/g, '')}` : undefined,
            locationId: HIGHLEVEL_LOCATION_ID
          })
        }
      );
    } else {
      // Create new contact
      const createResponse = await fetch(
        'https://services.leadconnectorhq.com/contacts/',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name,
            email,
            phone: phone ? `+1${phone.replace(/\D/g, '')}` : undefined,
            locationId: HIGHLEVEL_LOCATION_ID,
            source: 'Raptor Portal'
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

    return res.status(200).json({ success: true, contactId });

  } catch (error) {
    console.error('HighLevel sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}
