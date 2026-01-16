import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchProjectByToken, fetchProjectsByPMToken, recordSurveyClick, updateTask } from './supabaseClient';
import Admin from './Admin';
import './App.css';

// ============================================
// HELPERS
// ============================================
function formatDisplayDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// ============================================
// ICONS
// ============================================
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const FridgeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <line x1="4" y1="8" x2="20" y2="8"/>
    <line x1="12" y1="14" x2="12" y2="16"/>
  </svg>
);

const CookerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const EnclosureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 21V9"/>
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

// Logo component - variant: 'light' for dark bg, 'dark' for light bg
const Logo = ({ variant = 'light', height = 120 }) => (
  <img
    src={variant === 'light' ? '/logo-light.png' : '/logo-dark.png'}
    alt="Raptor Vending"
    className="logo-img"
    style={{ height: `${height}px`, width: 'auto' }}
  />
);

// ============================================
// SHARED COMPONENTS
// ============================================
function Header({ project, showLogo = true }) {
  return (
    <header className="widget-header">
      {showLogo ? (
        <div className="header-top">
          <Logo variant="light" height={100} />
          <div className="project-id">Project #{project.id}</div>
        </div>
      ) : (
        <div className="header-top-compact">
          <h1 className="location-name">{project.propertyName}</h1>
          <span className="project-id">Project #{project.id}</span>
        </div>
      )}

      {showLogo && <h1 className="location-name">{project.propertyName}</h1>}
      <p className="location-address">{project.address}</p>
      {project.locationName && (
        <p className="location-address" style={{ marginTop: '-20px', opacity: 0.9 }}>
          Location: {project.locationName} {project.locationFloor && `(Floor ${project.locationFloor})`}
        </p>
      )}

      <div className="header-meta">
        <div className="meta-item">
          <span className="meta-label">Building Size</span>
          <span className="meta-value">{project.employeeCount} Employees</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Configuration</span>
          <span className="meta-value">{project.configuration}</span>
        </div>
      </div>
    </header>
  );
}

function OverallProgress({ progress, estimatedCompletion, daysRemaining }) {
  return (
    <div className="overall-progress">
      <div className="overall-progress-header">
        <span className="overall-progress-label">Overall Installation Progress</span>
        <span className="overall-progress-percent">{progress}%</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="estimated-completion">
        Estimated completion: <strong>{estimatedCompletion}</strong>
        {daysRemaining > 0 && ` (${daysRemaining} days remaining)`}
      </div>
    </div>
  );
}

function TaskItem({ task, globalDocuments, readOnly = false }) {
  // Hide ADMIN-DOC tasks until document is uploaded
  if (task.label.startsWith('[ADMIN-DOC]') && !task.document_url) {
    return null;
  }

  // Hide PM tasks from regular task list (shown in PM Action Items section)
  if (task.label.startsWith('[PM-TEXT]') || task.label.startsWith('[PM]')) {
    return null;
  }

  // Clean up label by removing prefixes
  let displayLabel = task.label
    .replace('[PM] ', '')
    .replace('[PM-DATE] ', '')
    .replace('[PM-TEXT] ', '')
    .replace('[ADMIN-DATE] ', '')
    .replace('[ADMIN-SPEED] ', '')
    .replace('[ADMIN-ENCLOSURE] ', '')
    .replace('[ADMIN-EQUIPMENT] ', '')
    .replace('[ADMIN-DELIVERY] ', '')
    .replace('[ADMIN-DOC] ', '');

  // Handle equipment task - build dynamic label
  const isAdminEquipment = task.label.startsWith('[ADMIN-EQUIPMENT]');
  if (isAdminEquipment && (task.smartfridge_qty || task.smartcooker_qty)) {
    const parts = [];
    if (task.smartfridge_qty > 0) {
      parts.push(`(${task.smartfridge_qty}) SmartFridge™`);
    }
    if (task.smartcooker_qty > 0) {
      parts.push(`(${task.smartcooker_qty}) SmartCooker™`);
    }
    if (parts.length > 0) {
      displayLabel = parts.join(' and ') + ' ordered';
    }
  }

  // Handle delivery task - build dynamic label with date, carrier, tracking
  const isAdminDelivery = task.label.startsWith('[ADMIN-DELIVERY]');
  const deliveries = task.deliveries || [];
  const hasDeliveryData = isAdminDelivery && deliveries.length > 0;

  // Check if this is an admin date task
  const isAdminDate = task.label.startsWith('[ADMIN-DATE]');
  if (isAdminDate) {
    if (task.scheduled_date) {
      const date = new Date(task.scheduled_date + 'T00:00:00');
      const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      displayLabel = displayLabel + ' — ' + formatted;
    } else {
      displayLabel = displayLabel + ' — Pending';
    }
  }

  // Check if this is an admin speed task
  const isAdminSpeed = task.label.startsWith('[ADMIN-SPEED]');
  const hasSpeedData = isAdminSpeed && (task.upload_speed || task.download_speed);
  const uploadBelowMin = task.upload_speed && parseFloat(task.upload_speed) < 10;
  const downloadBelowMin = task.download_speed && parseFloat(task.download_speed) < 10;
  const speedWarning = hasSpeedData && (uploadBelowMin || downloadBelowMin);

  // Check if this is an admin enclosure task
  const isAdminEnclosure = task.label.startsWith('[ADMIN-ENCLOSURE]');
  const hasEnclosureData = isAdminEnclosure && task.enclosure_type;
  const isCustomColor = task.enclosure_type === 'custom' && task.enclosure_color === 'other';

  // Check if this is an admin doc task (like COI upload)
  const isAdminDoc = task.label.startsWith('[ADMIN-DOC]');
  const hasDocData = isAdminDoc && task.document_url;
  const isCOITask = isAdminDoc && task.label.toLowerCase().includes('coi');

  // For COI tasks with document, replace the label entirely
  if (isCOITask && hasDocData) {
    displayLabel = 'Download Certificate of Insurance (COI)';
  }

  const getEnclosureLabel = () => {
    if (!task.enclosure_type) return null;
    if (task.enclosure_type === 'wrap') return 'Magnetic Wrap';
    if (task.enclosure_type === 'custom') {
      const colorLabels = {
        'dove_grey': 'Dove Grey',
        'macchiato': 'Macchiato',
        'black': 'Black',
        'other': task.custom_color_name || 'Custom Color'
      };
      return `Custom Architectural Enclosure — ${colorLabels[task.enclosure_color] || 'Color TBD'}`;
    }
    return null;
  };

  return (
    <div className={`subtask ${task.completed ? 'completed' : ''} ${isAdminSpeed || isAdminEnclosure || hasDeliveryData ? 'has-detail-box' : ''}`}>
      <div className={`subtask-checkbox ${task.completed ? 'completed' : 'pending'}`}>
        {task.completed && <CheckIcon />}
      </div>
      <div className="subtask-content">
        <span className="subtask-label">
          {isCOITask && hasDocData ? (
            readOnly ? (
              <span
                className="coi-download-link"
                style={{ cursor: 'pointer' }}
                onClick={() => alert('Only Property Managers or Raptor Vending can access these documents.')}
              >
                {displayLabel}
              </span>
            ) : (
              <a href={task.document_url} target="_blank" rel="noopener noreferrer" className="coi-download-link">
                {displayLabel}
              </a>
            )
          ) : (
            displayLabel
          )}
          {isAdminSpeed && !hasSpeedData && !task.completed && (
            <span className="speed-pending"> — Pending</span>
          )}
          {isAdminEnclosure && !hasEnclosureData && !task.completed && (
            <span className="speed-pending"> — Pending</span>
          )}
          {hasDocData && !isCOITask && (
            readOnly ? (
              <span
                className="task-doc-link"
                style={{ cursor: 'pointer' }}
                onClick={() => alert('Only Property Managers or Raptor Vending can access these documents.')}
              >
                (View Document)
              </span>
            ) : (
              <a href={task.document_url} target="_blank" rel="noopener noreferrer" className="task-doc-link">
                (View Document)
              </a>
            )
          )}
        </span>
        {hasSpeedData && (
          <div className={`speed-results-box ${speedWarning ? 'warning' : 'success'}`}>
            <div className="speed-values">
              <div className={`speed-value ${uploadBelowMin ? 'below-min' : ''}`}>
                <span className="speed-label">Upload:</span>
                <span className="speed-number">{task.upload_speed || '—'} Mbps</span>
              </div>
              <div className={`speed-value ${downloadBelowMin ? 'below-min' : ''}`}>
                <span className="speed-label">Download:</span>
                <span className="speed-number">{task.download_speed || '—'} Mbps</span>
              </div>
            </div>
            {speedWarning && (
              <div className="speed-warning">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>This location will require network drops due to a cellular signal less than the minimum speed required to run transactions without issues.</span>
              </div>
            )}
          </div>
        )}
        {hasEnclosureData && (
          <EnclosureInfoBox
            enclosureLabel={getEnclosureLabel()}
            isCustomColor={isCustomColor}
          />
        )}
        {hasDeliveryData && (
          <div className="delivery-results-box">
            {deliveries.filter(d => d.equipment).map((delivery, idx) => (
              <div key={idx} className="delivery-item">
                <div className="delivery-equipment">{delivery.equipment}</div>
                <div className="delivery-values">
                  {delivery.date && (
                    <div className="delivery-value">
                      <span className="delivery-label">Date:</span>
                      <span className="delivery-data">{new Date(delivery.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  {delivery.carrier && (
                    <div className="delivery-value">
                      <span className="delivery-label">Carrier:</span>
                      <span className="delivery-data">{delivery.carrier}</span>
                    </div>
                  )}
                  {delivery.tracking && (
                    <div className="delivery-value">
                      <span className="delivery-label">Tracking #:</span>
                      <span className="delivery-data">{delivery.tracking}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="delivery-note">
              Note: the equipment delivery date may not be the same date as the official install of the equipment. See System Installation below.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Survey link for in-progress survey phases
function EnclosureInfoBox({ enclosureLabel, isCustomColor }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className={`enclosure-results-box ${isCustomColor ? 'custom-color' : ''}`}>
        <div className="enclosure-value">
          <span className="enclosure-type-label">
            This location is getting: {enclosureLabel}
            <button className="whats-this-link" onClick={() => setShowModal(true)}>what's this?</button>
          </span>
        </div>
        {isCustomColor && (
          <div className="enclosure-warning">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Please allow additional 4-6 weeks for custom color enclosures.</span>
          </div>
        )}
      </div>
      {showModal && (
        <div className="enclosure-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="enclosure-modal" onClick={(e) => e.stopPropagation()}>
            <button className="enclosure-modal-close" onClick={() => setShowModal(false)}>×</button>
            <img
              src="https://xfkjszbkcmuumzjbnuev.supabase.co/storage/v1/object/public/project-files/pic%20of%20custom%20enclosure.png"
              alt="Custom Enclosure Example"
            />
          </div>
        </div>
      )}
    </>
  );
}

function SurveyCallToAction({ surveyToken, surveyClicks, surveyCompletions, pmTask, onTaskUpdate, readOnly = false }) {
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const baseUrl = window.location.origin;
  const surveyUrl = surveyToken
    ? `${baseUrl}/survey/${surveyToken}`
    : 'https://raptor-vending.com/building-survey/';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const showReadOnlyMessage = () => {
    alert('Only Property Managers or Raptor Vending can complete tasks.');
  };

  const handleTaskToggle = async () => {
    if (readOnly) { showReadOnlyMessage(); return; }
    if (!pmTask || updating || pmTask.completed) return; // Don't allow unchecking
    setUpdating(true);
    try {
      await updateTask(pmTask.id, { completed: true });
      if (onTaskUpdate) onTaskUpdate();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="survey-cta">
      <div className="notice-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>Property Manager Action Items</span>
      </div>
      <div className="survey-cta-content">
        <p>Copy this link and share with building tenants to capture their snack and meal preferences:</p>
        <div className="survey-url-field">
          <input type="text" value={readOnly ? '(hidden)' : surveyUrl} readOnly style={readOnly ? { color: '#999', fontStyle: 'italic' } : {}} />
          <button className="copy-btn" onClick={readOnly ? undefined : handleCopy} title="Copy to clipboard" disabled={readOnly} style={readOnly ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
        </div>

        {/* PM Action Item */}
        {pmTask && (
          <div
            className={`pm-action-item ${pmTask.completed ? 'completed' : ''}`}
            onClick={handleTaskToggle}
          >
            <div className={`pm-checkbox ${pmTask.completed ? 'checked' : ''}`}>
              {pmTask.completed && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <span className="pm-action-label">
              {pmTask.completed ? 'Survey link distributed to tenants' : 'Click here once you\'ve shared the survey with tenants'}
            </span>
          </div>
        )}

        {(surveyClicks > 0 || surveyCompletions > 0) && (
          <div className="survey-stats">
            <span><strong>{surveyClicks || 0}</strong> clicks</span>
            <span><strong>{surveyCompletions || 0}</strong> completed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SurveyResults({ results }) {
  return (
    <div className="survey-results">
      <div className="survey-results-header">
        <ChartIcon />
        <span>Survey Results</span>
        <span className="response-rate">{results.responseRate} response rate</span>
      </div>
      <div className="survey-grid">
        <div className="survey-item">
          <span className="survey-item-label">Top Meal Choices</span>
          <ul>
            {results.topMeals.map((meal, idx) => (
              <li key={idx}>{meal}</li>
            ))}
          </ul>
        </div>
        <div className="survey-item">
          <span className="survey-item-label">Top Snack Choices</span>
          <ul>
            {results.topSnacks.map((snack, idx) => (
              <li key={idx}>{snack}</li>
            ))}
          </ul>
        </div>
      </div>
      {results.dietaryNotes && (
        <div className="dietary-note">{results.dietaryNotes}</div>
      )}
    </div>
  );
}

function PropertyNotice({ contractorInfo, tasks = [], onRefresh, document, globalDocuments, readOnly = false }) {
  // Use global electrical specs if available, otherwise fall back to phase document
  const specsDoc = globalDocuments?.electrical_specs?.url
    ? globalDocuments.electrical_specs
    : document;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [updating, setUpdating] = useState(null);

  // Filter to only PM-actionable tasks, keeping original sort order
  const pmActionTasks = tasks.filter(t => t.label.startsWith('[PM]') || t.label.startsWith('[PM-DATE]') || t.label.startsWith('[PM-TEXT]'));

  const showReadOnlyMessage = () => {
    alert('Only Property Managers or Raptor Vending can complete tasks.');
  };

  const handleTaskToggle = async (task) => {
    if (readOnly) { showReadOnlyMessage(); return; }
    if (updating || task.completed) return;
    setUpdating(task.id);
    try {
      await updateTask(task.id, { completed: true });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleDateTaskComplete = async (task) => {
    if (!selectedDate || updating) return;
    setUpdating(task.id);
    try {
      await updateTask(task.id, { completed: true });
      if (onRefresh) onRefresh();
      setShowDatePicker(false);
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setUpdating(null);
    }
  };

  const getTaskLabel = (label) => {
    return label.replace('[PM] ', '').replace('[PM-DATE] ', '').replace('[PM-TEXT] ', '');
  };

  const getPromptForTask = (task) => {
    if (task.label.includes('quotes')) return 'Click here once you\'ve obtained contractor quotes';
    if (task.label.includes('installed')) return 'Click here once all electrical and optional networking is installed';
    if (task.label.startsWith('[PM-DATE]')) return 'Click here once contractor is selected and install is scheduled';
    return 'Click to mark complete';
  };

  return (
    <div className="property-notice">
      <div className="notice-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>Property Manager Action Items</span>
      </div>
      <p>Property is responsible for infrastructure preparation—dedicated 15A circuit for Smart Cooker™ and <strong>optional</strong> ethernet drops for real-time operations. We provide specifications; property team coordinates contractor quotes and installation.</p>

      {specsDoc?.url && (
        readOnly ? (
          <span
            className="spec-sheet-btn"
            style={{ cursor: 'pointer' }}
            onClick={() => alert('Only Property Managers or Raptor Vending can access these documents.')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download the Electrical and Networking Specifications
          </span>
        ) : (
          <a href={specsDoc.url} target="_blank" rel="noopener noreferrer" className="spec-sheet-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download the Electrical and Networking Specifications
          </a>
        )
      )}

      {/* PM Action Items - rendered in database sort order */}
      <div className="pm-action-items">
        {pmActionTasks.map((task, idx) => {
          // Each task depends on the previous PM task being completed
          const prevTask = idx > 0 ? pmActionTasks[idx - 1] : null;
          const isDisabled = prevTask && !prevTask.completed;
          const isClickable = !readOnly && !isDisabled;
          const isDateTask = task.label.startsWith('[PM-DATE]');

          // Date task that needs date picker
          if (isDateTask && !task.completed) {
            if (showDatePicker === task.id) {
              return (
                <div key={task.id} className="pm-date-picker">
                  <label>Scheduled Installation Date:</label>
                  <div className="pm-date-input-row">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <button
                      className="pm-date-confirm"
                      onClick={() => handleDateTaskComplete(task)}
                      disabled={isDisabled || !selectedDate || updating}
                    >
                      Confirm
                    </button>
                    <button
                      className="pm-date-cancel"
                      onClick={() => setShowDatePicker(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={task.id}
                className={`pm-action-item electrical ${isDisabled ? 'disabled' : ''}`}
                onClick={() => isClickable && setShowDatePicker(task.id)}
              >
                <div className="pm-checkbox"></div>
                <span className="pm-action-label">{getPromptForTask(task)}</span>
              </div>
            );
          }

          // Regular PM task or completed date task
          return (
            <div
              key={task.id}
              className={`pm-action-item electrical ${task.completed ? 'completed' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => isClickable && !task.completed && handleTaskToggle(task)}
            >
              <div className={`pm-checkbox ${task.completed ? 'checked' : ''}`}>
                {task.completed && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <span className="pm-action-label">
                {task.completed ? getTaskLabel(task.label) : getPromptForTask(task)}
              </span>
            </div>
          );
        })}
      </div>

      {contractorInfo && (
        <div className="contractor-info">
          <span className="contractor-label">Selected Contractor:</span>
          <span className="contractor-name">{contractorInfo.name}</span>
          <span className="contractor-date">Scheduled: {contractorInfo.scheduledDate}</span>
        </div>
      )}

    </div>
  );
}

function BuildingAccessNotice({ tasks = [], onRefresh, globalDocuments, readOnly = false }) {
  const [updating, setUpdating] = useState(null);
  const [textValues, setTextValues] = useState({});
  const [coiForm, setCoiForm] = useState({ buildingName: '', careOf: '', street: '', city: '', state: '', zip: '' });

  // Filter to only PM-actionable tasks (including text input tasks)
  const pmTasks = tasks.filter(t => t.label.startsWith('[PM]') || t.label.startsWith('[PM-TEXT]'));

  // Initialize text values from tasks
  React.useEffect(() => {
    const initialValues = {};
    tasks.forEach(t => {
      if (t.label.startsWith('[PM-TEXT]')) {
        // Try to parse JSON for COI form data
        if (t.pm_text_value) {
          try {
            const parsed = JSON.parse(t.pm_text_value);
            if (parsed.buildingName) {
              setCoiForm(parsed);
            }
          } catch {
            // Not JSON, use as plain text (legacy)
            initialValues[t.id] = t.pm_text_value || '';
          }
        }
      }
    });
    setTextValues(initialValues);
  }, [tasks]);

  const showReadOnlyMessage = () => {
    alert('Only Property Managers or Raptor Vending can complete tasks.');
  };

  const handleTaskToggle = async (task) => {
    if (readOnly) { showReadOnlyMessage(); return; }
    if (updating || task.completed) return;
    setUpdating(task.id);
    try {
      await updateTask(task.id, { completed: true });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleCoiFormComplete = async (task) => {
    if (readOnly) { showReadOnlyMessage(); return; }
    if (!coiForm.buildingName.trim() || updating) return;
    setUpdating(task.id);
    try {
      await updateTask(task.id, { completed: true, pm_text_value: JSON.stringify(coiForm) });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleTextTaskComplete = async (task) => {
    if (readOnly) { showReadOnlyMessage(); return; }
    const textValue = textValues[task.id];
    if (!textValue || !textValue.trim() || updating) return;
    setUpdating(task.id);
    try {
      await updateTask(task.id, { completed: true, pm_text_value: textValue.trim() });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setUpdating(null);
    }
  };

  const formatCoiDisplay = (pmTextValue) => {
    try {
      const data = JSON.parse(pmTextValue);
      const lines = [];
      if (data.buildingName) lines.push(data.buildingName);
      if (data.careOf) lines.push(`c/o ${data.careOf}`);
      const addressParts = [data.street, data.city, data.state, data.zip].filter(Boolean);
      if (addressParts.length > 0) {
        lines.push(`${data.street || ''}, ${data.city || ''}, ${data.state || ''} ${data.zip || ''}`.replace(/^, |, $|, ,/g, ''));
      }
      return lines;
    } catch {
      return [pmTextValue];
    }
  };

  const getTaskLabel = (label) => {
    return label.replace('[PM] ', '').replace('[PM-TEXT] ', '');
  };

  const getPromptForTask = (task) => {
    if (task.label.includes('vendor list')) return 'Click once Raptor Vending is added to approved vendor list';
    if (task.label.includes('badges') || task.label.includes('keyfobs')) return 'Click once access credentials are provided';
    if (task.label.includes('Emergency contact')) return 'Click once emergency contact list is provided';
    if (task.label.includes('Loading dock') || task.label.includes('freight elevator')) return 'Click once loading dock/freight elevator access is scheduled';
    return 'Click to mark complete';
  };

  if (pmTasks.length === 0) return null;

  return (
    <div className="building-access-notice">
      <div className="notice-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>Property Manager Action Items</span>
      </div>
      <p>Please complete the following items for building access:</p>

      <div className="pm-action-items">
        {pmTasks.map((task, idx) => {
          const prevTask = idx > 0 ? pmTasks[idx - 1] : null;
          const isDisabled = prevTask && !prevTask.completed;
          const isClickable = !readOnly && !isDisabled;
          const isTextTask = task.label.startsWith('[PM-TEXT]');

          // Text input task (COI form)
          if (isTextTask) {
            const isCoiTask = task.label.toLowerCase().includes('coi') || task.label.toLowerCase().includes('insured');
            const canSubmit = isCoiTask ? coiForm.buildingName.trim() : textValues[task.id]?.trim();

            return (
              <div
                key={task.id}
                className={`pm-action-item access pm-text-task ${task.completed ? 'completed' : ''} ${isDisabled ? 'disabled' : ''}`}
              >
                <div
                  className={`pm-checkbox ${task.completed ? 'checked' : ''}`}
                  onClick={() => {
                    if (readOnly) { showReadOnlyMessage(); return; }
                    if (isClickable && !task.completed && canSubmit) {
                      isCoiTask ? handleCoiFormComplete(task) : handleTextTaskComplete(task);
                    }
                  }}
                >
                  {task.completed && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <div className="pm-text-task-content">
                  <span className="pm-action-label">{getTaskLabel(task.label)}</span>
                  {!task.completed ? (
                    isCoiTask ? (
                      <div className="coi-form">
                        <input
                          type="text"
                          className="coi-form-input"
                          placeholder="Building name"
                          value={coiForm.buildingName}
                          onChange={(e) => setCoiForm({ ...coiForm, buildingName: e.target.value })}
                          disabled={isDisabled}
                        />
                        <input
                          type="text"
                          className="coi-form-input"
                          placeholder="c/o (building owner)"
                          value={coiForm.careOf}
                          onChange={(e) => setCoiForm({ ...coiForm, careOf: e.target.value })}
                          disabled={isDisabled}
                        />
                        <input
                          type="text"
                          className="coi-form-input"
                          placeholder="Street address"
                          value={coiForm.street}
                          onChange={(e) => setCoiForm({ ...coiForm, street: e.target.value })}
                          disabled={isDisabled}
                        />
                        <div className="coi-form-row">
                          <input
                            type="text"
                            className="coi-form-input coi-city"
                            placeholder="City"
                            value={coiForm.city}
                            onChange={(e) => setCoiForm({ ...coiForm, city: e.target.value })}
                            disabled={isDisabled}
                          />
                          <input
                            type="text"
                            className="coi-form-input coi-state"
                            placeholder="State"
                            value={coiForm.state}
                            onChange={(e) => setCoiForm({ ...coiForm, state: e.target.value })}
                            disabled={isDisabled}
                          />
                          <input
                            type="text"
                            className="coi-form-input coi-zip"
                            placeholder="ZIP"
                            value={coiForm.zip}
                            onChange={(e) => setCoiForm({ ...coiForm, zip: e.target.value })}
                            disabled={isDisabled}
                          />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="pm-text-inline-input"
                        placeholder="Enter value"
                        value={textValues[task.id] || ''}
                        onChange={(e) => setTextValues({ ...textValues, [task.id]: e.target.value })}
                        disabled={isDisabled}
                      />
                    )
                  ) : (
                    <div className="pm-text-value">
                      {formatCoiDisplay(task.pm_text_value).map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Regular PM task
          return (
            <div
              key={task.id}
              className={`pm-action-item access ${task.completed ? 'completed' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => {
                if (readOnly) { showReadOnlyMessage(); return; }
                if (isClickable && !task.completed) handleTaskToggle(task);
              }}
            >
              <div className={`pm-checkbox ${task.completed ? 'checked' : ''}`}>
                {task.completed && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <span className="pm-action-label">
                {task.completed ? getTaskLabel(task.label) : getPromptForTask(task)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelinePhase({ phase, phaseNumber, locationImages = [], surveyToken, surveyClicks, surveyCompletions, onRefresh, globalDocuments, readOnly = false }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  const getMarkerContent = () => {
    if (phase.status === 'completed') {
      return <CheckIcon />;
    }
    return phaseNumber;
  };

  return (
    <div className={`timeline-item ${phase.status}`}>
      <div className={`timeline-marker ${phase.status}`}>
        {getMarkerContent()}
      </div>
      <div className="timeline-content">
        <div
          className="phase-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="phase-title-row">
            <div className="phase-title">{phase.title}</div>
            {phase.isApproximate && (
              <span className="approximate-badge">Approximate</span>
            )}
          </div>
          <span className={`phase-status ${phase.status}`}>
            {phase.status === 'completed' ? 'Completed' :
             phase.status === 'in-progress' ? 'In Progress' : 'Pending'}
          </span>
        </div>

        {(phase.startDate || phase.endDate) && (
          <div className="phase-dates">
            {phase.isApproximate ? (
              <span className="approximate-dates">
                {phase.startDate === phase.endDate
                  ? formatDisplayDate(phase.startDate)
                  : `${formatDisplayDate(phase.startDate) || 'TBD'} – ${formatDisplayDate(phase.endDate) || 'TBD'}`}
              </span>
            ) : (
              <span>
                {phase.startDate === phase.endDate
                  ? formatDisplayDate(phase.startDate)
                  : `${formatDisplayDate(phase.startDate) || 'TBD'} – ${formatDisplayDate(phase.endDate) || 'TBD'}`}
              </span>
            )}
          </div>
        )}

        <div className={`phase-details ${isExpanded ? 'expanded' : ''}`}>
          <div className="phase-description">{phase.description}</div>

          {/* Show document link if attached (but not for property responsibility phases - shown in PropertyNotice) */}
          {phase.document && !phase.propertyResponsibility && (
            <div className="phase-document">
              {readOnly ? (
                <span
                  className="document-link"
                  style={{ cursor: 'pointer' }}
                  onClick={() => alert('Only Property Managers or Raptor Vending can access these documents.')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  {phase.document.label}
                </span>
              ) : (
                <a href={phase.document.url} target="_blank" rel="noopener noreferrer" className="document-link">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  {phase.document.label}
                </a>
              )}
            </div>
          )}

          {/* Show site images - prefer phase.documents, fall back to legacy locationImages */}
          {((phase.documents && phase.documents.length > 0) || (locationImages && locationImages.length > 0)) && (
            <div className="phase-images">
              <div className="phase-images-title">Site Photos</div>
              <div className="phase-images-grid">
                {/* Show phase documents first */}
                {phase.documents && phase.documents.map((doc, idx) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url);
                  return isImage ? (
                    <div key={doc.id || idx} className="phase-image-thumb" onClick={() => setPreviewImage(doc.url)}>
                      <img src={doc.url} alt={doc.name} />
                    </div>
                  ) : (
                    <a key={doc.id || idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="phase-doc-thumb">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>{doc.name}</span>
                    </a>
                  );
                })}
                {/* Show legacy location images only if no phase documents */}
                {(!phase.documents || phase.documents.length === 0) && locationImages && locationImages.map((img, idx) => (
                  <div key={idx} className="phase-image-thumb" onClick={() => setPreviewImage(img)}>
                    <img src={img} alt={`Site ${idx + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Preview Modal */}
          {previewImage && (
            <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
              <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
                <button className="image-preview-close" onClick={() => setPreviewImage(null)}>×</button>
                <img src={previewImage} alt="Preview" />
              </div>
            </div>
          )}

          {/* Show survey CTA for survey phase */}
          {phase.title.toLowerCase().includes('survey') && (
            <SurveyCallToAction
              surveyToken={surveyToken}
              surveyClicks={surveyClicks}
              surveyCompletions={surveyCompletions}
              pmTask={phase.tasks.find(t => t.label.startsWith('[PM]'))}
              onTaskUpdate={onRefresh}
              readOnly={readOnly}
            />
          )}

          {phase.propertyResponsibility && (
            <PropertyNotice contractorInfo={phase.contractorInfo} tasks={phase.tasks} onRefresh={onRefresh} document={phase.document} globalDocuments={globalDocuments} readOnly={readOnly} />
          )}

          {/* Building Access & Coordination phase PM tasks */}
          {phase.title.toLowerCase().includes('building access') && (
            <BuildingAccessNotice tasks={phase.tasks} onRefresh={onRefresh} globalDocuments={globalDocuments} readOnly={readOnly} />
          )}

          {phase.surveyResults && (
            <SurveyResults results={phase.surveyResults} />
          )}

          <div className="subtasks">
            <div className="subtasks-title">
              {phase.status === 'completed' ? 'Completed Tasks' :
               phase.status === 'in-progress' ? 'Task Progress' : 'Upcoming Tasks'}
            </div>
            {phase.tasks.map((task, idx) => (
              <TaskItem key={idx} task={task} globalDocuments={globalDocuments} readOnly={readOnly} />
            ))}
          </div>
        </div>

        <button
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : 'Show Details'}
        </button>
      </div>
    </div>
  );
}

function Timeline({ phases, locationImages, surveyToken, surveyClicks, surveyCompletions, onRefresh, globalDocuments, readOnly = false }) {
  return (
    <div className="timeline-section">
      <h2 className="section-title">Installation Timeline</h2>
      <div className="timeline">
        {phases.map((phase, idx) => (
          <TimelinePhase
            key={phase.id}
            phase={phase}
            phaseNumber={idx + 1}
            locationImages={idx === 0 ? locationImages : []}
            surveyToken={surveyToken}
            surveyClicks={surveyClicks}
            surveyCompletions={surveyCompletions}
            onRefresh={onRefresh}
            globalDocuments={globalDocuments}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

function EquipmentCard({ item }) {
  const getIcon = () => {
    if (item.name.includes('Fridge')) return <FridgeIcon />;
    if (item.name.includes('Cooker')) return <CookerIcon />;
    return <EnclosureIcon />;
  };

  const getStatusClass = () => {
    switch (item.status) {
      case 'delivered': return 'delivered';
      case 'ready': return 'ready';
      case 'in-transit': return 'in-transit';
      case 'fabricating': return 'fabricating';
      default: return 'pending';
    }
  };

  return (
    <div className="equipment-card">
      <div className="equipment-icon">
        {getIcon()}
      </div>
      <div className="equipment-name">{item.name}</div>
      <div className="equipment-spec">{item.model} | {item.spec}</div>
      <div className={`equipment-status ${getStatusClass()}`}>
        <span className={`status-dot ${getStatusClass()}`}></span>
        <span>{item.statusLabel}</span>
      </div>
    </div>
  );
}

function EquipmentSection({ equipment }) {
  return (
    <div className="equipment-section">
      <h2 className="section-title">Equipment Status</h2>
      <div className="equipment-grid">
        {equipment.map((item, idx) => (
          <EquipmentCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

function ContactFooter({ projectManager }) {
  return (
    <footer className="contact-section">
      <div className="contact-info">
        <h3>Questions about your installation?</h3>
        <p>
          Contact your project manager {projectManager.name}:{' '}
          <a href={`mailto:${projectManager.email}`}>{projectManager.email}</a> |{' '}
          <a href={`tel:${projectManager.phone.replace(/[^0-9]/g, '')}`}>{projectManager.phone}</a>
        </p>
      </div>
      <a href={`tel:${projectManager.phone.replace(/[^0-9]/g, '')}`} className="contact-btn">
        <PhoneIcon />
        Call Now
      </a>
    </footer>
  );
}

function PoweredBy() {
  return (
    <div className="powered-by">
      <span>Powered by</span>
      <a href="https://raptor-vending.com" target="_blank" rel="noopener noreferrer">
        Raptor Vending
      </a>
      <span className="tagline">Food Infrastructure for Modern Workplaces</span>
    </div>
  );
}

// Send to Phone Modal - QR Code only
function SendToPhoneModal({ isOpen, onClose, url }) {
  if (!isOpen) return null;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  return (
    <div className="send-phone-overlay" onClick={onClose}>
      <div className="send-phone-modal" onClick={(e) => e.stopPropagation()}>
        <button className="send-phone-close" onClick={onClose}>×</button>
        <div className="send-phone-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <path d="M12 18h.01M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
          </svg>
        </div>
        <h3>View on Your Phone</h3>
        <p>Scan this QR code with your phone's camera to open this page.</p>
        <div className="send-phone-qr">
          <img src={qrCodeUrl} alt="QR Code" />
        </div>
        <div className="send-phone-url">
          {url}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PM WELCOME HEADER (desktop)
// ============================================
function PMWelcomeHeader({ project }) {
  // Count all PM tasks across all phases
  const allPmTasks = project.phases.flatMap(phase =>
    (phase.tasks || []).filter(t => t.label.startsWith('[PM]') || t.label.startsWith('[PM-TEXT]'))
  );

  const totalPmTasks = allPmTasks.length;
  const completedPmTasks = allPmTasks.filter(t => t.completed).length;
  const remainingPmTasks = totalPmTasks - completedPmTasks;

  // Get first name from property manager
  const fullName = project.propertyManager?.name || 'Property Manager';
  const firstName = fullName.split(' ')[0];

  // If all tasks done, show completion message
  if (remainingPmTasks === 0 && totalPmTasks > 0) {
    return (
      <div className="pm-welcome-header completed">
        <div className="pm-welcome-inner">
          <span className="pm-welcome-check">✓</span>
          <div className="pm-welcome-text">
            <p>
              <strong>You're all set, {firstName}!</strong> You've completed all your tasks.
              We'll take it from here—a great new amenity is on its way to your tenants.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-welcome-header">
      <div className="pm-welcome-inner">
        <div className="pm-welcome-text">
          <p>
            <strong>Welcome, {firstName}!</strong> We're excited to bring Raptor infrastructure to your building.
            Your part is simple: just {remainingPmTasks} of {totalPmTasks} items, marked below. Check them off as you go—we'll take care of everything else. A great new amenity is on its way to your tenants.
          </p>
        </div>
        <div className="pm-task-counter">
          <div className="pm-task-circle" key={remainingPmTasks}>
            <span className="remaining">{remainingPmTasks}</span>
            <span className="total">of {totalPmTasks}</span>
          </div>
          <span className="pm-task-label">items<br/>remaining</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PM MOBILE HEADER (sticky top bar)
// ============================================
function PMMobileHeader({ project }) {
  const [showMessage, setShowMessage] = useState(false);

  // Count all PM tasks across all phases
  const allPmTasks = project.phases?.flatMap(phase =>
    (phase.tasks || []).filter(t => t.label.startsWith('[PM]') || t.label.startsWith('[PM-TEXT]'))
  ) || [];

  const totalPmTasks = allPmTasks.length;
  const completedPmTasks = allPmTasks.filter(t => t.completed).length;
  const remainingPmTasks = totalPmTasks - completedPmTasks;
  const progressPercent = totalPmTasks > 0 ? Math.round((completedPmTasks / totalPmTasks) * 100) : 0;

  // Get first name from property manager
  const fullName = project.propertyManager?.name || 'Property Manager';
  const firstName = fullName.split(' ')[0];

  const allDone = remainingPmTasks === 0 && totalPmTasks > 0;

  return (
    <>
      <div className="pm-mobile-header">
        <img src="/logo-dark.png" alt="Raptor Vending" className="pm-mobile-logo" />
        <div className="pm-mobile-progress">
          <div className="pm-mobile-progress-bar">
            <div className="pm-mobile-progress-fill" style={{ width: `${project.overallProgress || 0}%` }}></div>
          </div>
          <span className="pm-mobile-progress-text">{project.overallProgress || 0}%</span>
        </div>
        <button className="pm-mobile-greeting" onClick={() => setShowMessage(!showMessage)}>
          Hi, {firstName}
          <svg className={`pm-mobile-greeting-icon ${showMessage ? 'open' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      {showMessage && (
        <div className="pm-mobile-message" onClick={() => setShowMessage(false)}>
          {allDone ? (
            <p>
              <strong>You're all set!</strong> You've completed all your tasks.
              We'll take it from here—a great new amenity is on its way to your tenants.
            </p>
          ) : (
            <p>
              <strong>Welcome!</strong> We're excited to bring Raptor infrastructure to your building.
              Your part is simple: just {remainingPmTasks} of {totalPmTasks} items, marked below. Check them off as you go—we'll take care of everything else.
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ============================================
// PM MOBILE BOTTOM BAR
// ============================================
function PMMobileBottomBar({ project, projects = [], onSelectProject, selectedToken }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMultipleProjects = projects.length > 1;

  // Calculate remaining PM tasks
  const getPmTasksRemaining = (proj) => {
    const allPmTasks = proj.phases?.flatMap(phase =>
      (phase.tasks || []).filter(t => t.label.startsWith('[PM]') || t.label.startsWith('[PM-TEXT]'))
    ) || [];
    return allPmTasks.filter(t => !t.completed).length;
  };

  const remainingTasks = getPmTasksRemaining(project);
  const propertyName = project.propertyName || 'Property';

  const handleSelect = (token) => {
    if (onSelectProject) onSelectProject(token);
    setMenuOpen(false);
  };

  return (
    <div className="pm-mobile-bar">
      {/* Items Remaining */}
      <div className="pm-mobile-tasks">
        {remainingTasks === 0 ? (
          <>
            <div className="pm-mobile-tasks-count complete">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="pm-mobile-tasks-label">All done!</span>
          </>
        ) : (
          <>
            <span className="pm-mobile-tasks-prefix">Only</span>
            <div className="pm-mobile-tasks-count">{remainingTasks}</div>
            <span className="pm-mobile-tasks-label">to-do{remainingTasks !== 1 ? 's' : ''}!</span>
          </>
        )}
      </div>

      {/* Property Name / Selector */}
      <button
        className={`pm-mobile-property ${hasMultipleProjects ? 'has-menu' : ''}`}
        onClick={() => hasMultipleProjects && setMenuOpen(!menuOpen)}
      >
        <span className="pm-mobile-property-name">{propertyName}</span>
        {hasMultipleProjects && (
          <svg className={`pm-mobile-caret ${menuOpen ? 'open' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        )}
      </button>

      {/* Property Menu */}
      {menuOpen && hasMultipleProjects && (
        <div className="pm-mobile-menu">
          {projects.map(proj => (
            <button
              key={proj.publicToken}
              className={`pm-mobile-menu-item ${selectedToken === proj.publicToken ? 'active' : ''}`}
              onClick={() => handleSelect(proj.publicToken)}
            >
              <span className="pm-mobile-menu-name">{proj.propertyName}</span>
              <span className="pm-mobile-menu-tasks">
                {getPmTasksRemaining(proj)} items
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// PROJECT WIDGET (reusable for single & multi-project views)
// ============================================
function ProjectWidget({ project, showLogo = true, onRefresh, readOnly = false }) {
  return (
    <div className="progress-widget">
        <Header project={project} showLogo={showLogo} />
        <OverallProgress
          progress={project.overallProgress}
          estimatedCompletion={project.estimatedCompletion}
          daysRemaining={project.daysRemaining}
        />
        <Timeline phases={project.phases} locationImages={project.locationImages} surveyToken={project.surveyToken} surveyClicks={project.surveyClicks} surveyCompletions={project.surveyCompletions} onRefresh={onRefresh} globalDocuments={project.globalDocuments} readOnly={readOnly} />
        <ContactFooter projectManager={project.projectManager} />
      </div>
  );
}

// ============================================
// PAGE: Single Project View
// ============================================
function ProjectView() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const isAdminPreview = searchParams.get('admin') === '1';
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSendToPhone, setShowSendToPhone] = useState(false);

  const currentUrl = window.location.href.split('?')[0]; // Remove query params

  async function loadProject() {
    try {
      const data = await fetchProjectByToken(token);
      if (!data) {
        setError('Project not found');
      } else {
        setProject(data);
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Unable to load project');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadProject();
  }, [token]);

  if (loading) {
    return <div className="loading">Loading project...</div>;
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Project Not Found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Admin preview mode - simplified view without sidebar
  if (isAdminPreview) {
    return (
      <div className="admin-preview-view">
        <main className="pm-main" style={{ marginLeft: 0 }}>
          <h1 className="pm-main-title">Installation Progress</h1>
          <ProjectWidget project={project} showLogo={false} onRefresh={loadProject} readOnly={true} />
        </main>
      </div>
    );
  }

  return (
    <div className="pm-portal">
      {/* Sidebar */}
      <aside className="pm-sidebar">
        <div className="pm-sidebar-header">
          <Logo variant="light" height={120} />
        </div>

        <div className="pm-sidebar-info">
          <h2>{project.propertyManager?.name || 'Property Manager'}</h2>
          <p>{project.propertyManager?.company || ''}</p>
        </div>

        <nav className="pm-sidebar-nav">
          <h3>Your Properties</h3>
          <span className="pm-nav-link">{project.propertyName}</span>
        </nav>

        <div className="pm-sidebar-survey">
          <h3>Employee Survey</h3>
          <p>Share this survey with tenants to customize their menu preferences.</p>
          <a
            href={project.surveyToken ? `/survey/${project.surveyToken}` : 'https://raptor-vending.com/building-survey/'}
            target="_blank"
            rel="noopener noreferrer"
            className="pm-survey-btn"
          >
            Share Survey →
          </a>
        </div>

        <div className="pm-sidebar-send-phone">
          <button className="send-phone-btn" onClick={() => setShowSendToPhone(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M12 18h.01M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
            </svg>
            Send to Phone
          </button>
        </div>

        <div className="pm-sidebar-footer">
          <PoweredBy />
        </div>
      </aside>

      {/* Mobile Header */}
      <PMMobileHeader project={project} />

      {/* Mobile Bottom Bar */}
      <PMMobileBottomBar project={project} />

      {/* Main Content */}
      <main className="pm-main">
        <h1 className="pm-main-title">Installation Progress</h1>
        <PMWelcomeHeader project={project} />
        <ProjectWidget project={project} showLogo={false} onRefresh={loadProject} />
      </main>

      {/* Send to Phone Modal */}
      <SendToPhoneModal
        isOpen={showSendToPhone}
        onClose={() => setShowSendToPhone(false)}
        url={currentUrl}
      />
    </div>
  );
}

// ============================================
// PAGE: Property Manager Portal (multi-project)
// ============================================
function PMPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSendToPhone, setShowSendToPhone] = useState(false);

  const currentUrl = window.location.href;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchProjectsByPMToken(token);
        if (!result) {
          setError('Portal not found');
        } else {
          setData(result);
        }
      } catch (err) {
        console.error('Error loading portal:', err);
        setError('Unable to load portal');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  if (loading) {
    return <div className="loading">Loading portal...</div>;
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Portal Not Found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-portal">
      {/* Sidebar */}
      <aside className="pm-sidebar">
        <div className="pm-sidebar-header">
          <Logo variant="light" height={120} />
        </div>

        <div className="pm-sidebar-info">
          <h2>{data.propertyManager.name}</h2>
          <p>{data.propertyManager.company}</p>
        </div>

        <nav className="pm-sidebar-nav">
          <h3>Your Properties</h3>
          {data.properties.map(prop => (
            <a key={prop.id} href={`#property-${prop.id}`} className="pm-nav-link">
              {prop.name}
            </a>
          ))}
        </nav>

        <div className="pm-sidebar-survey">
          <h3>Employee Survey</h3>
          <p>Share this survey with tenants to customize their menu preferences.</p>
          <a
            href="https://raptor-vending.com/building-survey/"
            target="_blank"
            rel="noopener noreferrer"
            className="pm-survey-btn"
          >
            Share Survey →
          </a>
        </div>

        <div className="pm-sidebar-send-phone">
          <button className="send-phone-btn" onClick={() => setShowSendToPhone(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M12 18h.01M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
            </svg>
            Send to Phone
          </button>
        </div>

        <div className="pm-sidebar-footer">
          <PoweredBy />
        </div>
      </aside>

      {/* Mobile Header */}
      {data.projects[0] && <PMMobileHeader project={data.projects[0]} />}

      {/* Mobile Bottom Bar */}
      <PMMobileBottomBar
        project={data.projects[0]}
        projects={data.projects}
        selectedToken={data.projects[0]?.publicToken}
        onSelectProject={(token) => {
          const el = document.getElementById(`property-${data.projects.find(p => p.publicToken === token)?.propertyName}`);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Content */}
      <main className="pm-main">
        <h1 className="pm-main-title">Installation Progress</h1>
        {data.projects.length === 0 ? (
          <div className="no-projects">
            <h2>No Active Projects</h2>
            <p>You don't have any active installation projects at this time.</p>
          </div>
        ) : (
          data.projects.map(project => (
            <div key={project.publicToken} id={`property-${project.propertyName}`} className="pm-project-section">
              <ProjectWidget project={project} showLogo={false} />
            </div>
          ))
        )}
      </main>

      {/* Send to Phone Modal */}
      <SendToPhoneModal
        isOpen={showSendToPhone}
        onClose={() => setShowSendToPhone(false)}
        url={currentUrl}
      />
    </div>
  );
}

// ============================================
// PAGE: Survey Redirect (tracks clicks)
// ============================================
function SurveyRedirect() {
  const { token } = useParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    async function trackAndRedirect() {
      try {
        await recordSurveyClick(token);
      } catch (err) {
        console.error('Error recording click:', err);
        setError('Survey link not found');
        return;
      }
      // Redirect to the actual survey
      window.location.href = 'https://raptor-vending.com/building-survey/';
    }
    trackAndRedirect();
  }, [token]);

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Survey Not Found</h2>
          <p>This survey link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return <div className="loading">Redirecting to survey...</div>;
}

// ============================================
// PAGE: Public Preview (shareable)
// ============================================
function PublicPreview() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add noindex meta tag to prevent search engine indexing
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    async function loadProjects() {
      try {
        const { supabase } = await import('./supabaseClient');
        const { data } = await supabase
          .from('projects')
          .select(`
            id,
            public_token,
            project_number,
            is_active,
            location:locations (
              id,
              name,
              property:properties (
                id,
                name
              )
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        // Group by property
        const grouped = {};
        (data || []).forEach(project => {
          const propertyName = project.location?.property?.name || 'Unknown Property';
          if (!grouped[propertyName]) grouped[propertyName] = [];
          grouped[propertyName].push({
            ...project,
            locationName: project.location?.name || 'Unknown Location',
            propertyName
          });
        });

        setProjects(grouped);

        // Default to first project
        const sortedProps = Object.keys(grouped).sort();
        if (sortedProps.length > 0 && grouped[sortedProps[0]].length > 0) {
          setSelectedToken(grouped[sortedProps[0]][0].public_token);
        }
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const sortedProperties = Object.keys(projects).sort();

  // Find current project name for mobile selector
  const allProjects = sortedProperties.flatMap(p => projects[p]);
  const currentProject = allProjects.find(p => p.public_token === selectedToken);
  const currentPropertyName = currentProject?.propertyName || 'Select Property';

  const handleMobileSelect = (token) => {
    setSelectedToken(token);
    setMobileMenuOpen(false);
  };

  return (
    <div className="preview-pane public-preview">
      {/* Desktop Sidebar */}
      <div className="preview-sidebar">
        <div className="preview-sidebar-header">
          <img src="/logo-light.png" alt="Raptor Vending" className="preview-logo" />
        </div>
        <nav className="preview-sidebar-nav">
          <h3>Properties</h3>
          {sortedProperties.map(propertyName => (
            <div key={propertyName} className="preview-property-group">
              <div className="preview-property-name">{propertyName}</div>
              {projects[propertyName].map(project => (
                <button
                  key={project.id}
                  className={`preview-project-btn ${selectedToken === project.public_token ? 'active' : ''}`}
                  onClick={() => setSelectedToken(project.public_token)}
                >
                  <span className="preview-location">{project.locationName}</span>
                  <span className="preview-project-number">{project.project_number}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="preview-content">
        {selectedToken ? (
          <iframe
            src={`/project/${selectedToken}?admin=1`}
            title="Project Preview"
            className="preview-iframe"
          />
        ) : (
          <div className="preview-placeholder">
            <p>No projects available</p>
          </div>
        )}
      </div>

      {/* Mobile Bottom Selector */}
      <div className={`preview-mobile-selector ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="preview-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span>{currentPropertyName}</span>
          <svg className={`preview-mobile-caret ${mobileMenuOpen ? 'open' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        {mobileMenuOpen && (
          <div className="preview-mobile-menu">
            {sortedProperties.map(propertyName => (
              <div key={propertyName} className="preview-mobile-group">
                <div className="preview-mobile-property">{propertyName}</div>
                {projects[propertyName].map(project => (
                  <button
                    key={project.id}
                    className={`preview-mobile-item ${selectedToken === project.public_token ? 'active' : ''}`}
                    onClick={() => handleMobileSelect(project.public_token)}
                  >
                    {project.locationName}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// PAGE: Home / Landing
// ============================================
function Home() {
  return (
    <div className="app">
      <div className="home-container">
        <div style={{ marginBottom: '30px' }}>
          <Logo variant="dark" height={140} />
        </div>
        <h1>Installation Progress Portal</h1>
        <p>Track your Raptor Vending installation in real-time.</p>
        <p style={{ marginTop: '20px', color: '#888', fontSize: '0.9em' }}>
          Use the link provided by your project manager to access your installation progress.
        </p>
        <div style={{ marginTop: '40px' }}>
          <Link to="/admin" className="contact-btn">
            Admin Access
          </Link>
        </div>
      </div>
      <PoweredBy />
    </div>
  );
}

// ============================================
// MAIN APP WITH ROUTING
// ============================================
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/project/:token" element={<ProjectView />} />
      <Route path="/pm/:token" element={<PMPortal />} />
      <Route path="/survey/:token" element={<SurveyRedirect />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/preview" element={<PublicPreview />} />
    </Routes>
  );
}

export default App;
