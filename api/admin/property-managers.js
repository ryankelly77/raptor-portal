// Admin API for property_managers CRUD operations
// Requires valid admin JWT token

const { requireAdmin } = require('../lib/auth');
const { getSupabaseAdmin } = require('../lib/supabase-admin');
const { isValidId, isNonEmptyString, isValidEmail } = require('../lib/validate');

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
        const { id } = req.query;

        if (id) {
          if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid property manager ID' });
          }
          const { data, error } = await supabase
            .from('property_managers')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return res.status(200).json({ data });
        }

        const { data, error } = await supabase
          .from('property_managers')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'POST': {
        const { name, email, ...rest } = req.body || {};

        if (!isNonEmptyString(name)) {
          return res.status(400).json({ error: 'Name is required' });
        }

        if (email && !isValidEmail(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        const insertData = {
          name,
          email: email || null,
          is_active: true,
          ...sanitizeFields(rest)
        };

        const { data, error } = await supabase
          .from('property_managers')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ data });
      }

      case 'PUT': {
        const { id, ...updates } = req.body || {};

        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid property manager ID is required' });
        }

        if (updates.email && !isValidEmail(updates.email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        const updateData = {
          ...sanitizeFields(updates),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('property_managers')
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
          return res.status(400).json({ error: 'Valid property manager ID is required' });
        }

        const { error } = await supabase
          .from('property_managers')
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
    console.error('Property Managers API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

function sanitizeFields(fields) {
  const allowed = [
    'name', 'email', 'phone', 'company', 'is_active', 'access_token', 'notes'
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sanitized[key] = fields[key];
    }
  }
  return sanitized;
}
