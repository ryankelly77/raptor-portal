import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  authenticateDriver,
  getStoredToken,
  getStoredDriver,
  clearDriverSession,
  getActiveSession,
  createSession,
  completeSession,
  addEntry,
  updateEntry,
  deleteEntry,
  uploadPhoto
} from './driverApi';
import './DriverTempLog.css';

// HEIC conversion (same as Admin.js)
let heic2any;
try {
  heic2any = require('heic2any');
} catch (e) {
  console.log('heic2any not available');
}

async function convertHeicToJpeg(file) {
  if (!heic2any) return file;
  if (!file.name.toLowerCase().endsWith('.heic')) return file;

  try {
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8
    });
    return new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    return file;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DriverTempLog() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driver, setDriver] = useState(null);
  const [session, setSession] = useState(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryType, setEntryType] = useState('pickup');
  const [properties, setProperties] = useState([]);
  const [completedSession, setCompletedSession] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('Personal vehicle w/ electric coolers');

  // Vehicle options
  const vehicleOptions = [
    'Personal vehicle w/ electric coolers',
    'Refrigerated trailer',
    'Refrigerated van'
  ];

  // Load properties for location dropdown
  const loadProperties = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('properties')
        .select('id, name, address, city, state')
        .order('name');
      setProperties(data || []);
    } catch (err) {
      console.error('Error loading properties:', err);
    }
  }, []);

  // Load session on mount
  const loadSession = useCallback(async () => {
    try {
      const activeSession = await getActiveSession();
      setSession(activeSession);
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        setDriver(null);
        setError('Session expired. Please log in again.');
      } else {
        setError(err.message);
      }
    }
  }, []);

  // Authenticate on mount if we have a URL token
  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);

      // Check for existing session
      const existingToken = getStoredToken();
      const existingDriver = getStoredDriver();

      if (existingToken && existingDriver) {
        setDriver(existingDriver);
        await loadSession();
        await loadProperties();
        setLoading(false);
        return;
      }

      // If URL token provided, authenticate
      if (urlToken) {
        try {
          const driverInfo = await authenticateDriver(urlToken);
          setDriver(driverInfo);
          await loadSession();
          await loadProperties();
        } catch (err) {
          setError(err.message);
        }
      }

      setLoading(false);
    }

    init();
  }, [urlToken, loadSession]);

  // Handle logout
  const handleLogout = () => {
    clearDriverSession();
    setDriver(null);
    setSession(null);
    navigate('/driver');
  };

  // Start new session
  const handleStartSession = async (vehicle = selectedVehicle) => {
    try {
      setLoading(true);
      const newSession = await createSession(vehicle);
      setSession({ ...newSession, entries: [] });
      setShowAddEntry(true);
      setEntryType('pickup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete session
  const handleCompleteSession = async () => {
    if (!session) return;

    if (!window.confirm('Complete this delivery run? You will not be able to add more entries.')) {
      return;
    }

    try {
      setLoading(true);
      await completeSession(session.id);
      // Store the completed session for the summary page
      setCompletedSession(session);
      setSession(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start new session after completion - go back to session start screen
  const handleStartNewSession = () => {
    setCompletedSession(null);
    // This will show the no-session screen where they can select vehicle
  };

  // Add entry
  const handleAddEntry = async (entryData) => {
    try {
      setLoading(true);
      const entry = await addEntry({
        sessionId: session.id,
        ...entryData
      });
      setSession(prev => ({
        ...prev,
        entries: [...(prev.entries || []), entry]
      }));
      setShowAddEntry(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Delete this entry?')) return;

    try {
      await deleteEntry(entryId);
      setSession(prev => ({
        ...prev,
        entries: prev.entries.filter(e => e.id !== entryId)
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="driver-container">
        <div className="driver-loading">Loading...</div>
      </div>
    );
  }

  // Not logged in - show login prompt
  if (!driver) {
    return (
      <div className="driver-container">
        <div className="driver-login">
          <img src="/logo-dark.png" alt="Raptor Vending" className="driver-logo" />
          <h1>Temperature Log</h1>
          <p className="driver-subtitle">Enter your access token to continue</p>
          {error && <div className="driver-error">{error}</div>}
          <LoginForm onSuccess={(d) => {
            setDriver(d);
            setError(null);
            loadSession();
            loadProperties();
          }} />
        </div>
      </div>
    );
  }

  // Logged in
  return (
    <div className="driver-container">
      <header className="driver-header">
        <div className="driver-header-left">
          <img src="/logo-dark.png" alt="Raptor Vending" className="driver-logo-small" />
          <span className="driver-name">{driver.name}</span>
        </div>
        <button onClick={handleLogout} className="driver-logout-btn">Logout</button>
      </header>

      {error && <div className="driver-error">{error}</div>}

      <main className="driver-main">
        {completedSession ? (
          // Session completed - show summary
          <div className="driver-completed">
            <div className="driver-branding">
              <img src="/logo-dark.png" alt="Raptor Vending" />
              <h1>Session complete, {driver?.name?.split(' ')[0] || 'Driver'}!</h1>
            </div>
            <div className="completed-summary">
              <div className="completed-stat">
                <span className="stat-value">{completedSession.entries?.length || 0}</span>
                <span className="stat-label">Stops Logged</span>
              </div>
              {completedSession.entries && completedSession.entries.length > 1 && (() => {
                const times = completedSession.entries.map(e => new Date(e.timestamp).getTime());
                const firstTime = Math.min(...times);
                const lastTime = Math.max(...times);
                const diffMs = lastTime - firstTime;
                const diffMins = Math.round(diffMs / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                return (
                  <div className="completed-stat">
                    <span className="stat-value">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</span>
                    <span className="stat-label">Total Time</span>
                  </div>
                );
              })()}
            </div>
            <p className="completed-message">Great job! Your temperature log has been saved.</p>
            <button onClick={handleStartNewSession} className="driver-btn driver-btn-primary driver-btn-large">
              Start New Session
            </button>
            <button onClick={() => setCompletedSession(null)} className="driver-btn driver-btn-secondary" style={{marginTop: '12px'}}>
              Back to Home
            </button>
          </div>
        ) : !session ? (
          // No active session
          <div className="driver-no-session">
            <div className="driver-branding">
              <img src="/logo-dark.png" alt="Raptor Vending" />
              <h1>Temperature Log</h1>
            </div>
            <h2>No Active Session</h2>
            <p>Start a new delivery run to begin logging temperatures.</p>
            <div className="vehicle-select-group">
              <label>Vehicle</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="driver-select"
              >
                {vehicleOptions.map(vehicle => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
            </div>
            <button onClick={() => handleStartSession()} className="driver-btn driver-btn-primary driver-btn-large">
              Start New Session
            </button>
          </div>
        ) : (
          // Active session
          <div className="driver-session">
            <div className="driver-session-header">
              <h2>Active Session</h2>
              <span className="driver-session-date">
                {new Date(session.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Entry timeline */}
            <div className="driver-entries">
              {(!session.entries || session.entries.length === 0) ? (
                <div className="driver-no-entries">
                  <p>No entries yet. Start by logging the pickup temperature.</p>
                </div>
              ) : (
                session.entries.map((entry, index) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    index={index}
                    onDelete={() => handleDeleteEntry(entry.id)}
                  />
                ))
              )}
            </div>

            {/* Add entry form */}
            {showAddEntry ? (
              <AddEntryForm
                entryType={entryType}
                sessionId={session.id}
                properties={properties}
                onSubmit={handleAddEntry}
                onCancel={() => setShowAddEntry(false)}
              />
            ) : (
              <div className="driver-actions">
                {!session.entries?.some(e => e.entry_type === 'pickup') ? (
                  <button
                    onClick={() => { setEntryType('pickup'); setShowAddEntry(true); }}
                    className="driver-btn driver-btn-primary"
                  >
                    Log Pickup Temperature
                  </button>
                ) : (
                  <button
                    onClick={() => { setEntryType('delivery'); setShowAddEntry(true); }}
                    className="driver-btn driver-btn-primary"
                  >
                    Log Delivery Stop
                  </button>
                )}
                <button
                  onClick={handleCompleteSession}
                  className="driver-btn driver-btn-secondary"
                >
                  Complete Session
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// LOGIN FORM
// ============================================

function LoginForm({ onSuccess }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError('');

    try {
      const driver = await authenticateDriver(token.trim());
      onSuccess(driver);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="driver-login-form">
      <input
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Enter access token"
        className="driver-input"
        autoComplete="off"
        autoCapitalize="off"
      />
      {error && <div className="driver-form-error">{error}</div>}
      <button
        type="submit"
        disabled={loading || !token.trim()}
        className="driver-btn driver-btn-primary"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// ============================================
// ENTRY CARD
// ============================================

function EntryCard({ entry, index, onDelete }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const isPickup = entry.entry_type === 'pickup';
  const tempClass = entry.temperature > 41 ? 'temp-warning' : 'temp-ok';

  // Parse location name and address (format: "Name | Address")
  let locationName = '';
  let locationAddress = '';
  if (entry.location_name) {
    const parts = entry.location_name.split(' | ');
    locationName = parts[0];
    locationAddress = parts[1] || '';
  }

  return (
    <div className={`driver-entry-card ${isPickup ? 'entry-pickup' : 'entry-delivery'}`}>
      <div className="entry-header">
        <span className="entry-type">
          {isPickup ? 'Pickup' : `Delivery #${entry.stop_number}`}
        </span>
        <span className="entry-time">{time}</span>
      </div>

      <div className="entry-body">
        <div className={`entry-temp ${tempClass}`}>
          {entry.temperature}°F
        </div>
        {locationName && (
          <div className="entry-location">
            <div className="entry-location-name">{locationName}</div>
            {locationAddress && <div className="entry-location-address">{locationAddress}</div>}
          </div>
        )}
        {entry.notes && (
          <div className="entry-notes">{entry.notes}</div>
        )}
        {entry.photo_url && (
          <div className="entry-photos">
            {entry.photo_url.split(' | ').map((url, idx) => (
              <img key={idx} src={url} alt={`Entry photo ${idx + 1}`} className="entry-photo" />
            ))}
          </div>
        )}
      </div>

      <div className="entry-footer">
        <button onClick={onDelete} className="entry-delete-btn">Delete</button>
      </div>
    </div>
  );
}

// ============================================
// ADD ENTRY FORM
// ============================================

function AddEntryForm({ entryType, sessionId, properties, onSubmit, onCancel }) {
  const isPickup = entryType === 'pickup';
  const [temperature, setTemperature] = useState(35);
  const [locationName, setLocationName] = useState(isPickup ? 'Kitchen, 2020 Broadway' : '');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  const adjustTemp = (amount) => {
    setTemperature(prev => Math.max(-40, Math.min(200, prev + amount)));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert HEIC if needed
    const converted = await convertHeicToJpeg(file);
    setPhotos(prev => [...prev, converted]);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreviews(prev => [...prev, reader.result]);
    reader.readAsDataURL(converted);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const temp = parseFloat(temperature);
    if (isNaN(temp) || temp < -40 || temp > 200) {
      alert('Please enter a valid temperature');
      return;
    }

    const entryData = {
      entryType,
      temperature: temp,
      locationName: locationName.trim() || null,
      notes: notes.trim() || null,
      photoUrl: null
    };

    // Upload photos if present
    if (photos.length > 0) {
      setUploading(true);
      try {
        const photoUrls = [];
        for (let i = 0; i < photos.length; i++) {
          const tempId = `temp_${Date.now()}_${i}`;
          const url = await uploadPhoto(photos[i], sessionId, tempId);
          photoUrls.push(url);
        }
        // Join multiple URLs with a pipe separator
        entryData.photoUrl = photoUrls.join(' | ');
      } catch (err) {
        console.error('Photo upload failed:', err);
        alert(`Photo upload failed: ${err.message}. Entry will be saved without photos.`);
      }
      setUploading(false);
    }

    onSubmit(entryData);
  };

  return (
    <form onSubmit={handleSubmit} className="driver-entry-form">
      <h3>{isPickup ? 'Log Pickup' : 'Log Delivery'}</h3>

      <div className="form-group">
        <label>Temperature (°F)</label>
        <div className="temp-control">
          <button type="button" className="temp-btn temp-minus" onClick={() => adjustTemp(-1)}>−</button>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
            step="1"
            inputMode="numeric"
            className="driver-input driver-input-temp"
          />
          <button type="button" className="temp-btn temp-plus" onClick={() => adjustTemp(1)}>+</button>
        </div>
        {temperature > 41 && (
          <div className="form-warning">Temperature above 41°F</div>
        )}
      </div>

      <div className="form-group">
        <label>{isPickup ? 'Pickup Location' : 'Delivery Location'}</label>
        {isPickup ? (
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="driver-input"
            placeholder="Kitchen, 2020 Broadway"
          />
        ) : (
          <select
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="driver-select"
          >
            <option value="">Select property...</option>
            {properties.map(prop => {
              const addr = [prop.address, prop.city, prop.state].filter(Boolean).join(', ');
              const fullValue = addr ? `${prop.name} | ${addr}` : prop.name;
              return (
                <option key={prop.id} value={fullValue}>{prop.name}</option>
              );
            })}
          </select>
        )}
      </div>

      <div className="form-group">
        <label>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          className="driver-textarea"
          rows={2}
        />
      </div>

      <div className="form-group">
        <label>Photos (optional)</label>
        <input
          type="file"
          accept="image/*,.heic"
          capture="environment"
          onChange={handlePhotoChange}
          className="driver-file-input"
        />
        {photoPreviews.length > 0 && (
          <div className="photo-previews">
            {photoPreviews.map((preview, index) => (
              <div key={index} className="photo-preview-item">
                <img src={preview} alt={`Preview ${index + 1}`} className="photo-preview" />
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={() => removePhoto(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length > 0 && (
          <div className="photo-count">{photos.length} photo{photos.length > 1 ? 's' : ''} added</div>
        )}
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="driver-btn driver-btn-cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploading || !temperature}
          className="driver-btn driver-btn-primary"
        >
          {uploading ? 'Uploading...' : 'Save Entry'}
        </button>
      </div>
    </form>
  );
}
