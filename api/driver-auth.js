// Driver Authentication API
// Validates access token and returns JWT for driver session

const { createDriverToken } = require('./lib/auth');
const { getSupabaseAdmin } = require('./lib/supabase-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessToken } = req.body || {};

  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({ error: 'Access token is required' });
  }

  // Clean the token (remove whitespace, normalize)
  const cleanToken = accessToken.trim().toLowerCase();

  if (cleanToken.length < 8 || cleanToken.length > 32) {
    return res.status(400).json({ error: 'Invalid token format' });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error('Supabase admin client error:', err.message);
    return res.status(500).json({ error: 'Database service not configured' });
  }

  try {
    // Look up driver by access token
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id, name, email, phone, is_active')
      .eq('access_token', cleanToken)
      .single();

    if (error || !driver) {
      console.log(`[Driver Auth] Invalid token attempt: ${cleanToken.substring(0, 4)}...`);
      return res.status(401).json({ error: 'Invalid access token' });
    }

    if (!driver.is_active) {
      console.log(`[Driver Auth] Inactive driver attempted login: ${driver.name}`);
      return res.status(401).json({ error: 'Driver account is inactive' });
    }

    // Generate JWT
    const token = createDriverToken(driver);

    console.log(`[Driver Auth] Successful login: ${driver.name}`);

    return res.status(200).json({
      token,
      driver: {
        id: driver.id,
        name: driver.name
      }
    });

  } catch (error) {
    console.error('Driver auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};
