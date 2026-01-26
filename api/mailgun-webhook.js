// Mailgun Webhook Handler for email tracking events
// Receives open/click events and logs them to activity stream

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Verify Mailgun webhook signature
function verifyWebhookSignature(timestamp, token, signature) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    console.warn('MAILGUN_WEBHOOK_SIGNING_KEY not configured, skipping verification');
    return true; // Allow in dev, but log warning
  }

  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex');

  return encodedToken === signature;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signature, 'event-data': eventData } = req.body || {};

    // Verify signature if signing key is configured
    if (signature) {
      const isValid = verifyWebhookSignature(
        signature.timestamp,
        signature.token,
        signature.signature
      );
      if (!isValid) {
        console.error('Invalid Mailgun webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    if (!eventData) {
      return res.status(400).json({ error: 'No event data' });
    }

    const eventType = eventData.event;
    const recipient = eventData.recipient;
    const projectId = eventData['user-variables']?.project_id;

    console.log(`[Mailgun Webhook] Event: ${eventType}, Recipient: ${recipient}, Project: ${projectId}`);

    // Only log opens and clicks
    if (eventType === 'opened' || eventType === 'clicked') {
      const description = eventType === 'opened'
        ? `Email opened by ${recipient}`
        : `Email link clicked by ${recipient}`;

      await supabase
        .from('activity_log')
        .insert({
          project_id: projectId || null,
          action: eventType === 'opened' ? 'email_opened' : 'email_clicked',
          description,
          actor_type: 'system'
        });

      console.log(`[Mailgun Webhook] Logged ${eventType} event to activity stream`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mailgun webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
};
