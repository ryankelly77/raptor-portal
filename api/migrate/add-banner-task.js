// One-time migration: Add banner permission task to existing Phase 3s
// Run once then delete this file

const { requireAdmin } = require('../lib/auth');
const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Admin authentication
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return res.status(500).json({ error: 'Database service not configured' });
  }

  try {
    // Find all Phase 3s (Employee Preference Survey)
    const { data: phases, error: phasesError } = await supabase
      .from('phases')
      .select('id, project_id, title')
      .eq('phase_number', 3);

    if (phasesError) throw phasesError;

    const newTaskLabel = '[PM-TEXT] Allow Raptor Vending to place retractable banners on site announcing the food program until machines arrive';
    let added = 0;
    let skipped = 0;

    for (const phase of phases) {
      // Check if task already exists
      const { data: existingTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, label')
        .eq('phase_id', phase.id)
        .ilike('label', '%retractable banners%');

      if (tasksError) throw tasksError;

      if (existingTasks && existingTasks.length > 0) {
        skipped++;
        continue;
      }

      // Get current max sort_order for this phase
      const { data: maxTask } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('phase_id', phase.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const sortOrder = (maxTask?.sort_order || 0) + 1;

      // First, shift existing tasks with sort_order >= 2 up by 1
      const { data: tasksToShift } = await supabase
        .from('tasks')
        .select('id, sort_order')
        .eq('phase_id', phase.id)
        .gte('sort_order', 2)
        .order('sort_order', { ascending: false });

      if (tasksToShift) {
        for (const task of tasksToShift) {
          await supabase
            .from('tasks')
            .update({ sort_order: task.sort_order + 1 })
            .eq('id', task.id);
        }
      }

      // Insert new task at position 2
      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          phase_id: phase.id,
          label: newTaskLabel,
          completed: false,
          sort_order: 2
        });

      if (insertError) {
        console.error(`Failed to add task to phase ${phase.id}:`, insertError);
      } else {
        added++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Added banner task to ${added} phases, skipped ${skipped} (already had it)`,
      total_phases: phases.length
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: error.message });
  }
};
