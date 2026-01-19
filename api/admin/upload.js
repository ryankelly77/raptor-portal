// Admin file upload API - bypasses storage RLS using service role key

const { requireAdmin } = require('../lib/auth');
const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin authentication
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({ error: auth.error });
  }

  // Get Supabase admin client
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error('Supabase admin client error:', err.message);
    return res.status(500).json({ error: 'Database service not configured' });
  }

  try {
    const { bucket, filePath, fileData, contentType } = req.body;

    if (!bucket || !filePath || !fileData) {
      return res.status(400).json({ error: 'Missing required fields: bucket, filePath, fileData' });
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        upsert: true,
        contentType: contentType || 'application/octet-stream'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return res.status(200).json({
      success: true,
      publicUrl: urlData.publicUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
};
