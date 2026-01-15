// Vercel Serverless Function for sending email reminders via Mailgun
// Triggered by Vercel Cron or manual API call

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'reminders.raptor-vending.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Raptor Vending <noreply@reminders.raptor-vending.com>';
const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.raptor-vending.com';

async function sendEmail(to, subject, html) {
  const form = new URLSearchParams();
  form.append('from', FROM_EMAIL);
  form.append('to', to);
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

function generateReminderEmail(project, incompleteTasks, propertyName, firstName) {
  const projectUrl = `${PORTAL_URL}/${project.public_token}`;
  const logoUrl = `${PORTAL_URL}/logo-light.png`;
  const taskList = incompleteTasks.map(t => `<li style="margin-bottom: 8px;">${t.label.replace(/^\[(PM|PM-TEXT)\]\s*/, '')}</li>`).join('');
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,';

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
        <p style="font-size: 16px;">${greeting}</p>

        <p style="font-size: 16px;">This is a friendly reminder that there are <strong>${incompleteTasks.length} item${incompleteTasks.length !== 1 ? 's' : ''}</strong> remaining for the vending installation at <strong>${propertyName}</strong>.</p>

        <p style="font-size: 16px; margin-top: 24px;"><strong>Remaining items:</strong></p>
        <ul style="background: #f9f9f9; padding: 20px 20px 20px 40px; border-radius: 4px; border-left: 4px solid #4CAF50; margin: 16px 0;">
          ${taskList}
        </ul>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${projectUrl}" style="background: #4CAF50; color: white; padding: 14px 36px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">Complete Your Items</a>
        </p>

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
  // Verify cron secret for scheduled calls (optional security)
  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    // Allow manual calls without secret for testing
    if (req.method !== 'POST' || !req.body?.manual) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!MAILGUN_API_KEY) {
    return res.status(500).json({ error: 'Mailgun API key not configured' });
  }

  try {
    // Fetch projects with reminders enabled, including location/property/PM info
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        public_token,
        project_number,
        reminder_email,
        email_reminders_enabled,
        last_reminder_sent,
        location:locations (
          name,
          property:properties (
            name,
            property_manager:property_managers (
              name,
              email
            )
          )
        ),
        phases (
          id,
          tasks (
            id,
            label,
            completed
          )
        )
      `)
      .eq('email_reminders_enabled', true);

    if (projectsError) {
      throw new Error(`Database error: ${projectsError.message}`);
    }

    const results = [];
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    for (const project of projects || []) {
      const propertyName = project.location?.property?.name || project.location?.name || project.project_number;
      const pmEmail = project.location?.property?.property_manager?.email;
      const pmFullName = project.location?.property?.property_manager?.name || '';
      const firstName = pmFullName.split(' ')[0] || '';

      // Skip if reminded in the last 24 hours
      if (project.last_reminder_sent && new Date(project.last_reminder_sent) > oneDayAgo) {
        results.push({ project: propertyName, status: 'skipped', reason: 'Recently reminded' });
        continue;
      }

      // Get incomplete PM tasks
      const incompleteTasks = [];
      for (const phase of project.phases || []) {
        for (const task of phase.tasks || []) {
          if ((task.label.startsWith('[PM]') || task.label.startsWith('[PM-TEXT]')) && !task.completed) {
            incompleteTasks.push(task);
          }
        }
      }

      // Skip if no incomplete tasks
      if (incompleteTasks.length === 0) {
        results.push({ project: propertyName, status: 'skipped', reason: 'No incomplete tasks' });
        continue;
      }

      // Determine recipient email (reminder_email override, or property manager email)
      const recipientEmail = project.reminder_email || pmEmail;
      if (!recipientEmail) {
        results.push({ project: propertyName, status: 'skipped', reason: 'No email address' });
        continue;
      }

      // Send the reminder email
      try {
        const html = generateReminderEmail(project, incompleteTasks, propertyName, firstName);
        await sendEmail(
          recipientEmail,
          `Reminder: ${incompleteTasks.length} item${incompleteTasks.length !== 1 ? 's' : ''} remaining for ${propertyName}`,
          html
        );

        // Update last_reminder_sent
        await supabase
          .from('projects')
          .update({ last_reminder_sent: now.toISOString() })
          .eq('id', project.id);

        results.push({ project: propertyName, status: 'sent', to: recipientEmail, tasks: incompleteTasks.length });
      } catch (emailError) {
        results.push({ project: propertyName, status: 'error', error: emailError.message });
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      results
    });

  } catch (error) {
    console.error('Reminder error:', error);
    return res.status(500).json({ error: error.message });
  }
}
