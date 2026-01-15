// Vercel Serverless Function for sending delivery notification emails via Mailgun

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'reminders.raptor-vending.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Raptor Vending <noreply@reminders.raptor-vending.com>';
const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.raptor-vending.com';
const CC_EMAILS = 'ryan@raptor-vending.com, tracie@raptor-vending.com, cristian@raptor-vending.com';

async function sendEmail(to, subject, html) {
  const form = new URLSearchParams();
  form.append('from', FROM_EMAIL);
  form.append('to', to);
  form.append('cc', CC_EMAILS);
  form.append('subject', subject);
  form.append('html', html);

  const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailgun error: ${error}`);
  }

  return response.json();
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateDeliveryEmail(delivery, propertyName, projectToken, firstName) {
  const logoUrl = `${PORTAL_URL}/logo-light.png`;
  const projectUrl = `${PORTAL_URL}/project/${projectToken}`;
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,';
  const formattedDate = formatDate(delivery.date);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
      <div style="background: #202020; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <img src="${logoUrl}" alt="Raptor Vending" style="max-width: 200px; height: auto;" />
      </div>

      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #FF6B00; font-size: 28px; margin: 0 0 20px 0; text-align: center;">Equipment is on the way!</h1>

        <p style="font-size: 16px;">${greeting}</p>

        <p style="font-size: 16px;">Great news! Equipment for <strong>${propertyName}</strong> has shipped and is on its way.</p>

        <div style="background: #f9f9f9; padding: 20px; border-radius: 4px; border-left: 4px solid #FF6B00; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 140px;">Equipment:</td>
              <td style="padding: 8px 0;">${delivery.equipment}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Delivery Date:</td>
              <td style="padding: 8px 0;">${formattedDate}</td>
            </tr>
            ${delivery.carrier ? `<tr>
              <td style="padding: 8px 0; font-weight: bold;">Carrier:</td>
              <td style="padding: 8px 0;">${delivery.carrier}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Tracking Number:</td>
              <td style="padding: 8px 0;">${delivery.tracking}</td>
            </tr>
          </table>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${projectUrl}" style="background: #FF6B00; color: white; padding: 14px 36px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">View Installation Progress</a>
        </p>

        <p style="font-size: 16px; background: #f0f0f0; padding: 16px; border-radius: 4px; margin-top: 24px;">Raptor Vending will be onsite to accept the delivery and ensure the items are satisfactory. We will need a secure area to store the equipment until the health inspection.</p>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please contact your Raptor Vending representative.</p>
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>Raptor Vending Installation Portal</p>
      </div>
    </body>
    </html>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!MAILGUN_API_KEY) {
    return res.status(500).json({ error: 'Mailgun API key not configured' });
  }

  const { projectId, delivery } = req.body;

  if (!projectId || !delivery) {
    return res.status(400).json({ error: 'Missing projectId or delivery data' });
  }

  if (!delivery.equipment || !delivery.date || !delivery.tracking) {
    return res.status(400).json({ error: 'Delivery must have equipment, date, and tracking number' });
  }

  try {
    // Fetch project with location/property/PM info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        public_token,
        reminder_email,
        location:locations (
          name,
          property:properties (
            name,
            property_manager:property_managers (
              name,
              email
            )
          )
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    const propertyName = project.location?.property?.name || project.location?.name || 'your location';
    const pmEmail = project.location?.property?.property_manager?.email;
    const pmFullName = project.location?.property?.property_manager?.name || '';
    const firstName = pmFullName.split(' ')[0] || '';

    // Use reminder_email override if set, otherwise PM email
    const recipientEmail = project.reminder_email || pmEmail;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'No recipient email found for this project' });
    }

    const html = generateDeliveryEmail(delivery, propertyName, project.public_token, firstName);

    await sendEmail(
      recipientEmail,
      `Equipment on the way to ${propertyName} - ${delivery.equipment}`,
      html
    );

    return res.status(200).json({
      success: true,
      to: recipientEmail,
      equipment: delivery.equipment
    });

  } catch (error) {
    console.error('Delivery notification error:', error);
    return res.status(500).json({ error: error.message });
  }
}
