// Admin API for projects CRUD operations
// Requires valid admin JWT token

import { requireAdmin } from '../lib/auth.js';
import { getSupabaseAdmin } from '../lib/supabase-admin.js';
import { isValidId, isNonEmptyString } from '../lib/validate.js';

export default async function handler(req, res) {
  // 1. Admin authentication
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  // 2. Get Supabase admin client
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error('Supabase admin client error:', err.message);
    return res.status(500).json({ error: 'Database service not configured' });
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        // GET /api/admin/projects - list all projects
        // GET /api/admin/projects?id=123 - get single project
        const { id } = req.query;

        if (id) {
          if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid project ID' });
          }
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return res.status(200).json({ data });
        }

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'POST': {
        // POST /api/admin/projects - create new project
        const { location_id, project_number, public_token, ...rest } = req.body || {};

        if (!isValidId(location_id)) {
          return res.status(400).json({ error: 'Valid location_id is required' });
        }

        const insertData = {
          location_id: parseInt(location_id, 10),
          project_number: project_number || null,
          public_token: public_token || generateToken(),
          is_active: true,
          ...sanitizeProjectFields(rest)
        };

        const { data, error } = await supabase
          .from('projects')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ data });
      }

      case 'PUT': {
        // PUT /api/admin/projects - update project
        const { id, ...updates } = req.body || {};

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid project ID is required' });
        }

        const updateData = {
          ...sanitizeProjectFields(updates),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'DELETE': {
        // DELETE /api/admin/projects?id=123
        const { id } = req.query;

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid project ID is required' });
        }

        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Projects API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Generate a random public token
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Sanitize and validate project fields
function sanitizeProjectFields(fields) {
  const allowed = [
    'location_id', 'project_number', 'public_token', 'is_active',
    'overall_progress', 'estimated_completion', 'configuration',
    'employee_count', 'email_reminders_enabled', 'reminder_email',
    'last_reminder_sent', 'survey_clicks'
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sanitized[key] = fields[key];
    }
  }
  return sanitized;
}
