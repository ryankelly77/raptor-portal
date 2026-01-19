// Consolidated Admin CRUD API
// Single endpoint for all admin table operations
// Reduces Vercel function count (Hobby plan limit: 12)

const { requireAdmin } = require('../lib/auth');
const { getSupabaseAdmin } = require('../lib/supabase-admin');
const { isValidId, isNonEmptyString, isValidEmail } = require('../lib/validate');

// Allowed tables and their configurations
const TABLE_CONFIG = {
  projects: {
    allowedFields: [
      'location_id', 'project_number', 'public_token', 'is_active',
      'overall_progress', 'estimated_completion', 'configuration',
      'employee_count', 'email_reminders_enabled', 'reminder_email',
      'last_reminder_sent', 'survey_clicks', 'survey_completions'
    ],
    requiredForCreate: ['location_id'],
    orderBy: { column: 'created_at', ascending: false }
  },
  phases: {
    allowedFields: [
      'project_id', 'title', 'phase_number', 'status', 'description',
      'start_date', 'end_date', 'is_approximate',
      'property_responsibility', 'contractor_name',
      'contractor_scheduled_date', 'contractor_status',
      'survey_response_rate', 'survey_top_meals',
      'survey_top_snacks', 'survey_dietary_notes'
    ],
    requiredForCreate: ['project_id', 'title'],
    orderBy: { column: 'phase_number', ascending: true }
  },
  tasks: {
    allowedFields: [
      'phase_id', 'label', 'completed', 'sort_order', 'scheduled_date',
      'upload_speed', 'download_speed', 'enclosure_type',
      'enclosure_color', 'custom_color_name', 'smartfridge_qty',
      'smartcooker_qty', 'deliveries', 'document_url', 'notes',
      'pm_text_response'
    ],
    requiredForCreate: ['phase_id', 'label'],
    orderBy: { column: 'sort_order', ascending: true }
  },
  property_managers: {
    allowedFields: [
      'name', 'email', 'phone', 'company', 'is_active', 'access_token', 'notes'
    ],
    requiredForCreate: ['name'],
    orderBy: { column: 'name', ascending: true }
  },
  properties: {
    allowedFields: [
      'name', 'property_manager_id', 'address', 'city', 'state', 'zip',
      'total_employees', 'notes'
    ],
    requiredForCreate: ['name'],
    orderBy: { column: 'name', ascending: true }
  },
  locations: {
    allowedFields: [
      'name', 'property_id', 'floor', 'employee_count', 'images', 'notes'
    ],
    requiredForCreate: ['name', 'property_id'],
    orderBy: { column: 'name', ascending: true }
  },
  pm_messages: {
    allowedFields: [
      'pm_id', 'sender', 'sender_name', 'message', 'read_at'
    ],
    requiredForCreate: ['pm_id', 'message'],
    orderBy: { column: 'created_at', ascending: false }
  }
};

// Generate random token for projects
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Sanitize fields based on table config
function sanitizeFields(table, fields) {
  const config = TABLE_CONFIG[table];
  if (!config) return {};

  const sanitized = {};
  for (const key of config.allowedFields) {
    if (fields[key] !== undefined) {
      sanitized[key] = fields[key];
    }
  }
  return sanitized;
}

// Validate required fields for create
function validateRequired(table, data) {
  const config = TABLE_CONFIG[table];
  if (!config) return { valid: false, error: 'Unknown table' };

  for (const field of config.requiredForCreate) {
    if (field.endsWith('_id')) {
      if (!isValidId(data[field])) {
        return { valid: false, error: `Valid ${field} is required` };
      }
    } else {
      if (!isNonEmptyString(data[field])) {
        return { valid: false, error: `${field} is required` };
      }
    }
  }
  return { valid: true };
}

module.exports = async function handler(req, res) {
  // Only POST allowed for this consolidated endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST with action in body.' });
  }

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

  // 3. Parse request
  const { table, action, data, id, filters } = req.body || {};
  console.log('[CRUD REQUEST]', JSON.stringify({ table, action, id, filters, dataKeys: data ? Object.keys(data) : null }));

  // Validate table
  if (!table || !TABLE_CONFIG[table]) {
    return res.status(400).json({
      error: 'Invalid table. Allowed: ' + Object.keys(TABLE_CONFIG).join(', ')
    });
  }

  // Validate action
  const validActions = ['create', 'read', 'update', 'delete'];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({
      error: 'Invalid action. Allowed: ' + validActions.join(', ')
    });
  }

  const config = TABLE_CONFIG[table];

  try {
    switch (action) {
      case 'read': {
        // Read single by ID or list with optional filters
        if (id) {
          if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
          }
          const { data: record, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return res.status(200).json({ data: record });
        }

        // List with optional filters
        let query = supabase.from(table).select('*');

        // Apply filters (e.g., { project_id: 123 })
        if (filters && typeof filters === 'object') {
          for (const [key, value] of Object.entries(filters)) {
            if (config.allowedFields.includes(key) || key === 'id') {
              query = query.eq(key, value);
            }
          }
        }

        // Apply default ordering
        if (config.orderBy) {
          query = query.order(config.orderBy.column, { ascending: config.orderBy.ascending });
        }

        const { data: records, error } = await query;
        if (error) throw error;
        return res.status(200).json({ data: records });
      }

      case 'create': {
        if (!data || typeof data !== 'object') {
          return res.status(400).json({ error: 'Data object is required for create' });
        }

        // Validate required fields
        const validation = validateRequired(table, data);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }

        // Email validation for tables with email field
        if (data.email && !isValidEmail(data.email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        // Sanitize and prepare insert data
        let insertData = sanitizeFields(table, data);

        // Table-specific defaults (IDs passed through as-is - supports both int and UUID)
        if (table === 'projects') {
          insertData.public_token = insertData.public_token || generateToken();
          insertData.is_active = insertData.is_active !== false;
        } else if (table === 'phases') {
          insertData.phase_number = insertData.phase_number || 1;
          insertData.status = insertData.status || 'not_started';
        } else if (table === 'tasks') {
          insertData.completed = insertData.completed || false;
          insertData.sort_order = insertData.sort_order || 0;
        } else if (table === 'property_managers') {
          insertData.is_active = insertData.is_active !== false;
        }

        console.log(`[CRUD CREATE] Table: ${table}, Data:`, JSON.stringify(insertData));
        const { data: created, error } = await supabase
          .from(table)
          .insert([insertData])
          .select()
          .single();

        if (error) {
          console.error(`[CRUD CREATE ERROR] Table: ${table}, Error:`, error.message, 'Data:', JSON.stringify(insertData));
          throw error;
        }
        return res.status(201).json({ data: created });
      }

      case 'update': {
        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid ID is required for update' });
        }

        if (!data || typeof data !== 'object') {
          return res.status(400).json({ error: 'Data object is required for update' });
        }

        // Email validation if updating email
        if (data.email && !isValidEmail(data.email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        const updateData = {
          ...sanitizeFields(table, data),
          updated_at: new Date().toISOString()
        };

        const { data: updated, error } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data: updated });
      }

      case 'delete': {
        if (!isValidId(id)) {
          return res.status(400).json({ error: 'Valid ID is required for delete' });
        }

        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(`Admin CRUD error [${table}/${action}]:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      requestData: JSON.stringify({ table, action, id, data: data ? Object.keys(data) : null })
    });
    return res.status(500).json({
      error: error.message,
      details: error.details || null,
      hint: error.hint || null
    });
  }
};
