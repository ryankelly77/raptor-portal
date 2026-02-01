// Driver Temperature Log API
// Handles session and entry CRUD for authenticated drivers

const { requireDriver } = require('../lib/auth');
const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async function handler(req, res) {
  // Authenticate driver
  const auth = requireDriver(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { driverId } = auth.payload;

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error('Supabase admin client error:', err.message);
    return res.status(500).json({ error: 'Database service not configured' });
  }

  const { action, data, id } = req.body || {};

  try {
    switch (action) {
      // ============================================
      // SESSION OPERATIONS
      // ============================================

      case 'getActiveSession': {
        // Get driver's current in-progress session with entries
        const { data: session, error } = await supabase
          .from('temp_log_sessions')
          .select(`
            *,
            entries:temp_log_entries(*)
          `)
          .eq('driver_id', driverId)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
          throw error;
        }

        // Sort entries by timestamp
        if (session?.entries) {
          session.entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }

        return res.status(200).json({ session: session || null });
      }

      case 'createSession': {
        // Create new session for this driver
        const { vehicleId, notes } = data || {};

        const { data: session, error } = await supabase
          .from('temp_log_sessions')
          .insert({
            driver_id: driverId,
            vehicle_id: vehicleId || null,
            notes: notes || null,
            status: 'in_progress'
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`[Temp Log] Session created: ${session.id} by driver ${driverId}`);
        return res.status(201).json({ session });
      }

      case 'completeSession': {
        // Mark session as completed
        if (!id) {
          return res.status(400).json({ error: 'Session ID required' });
        }

        // Verify ownership
        const { data: existing } = await supabase
          .from('temp_log_sessions')
          .select('id, driver_id')
          .eq('id', id)
          .single();

        if (!existing || existing.driver_id !== driverId) {
          return res.status(403).json({ error: 'Not authorized to modify this session' });
        }

        const { data: session, error } = await supabase
          .from('temp_log_sessions')
          .update({ status: 'completed' })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        console.log(`[Temp Log] Session completed: ${id}`);
        return res.status(200).json({ session });
      }

      case 'getSessionHistory': {
        // Get driver's recent sessions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: sessions, error } = await supabase
          .from('temp_log_sessions')
          .select(`
            *,
            entries:temp_log_entries(count)
          `)
          .eq('driver_id', driverId)
          .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json({ sessions });
      }

      // ============================================
      // ENTRY OPERATIONS
      // ============================================

      case 'addEntry': {
        // Add temperature log entry
        const { sessionId, entryType, temperature, locationName, photoUrl, notes, stopNumber } = data || {};

        if (!sessionId || !entryType || temperature === undefined) {
          return res.status(400).json({ error: 'sessionId, entryType, and temperature are required' });
        }

        if (!['pickup', 'delivery'].includes(entryType)) {
          return res.status(400).json({ error: 'entryType must be pickup or delivery' });
        }

        // Verify session ownership
        const { data: session } = await supabase
          .from('temp_log_sessions')
          .select('id, driver_id, status')
          .eq('id', sessionId)
          .single();

        if (!session || session.driver_id !== driverId) {
          return res.status(403).json({ error: 'Not authorized to add entries to this session' });
        }

        if (session.status !== 'in_progress') {
          return res.status(400).json({ error: 'Cannot add entries to a completed session' });
        }

        // Get next stop number if not provided
        let finalStopNumber = stopNumber;
        if (!finalStopNumber && entryType === 'delivery') {
          const { data: lastEntry } = await supabase
            .from('temp_log_entries')
            .select('stop_number')
            .eq('session_id', sessionId)
            .eq('entry_type', 'delivery')
            .order('stop_number', { ascending: false })
            .limit(1)
            .single();

          finalStopNumber = lastEntry ? lastEntry.stop_number + 1 : 1;
        }

        const { data: entry, error } = await supabase
          .from('temp_log_entries')
          .insert({
            session_id: sessionId,
            entry_type: entryType,
            stop_number: entryType === 'pickup' ? 0 : finalStopNumber,
            location_name: locationName || null,
            temperature: parseFloat(temperature),
            photo_url: photoUrl || null,
            notes: notes || null
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`[Temp Log] Entry added: ${entryType} at ${temperature}°F for session ${sessionId}`);
        return res.status(201).json({ entry });
      }

      case 'updateEntry': {
        // Update existing entry (e.g., add photo after creation)
        const { entryId, temperature, photoUrl, notes, locationName } = data || {};

        if (!entryId) {
          return res.status(400).json({ error: 'entryId required' });
        }

        // Verify ownership through session
        const { data: entry } = await supabase
          .from('temp_log_entries')
          .select(`
            id,
            session:temp_log_sessions(driver_id, status)
          `)
          .eq('id', entryId)
          .single();

        if (!entry || entry.session?.driver_id !== driverId) {
          return res.status(403).json({ error: 'Not authorized to modify this entry' });
        }

        if (entry.session?.status !== 'in_progress') {
          return res.status(400).json({ error: 'Cannot modify entries in a completed session' });
        }

        const updateData = {};
        if (temperature !== undefined) updateData.temperature = parseFloat(temperature);
        if (photoUrl !== undefined) updateData.photo_url = photoUrl;
        if (notes !== undefined) updateData.notes = notes;
        if (locationName !== undefined) updateData.location_name = locationName;

        const { data: updated, error } = await supabase
          .from('temp_log_entries')
          .update(updateData)
          .eq('id', entryId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ entry: updated });
      }

      case 'deleteEntry': {
        // Delete entry
        const { entryId } = data || {};

        if (!entryId) {
          return res.status(400).json({ error: 'entryId required' });
        }

        // Verify ownership through session
        const { data: entry } = await supabase
          .from('temp_log_entries')
          .select(`
            id,
            session:temp_log_sessions(driver_id, status)
          `)
          .eq('id', entryId)
          .single();

        if (!entry || entry.session?.driver_id !== driverId) {
          return res.status(403).json({ error: 'Not authorized to delete this entry' });
        }

        if (entry.session?.status !== 'in_progress') {
          return res.status(400).json({ error: 'Cannot delete entries from a completed session' });
        }

        const { error } = await supabase
          .from('temp_log_entries')
          .delete()
          .eq('id', entryId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({
          error: 'Invalid action',
          validActions: [
            'getActiveSession',
            'createSession',
            'completeSession',
            'getSessionHistory',
            'addEntry',
            'updateEntry',
            'deleteEntry'
          ]
        });
    }
  } catch (error) {
    console.error(`[Temp Log] Error in ${action}:`, error);
    return res.status(500).json({ error: error.message });
  }
};
