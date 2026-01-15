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

function generateReminderEmail(project, allTasks, incompleteCount, propertyName, firstName) {
  const projectUrl = `${PORTAL_URL}/project/${project.public_token}`;
  const logoUrl = `${PORTAL_URL}/logo-light.png`;
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,';

  const taskList = allTasks.map(t => {
    const label = t.label.replace(/^\[(PM|PM-TEXT)\]\s*/, '');
    if (t.completed) {
      return `<tr>
        <td style="width: 32px; padding: 8px 12px 8px 0; vertical-align: top;">
          <div style="width: 24px; height: 24px; background: #FF6B00; border-radius: 4px; text-align: center; line-height: 24px;">
            <span style="color: white; font-size: 16px; font-weight: bold;">&#10003;</span>
          </div>
        </td>
        <td style="padding: 8px 0; vertical-align: middle; color: #999; text-decoration: line-through;">${label}</td>
      </tr>`;
    } else {
      return `<tr>
        <td style="width: 32px; padding: 8px 12px 8px 0; vertical-align: top;">
          <div style="width: 24px; height: 24px; border: 2px solid #FF6B00; border-radius: 4px; box-sizing: border-box;"></div>
        </td>
        <td style="padding: 8px 0; vertical-align: middle;">${label}</td>
      </tr>`;
    }
  }).join('');

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

        <p style="font-size: 16px;">This is a friendly reminder that there are <strong>${incompleteCount} item${incompleteCount !== 1 ? 's' : ''}</strong> remaining to get hot, gourmet food at <strong>${propertyName}</strong>.</p>

        <p style="font-size: 16px; margin-top: 24px;"><strong>Your progress:</strong></p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 4px; border-left: 4px solid #FF6B00; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            ${taskList}
          </table>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${projectUrl}" style="background: #FF6B00; color: white; padding: 14px 36px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">Complete Your Items</a>
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

  const forceResend = req.body?.force === true;

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
          phase_number,
          tasks (
            id,
            label,
            completed,
            sort_order
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

      // Skip if reminded in the last 24 hours (unless force flag is set)
      if (!forceResend && project.last_reminder_sent && new Date(project.last_reminder_sent) > oneDayAgo) {
        results.push({ project: propertyName, status: 'skipped', reason: 'Recently reminded' });
        continue;
      }

      // Get all PM tasks in order (by phase_number, then sort_order)
      const sortedPhases = (project.phases || []).sort((a, b) => a.phase_number - b.phase_number);
      const allPmTasks = [];
      for (const phase of sortedPhases) {
        const sortedTasks = (phase.tasks || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        for (const task of sortedTasks) {
          if (task.label.startsWith('[PM]') || task.label.startsWith('[PM-TEXT]')) {
            allPmTasks.push(task);
          }
        }
      }

      const incompleteCount = allPmTasks.filter(t => !t.completed).length;

      // Skip if no incomplete tasks
      if (incompleteCount === 0) {
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
        const html = generateReminderEmail(project, allPmTasks, incompleteCount, propertyName, firstName);
        await sendEmail(
          recipientEmail,
          `Reminder: ${incompleteCount} item${incompleteCount !== 1 ? 's' : ''} remaining for ${propertyName}`,
          html
        );

        // Update last_reminder_sent
        await supabase
          .from('projects')
          .update({ last_reminder_sent: now.toISOString() })
          .eq('id', project.id);

        results.push({ project: propertyName, status: 'sent', to: recipientEmail, tasks: incompleteCount });
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
