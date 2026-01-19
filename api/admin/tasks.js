// Admin API for tasks CRUD operations
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
        // GET /api/admin/tasks?phase_id=123 - list tasks for phase
        // GET /api/admin/tasks?id=123 - get single task
        const { id, phase_id } = req.query;

        if (id) {
          if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid task ID' });
          }
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return res.status(200).json({ data });
        }

        if (phase_id) {
          if (!isValidId(phase_id)) {
            return res.status(400).json({ error: 'Invalid phase_id' });
          }
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('phase_id', phase_id)
            .order('sort_order', { ascending: true });

          if (error) throw error;
          return res.status(200).json({ data });
        }

        return res.status(400).json({ error: 'phase_id or id required' });
      }

      case 'POST': {
        // POST /api/admin/tasks - create new task
        const { phase_id, label, ...rest } = req.body || {};

        if (!isValidId(phase_id)) {
          return res.status(400).json({ error: 'Valid phase_id is required' });
        }

        if (!isNonEmptyString(label)) {
          return res.status(400).json({ error: 'Label is required' });
        }

        const insertData = {
          phase_id: parseInt(phase_id, 10),
          label,
          completed: false,
          sort_order: rest.sort_order || 0,
          ...sanitizeTaskFields(rest)
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ data });
      }

      case 'PUT': {
        // PUT /api/admin/tasks - update task
        const { id, ...updates } = req.body || {};

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid task ID is required' });
        }

        const updateData = {
          ...sanitizeTaskFields(updates),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'DELETE': {
        // DELETE /api/admin/tasks?id=123
        const { id } = req.query;

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid task ID is required' });
        }

        const { error } = await supabase
          .from('tasks')
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
    console.error('Tasks API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Sanitize and validate task fields
function sanitizeTaskFields(fields) {
  const allowed = [
    'label', 'completed', 'sort_order', 'scheduled_date',
    'upload_speed', 'download_speed', 'enclosure_type',
    'enclosure_color', 'custom_color_name', 'smartfridge_qty',
    'smartcooker_qty', 'deliveries', 'document_url', 'notes',
    'pm_text_response'
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sanitized[key] = fields[key];
    }
  }
  return sanitized;
}
