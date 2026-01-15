import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import heic2any from 'heic2any';
import {
  supabase,
  fetchAllForAdmin,
  fetchProjectDetails,
  createPropertyManager,
  updatePropertyManager,
  createProperty,
  updateProperty,
  createLocation,
  updateLocation,
  createProject,
  updateProject,
  createPhase,
  updatePhase,
  createTask,
  updateTask,
  deleteTask,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  deleteProject,
  updateGlobalDocument
} from './supabaseClient';

// ============================================
// ADMIN DASHBOARD
// ============================================
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'raptorlive26';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('adminAuth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);

  function handlePasswordSubmit(e) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

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
              autoFocus
            />
            {passwordError && <p className="error-message">Incorrect password</p>}
            <button type="submit">Enter</button>
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
        </nav>
        <Link to="/" className="admin-home-link">← Back</Link>
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
    is_active: project.is_active
  });
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);

  async function handleSaveProject() {
    try {
      await updateProject(project.id, projectForm);
      setEditingProject(false);
      onRefresh();
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Error saving project');
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
              <button className="btn-save" onClick={handleSaveProject}>Save</button>
              <button className="btn-cancel" onClick={() => setEditingProject(false)}>Cancel</button>
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const multiFileInputRef = useRef(null);

  const isSiteAssessment = phase.title.toLowerCase().includes('site assessment');
  const documents = phase.documents || [];

  async function handleSave() {
    await onUpdatePhase(phase.id, form);
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
              <button className="btn-save" onClick={handleSave}>Save</button>
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
                  <button className="btn-delete-small" onClick={() => onDeleteTask(task.id)}>×</button>
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
                    <DeliveryInputs task={task} onRefresh={onRefresh} />
                  )}
                  {isAdminDoc && task.completed && (
                    <TaskDocUpload task={task} onRefresh={onRefresh} />
                  )}
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

  return (
    <div className="admin-speed-inputs">
      <div className="speed-input-group">
        <label>Up:</label>
        <input
          type="number"
          step="0.1"
          min="0"
          className="admin-speed-input"
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
          className="admin-speed-input"
          placeholder="Mbps"
          value={download}
          onChange={(e) => setDownload(e.target.value)}
          onBlur={handleDownloadBlur}
        />
      </div>
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

function DeliveryInputs({ task, onRefresh }) {
  const deliveries = task.deliveries || [];
  const [localDeliveries, setLocalDeliveries] = useState(deliveries);

  const addDelivery = async () => {
    const newDeliveries = [...localDeliveries, { equipment: '', date: '', carrier: '', tracking: '' }];
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

  const [smartFridgeQty, setSmartFridgeQty] = useState(0);
  const [smartCookerQty, setSmartCookerQty] = useState(0);
  const [enclosureType, setEnclosureType] = useState('');
  const [enclosureColor, setEnclosureColor] = useState('');

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
    if (!form.location_id) return;

    try {
      // Generate a survey token
      const surveyToken = Math.random().toString(36).substring(2, 15);

      // Create the project first
      const projectData = { ...form, configuration: buildConfiguration(), survey_token: surveyToken };
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

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!form.location_id}
          >
            Create Install
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
    onRefresh();
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
      const { deleteProperty } = await import('./supabaseClient');
      await deleteProperty(id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting property:', err);
      alert('Error deleting property');
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
      const { deleteLocation } = await import('./supabaseClient');
      await deleteLocation(id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting location:', err);
      alert('Error deleting location');
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

  return (
    <>
      <div className="form-group">
        <label>Property Name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Address</label>
        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="form-row three-col">
        <div className="form-group">
          <label>City</label>
          <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="form-group">
          <label>State</label>
          <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
        </div>
        <div className="form-group">
          <label>ZIP</label>
          <input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
        </div>
      </div>
      <div className="form-row two-col">
        <div className="form-group">
          <label>Est Headcount</label>
          <input type="number" value={form.total_employees} onChange={e => setForm({ ...form, total_employees: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label>Property Manager</label>
          <select value={form.property_manager_id} onChange={e => setForm({ ...form, property_manager_id: e.target.value })}>
            <option value="">Select...</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>{m.name} - {m.company}</option>
            ))}
          </select>
        </div>
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
    await createPropertyManager(data);
    onRefresh();
    setShowNew(false);
  }

  async function handleUpdate(data) {
    await updatePropertyManager(editingManager.id, data);
    onRefresh();
    setEditingManager(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this property manager? This may affect associated properties.')) return;
    try {
      const { deletePropertyManager } = await import('./supabaseClient');
      await deletePropertyManager(id);
      onRefresh();
    } catch (err) {
      console.error('Error deleting manager:', err);
      alert('Error deleting manager');
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

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update document record
      await updateGlobalDocument(doc.id, { url: urlData.publicUrl });
      onRefresh();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Failed to upload document');
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
