// Admin API for phases CRUD operations
// Requires valid admin JWT token

import { requireAdmin } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import { isValidId, isNonEmptyString } from '../lib/validate';

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
        // GET /api/admin/phases?project_id=123 - list phases for project
        // GET /api/admin/phases?id=123 - get single phase
        const { id, project_id } = req.query;

        if (id) {
          if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid phase ID' });
          }
          const { data, error } = await supabase
            .from('phases')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return res.status(200).json({ data });
        }

        if (project_id) {
          if (!isValidId(project_id)) {
            return res.status(400).json({ error: 'Invalid project_id' });
          }
          const { data, error } = await supabase
            .from('phases')
            .select('*')
            .eq('project_id', project_id)
            .order('phase_number', { ascending: true });

          if (error) throw error;
          return res.status(200).json({ data });
        }

        return res.status(400).json({ error: 'project_id or id required' });
      }

      case 'POST': {
        // POST /api/admin/phases - create new phase
        const { project_id, title, phase_number, ...rest } = req.body || {};

        if (!isValidId(project_id)) {
          return res.status(400).json({ error: 'Valid project_id is required' });
        }

        if (!isNonEmptyString(title)) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const insertData = {
          project_id: parseInt(project_id, 10),
          title,
          phase_number: phase_number || 1,
          status: 'not_started',
          ...sanitizePhaseFields(rest)
        };

        const { data, error } = await supabase
          .from('phases')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ data });
      }

      case 'PUT': {
        // PUT /api/admin/phases - update phase
        const { id, ...updates } = req.body || {};

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid phase ID is required' });
        }

        const updateData = {
          ...sanitizePhaseFields(updates),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('phases')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'DELETE': {
        // DELETE /api/admin/phases?id=123
        const { id } = req.query;

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid phase ID is required' });
        }

        const { error } = await supabase
          .from('phases')
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
    console.error('Phases API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Sanitize and validate phase fields
function sanitizePhaseFields(fields) {
  const allowed = [
    'title', 'phase_number', 'status', 'description',
    'start_date', 'end_date', 'is_approximate',
    'property_responsibility', 'contractor_name',
    'contractor_scheduled_date', 'contractor_status',
    'survey_response_rate', 'survey_top_meals',
    'survey_top_snacks', 'survey_dietary_notes'
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sanitized[key] = fields[key];
    }
  }
  return sanitized;
}
