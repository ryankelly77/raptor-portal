// Admin API for locations CRUD operations
// Requires valid admin JWT token

const { requireAdmin } = require('../lib/auth');
const { getSupabaseAdmin } = require('../lib/supabase-admin');
const { isValidId, isNonEmptyString } = require('../lib/validate');

module.exports = async function handler(req, res) {
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
        const { id, property_id } = req.query;

        if (id) {
          if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid location ID' });
          }
          const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return res.status(200).json({ data });
        }

        if (property_id) {
          if (!isValidId(property_id)) {
            return res.status(400).json({ error: 'Invalid property_id' });
          }
          const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('property_id', property_id)
            .order('name', { ascending: true });

          if (error) throw error;
          return res.status(200).json({ data });
        }

        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'POST': {
        const { name, property_id, ...rest } = req.body || {};

        if (!isNonEmptyString(name)) {
          return res.status(400).json({ error: 'Location name is required' });
        }

        if (!isValidId(property_id)) {
          return res.status(400).json({ error: 'Valid property_id is required' });
        }

        const insertData = {
          name,
          property_id: parseInt(property_id, 10),
          ...sanitizeFields(rest)
        };

        const { data, error } = await supabase
          .from('locations')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ data });
      }

      case 'PUT': {
        const { id, ...updates } = req.body || {};

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid location ID is required' });
        }

        if (updates.property_id && !isValidId(updates.property_id)) {
          return res.status(400).json({ error: 'Invalid property_id' });
        }

        const updateData = {
          ...sanitizeFields(updates),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('locations')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'DELETE': {
        const { id } = req.query;

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid location ID is required' });
        }

        const { error } = await supabase
          .from('locations')
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
    console.error('Locations API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

function sanitizeFields(fields) {
  const allowed = [
    'name', 'property_id', 'floor', 'employee_count', 'images', 'notes'
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sanitized[key] = fields[key];
    }
  }
  return sanitized;
}
