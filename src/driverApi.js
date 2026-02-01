// Driver API Client
// Handles authentication and temperature log operations

const API_BASE = '/api';

// Token storage
const TOKEN_KEY = 'driver_token';
const DRIVER_KEY = 'driver_info';

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredDriver() {
  const info = sessionStorage.getItem(DRIVER_KEY);
  return info ? JSON.parse(info) : null;
}

export function clearDriverSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(DRIVER_KEY);
}

function storeSession(token, driver) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(DRIVER_KEY, JSON.stringify(driver));
}

// Helper for authenticated requests
async function driverFetch(endpoint, options = {}) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle expired token
    if (response.status === 401) {
      clearDriverSession();
      throw new Error('SESSION_EXPIRED');
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ============================================
// AUTHENTICATION
// ============================================

export async function authenticateDriver(accessToken) {
  const response = await fetch(`${API_BASE}/driver-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  storeSession(data.token, data.driver);
  return data.driver;
}

// ============================================
// SESSION OPERATIONS
// ============================================

export async function getActiveSession() {
  const data = await driverFetch('/driver/temp-log', {
    method: 'POST',
    body: JSON.stringify({ action: 'getActiveSession' })
  });
  return data.session;
}

export async function createSession(vehicleId = null, notes = null) {
  const data = await driverFetch('/driver/temp-log', {
    method: 'POST',
    body: JSON.stringify({
      action: 'createSession',
      data: { vehicleId, notes }
    })
  });
  return data.session;
}

export async function completeSession(sessionId) {
  const data = await driverFetch('/driver/temp-log', {
    method: 'POST',
    body: JSON.stringify({
      action: 'completeSession',
      id: sessionId
    })
  });
  return data.session;
}

export async function getSessionHistory() {
  const data = await driverFetch('/driver/temp-log', {
    method: 'POST',
    body: JSON.stringify({ action: 'getSessionHistory' })
  });
  return data.sessions;
}

// ============================================
// ENTRY OPERATIONS
// ============================================

export async function addEntry({
  sessionId,
  entryType,
  temperature,
  locationName = null,
  photoUrl = null,
  notes = null
}) {
  const data = await driverFetch('/driver/temp-log', {
    method: 'POST',
    body: JSON.stringify({
      action: 'addEntry',
      data: { sessionId, entryType, temperature, locationName, photoUrl, notes }
    })
  });
  return data.entry;
}

export async function updateEntry(entryId, updates) {
  const data = await driverFetch('/driver/temp-log', {
    method: 'POST',
    body: JSON.stringify({
      action: 'updateEntry',
      data: { entryId, ...updates }
    })
  });
  return data.entry;
}

export async function deleteEntry(entryId) {
  await driverFetch('/driver/temp-log', {
    method: 'POST',
    body: JSON.stringify({
      action: 'deleteEntry',
      data: { entryId }
    })
  });
}

// ============================================
// PHOTO UPLOAD
// ============================================

export async function uploadPhoto(file, sessionId, entryId) {
  // Import supabase client
  const { supabase } = await import('./supabaseClient');

  const driver = getStoredDriver();
  if (!driver) throw new Error('No driver session');

  const fileName = `${driver.id}/${sessionId}/${entryId}_${Date.now()}.jpg`;

  console.log('[Photo Upload] Uploading to:', fileName);

  const { data, error } = await supabase.storage
    .from('temp-logs')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('[Photo Upload] Error:', error);
    throw error;
  }

  console.log('[Photo Upload] Success:', data);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('temp-logs')
    .getPublicUrl(fileName);

  console.log('[Photo Upload] Public URL:', urlData.publicUrl);

  return urlData.publicUrl;
}
