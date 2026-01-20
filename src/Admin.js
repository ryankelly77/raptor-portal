import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import heic2any from 'heic2any';
import {
  supabase,
  fetchAllForAdmin,
  fetchProjectDetails,
  fetchActivityLog,
  deleteActivityLog,
  clearActivityLog,
  createEquipment,
  updateEquipment,
  deleteEquipment
} from './supabaseClient';

// Admin API client for authenticated CRUD operations (uses service role key via API)
import {
  createProject,
  updateProject,
  deleteProject,
  createPhase,
  updatePhase,
  deletePhase,
  createTask,
  updateTask,
  deleteTask,
  createPropertyManager,
  updatePropertyManager,
  deletePropertyManager,
  createProperty,
  updateProperty,
  deleteProperty,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchAllPmMessages,
  fetchPmMessagesByPm,
  createPmMessage,
  deletePmMessage,
  deletePmMessagesByPm,
  markPmMessagesAsRead,
  updateGlobalDocument,
  fetchEmailTemplates,
  updateEmailTemplate,
  uploadFile
} from './adminApi';

// ============================================
// ADMIN DASHBOARD
// ============================================

// Helper to get auth headers for protected API calls
function getAdminAuthHeaders() {
  const token = sessionStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('adminAuth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'projects';
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setAuthLoading(true);
    setPasswordError(false);

    try {
      const response = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('adminAuth', 'true');
        sessionStorage.setItem('adminToken', result.token);
        setIsAuthenticated(true);
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setPasswordError(true);
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const result = await fetchAllForAdmin();
      setData(result);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    try {
      const data = await fetchAllPmMessages();
      if (data) {
        // Count unread messages from PMs
        const unreadCount = data.filter(msg => msg.sender === 'pm' && !msg.read_at).length;
        setUnreadMessageCount(unreadCount);
      }
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }

  async function loadProjectDetails(projectId) {
    try {
      const details = await fetchProjectDetails(projectId);
      setProjectDetails(details);
    } catch (err) {
      console.error('Error loading project details:', err);
    }
  }

  async function handleSelectProject(project) {
    setSelectedProject(project);
    await loadProjectDetails(project.id);
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <img src="/logo-light.png" alt="Raptor Vending" className="admin-login-logo" />
          <h2>Admin Access</h2>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className={passwordError ? 'error' : ''}
              disabled={authLoading}
              autoFocus
            />
            {passwordError && <p className="error-message">Incorrect password</p>}
            <button type="submit" disabled={authLoading}>
              {authLoading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <img src="/logo-light.png" alt="Raptor Vending" className="admin-logo" />
          <span className="admin-title">Admin</span>
        </div>
        <nav className="admin-nav">
          <button
            className={activeTab === 'projects' ? 'active' : ''}
            onClick={() => { setActiveTab('projects'); setSelectedProject(null); }}
          >
            Installs
          </button>
          <button
            className={activeTab === 'properties' ? 'active' : ''}
            onClick={() => setActiveTab('properties')}
          >
            Properties & Locations
          </button>
          <button
            className={activeTab === 'managers' ? 'active' : ''}
            onClick={() => setActiveTab('managers')}
          >
            Property Managers
          </button>
          <button
            className={activeTab === 'docs' ? 'active' : ''}
            onClick={() => setActiveTab('docs')}
          >
            Docs
          </button>
          <button
            className={activeTab === 'activity' ? 'active' : ''}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
          <button
            className={activeTab === 'preview' ? 'active' : ''}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button
            className={activeTab === 'emails' ? 'active' : ''}
            onClick={() => setActiveTab('emails')}
          >
            Email Templates
          </button>
          <button
            className={activeTab === 'messages' ? 'active' : ''}
            onClick={() => setActiveTab('messages')}
          >
            Messages
            {unreadMessageCount > 0 && (
              <span className="admin-nav-badge">{unreadMessageCount}</span>
            )}
          </button>
        </nav>
        <div className="admin-header-right">
          <Link to="/" className="admin-home-link">← Back</Link>
          <button
            className="admin-logout-btn"
            onClick={() => {
              sessionStorage.clear();
              setIsAuthenticated(false);
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        {activeTab === 'projects' && !selectedProject && (
          <ProjectsList
            projects={data.projects}
            locations={data.locations}
            properties={data.properties}
            onSelect={handleSelectProject}
            onNew={() => setShowModal('new-project')}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'projects' && selectedProject && (
          <ProjectEditor
            project={selectedProject}
            details={projectDetails}
            locations={data.locations}
            properties={data.properties}
            managers={data.propertyManagers}
            onBack={() => { setSelectedProject(null); setProjectDetails(null); }}
            onRefresh={async () => {
              const result = await fetchAllForAdmin();
              setData(result);
              const updatedProject = result.projects.find(p => p.id === selectedProject.id);
              if (updatedProject) setSelectedProject(updatedProject);
              await loadProjectDetails(selectedProject.id);
            }}
          />
        )}

        {activeTab === 'properties' && (
          <PropertiesList
            properties={data.properties}
            locations={data.locations}
            managers={data.propertyManagers}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'managers' && (
          <ManagersList
            managers={data.propertyManagers}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'docs' && (
          <GlobalDocsManager
            documents={data.globalDocuments}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityLog projects={data.projects} locations={data.locations} properties={data.properties} />
        )}

        {activeTab === 'preview' && (
          <PreviewPane projects={data.projects} locations={data.locations} properties={data.properties} />
        )}

        {activeTab === 'emails' && (
          <EmailTemplates />
        )}

        {activeTab === 'messages' && (
          <AdminMessagesSection propertyManagers={data.propertyManagers} onUnreadChange={loadUnreadCount} />
        )}
      </main>

      {showModal === 'new-project' && (
        <NewProjectModal
          locations={data.locations}
          properties={data.properties}
          onClose={() => setShowModal(null)}
          onSave={async () => {
            await loadData();
            setShowModal(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// PROJECTS LIST
// ============================================
function ProjectsList({ projects, locations, properties, onSelect, onNew, onRefresh }) {
  const getLocationInfo = (project) => {
    const location = locations.find(l => l.id === project.location_id);
    const property = location ? properties.find(p => p.id === location.property_id) : null;
    return { location, property };
  };

  async function handleDelete(e, projectId) {
    e.stopPropagation();
    if (!window.confirm('Delete this install? This will also delete all phases, tasks, and equipment. This cannot be undone.')) return;
    try {
      await deleteProject(projectId);
      onRefresh();
    } catch (err) {
      console.error('Error deleting install:', err);
      alert('Error deleting install: ' + err.message);
    }
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Installs</h2>
        <button className="btn-primary" onClick={onNew}>+ New Install</button>
      </div>

      <div className="projects-grid">
        {projects.map(project => {
          const { location, property } = getLocationInfo(project);
          return (
            <div key={project.id} className="project-card" onClick={() => onSelect(project)}>
              <div className="card-actions">
                <button className="icon-btn delete" onClick={(e) => handleDelete(e, project.id)} title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
              <div className="project-card-header">
                <span className="project-number">{project.project_number}</span>
                <span className={`status-badge ${project.is_active ? 'active' : 'inactive'}`}>
                  {project.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="project-card-body">
                <h3>{property?.name || 'Unknown Property'}</h3>
                <p>{location?.name || 'Unknown Location'}</p>
                <div className="project-progress">
                  <div className="progress-bar-mini">
                    <div className="progress-fill" style={{ width: `${project.overall_progress}%` }}></div>
                  </div>
                  <span>{project.overall_progress}%</span>
                </div>
              </div>
              <div className="project-card-footer">
                <span className="token-display">Token: {project.public_token}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// PROJECT EDITOR
// ============================================
function ProjectEditor({ project, details, locations, properties, managers, onBack, onRefresh }) {
  const location = locations?.find(l => l.id === project.location_id);
  const property = location ? properties?.find(p => p.id === location.property_id) : null;
  const propertyManager = property ? managers?.find(m => m.id === property.property_manager_id) : null;
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    project_number: project.project_number,
    configuration: project.configuration || '',
    raptor_pm_name: project.raptor_pm_name || '',
    raptor_pm_email: project.raptor_pm_email || '',
    raptor_pm_phone: project.raptor_pm_phone || '',
    estimated_completion: project.estimated_completion || '',
    overall_progress: project.overall_progress || 0,
    is_active: project.is_active,
    email_reminders_enabled: project.email_reminders_enabled || false,
    reminder_email: project.reminder_email || ''
  });
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [savingProject, setSavingProject] = useState(false);
  const [savedProject, setSavedProject] = useState(false);

  async function handleSaveProject() {
    setSavingProject(true);
    setSavedProject(false);
    try {
      await updateProject(project.id, projectForm);
      setSavedProject(true);
      setTimeout(() => {
        setSavedProject(false);
        setEditingProject(false);
      }, 1000);
      onRefresh();
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Error saving project');
    } finally {
      setSavingProject(false);
    }
  }

  async function handleUpdatePhase(phaseId, updates) {
    try {
      await updatePhase(phaseId, updates);

      // If marking phase as completed, also mark all tasks as completed
      if (updates.status === 'completed') {
        const phase = details?.phases?.find(p => p.id === phaseId);
        if (phase?.tasks) {
          for (const task of phase.tasks) {
            if (!task.completed) {
              await updateTask(task.id, { completed: true });
            }
          }
          // Recalculate progress
          const updatedDetails = await fetchProjectDetails(project.id);
          let total = 0, done = 0;
          updatedDetails.phases.forEach(p => {
            p.tasks?.forEach(t => {
              total++;
              if (t.completed) done++;
            });
          });
          const newProgress = total > 0 ? Math.round((done / total) * 100) : 0;
          await updateProject(project.id, { overall_progress: newProgress });
        }
      }

      onRefresh();
    } catch (err) {
      console.error('Error updating phase:', err);
    }
  }

  async function handleUpdateTask(taskId, completed) {
    try {
      await updateTask(taskId, { completed });
      // Auto-recalculate progress after task update
      const updatedDetails = await fetchProjectDetails(project.id);
      let total = 0, done = 0;
      updatedDetails.phases.forEach(phase => {
        phase.tasks?.forEach(task => {
          total++;
          if (task.completed) done++;
        });
      });
      const newProgress = total > 0 ? Math.round((done / total) * 100) : 0;
      await updateProject(project.id, { overall_progress: newProgress });

      // Auto-update phase status based on task completion
      for (const phase of updatedDetails.phases) {
        const phaseTasks = phase.tasks || [];
        if (phaseTasks.length === 0) continue;

        const completedCount = phaseTasks.filter(t => t.completed).length;
        let newStatus;
        if (completedCount === 0) {
          newStatus = 'pending';
        } else if (completedCount === phaseTasks.length) {
          newStatus = 'completed';
        } else {
          newStatus = 'in-progress';
        }

        if (phase.status !== newStatus) {
          await updatePhase(phase.id, { status: newStatus });
        }
      }

      onRefresh();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }

  async function handleAddTask(phaseId, label) {
    try {
      const maxSort = details.phases.find(p => p.id === phaseId)?.tasks?.length || 0;
      await createTask({ phase_id: phaseId, label, completed: false, sort_order: maxSort + 1 });
      onRefresh();
    } catch (err) {
      console.error('Error adding task:', err);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      onRefresh();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }

  async function handleUpdateEquipment(equipId, updates) {
    try {
      await updateEquipment(equipId, updates);
      onRefresh();
    } catch (err) {
      console.error('Error updating equipment:', err);
    }
  }

  // Calculate progress based on completed tasks
  function calculateProgress() {
    if (!details?.phases) return 0;
    let total = 0, completed = 0;
    details.phases.forEach(phase => {
      phase.tasks?.forEach(task => {
        total++;
        if (task.completed) completed++;
      });
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  async function handleRecalculateProgress() {
    const newProgress = calculateProgress();
    try {
      await updateProject(project.id, { overall_progress: newProgress });
      setProjectForm(prev => ({ ...prev, overall_progress: newProgress }));
      onRefresh();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  }

  return (
    <div className="admin-section">
      <div className="editing-sticky-header">
        You are editing: <strong>{property?.name || 'Unknown Property'}</strong> &mdash; <strong>{location?.name || 'Unknown Location'}</strong>
      </div>
      <div className="section-header">
        <button className="btn-back" onClick={onBack}>← Back to Projects</button>
        <h2>{project.project_number}</h2>
        <div className="header-actions">
          <a
            href={`/project/${project.public_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            View Public Page
          </a>
        </div>
      </div>

      {/* Project Details */}
      <div className="editor-card">
        <div className="card-header">
          <h3>Project Details</h3>
          {!editingProject ? (
            <button className="btn-edit" onClick={() => setEditingProject(true)}>Edit</button>
          ) : (
            <div className="btn-group">
              <button className="btn-save" onClick={handleSaveProject} disabled={savingProject}>
                {savingProject ? 'Saving...' : savedProject ? '✓ Saved' : 'Save'}
              </button>
              <button className="btn-cancel" onClick={() => setEditingProject(false)} disabled={savingProject}>Cancel</button>
            </div>
          )}
        </div>
        <div className="card-body">
          {editingProject ? (
            <div className="form-grid">
              <div className="form-group">
                <label>Project Number</label>
                <input
                  value={projectForm.project_number}
                  onChange={e => setProjectForm({ ...projectForm, project_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Configuration</label>
                <input
                  value={projectForm.configuration}
                  onChange={e => setProjectForm({ ...projectForm, configuration: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Raptor PM Name</label>
                <input
                  value={projectForm.raptor_pm_name}
                  onChange={e => setProjectForm({ ...projectForm, raptor_pm_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Raptor PM Email</label>
                <input
                  value={projectForm.raptor_pm_email}
                  onChange={e => setProjectForm({ ...projectForm, raptor_pm_email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Raptor PM Phone</label>
                <input
                  value={projectForm.raptor_pm_phone}
                  onChange={e => setProjectForm({ ...projectForm, raptor_pm_phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Est. Completion</label>
                <input
                  type="date"
                  value={projectForm.estimated_completion}
                  onChange={e => setProjectForm({ ...projectForm, estimated_completion: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Overall Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={projectForm.overall_progress}
                  onChange={e => setProjectForm({ ...projectForm, overall_progress: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Active</label>
                <select
                  value={projectForm.is_active ? 'true' : 'false'}
                  onChange={e => setProjectForm({ ...projectForm, is_active: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={projectForm.email_reminders_enabled}
                    onChange={e => setProjectForm({ ...projectForm, email_reminders_enabled: e.target.checked })}
                  />
                  <span className="toggle-switch"></span>
                  Email Reminders {projectForm.email_reminders_enabled ? 'ON' : 'OFF'}
                </label>
              </div>
              {projectForm.email_reminders_enabled && (
                <div className="form-group full-width">
                  <label>Reminder Email (optional override)</label>
                  <input
                    type="email"
                    placeholder={propertyManager?.email || 'Uses property manager email'}
                    value={projectForm.reminder_email}
                    onChange={e => setProjectForm({ ...projectForm, reminder_email: e.target.value })}
                  />
                  <span className="form-hint">Leave blank to use property manager's email</span>
                </div>
              )}
            </div>
          ) : (
            <div className="details-grid">
              <div><strong>Property:</strong> {property?.name || 'Unknown'}</div>
              <div><strong>Location:</strong> {location?.name || 'Unknown'}{location?.floor ? ` (Floor ${location.floor})` : ''}</div>
              <div><strong>Property Manager:</strong> {propertyManager?.name || 'Not assigned'}{propertyManager?.company ? ` (${propertyManager.company})` : ''}</div>
              <div><strong>Configuration:</strong> {project.configuration}</div>
              <div><strong>Est. Completion:</strong> {project.estimated_completion}</div>
              <div>
                <strong>Progress:</strong> {project.overall_progress}%
                <button className="btn-small" onClick={handleRecalculateProgress} style={{ marginLeft: '10px' }}>
                  Recalculate
                </button>
              </div>
              <div><strong>Public Token:</strong> <code>{project.public_token}</code></div>
              <div>
                <strong>Email Reminders:</strong>{' '}
                <span className={`reminder-status ${project.email_reminders_enabled ? 'on' : 'off'}`}>
                  {project.email_reminders_enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phases */}
      <div className="editor-card">
        <div className="card-header">
          <h3>Phases & Tasks</h3>
          <button className="btn-primary" onClick={() => setShowPhaseModal(true)}>+ Add Phase</button>
        </div>
        <div className="card-body">
          {details?.phases?.map((phase, idx) => (
            <PhaseEditor
              key={phase.id}
              phase={phase}
              phaseNumber={idx + 1}
              project={project}
              onUpdatePhase={handleUpdatePhase}
              onUpdateTask={handleUpdateTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onRefresh={onRefresh}
            />
          ))}
          {(!details?.phases || details.phases.length === 0) && (
            <p className="empty-state">No phases yet. Add a phase to get started.</p>
          )}
        </div>
      </div>

      {showPhaseModal && (
        <PhaseModal
          projectId={project.id}
          phaseCount={details?.phases?.length || 0}
          onClose={() => setShowPhaseModal(false)}
          onSave={async (phaseData) => {
            await createPhase(phaseData);
            onRefresh();
            setShowPhaseModal(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// PHASE EDITOR
// ============================================
function PhaseEditor({ phase, phaseNumber, project, onUpdatePhase, onUpdateTask, onAddTask, onDeleteTask, onRefresh }) {
  const [expanded, setExpanded] = useState(phase.status === 'in-progress');
  const [form, setForm] = useState({
    title: phase.title,
    status: phase.status,
    start_date: phase.start_date || '',
    end_date: phase.end_date || '',
    description: phase.description || '',
    is_approximate: phase.is_approximate || false,
    property_responsibility: phase.property_responsibility || false,
    contractor_name: phase.contractor_name || '',
    contractor_scheduled_date: phase.contractor_scheduled_date || '',
    document_url: phase.document_url || '',
    document_label: phase.document_label || ''
  });
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const multiFileInputRef = useRef(null);

  const isSiteAssessment = phase.title.toLowerCase().includes('site assessment');
  const documents = phase.documents || [];

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await onUpdatePhase(phase.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `phase-${phase.id}-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      const newLabel = form.document_label || file.name.replace(/\.[^/.]+$/, '');
      await onUpdatePhase(phase.id, {
        document_url: publicUrl,
        document_label: newLabel
      });
      setForm(prev => ({ ...prev, document_url: publicUrl, document_label: newLabel }));
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Error uploading file. Make sure the "project-files" bucket exists in Supabase Storage.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveDocument() {
    if (!window.confirm('Remove this document?')) return;
    await onUpdatePhase(phase.id, { document_url: null, document_label: null });
    setForm(prev => ({ ...prev, document_url: '', document_label: '' }));
  }

  // Multi-document upload for Site Assessment
  async function handleMultiFileUpload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const newDocs = [...documents];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `phase-${phase.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        newDocs.push({
          id: Date.now() + Math.random(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: publicUrl,
          uploadedAt: new Date().toISOString()
        });
      }

      await onUpdatePhase(phase.id, { documents: newDocs });
    } catch (err) {
      console.error('Error uploading files:', err);
      alert('Error uploading files. Make sure the "project-files" bucket exists.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveMultiDoc(docId) {
    const newDocs = documents.filter(d => d.id !== docId);
    await onUpdatePhase(phase.id, { documents: newDocs });
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleMultiFileUpload(files);
  }

  return (
    <div className={`phase-block ${phase.status}`}>
      <div className="phase-header" onClick={() => setExpanded(!expanded)}>
        <span className="phase-number">{phaseNumber}</span>
        <span className="phase-title">{phase.title}</span>
        <span className={`phase-status-badge ${phase.status}`}>
          {phase.status === 'pending' ? 'Pending' : phase.status === 'in-progress' ? 'In Progress' : 'Completed'}
        </span>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="phase-content">
          <div className="phase-form">
            <div className="form-row">
              <input
                placeholder="Title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="form-row two-col">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="form-row checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_approximate}
                  onChange={e => setForm({ ...form, is_approximate: e.target.checked })}
                />
                Approximate dates
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.property_responsibility}
                  onChange={e => setForm({ ...form, property_responsibility: e.target.checked })}
                />
                Property responsibility
              </label>
            </div>
            {form.property_responsibility && (
              <div className="form-row two-col">
                <input
                  placeholder="Contractor name"
                  value={form.contractor_name}
                  onChange={e => setForm({ ...form, contractor_name: e.target.value })}
                />
                <input
                  placeholder="Scheduled date"
                  value={form.contractor_scheduled_date}
                  onChange={e => setForm({ ...form, contractor_scheduled_date: e.target.value })}
                />
              </div>
            )}
            {!phase.title.toLowerCase().includes('survey') && (
              <div className="form-row two-col">
                <input
                  placeholder="Document label (e.g., Signed Agreement)"
                  value={form.document_label}
                  onChange={e => setForm({ ...form, document_label: e.target.value })}
                />
                <input
                  placeholder="Document URL (or upload below)"
                  value={form.document_url}
                  onChange={e => setForm({ ...form, document_url: e.target.value })}
                />
              </div>
            )}
            <div className="form-actions">
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Multi-Document Upload for Site Assessment */}
          {isSiteAssessment && (
            <div className="document-section">
              <h4>Site Images</h4>
              <div
                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => multiFileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={multiFileInputRef}
                  onChange={e => handleMultiFileUpload(Array.from(e.target.files))}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  multiple
                  style={{ display: 'none' }}
                />
                {uploading ? (
                  <span>Uploading...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>Drag & drop files here or click to browse</span>
                    <span className="drop-zone-hint">PDF, Word, or Images</span>
                  </>
                )}
              </div>
              {documents.length > 0 && (
                <div className="multi-doc-grid">
                  {documents.map(doc => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url);
                    return (
                      <div key={doc.id} className={`multi-doc-item ${isImage ? 'is-image' : ''}`}>
                        {isImage ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="doc-thumb">
                            <img src={doc.url} alt={doc.name} />
                          </a>
                        ) : (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="document-link-admin">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {doc.name}
                          </a>
                        )}
                        <button className="btn-delete-small" onClick={() => handleRemoveMultiDoc(doc.id)} title="Remove">×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Single Document Upload Section - hide for survey and site assessment phases */}
          {!phase.title.toLowerCase().includes('survey') && !isSiteAssessment && (
            <div className="document-section">
              <h4>{phase.title.toLowerCase().includes('building access') ? 'Additional Insured COI' : 'Document'}</h4>
              {phase.document_url ? (
                <div className="document-attached">
                  <a href={phase.document_url} target="_blank" rel="noopener noreferrer" className="document-link-admin">
                    {phase.document_label || 'View Document'}
                  </a>
                  <button className="btn-delete-small" onClick={handleRemoveDocument}>Remove</button>
                </div>
              ) : (
                <div className="document-upload">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                  <span className="upload-hint">PDF, Word, or Image</span>
                </div>
              )}
            </div>
          )}

          {/* Survey Link Section - only for survey phases */}
          {phase.title.toLowerCase().includes('survey') && (
            <div className="survey-link-section" style={{ background: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#E65100' }}>Trackable Survey Link</h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={project.survey_token ? `${window.location.origin}/survey/${project.survey_token}` : 'No token generated'}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #FFE0B2', fontFamily: 'monospace', fontSize: '0.85em' }}
                />
                <button
                  className="btn-small"
                  onClick={async () => {
                    const token = project.survey_token || Math.random().toString(36).substring(2, 15);
                    if (!project.survey_token) {
                      await updateProject(project.id, { survey_token: token });
                      onRefresh();
                    } else {
                      navigator.clipboard.writeText(`${window.location.origin}/survey/${token}`);
                      alert('Copied to clipboard!');
                    }
                  }}
                >
                  {project.survey_token ? 'Copy' : 'Generate'}
                </button>
              </div>
              {project.survey_token && (
                <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '0.85em', color: '#666' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Clicks:</span>
                    <strong>{project.survey_clicks || 0}</strong>
                    <button
                      className="btn-link-small"
                      onClick={async () => {
                        if (window.confirm('Reset click count to 0?')) {
                          await updateProject(project.id, { survey_clicks: 0 });
                          onRefresh();
                        }
                      }}
                      style={{ fontSize: '0.85em', color: '#999', marginLeft: '4px' }}
                    >
                      (reset)
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Completed:</span>
                    <strong>{project.survey_completions || 0}</strong>
                    <button
                      className="btn-link-small"
                      onClick={async () => {
                        if (window.confirm('Reset completed count to 0?')) {
                          await updateProject(project.id, { survey_completions: 0 });
                          onRefresh();
                        }
                      }}
                      style={{ fontSize: '0.85em', color: '#999', marginLeft: '4px' }}
                    >
                      (reset)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="tasks-section">
            <h4>Tasks</h4>
            {phase.tasks?.map(task => {
              const isAdminDate = task.label.startsWith('[ADMIN-DATE]');
              const isAdminSpeed = task.label.startsWith('[ADMIN-SPEED]');
              const isAdminEnclosure = task.label.startsWith('[ADMIN-ENCLOSURE]');
              const isAdminEquipment = task.label.startsWith('[ADMIN-EQUIPMENT]');
              const isAdminDelivery = task.label.startsWith('[ADMIN-DELIVERY]');
              const isAdminDoc = task.label.startsWith('[ADMIN-DOC]');
              const isPmText = task.label.startsWith('[PM-TEXT]');
              const isPmTask = task.label.startsWith('[PM]') || task.label.startsWith('[PM-DATE]') || task.label.startsWith('[PM-TEXT]');
              const displayLabel = task.label
                .replace('[ADMIN-DATE] ', '')
                .replace('[ADMIN-SPEED] ', '')
                .replace('[ADMIN-ENCLOSURE] ', '')
                .replace('[ADMIN-EQUIPMENT] ', '')
                .replace('[ADMIN-DELIVERY] ', '')
                .replace('[ADMIN-DOC] ', '')
                .replace('[PM] ', '')
                .replace('[PM-DATE] ', '')
                .replace('[PM-TEXT] ', '');

              return (
                <div key={task.id} className={`task-item ${isAdminEnclosure || isAdminEquipment || isAdminDelivery ? 'task-item-enclosure' : ''}`}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={e => onUpdateTask(task.id, e.target.checked)}
                  />
                  <span className={task.completed ? 'completed' : ''}>
                    {isPmTask && <span className="pm-badge">PM</span>}
                    {displayLabel}
                  </span>
                  {isAdminDate && (
                    <input
                      type="date"
                      className="admin-date-input"
                      value={task.scheduled_date || ''}
                      onChange={async (e) => {
                        await updateTask(task.id, { scheduled_date: e.target.value });
                        onRefresh();
                      }}
                    />
                  )}
                  {isAdminSpeed && (
                    <SpeedInputs task={task} onRefresh={onRefresh} />
                  )}
                  {isAdminEnclosure && (
                    <EnclosureInputs task={task} onRefresh={onRefresh} />
                  )}
                  {isAdminEquipment && (
                    <EquipmentQtyInputs task={task} onRefresh={onRefresh} />
                  )}
                  {isAdminDelivery && (
                    <DeliveryInputs task={task} projectId={project.id} onRefresh={onRefresh} />
                  )}
                  {isAdminDoc && task.completed && (
                    <TaskDocUpload task={task} onRefresh={onRefresh} />
                  )}
                  {isPmText && task.label.includes('COI') && (
                    <COIInputs task={task} onRefresh={onRefresh} />
                  )}
                  {isPmText && !task.label.includes('COI') && (
                    <PmTextResponse task={task} onRefresh={onRefresh} />
                  )}
                  <button className="btn-delete-small" onClick={() => onDeleteTask(task.id)}>×</button>
                </div>
              );
            })}
            <div className="add-task-row">
              <input
                placeholder="New task..."
                value={newTaskLabel}
                onChange={e => setNewTaskLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTaskLabel.trim()) {
                    onAddTask(phase.id, newTaskLabel.trim());
                    setNewTaskLabel('');
                  }
                }}
              />
              <button
                className="btn-add-small"
                onClick={() => {
                  if (newTaskLabel.trim()) {
                    onAddTask(phase.id, newTaskLabel.trim());
                    setNewTaskLabel('');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SPEED INPUTS (with local state for performance)
// ============================================
function SpeedInputs({ task, onRefresh }) {
  const [upload, setUpload] = useState(task.upload_speed || '');
  const [download, setDownload] = useState(task.download_speed || '');

  const handleUploadBlur = async () => {
    if (upload !== (task.upload_speed || '')) {
      await updateTask(task.id, { upload_speed: upload || null });
      onRefresh();
    }
  };

  const handleDownloadBlur = async () => {
    if (download !== (task.download_speed || '')) {
      await updateTask(task.id, { download_speed: download || null });
      onRefresh();
    }
  };

  // Check if either speed is below 10 Mbps
  const uploadBelowMin = upload && parseFloat(upload) < 10;
  const downloadBelowMin = download && parseFloat(download) < 10;
  const showWarning = (upload || download) && (uploadBelowMin || downloadBelowMin);

  return (
    <div className="admin-speed-inputs">
      <div className="speed-input-group">
        <label>Up:</label>
        <input
          type="number"
          step="0.1"
          min="0"
          className={`admin-speed-input ${uploadBelowMin ? 'below-min' : ''}`}
          placeholder="Mbps"
          value={upload}
          onChange={(e) => setUpload(e.target.value)}
          onBlur={handleUploadBlur}
        />
      </div>
      <div className="speed-input-group">
        <label>Down:</label>
        <input
          type="number"
          step="0.1"
          min="0"
          className={`admin-speed-input ${downloadBelowMin ? 'below-min' : ''}`}
          placeholder="Mbps"
          value={download}
          onChange={(e) => setDownload(e.target.value)}
          onBlur={handleDownloadBlur}
        />
      </div>
      {showWarning && (
        <div className="admin-speed-warning">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>One or more of the speed tests did not meet the minimum requirements of 10Mbps. A network drop or WiFi with QoS (Quality of Service) may be required.</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// ENCLOSURE INPUTS (with local state for performance)
// ============================================
function EnclosureInputs({ task, onRefresh }) {
  const [customColor, setCustomColor] = useState(task.custom_color_name || '');

  const handleTypeChange = async (e) => {
    const updates = { enclosure_type: e.target.value || null };
    if (e.target.value !== 'custom') {
      updates.enclosure_color = null;
      updates.custom_color_name = null;
    }
    await updateTask(task.id, updates);
    onRefresh();
  };

  const handleColorChange = async (e) => {
    const updates = { enclosure_color: e.target.value || null };
    if (e.target.value !== 'other') {
      updates.custom_color_name = null;
      setCustomColor('');
    }
    await updateTask(task.id, updates);
    onRefresh();
  };

  const handleCustomColorBlur = async () => {
    if (customColor !== (task.custom_color_name || '')) {
      await updateTask(task.id, { custom_color_name: customColor || null });
      onRefresh();
    }
  };

  return (
    <div className="admin-enclosure-inputs">
      <select
        className="enclosure-type-select"
        value={task.enclosure_type || ''}
        onChange={handleTypeChange}
      >
        <option value="">Select type...</option>
        <option value="custom">Custom Architectural Enclosure</option>
        <option value="wrap">Magnetic Wrap</option>
      </select>
      {task.enclosure_type === 'custom' && (
        <select
          className="enclosure-color-select"
          value={task.enclosure_color || ''}
          onChange={handleColorChange}
        >
          <option value="">Select color...</option>
          <option value="dove_grey">Dove Grey</option>
          <option value="macchiato">Macchiato</option>
          <option value="black">Black</option>
          <option value="other">Other</option>
        </select>
      )}
      {task.enclosure_type === 'custom' && task.enclosure_color === 'other' && (
        <input
          type="text"
          className="custom-color-input"
          placeholder="Enter color name..."
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          onBlur={handleCustomColorBlur}
        />
      )}
    </div>
  );
}

// ============================================
// DELIVERY INPUTS (multiple equipment deliveries)
// ============================================
const EQUIPMENT_TYPES = ['SmartFridge', 'SmartCooker', 'Fixturelite', 'Mag Wrap'];

function DeliveryInputs({ task, projectId, onRefresh }) {
  const deliveries = task.deliveries || [];
  const [localDeliveries, setLocalDeliveries] = useState(deliveries);

  const addDelivery = async () => {
    const newDeliveries = [...localDeliveries, { equipment: '', date: '', carrier: '', tracking: '', notified: false }];
    setLocalDeliveries(newDeliveries);
    await updateTask(task.id, { deliveries: newDeliveries });
    onRefresh();
  };

  const updateDelivery = (index, field, value) => {
    const newDeliveries = [...localDeliveries];
    newDeliveries[index] = { ...newDeliveries[index], [field]: value };
    setLocalDeliveries(newDeliveries);
  };

  const saveDelivery = async (index) => {
    const delivery = localDeliveries[index];

    // Check if delivery has all required fields and hasn't been notified yet
    if (delivery.equipment && delivery.date && delivery.tracking && !delivery.notified) {
      try {
        const response = await fetch('/api/send-delivery-notification', {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({ projectId, delivery })
        });

        if (response.ok) {
          // Mark as notified so we don't send duplicate emails
          const newDeliveries = [...localDeliveries];
          newDeliveries[index] = { ...newDeliveries[index], notified: true };
          setLocalDeliveries(newDeliveries);
          await updateTask(task.id, { deliveries: newDeliveries });
          onRefresh();
          return;
        }
      } catch (err) {
        console.error('Failed to send delivery notification:', err);
      }
    }

    await updateTask(task.id, { deliveries: localDeliveries });
    onRefresh();
  };

  const removeDelivery = async (index) => {
    const newDeliveries = localDeliveries.filter((_, i) => i !== index);
    setLocalDeliveries(newDeliveries);
    await updateTask(task.id, { deliveries: newDeliveries });
    onRefresh();
  };

  return (
    <div className="admin-delivery-multi">
      {localDeliveries.map((delivery, idx) => (
        <div key={idx} className="delivery-row">
          <select
            value={delivery.equipment || ''}
            onChange={(e) => updateDelivery(idx, 'equipment', e.target.value)}
            onBlur={() => saveDelivery(idx)}
            className="delivery-equipment-select"
          >
            <option value="">Select equipment...</option>
            {EQUIPMENT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input
            type="date"
            value={delivery.date || ''}
            onChange={(e) => updateDelivery(idx, 'date', e.target.value)}
            onBlur={() => saveDelivery(idx)}
            className="delivery-date-input"
          />
          <input
            type="text"
            placeholder="Carrier"
            value={delivery.carrier || ''}
            onChange={(e) => updateDelivery(idx, 'carrier', e.target.value)}
            onBlur={() => saveDelivery(idx)}
            className="delivery-carrier-input"
          />
          <input
            type="text"
            placeholder="Tracking #"
            value={delivery.tracking || ''}
            onChange={(e) => updateDelivery(idx, 'tracking', e.target.value)}
            onBlur={() => saveDelivery(idx)}
            className="delivery-tracking-input"
          />
          <button className="btn-delete-small" onClick={() => removeDelivery(idx)}>×</button>
        </div>
      ))}
      <button className="btn-add-small" onClick={addDelivery}>+ Add Delivery</button>
    </div>
  );
}

// ============================================
// COI / PM-TEXT INPUTS
// ============================================
function COIInputs({ task, onRefresh }) {
  // Parse existing data from pm_text_value (stored as JSON)
  let existingData = {};
  try {
    if (task.pm_text_value) {
      existingData = JSON.parse(task.pm_text_value);
    }
  } catch (e) {
    // If it's plain text (legacy), treat as building name
    existingData = { buildingName: task.pm_text_value || '' };
  }

  const [form, setForm] = useState({
    buildingName: existingData.buildingName || '',
    careOf: existingData.careOf || '',
    street: existingData.street || '',
    city: existingData.city || '',
    state: existingData.state || '',
    zip: existingData.zip || ''
  });

  const saveForm = async () => {
    const jsonValue = JSON.stringify(form);
    await updateTask(task.id, { pm_text_value: jsonValue });
    onRefresh();
  };

  return (
    <div className="admin-coi-inputs">
      <div className="coi-row">
        <input
          type="text"
          placeholder="Building name"
          value={form.buildingName}
          onChange={(e) => setForm({ ...form, buildingName: e.target.value })}
          onBlur={saveForm}
        />
        <input
          type="text"
          placeholder="c/o (building owner)"
          value={form.careOf}
          onChange={(e) => setForm({ ...form, careOf: e.target.value })}
          onBlur={saveForm}
        />
      </div>
      <div className="coi-row">
        <input
          type="text"
          placeholder="Street address"
          value={form.street}
          onChange={(e) => setForm({ ...form, street: e.target.value })}
          onBlur={saveForm}
          style={{ flex: 2 }}
        />
      </div>
      <div className="coi-row">
        <input
          type="text"
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          onBlur={saveForm}
          style={{ flex: 2 }}
        />
        <input
          type="text"
          placeholder="State"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          onBlur={saveForm}
          style={{ width: '80px' }}
        />
        <input
          type="text"
          placeholder="ZIP"
          value={form.zip}
          onChange={(e) => setForm({ ...form, zip: e.target.value })}
          onBlur={saveForm}
          style={{ width: '100px' }}
        />
      </div>
    </div>
  );
}

// ============================================
// PM TEXT RESPONSE (simple text input for non-COI PM-TEXT tasks)
// ============================================
function PmTextResponse({ task, onRefresh }) {
  const [value, setValue] = useState(task.pm_text_response || '');
  const [showInfo, setShowInfo] = useState(false);

  const saveValue = async () => {
    await updateTask(task.id, { pm_text_response: value });
    onRefresh();
  };

  const isBannerTask = task.label.includes('banner');

  return (
    <div className="pm-text-response">
      <div className="pm-text-response-row">
        <input
          type="text"
          placeholder="PM response..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={saveValue}
          className="pm-text-input"
        />
        {isBannerTask && (
          <button
            type="button"
            className="whats-this-link"
            onClick={() => setShowInfo(!showInfo)}
          >
            What's this?
          </button>
        )}
      </div>
      {showInfo && isBannerTask && (
        <div className="whats-this-info">
          Raptor Vending uses retractable banners to announce the upcoming food program to employees before machines arrive. This helps build awareness and excitement. The PM should confirm if banner placement is allowed on-site.
        </div>
      )}
    </div>
  );
}

// ============================================
// EQUIPMENT QTY INPUTS
// ============================================
function EquipmentQtyInputs({ task, onRefresh }) {
  const handleFridgeChange = async (e) => {
    await updateTask(task.id, { smartfridge_qty: parseInt(e.target.value) || 0 });
    onRefresh();
  };

  const handleCookerChange = async (e) => {
    await updateTask(task.id, { smartcooker_qty: parseInt(e.target.value) || 0 });
    onRefresh();
  };

  return (
    <div className="admin-equipment-inputs">
      <div className="equipment-qty-group">
        <label>SmartFridge™:</label>
        <select
          className="equipment-qty-select"
          value={task.smartfridge_qty || 0}
          onChange={handleFridgeChange}
        >
          <option value={0}>0</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </div>
      <div className="equipment-qty-group">
        <label>SmartCooker™:</label>
        <select
          className="equipment-qty-select"
          value={task.smartcooker_qty || 0}
          onChange={handleCookerChange}
        >
          <option value={0}>0</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </div>
    </div>
  );
}

// ============================================
// TASK DOCUMENT UPLOAD (only shows when task is completed)
// ============================================
function TaskDocUpload({ task, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `task-${task.id}-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      await updateTask(task.id, { document_url: publicUrl });
      onRefresh();
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async () => {
    if (!window.confirm('Remove this document?')) return;
    await updateTask(task.id, { document_url: null });
    onRefresh();
  };

  return (
    <div className="admin-task-doc">
      {task.document_url ? (
        <div className="task-doc-attached">
          <a href={task.document_url} target="_blank" rel="noopener noreferrer" className="task-doc-link">
            View Document
          </a>
          <button className="btn-delete-small" onClick={handleRemoveDocument}>×</button>
        </div>
      ) : (
        <div className="task-doc-upload">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
          />
          <button
            className="btn-small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// EQUIPMENT EDITOR
// ============================================
function EquipmentEditor({ equipment, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: equipment.name,
    model: equipment.model || '',
    spec: equipment.spec || '',
    status: equipment.status,
    status_label: equipment.status_label || ''
  });

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'fabricating', label: 'Fabricating' },
    { value: 'ready', label: 'Ready for Delivery' },
    { value: 'in-transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'installed', label: 'Installed' }
  ];

  async function handleSave() {
    await onUpdate(equipment.id, form);
    setEditing(false);
  }

  return (
    <div className="equipment-item">
      {editing ? (
        <div className="equipment-form">
          <input
            placeholder="Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Model"
            value={form.model}
            onChange={e => setForm({ ...form, model: e.target.value })}
          />
          <input
            placeholder="Spec"
            value={form.spec}
            onChange={e => setForm({ ...form, spec: e.target.value })}
          />
          <select
            value={form.status}
            onChange={e => {
              const opt = statusOptions.find(o => o.value === e.target.value);
              setForm({ ...form, status: e.target.value, status_label: opt?.label || '' });
            }}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="btn-group">
            <button className="btn-save" onClick={handleSave}>Save</button>
            <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="equipment-info">
            <strong>{equipment.name}</strong>
            <span>{equipment.model} | {equipment.spec}</span>
          </div>
          <span className={`equipment-status ${equipment.status}`}>{equipment.status_label}</span>
          <div className="equipment-actions">
            <button className="btn-edit-small" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn-delete-small" onClick={onDelete}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// MODALS
// ============================================
function PhaseModal({ projectId, phaseCount, onClose, onSave }) {
  const [form, setForm] = useState({
    project_id: projectId,
    phase_number: phaseCount + 1,
    title: '',
    status: 'pending',
    start_date: '',
    end_date: '',
    description: ''
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Add New Phase</h3>
        <div className="form-group">
          <label>Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-row two-col">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Add Phase</button>
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({ locations, properties, onClose, onSave }) {
  const [form, setForm] = useState({
    location_id: '',
    project_number: '',
    raptor_pm_name: 'Ryan Kelly',
    raptor_pm_email: 'ryan@raptor-vending.com',
    raptor_pm_phone: '(385) 438-6325',
    overall_progress: 0,
    is_active: true
  });

  const [smartFridgeQty, setSmartFridgeQty] = useState(2);
  const [smartCookerQty, setSmartCookerQty] = useState(1);
  const [enclosureType, setEnclosureType] = useState('wrap');
  const [enclosureColor, setEnclosureColor] = useState('');
  const [saving, setSaving] = useState(false);

  // Generate next project number on mount
  useEffect(() => {
    async function getNextProjectNumber() {
      try {
        // Get all project numbers to find the highest install number
        const { data: projects } = await supabase
          .from('projects')
          .select('project_number')
          .order('created_at', { ascending: false });

        let maxInstallNum = 0;
        if (projects) {
          projects.forEach(p => {
            // Extract the install number (last 3 digits) from project numbers like RV-2026-01001
            const match = p.project_number?.match(/RV-\d{4}-\d{2}(\d{3})$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxInstallNum) maxInstallNum = num;
            }
          });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const nextNum = String(maxInstallNum + 1).padStart(3, '0');

        setForm(prev => ({ ...prev, project_number: `RV-${year}-${month}${nextNum}` }));
      } catch (err) {
        console.error('Error generating project number:', err);
        // Fallback
        const now = new Date();
        setForm(prev => ({ ...prev, project_number: `RV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}001` }));
      }
    }
    getNextProjectNumber();
  }, []);

  const getLocationLabel = (loc) => {
    const prop = properties.find(p => p.id === loc.property_id);
    return `${prop?.name || 'Unknown'} - ${loc.name}`;
  };

  const buildConfiguration = () => {
    const parts = [];
    if (smartFridgeQty > 0) parts.push(`(${smartFridgeQty}) SmartFridge™`);
    if (smartCookerQty > 0) parts.push(`(${smartCookerQty}) SmartCooker™`);
    if (enclosureType === 'custom' && enclosureColor) {
      parts.push(`Custom Architectural Enclosure (${enclosureColor})`);
    } else if (enclosureType === 'wrap') {
      parts.push('Magnetic Wrap');
    }
    return parts.join(' + ');
  };

  const handleSave = async () => {
    if (!form.location_id || saving) return;

    console.log('NewProjectModal: Setting saving to true');
    setSaving(true);
    try {
      // Generate a survey token
      const surveyToken = Math.random().toString(36).substring(2, 15);

      // Create the project (PM is derived from location -> property -> property_manager when needed)
      const projectData = {
        ...form,
        configuration: buildConfiguration(),
        survey_token: surveyToken
      };
      const newProject = await createProject(projectData);
      console.log('Created project:', newProject);

      // Define template phases with tasks
      const templatePhases = [
        {
          phase_number: 1,
          title: 'Site Assessment & Planning',
          status: 'pending',
          description: 'Site survey to identify optimal placement. Cellular signal strength verification for reliable transaction processing. Space and infrastructure requirements confirmed.',
          tasks: [
            'Initial site survey and measurements',
            'Optimal placement location identified',
            'Cellular signal strength verification',
            '[ADMIN-SPEED] Speed test conducted in proposed location (required 10Mbps up/down)',
            'Space and traffic flow assessment',
            'Infrastructure specifications delivered to property'
          ]
        },
        {
          phase_number: 2,
          title: 'Contract Signature',
          status: 'pending',
          description: 'Service agreement reviewed and signed. This document outlines equipment specifications, service terms, and installation timeline.',
          document_label: 'View Signed Agreement',
          tasks: [
            'Agreement sent for review',
            'Contract signed and returned'
          ]
        },
        {
          phase_number: 3,
          title: 'Employee Preference Survey',
          status: 'pending',
          description: 'Survey distributed to building employees to capture snack and meal preferences. Results compiled and menu customization planned based on employee favorites.',
          tasks: [
            'Survey link distributed to property management',
            '[PM-TEXT] Allow Raptor Vending to place retractable banners on site announcing the food program until machines arrive',
            '[PM] Survey link distributed to tenants',
            'Snack preferences compiled',
            'Hot meal preferences compiled',
            'Custom menu recommendations finalized'
          ]
        },
        {
          phase_number: 4,
          title: 'Electrical & Networking Preparation',
          status: 'pending',
          description: 'Property is responsible for infrastructure preparation—dedicated 15A circuit for Smart Cooker™ and optional ethernet drops for real-time operations. We provide specifications; property team coordinates contractor quotes and installation.',
          property_responsibility: true,
          tasks: [
            'Electrical & networking specifications provided to property',
            '[PM] Property obtained contractor quotes',
            '[PM-DATE] Property selected electrical contractor and scheduled install',
            '[PM] All electrical and optional networking installed'
          ]
        },
        {
          phase_number: 5,
          title: 'Building Access & Coordination',
          status: 'pending',
          description: 'Final coordination with property management to ensure smooth installation. Vendor approvals, insurance documentation, access scheduling, and security credentials.',
          tasks: [
            '[PM] Raptor Vending added to approved vendor list',
            'Certificate of Insurance (COI) submitted to property management',
            '[ADMIN-DATE] Install date confirmed with property manager',
            'Loading dock/freight elevator access scheduled',
            'Secure storage location confirmed for equipment',
            'Raptor Vending confirmed electrical and networking is satisfactory',
            '[PM] Security badges/keyfobs/access items provided to Raptor Vending',
            '[PM] Emergency contact list provided to Raptor Vending'
          ]
        },
        {
          phase_number: 6,
          title: 'Equipment Ordering & Delivery',
          status: 'pending',
          description: 'Equipment ordered based on final configuration. Delivery scheduled with property team.',
          tasks: [
            '[ADMIN-EQUIPMENT] SmartFridge™ and SmartCooker™ ordered',
            '[ADMIN-ENCLOSURE] Enclosure ordered',
            '[ADMIN-DELIVERY] Delivery scheduled',
            'All equipment delivered to site and prepped for health inspection',
            'City Health Inspection scheduled',
            'Health inspection PASSED'
          ]
        },
        {
          phase_number: 7,
          title: 'System Installation & Integration',
          status: 'pending',
          description: 'Equipment delivery and installation. Smart Fridge™ units positioned and connected. Smart Cooker™ integrated with dedicated circuit. Payment system activation and cellular connectivity confirmed.',
          is_approximate: true,
          tasks: [
            'Smart Fridge™ units positioning',
            'Smart Cooker™ installation & circuit connection',
            'Custom enclosure installation',
            'Payment system activation',
            'Cellular transaction testing'
          ]
        },
        {
          phase_number: 8,
          title: 'Testing, Stocking & Launch',
          status: 'pending',
          description: 'Full system testing, initial inventory stocking with Southerleigh chef-prepared meals based on survey results, property management dashboard setup, and tenant launch communications.',
          is_approximate: true,
          tasks: [
            'AI vision system calibration',
            'Payment processing verification',
            'Initial Southerleigh meal inventory (survey-based)',
            'Snack inventory based on employee preferences',
            'Property management dashboard access',
            'Tenant communication materials delivered',
            'Official infrastructure launch'
          ]
        }
      ];

      // Create all phases and their tasks
      for (const phaseTemplate of templatePhases) {
        const { tasks, ...phaseData } = phaseTemplate;
        const phase = await createPhase({
          project_id: newProject.id,
          ...phaseData
        });

        // Create tasks for this phase
        for (let i = 0; i < tasks.length; i++) {
          await createTask({
            phase_id: phase.id,
            label: tasks[i],
            completed: false,
            sort_order: i + 1
          });
        }
      }

      onSave(newProject);
    } catch (err) {
      console.error('Error creating install:', err);
      alert('Error creating install: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>New Install</h3>
        <div className="form-group">
          <label>Location</label>
          <select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
            <option value="">Select a location...</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{getLocationLabel(loc)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Project Number</label>
          <input value={form.project_number} onChange={e => setForm({ ...form, project_number: e.target.value })} />
        </div>

        <div className="config-section">
          <label>Configuration</label>
          <div className="config-row">
            <div className="config-item">
              <select value={smartFridgeQty} onChange={e => setSmartFridgeQty(parseInt(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
              <span>SmartFridge™</span>
            </div>
            <div className="config-item">
              <select value={smartCookerQty} onChange={e => setSmartCookerQty(parseInt(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
              <span>SmartCooker™</span>
            </div>
          </div>
          <div className="config-row">
            <div className="config-item full">
              <select value={enclosureType} onChange={e => { setEnclosureType(e.target.value); if (e.target.value !== 'custom') setEnclosureColor(''); }}>
                <option value="">No Enclosure</option>
                <option value="custom">Custom Architectural Enclosure</option>
                <option value="wrap">Magnetic Wrap</option>
              </select>
            </div>
          </div>
          {enclosureType === 'custom' && (
            <div className="config-row">
              <div className="config-item full">
                <select value={enclosureColor} onChange={e => setEnclosureColor(e.target.value)}>
                  <option value="">Select color...</option>
                  <option value="Dove Grey">Dove Grey</option>
                  <option value="Macchiato">Macchiato</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>
          )}
          {buildConfiguration() && (
            <div className="config-preview">
              <strong>Preview:</strong> {buildConfiguration()}
            </div>
          )}
        </div>

        {saving && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e5e5',
              borderTopColor: '#f97316',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }}></div>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#333' }}>Creating Install...</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Setting up phases and tasks</p>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!form.location_id || saving}
          >
            {saving ? 'Creating...' : 'Create Install'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROPERTIES LIST
// ============================================
function PropertiesList({ properties, locations, managers, onRefresh }) {
  const [showNewProperty, setShowNewProperty] = useState(false);
  const [showNewLocation, setShowNewLocation] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

  async function handleCreateProperty(data) {
    await createProperty(data);
    await onRefresh();
    setShowNewProperty(false);
  }

  async function handleUpdateProperty(data) {
    await updateProperty(editingProperty.id, data);
    onRefresh();
    setEditingProperty(null);
  }

  async function handleDeleteProperty(id) {
    if (!window.confirm('Delete this property and all its locations? This cannot be undone.')) return;
    try {
      await deleteProperty(id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting property:', err);
      alert('Error deleting property: ' + err.message);
    }
  }

  async function handleCreateLocation(data) {
    await createLocation(data);
    onRefresh();
    setShowNewLocation(null);
  }

  async function handleUpdateLocation(data) {
    await updateLocation(editingLocation.id, data);
    onRefresh();
    setEditingLocation(null);
  }

  async function handleDeleteLocation(id) {
    if (!window.confirm('Delete this location?')) return;
    try {
      await deleteLocation(id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting location:', err);
      alert('Error deleting location: ' + err.message);
    }
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Properties & Locations</h2>
        <button className="btn-primary" onClick={() => setShowNewProperty(true)}>+ New Property</button>
      </div>

      <div className="properties-list">
        {properties.map(prop => {
          const propLocations = locations.filter(l => l.property_id === prop.id);
          const manager = managers.find(m => m.id === prop.property_manager_id);
          return (
            <div key={prop.id} className="property-block">
              <div className="property-header">
                <div>
                  <h3>{prop.name}</h3>
                  <p>{prop.address}, {prop.city}, {prop.state} {prop.zip}</p>
                  {prop.total_employees > 0 && <p className="headcount-info">Est headcount: {prop.total_employees}</p>}
                  {manager && <p className="manager-info">PM: {manager.name}</p>}
                </div>
                <div className="property-actions">
                  <button className="btn-secondary" onClick={() => setEditingProperty(prop)}>Edit</button>
                  <button className="btn-secondary btn-danger" onClick={() => handleDeleteProperty(prop.id)}>Delete</button>
                  <button className="btn-secondary" onClick={() => setShowNewLocation(prop.id)}>+ Add Location</button>
                </div>
              </div>
              <div className="locations-grid">
                {propLocations.map(loc => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    onEdit={() => setEditingLocation(loc)}
                    onDelete={() => handleDeleteLocation(loc.id)}
                    onRefresh={onRefresh}
                  />
                ))}
                {propLocations.length === 0 && (
                  <p className="empty-state">No locations yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNewProperty && (
        <div className="modal-overlay" onClick={() => setShowNewProperty(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>New Property</h3>
            <PropertyForm managers={managers} onSave={handleCreateProperty} onCancel={() => setShowNewProperty(false)} />
          </div>
        </div>
      )}

      {showNewLocation && (
        <div className="modal-overlay" onClick={() => setShowNewLocation(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>New Location</h3>
            <LocationForm propertyId={showNewLocation} onSave={handleCreateLocation} onCancel={() => setShowNewLocation(null)} />
          </div>
        </div>
      )}

      {editingProperty && (
        <div className="modal-overlay" onClick={() => setEditingProperty(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Property</h3>
            <PropertyForm
              managers={managers}
              initialData={editingProperty}
              onSave={handleUpdateProperty}
              onCancel={() => setEditingProperty(null)}
            />
          </div>
        </div>
      )}

      {editingLocation && (
        <div className="modal-overlay" onClick={() => setEditingLocation(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Location</h3>
            <LocationForm
              propertyId={editingLocation.property_id}
              initialData={editingLocation}
              onSave={handleUpdateLocation}
              onCancel={() => setEditingLocation(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyForm({ managers, initialData, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip: initialData?.zip || '',
    total_employees: initialData?.total_employees || 0,
    property_manager_id: initialData?.property_manager_id || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || saving) return;
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      console.error('Error saving property:', err);
      alert('Error saving property: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="form-group">
        <label>Property Name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={saving} />
      </div>
      <div className="form-group">
        <label>Address</label>
        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} disabled={saving} />
      </div>
      <div className="form-row three-col">
        <div className="form-group">
          <label>City</label>
          <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} disabled={saving} />
        </div>
        <div className="form-group">
          <label>State</label>
          <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} disabled={saving} />
        </div>
        <div className="form-group">
          <label>ZIP</label>
          <input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} disabled={saving} />
        </div>
      </div>
      <div className="form-row two-col">
        <div className="form-group">
          <label>Est Headcount</label>
          <input type="number" value={form.total_employees} onChange={e => setForm({ ...form, total_employees: parseInt(e.target.value) || 0 })} disabled={saving} />
        </div>
        <div className="form-group">
          <label>Property Manager</label>
          <select value={form.property_manager_id} onChange={e => setForm({ ...form, property_manager_id: e.target.value })} disabled={saving}>
            <option value="">Select...</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>{m.name} - {m.company}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : (initialData ? 'Save' : 'Create')}
        </button>
      </div>
    </>
  );
}

function LocationCard({ location, onEdit, onDelete, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const images = location.images || [];

  async function handleImageUpload(e) {
    let file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convert HEIC to JPEG if needed
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      if (fileType === 'image/heic' || fileType === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.85
          });
          file = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (convErr) {
          console.warn('HEIC conversion failed, uploading original:', convErr);
          // Continue with original file - thumbnail may not display but file will be stored
        }
      }

      const fileExt = file.name.split('.').pop();
      const uploadFileName = `location-${location.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(uploadFileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(uploadFileName);

      const newImages = [...images, publicUrl];
      await updateLocation(location.id, { images: newImages });
      onRefresh();
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error uploading image: ' + (err.message || JSON.stringify(err)));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(imageUrl) {
    if (!window.confirm('Remove this image?')) return;
    const newImages = images.filter(img => img !== imageUrl);
    await updateLocation(location.id, { images: newImages });
    onRefresh();
  }

  return (
    <div className="location-card">
      <div className="card-actions">
        <button className="icon-btn edit" onClick={onEdit} title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button className="icon-btn delete" onClick={onDelete} title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
      <strong>{location.name}</strong>
      {location.floor && <span>Floor {location.floor}</span>}

      {/* Location Images */}
      <div className="location-images">
        {images.map((img, idx) => (
          <div key={idx} className="location-image-thumb" onClick={() => setPreviewImage(img)}>
            <img
              src={img}
              alt={`Location ${idx + 1}`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="image-placeholder" style={{ display: 'none' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <button className="remove-image" onClick={(e) => { e.stopPropagation(); handleRemoveImage(img); }}>×</button>
          </div>
        ))}
        <div className="add-image-btn">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*,.heic,.heif"
            style={{ display: 'none' }}
          />
          <button
            className="icon-btn add"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Add Image"
          >
            {uploading ? '...' : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-preview-close" onClick={() => setPreviewImage(null)}>×</button>
            <img src={previewImage} alt="Preview" />
            <a href={previewImage} download className="image-preview-download">Download</a>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationForm({ propertyId, initialData, onSave, onCancel }) {
  const [form, setForm] = useState({
    property_id: propertyId,
    name: initialData?.name || '',
    floor: initialData?.floor || '',
    description: initialData?.description || ''
  });

  return (
    <>
      <div className="form-row two-col">
        <div className="form-group">
          <label>Location Name</label>
          <input placeholder="e.g., 4th Floor Break Room" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Floor</label>
          <input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => form.name && onSave(form)}>
          {initialData ? 'Save' : 'Create'}
        </button>
      </div>
    </>
  );
}

// ============================================
// MANAGERS LIST
// ============================================
function ManagersList({ managers, onRefresh }) {
  const [showNew, setShowNew] = useState(false);
  const [editingManager, setEditingManager] = useState(null);

  async function handleCreate(data) {
    // Sync with HighLevel first
    try {
      const hlResponse = await fetch('/api/sync-highlevel-contact', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone
        })
      });
      const hlResult = await hlResponse.json();
      if (hlResult.contactId) {
        data.highlevel_contact_id = hlResult.contactId;
      }
    } catch (err) {
      console.error('HighLevel sync failed:', err);
      // Continue anyway - PM will be created without HighLevel link
    }

    await createPropertyManager(data);
    onRefresh();
    setShowNew(false);
  }

  async function handleUpdate(data) {
    // Sync with HighLevel
    try {
      const hlResponse = await fetch('/api/sync-highlevel-contact', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone
        })
      });
      const hlResult = await hlResponse.json();
      if (hlResult.contactId) {
        data.highlevel_contact_id = hlResult.contactId;
      }
    } catch (err) {
      console.error('HighLevel sync failed:', err);
    }

    await updatePropertyManager(editingManager.id, data);
    onRefresh();
    setEditingManager(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this property manager? This may affect associated properties.')) return;
    try {
      await deletePropertyManager(id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting manager:', err);
      alert('Error deleting manager: ' + err.message);
    }
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Property Managers</h2>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Manager</button>
      </div>

      <div className="managers-grid">
        {managers.map(manager => (
          <div key={manager.id} className="manager-card">
            <div className="card-actions">
              <button className="icon-btn edit" onClick={() => setEditingManager(manager)} title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button className="icon-btn delete" onClick={() => handleDelete(manager.id)} title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
            <h3>{manager.name}</h3>
            <p>{manager.company}</p>
            <p>{manager.email}</p>
            <p>{manager.phone}</p>
            <div className="token-display">
              Portal: <code>/pm/{manager.access_token}</code>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>New Property Manager</h3>
            <ManagerForm onSave={handleCreate} onCancel={() => setShowNew(false)} />
          </div>
        </div>
      )}

      {editingManager && (
        <div className="modal-overlay" onClick={() => setEditingManager(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Property Manager</h3>
            <ManagerForm
              initialData={editingManager}
              onSave={handleUpdate}
              onCancel={() => setEditingManager(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || ''
  });

  return (
    <>
      <div className="form-group">
        <label>Name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Company</label>
        <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Phone</label>
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => form.name && onSave(form)}>
          {initialData ? 'Save' : 'Create'}
        </button>
      </div>
    </>
  );
}

// ============================================
// ACTIVITY LOG
// ============================================
function ActivityLog({ projects, locations, properties }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => {
    loadActivities();
  }, [filterProject]);

  async function loadActivities() {
    setLoading(true);
    try {
      const data = await fetchActivityLog(filterProject || null);
      setActivities(data);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this activity entry?')) return;
    try {
      await deleteActivityLog(id);
      setActivities(activities.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting activity:', err);
    }
  }

  async function handleClearAll() {
    const msg = filterProject ? 'Clear all activity for this project?' : 'Clear ALL activity logs?';
    if (!window.confirm(msg)) return;
    try {
      await clearActivityLog(filterProject || null);
      setActivities([]);
    } catch (err) {
      console.error('Error clearing activity:', err);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function getProjectInfo(activity) {
    if (activity.project?.project_number) {
      const propertyName = activity.project?.location?.property?.name || '';
      return `#${activity.project.project_number}${propertyName ? ` - ${propertyName}` : ''}`;
    }
    return 'Unknown Project';
  }

  return (
    <div className="activity-log-section">
      <div className="section-header">
        <h2>Activity Log</h2>
        <div className="activity-controls">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="activity-filter"
          >
            <option value="">All Projects</option>
            {projects.map(p => {
              const location = locations.find(l => l.id === p.location_id);
              const property = location ? properties.find(pr => pr.id === location.property_id) : null;
              return (
                <option key={p.id} value={p.id}>
                  #{p.project_number} - {property?.name || 'Unknown'}
                </option>
              );
            })}
          </select>
          {activities.length > 0 && (
            <button className="btn-clear" onClick={handleClearAll}>Clear All</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading activity...</div>
      ) : activities.length === 0 ? (
        <div className="empty-state">No activity recorded yet.</div>
      ) : (
        <div className="activity-list">
          {activities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="activity-content">
                <div className="activity-description">
                  <strong>{activity.actor_type === 'admin' ? 'Admin' : 'Property Manager'}</strong>
                  {' completed: '}
                  <span className="activity-task">{activity.description}</span>
                </div>
                <div className="activity-meta">
                  <span className="activity-project">{getProjectInfo(activity)}</span>
                  <span className="activity-time">{formatDate(activity.created_at)}</span>
                </div>
              </div>
              <button className="activity-delete" onClick={() => handleDelete(activity.id)} title="Delete">×</button>
            </div>
          ))}
        </div>
      )}

      <MigrationsPanel />
    </div>
  );
}

// ============================================
// MIGRATIONS PANEL (one-time data fixes)
// ============================================
function MigrationsPanel() {
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});

  async function runMigration(name, migrationKey) {
    if (running) return;
    setRunning(name);
    try {
      const response = await fetch('/api/admin/crud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sessionStorage.getItem('adminToken')
        },
        body: JSON.stringify({ table: migrationKey, action: 'migrate' })
      });
      const data = await response.json();
      setResults(prev => ({ ...prev, [name]: data }));
      if (data.success) {
        alert(data.message || 'Migration completed successfully!');
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Migration failed: ' + err.message);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="migrations-panel" style={{ marginTop: '40px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#666' }}>Data Migrations</h3>
      <p style={{ fontSize: '13px', color: '#888', marginBottom: '15px' }}>One-time scripts to update existing data. Safe to run multiple times.</p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn-secondary"
          onClick={() => runMigration('banner', 'add-banner-task')}
          disabled={running === 'banner'}
          style={{ fontSize: '13px' }}
        >
          {running === 'banner' ? 'Running...' : 'Add Banner Task to Phase 3'}
        </button>
      </div>

      {results.banner && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Last run: {results.banner.message || results.banner.error}
        </div>
      )}
    </div>
  );
}

// ============================================
// GLOBAL DOCUMENTS MANAGER
// ============================================
function GlobalDocsManager({ documents = [], onRefresh }) {
  const [uploading, setUploading] = useState(null);
  const fileInputRefs = {};

  async function handleFileUpload(doc, e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(doc.id);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${doc.key}.${fileExt}`;
      const filePath = `global-docs/${fileName}`;

      // Upload via admin API to bypass storage RLS
      const publicUrl = await uploadFile('documents', filePath, file);

      // Update document record
      await updateGlobalDocument(doc.id, { url: publicUrl });
      onRefresh();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Failed to upload document: ' + err.message);
    } finally {
      setUploading(null);
    }
  }

  async function handleRemoveDocument(doc) {
    if (!window.confirm('Remove this document?')) return;
    try {
      await updateGlobalDocument(doc.id, { url: null });
      onRefresh();
    } catch (err) {
      console.error('Error removing document:', err);
    }
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Global Documents</h2>
        <p style={{ color: '#666', fontSize: '0.9em', marginTop: '5px' }}>
          These documents are shared across all installations.
        </p>
      </div>

      <div className="global-docs-list">
        {documents.length === 0 ? (
          <p className="empty-state">No global documents configured. Add them via Supabase.</p>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="global-doc-item">
              <div className="global-doc-info">
                <strong>{doc.label}</strong>
                {doc.description && <span>{doc.description}</span>}
              </div>
              <div className="global-doc-actions">
                {doc.url ? (
                  <>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="document-link-admin"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      View
                    </a>
                    <button
                      className="btn-secondary"
                      onClick={() => fileInputRefs[doc.id]?.click()}
                      disabled={uploading === doc.id}
                    >
                      Replace
                    </button>
                    <button
                      className="btn-secondary btn-danger"
                      onClick={() => handleRemoveDocument(doc)}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => fileInputRefs[doc.id]?.click()}
                    disabled={uploading === doc.id}
                  >
                    {uploading === doc.id ? 'Uploading...' : 'Upload Document'}
                  </button>
                )}
                <input
                  type="file"
                  ref={el => fileInputRefs[doc.id] = el}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx"
                  onChange={e => handleFileUpload(doc, e)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// PREVIEW PANE (Admin view of PM pages)
// ============================================
function PreviewPane({ projects, locations, properties }) {
  // Group projects by property
  const projectsByProperty = {};
  projects.forEach(project => {
    const location = locations.find(l => l.id === project.location_id);
    const property = location ? properties.find(p => p.id === location.property_id) : null;
    const propertyName = property?.name || 'Unknown Property';

    if (!projectsByProperty[propertyName]) {
      projectsByProperty[propertyName] = [];
    }
    projectsByProperty[propertyName].push({
      ...project,
      locationName: location?.name || 'Unknown Location',
      propertyName
    });
  });

  // Sort properties alphabetically
  const sortedProperties = Object.keys(projectsByProperty).sort();

  // Get the first project's token as default
  const firstProject = sortedProperties.length > 0 ? projectsByProperty[sortedProperties[0]][0] : null;
  const [selectedToken, setSelectedToken] = useState(firstProject?.public_token || null);

  return (
    <div className="preview-pane">
      <div className="preview-sidebar">
        <div className="preview-sidebar-header">
          <img src="/logo-light.png" alt="Raptor Vending" className="preview-logo" />
        </div>
        <nav className="preview-sidebar-nav">
          <h3>Properties</h3>
          {sortedProperties.map(propertyName => (
            <div key={propertyName} className="preview-property-group">
              <div className="preview-property-name">{propertyName}</div>
              {projectsByProperty[propertyName].map(project => (
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
      <div className="preview-content">
        {selectedToken ? (
          <iframe
            src={`/project/${selectedToken}?admin=1`}
            title="Project Preview"
            className="preview-iframe"
          />
        ) : (
          <div className="preview-placeholder">
            <p>Select a project from the sidebar to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EMAIL TEMPLATES
// ============================================
function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      const data = await fetchEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading email templates:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(template) {
    setEditingTemplate(template.id);
    setEditForm({
      name: template.name,
      trigger_description: template.trigger_description || '',
      trigger_details: template.trigger_details || '',
      recipients: template.recipients || '',
      cc_emails: template.cc_emails || '',
      subject_template: template.subject_template || '',
      body_template: template.body_template || ''
    });
  }

  function handleCancel() {
    setEditingTemplate(null);
    setEditForm({});
  }

  async function handleSave(templateId) {
    setSaving(true);
    try {
      await updateEmailTemplate(templateId, editForm);
      await loadTemplates();
      setEditingTemplate(null);
      setEditForm({});
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Error saving template: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading email templates...</div>;
  }

  return (
    <div className="email-templates-section">
      <div className="section-header">
        <h2>Email Templates</h2>
      </div>
      <p className="email-templates-intro">
        These email templates are sent automatically based on their triggers. Click "Edit" to modify a template.
      </p>

      <div className="email-templates-list">
        {templates.map(template => (
          <div key={template.id} className="email-template-card">
            <div
              className="email-template-header"
              onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
            >
              <div className="email-template-title">
                <h3>{template.name}</h3>
                <span className="email-template-trigger-badge">{template.trigger_description}</span>
              </div>
              <span className="email-template-expand">
                {expandedTemplate === template.id ? '−' : '+'}
              </span>
            </div>

            {expandedTemplate === template.id && (
              <div className="email-template-body">
                {editingTemplate === template.id ? (
                  <div className="email-template-edit-form">
                    <div className="form-group">
                      <label>Template Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Trigger Description (shown in header)</label>
                      <input
                        type="text"
                        value={editForm.trigger_description}
                        onChange={e => setEditForm({ ...editForm, trigger_description: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Trigger Details</label>
                      <textarea
                        rows="2"
                        value={editForm.trigger_details}
                        onChange={e => setEditForm({ ...editForm, trigger_details: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Recipients</label>
                      <input
                        type="text"
                        value={editForm.recipients}
                        onChange={e => setEditForm({ ...editForm, recipients: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>CC Emails</label>
                      <input
                        type="text"
                        value={editForm.cc_emails}
                        onChange={e => setEditForm({ ...editForm, cc_emails: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Subject Template</label>
                      <input
                        type="text"
                        value={editForm.subject_template}
                        onChange={e => setEditForm({ ...editForm, subject_template: e.target.value })}
                        placeholder="Use {{propertyName}}, {{itemCount}}, {{equipment}} etc."
                      />
                    </div>
                    <div className="form-group">
                      <label>Body Template</label>
                      <textarea
                        rows="12"
                        value={editForm.body_template}
                        onChange={e => setEditForm({ ...editForm, body_template: e.target.value })}
                        placeholder="Use {{firstName}}, {{propertyName}}, {{taskList}}, {{projectUrl}} etc."
                      />
                    </div>
                    <div className="form-actions">
                      <button className="btn-secondary" onClick={handleCancel} disabled={saving}>Cancel</button>
                      <button className="btn-primary" onClick={() => handleSave(template.id)} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="email-template-meta">
                      <div className="email-template-meta-item">
                        <strong>Trigger:</strong>
                        <span>{template.trigger_details}</span>
                      </div>
                      <div className="email-template-meta-item">
                        <strong>To:</strong>
                        <span>{template.recipients}</span>
                      </div>
                      <div className="email-template-meta-item">
                        <strong>CC:</strong>
                        <span>{template.cc_emails}</span>
                      </div>
                      <div className="email-template-meta-item">
                        <strong>Subject:</strong>
                        <span>{template.subject_template}</span>
                      </div>
                    </div>

                    <div className="email-template-content">
                      <strong>Content:</strong>
                      <pre>{template.body_template}</pre>
                    </div>

                    <div className="email-template-actions">
                      <button className="btn-secondary" onClick={() => handleEdit(template)}>Edit Template</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// ADMIN MESSAGES SECTION
// ============================================
function AdminMessagesSection({ propertyManagers, onUnreadChange }) {
  const [conversations, setConversations] = useState([]);
  const [selectedPM, setSelectedPM] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Load all conversations (PMs with messages)
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load messages when PM selected and mark as read
  useEffect(() => {
    if (selectedPM) {
      loadMessages(selectedPM.id);
      markAsRead(selectedPM.id);
    }
  }, [selectedPM]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const data = await fetchAllPmMessages();

      if (data) {
        // Sort by created_at descending
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Get unique PM IDs with latest message time and unread count
        const pmMap = new Map();
        data.forEach(msg => {
          if (!pmMap.has(msg.pm_id)) {
            pmMap.set(msg.pm_id, { lastMessage: msg.created_at, unreadCount: 0 });
          }
          // Count unread messages from PM (not admin)
          if (msg.sender === 'pm' && !msg.read_at) {
            const current = pmMap.get(msg.pm_id);
            current.unreadCount++;
          }
        });

        // Match with property managers
        const convos = [];
        pmMap.forEach((info, pmId) => {
          const pm = propertyManagers.find(p => p.id === pmId);
          if (pm) {
            convos.push({ ...pm, lastMessage: info.lastMessage, unreadCount: info.unreadCount });
          }
        });

        // Sort by last message
        convos.sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));
        setConversations(convos);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(pmId) {
    try {
      await markPmMessagesAsRead(pmId);

      // Refresh conversations to update unread counts
      loadConversations();
      // Notify parent to update nav badge
      if (onUnreadChange) onUnreadChange();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }

  async function loadMessages(pmId) {
    try {
      const data = await fetchPmMessagesByPm(pmId);
      if (data) {
        // Sort by created_at ascending for display
        data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setMessages(data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedPM) return;

    setSending(true);
    try {
      await createPmMessage({
        pm_id: selectedPM.id,
        sender: 'admin',
        sender_name: 'Raptor Vending',
        message: newMessage.trim()
      });

      setNewMessage('');
      loadMessages(selectedPM.id);
      loadConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(msgId) {
    if (!window.confirm('Delete this message?')) return;

    try {
      await deletePmMessage(msgId);
      loadMessages(selectedPM.id);
      loadConversations();
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message: ' + err.message);
    }
  }

  async function handleDeleteConversation(pmId) {
    if (!window.confirm('Delete ALL messages with this property manager?')) return;

    try {
      await deletePmMessagesByPm(pmId);
      setSelectedPM(null);
      setMessages([]);
      loadConversations();
      if (onUnreadChange) onUnreadChange();
    } catch (err) {
      console.error('Error deleting conversation:', err);
      alert('Failed to delete conversation: ' + err.message);
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="admin-messages-section">
      <div className="section-header">
        <h2>Messages</h2>
        <div className="section-header-actions">
          <select
            className="admin-new-convo-select"
            value=""
            onChange={(e) => {
              const pm = propertyManagers.find(p => p.id === e.target.value);
              if (pm) setSelectedPM(pm);
            }}
          >
            <option value="">+ New Message</option>
            {propertyManagers
              .filter(pm => !conversations.find(c => c.id === pm.id))
              .map(pm => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))
            }
          </select>
          <button className="btn-secondary btn-icon" onClick={() => { loadConversations(); if (selectedPM) loadMessages(selectedPM.id); }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="admin-messages-container">
        {/* Conversations List */}
        <div className="admin-conversations-list">
          <h3>Conversations</h3>
          {loading ? (
            <div className="admin-messages-loading">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="admin-messages-empty">No messages yet</div>
          ) : (
            conversations.map(pm => (
              <div
                key={pm.id}
                className={`admin-conversation-item ${selectedPM?.id === pm.id ? 'active' : ''} ${pm.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => setSelectedPM(pm)}
              >
                <div className="admin-conversation-header">
                  <div className="admin-conversation-name">{pm.name}</div>
                  {pm.unreadCount > 0 && (
                    <span className="admin-unread-badge">{pm.unreadCount}</span>
                  )}
                </div>
                <div className="admin-conversation-company">{pm.company}</div>
                <div className="admin-conversation-time">{formatTime(pm.lastMessage)}</div>
              </div>
            ))
          )}
        </div>

        {/* Messages Panel */}
        <div className="admin-messages-panel">
          {!selectedPM ? (
            <div className="admin-messages-placeholder">
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div className="admin-messages-header">
                <div>
                  <h3>{selectedPM.name}</h3>
                  <span>{selectedPM.company}</span>
                </div>
                <button className="admin-delete-convo-btn" onClick={() => handleDeleteConversation(selectedPM.id)}>
                  Delete All
                </button>
              </div>

              <div className="admin-messages-list">
                {messages.map(msg => (
                  <div key={msg.id} className={`admin-message ${msg.sender === 'admin' ? 'outgoing' : 'incoming'}`}>
                    <div className="admin-message-bubble">
                      <div className="admin-message-text">{msg.message}</div>
                      <div className="admin-message-time">{formatTime(msg.created_at)}</div>
                    </div>
                    <div className="admin-message-footer">
                      <span className="admin-message-sender">
                        {msg.sender === 'admin' ? 'Raptor Vending' : msg.sender_name || 'Property Manager'}
                      </span>
                      <button className="admin-message-delete" onClick={() => handleDelete(msg.id)} title="Delete message">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="admin-messages-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
