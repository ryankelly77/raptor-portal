// Admin API for properties CRUD operations
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
        const { id, property_manager_id } = req.query;

        if (id) {
          if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid property ID' });
          }
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return res.status(200).json({ data });
        }

        if (property_manager_id) {
          if (!isValidId(property_manager_id)) {
            return res.status(400).json({ error: 'Invalid property_manager_id' });
          }
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('property_manager_id', property_manager_id)
            .order('name', { ascending: true });

          if (error) throw error;
          return res.status(200).json({ data });
        }

        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'POST': {
        const { name, property_manager_id, ...rest } = req.body || {};

        if (!isNonEmptyString(name)) {
          return res.status(400).json({ error: 'Property name is required' });
        }

        if (property_manager_id && !isValidId(property_manager_id)) {
          return res.status(400).json({ error: 'Invalid property_manager_id' });
        }

        const insertData = {
          name,
          property_manager_id: property_manager_id ? parseInt(property_manager_id, 10) : null,
          ...sanitizeFields(rest)
        };

        const { data, error } = await supabase
          .from('properties')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ data });
      }

      case 'PUT': {
        const { id, ...updates } = req.body || {};

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid property ID is required' });
        }

        if (updates.property_manager_id && !isValidId(updates.property_manager_id)) {
          return res.status(400).json({ error: 'Invalid property_manager_id' });
        }

        const updateData = {
          ...sanitizeFields(updates),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('properties')
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
          return res.status(400).json({ error: 'Valid property ID is required' });
        }

        const { error } = await supabase
          .from('properties')
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
    console.error('Properties API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

function sanitizeFields(fields) {
  const allowed = [
    'name', 'property_manager_id', 'address', 'city', 'state', 'zip',
    'total_employees', 'notes'
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sanitized[key] = fields[key];
    }
  }
  return sanitized;
}
