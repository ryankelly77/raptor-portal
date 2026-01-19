// API endpoint for tracking survey clicks
// Uses service role key to bypass RLS

const { getSupabaseAdmin } = require('./lib/supabase-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { surveyToken, action } = req.body || {};

  if (!surveyToken) {
    return res.status(400).json({ error: 'Survey token is required' });
  }

  if (!action || !['click', 'complete'].includes(action)) {
    return res.status(400).json({ error: 'Valid action required: click or complete' });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error('Supabase admin client error:', err.message);
    return res.status(500).json({ error: 'Database service not configured' });
  }

  try {
    // Get current project by survey token
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, survey_clicks, survey_completions')
      .eq('survey_token', surveyToken)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Update the appropriate counter
    const updateData = {};
    if (action === 'click') {
      updateData.survey_clicks = (project.survey_clicks || 0) + 1;
    } else if (action === 'complete') {
      updateData.survey_completions = (project.survey_completions || 0) + 1;
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', project.id);

    if (updateError) {
      console.error('Survey track update error:', updateError.message);
      return res.status(500).json({ error: 'Failed to update survey tracking' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Survey track error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
