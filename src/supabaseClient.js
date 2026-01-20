import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// PUBLIC FETCH FUNCTIONS (for viewer)
// ============================================

// Fetch a single project by public token
export async function fetchProjectByToken(token) {
  // Get project with location and property info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      *,
      location:locations(
        *,
        property:properties(
          *,
          property_manager:property_managers(*)
        )
      )
    `)
    .eq('public_token', token)
    .eq('is_active', true)
    .single();

  if (projectError) throw projectError;
  if (!project) return null;

  // Fetch phases
  const { data: phases, error: phasesError } = await supabase
    .from('phases')
    .select('*')
    .eq('project_id', project.id)
    .order('phase_number', { ascending: true });

  if (phasesError) throw phasesError;

  // Fetch tasks for all phases
  const phaseIds = (phases || []).map(p => p.id);
  let tasks = [];
  if (phaseIds.length > 0) {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('phase_id', phaseIds)
      .order('sort_order', { ascending: true });

    if (tasksError) throw tasksError;
    tasks = tasksData || [];
  }

  // Fetch equipment
  const { data: equipment, error: equipmentError } = await supabase
    .from('equipment')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order', { ascending: true });

  if (equipmentError) throw equipmentError;

  // Fetch global documents
  const { data: globalDocs } = await supabase
    .from('global_documents')
    .select('*');

  const globalDocsMap = {};
  (globalDocs || []).forEach(doc => {
    globalDocsMap[doc.key] = doc;
  });

  // Assemble the full project object
  const location = project.location;
  const property = location?.property;
  const propertyManager = property?.property_manager;

  const phasesWithTasks = phases.map(phase => ({
    id: phase.id,
    title: phase.title,
    status: phase.status,
    startDate: phase.start_date,
    endDate: phase.end_date,
    description: phase.description,
    isApproximate: phase.is_approximate,
    propertyResponsibility: phase.property_responsibility,
    contractorInfo: phase.contractor_name ? {
      name: phase.contractor_name,
      scheduledDate: phase.contractor_scheduled_date,
      status: phase.contractor_status
    } : null,
    surveyResults: phase.survey_response_rate ? {
      responseRate: phase.survey_response_rate,
      topMeals: phase.survey_top_meals || [],
      topSnacks: phase.survey_top_snacks || [],
      dietaryNotes: phase.survey_dietary_notes
    } : null,
    document: phase.document_url ? {
      url: phase.document_url,
      label: phase.document_label || 'View Document'
    } : null,
    documents: phase.documents || [],
    tasks: tasks
      .filter(t => t.phase_id === phase.id)
      .map(t => ({ id: t.id, label: t.label, completed: t.completed, scheduled_date: t.scheduled_date, upload_speed: t.upload_speed, download_speed: t.download_speed, enclosure_type: t.enclosure_type, enclosure_color: t.enclosure_color, custom_color_name: t.custom_color_name, smartfridge_qty: t.smartfridge_qty, smartcooker_qty: t.smartcooker_qty, delivery_carrier: t.delivery_carrier, tracking_number: t.tracking_number, deliveries: t.deliveries, document_url: t.document_url, pm_text_value: t.pm_text_value }))
  }));

  return {
    id: project.project_number,
    projectId: project.id,
    publicToken: project.public_token,
    locationName: location?.name || '',
    locationFloor: location?.floor || '',
    locationImages: location?.images || [],
    propertyName: property?.name || '',
    address: property ? `${property.address}, ${property.city}, ${property.state} ${property.zip}` : '',
    employeeCount: property?.total_employees || 0,
    configuration: project.configuration,
    projectManager: {
      name: project.raptor_pm_name,
      email: project.raptor_pm_email,
      phone: project.raptor_pm_phone
    },
    propertyManager: propertyManager ? {
      id: propertyManager.id,
      name: propertyManager.name,
      company: propertyManager.company,
      email: propertyManager.email,
      phone: propertyManager.phone
    } : null,
    estimatedCompletion: formatDate(project.estimated_completion),
    daysRemaining: calculateDaysRemaining(project.estimated_completion),
    overallProgress: project.overall_progress,
    surveyToken: project.survey_token,
    surveyClicks: project.survey_clicks || 0,
    surveyCompletions: project.survey_completions || 0,
    phases: phasesWithTasks,
    equipment: equipment.map(e => ({
      id: e.id,
      name: e.name,
      model: e.model,
      spec: e.spec,
      status: e.status,
      statusLabel: e.status_label
    })),
    globalDocuments: globalDocsMap
  };
}

// Fetch all projects for a property manager by their access token
export async function fetchProjectsByPMToken(accessToken) {
  // Get property manager
  const { data: pm, error: pmError } = await supabase
    .from('property_managers')
    .select('*')
    .eq('access_token', accessToken)
    .eq('is_active', true)
    .single();

  if (pmError) throw pmError;
  if (!pm) return null;

  // Get all properties for this PM
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select(`
      *,
      locations(
        *,
        projects(*)
      )
    `)
    .eq('property_manager_id', pm.id)
    .order('name', { ascending: true });

  if (propError) throw propError;

  // Fetch full project data for each project
  const allProjects = [];
  for (const property of properties) {
    for (const location of property.locations || []) {
      for (const project of location.projects || []) {
        if (project.is_active) {
          const fullProject = await fetchProjectByToken(project.public_token);
          if (fullProject) {
            allProjects.push(fullProject);
          }
        }
      }
    }
  }

  return {
    propertyManager: {
      name: pm.name,
      email: pm.email,
      company: pm.company
    },
    properties: properties.map(p => ({
      id: p.id,
      name: p.name,
      address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`,
      totalEmployees: p.total_employees,
      locationCount: p.locations?.length || 0
    })),
    projects: allProjects
  };
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

// Fetch all data for admin dashboard
export async function fetchAllForAdmin() {
  const [pmResult, propResult, locResult, projResult, docsResult] = await Promise.all([
    supabase.from('property_managers').select('*').order('name'),
    supabase.from('properties').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('global_documents').select('*').order('label')
  ]);

  return {
    propertyManagers: pmResult.data || [],
    properties: propResult.data || [],
    locations: locResult.data || [],
    projects: projResult.data || [],
    globalDocuments: docsResult.data || []
  };
}

// Property Manager CRUD
export async function createPropertyManager(data) {
  const { data: result, error } = await supabase
    .from('property_managers')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updatePropertyManager(id, updates) {
  const { data, error } = await supabase
    .from('property_managers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePropertyManager(id) {
  const { error } = await supabase.from('property_managers').delete().eq('id', id);
  if (error) throw error;
}

// Property CRUD
export async function createProperty(data) {
  const { data: result, error } = await supabase
    .from('properties')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateProperty(id, updates) {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

// Location CRUD
export async function createLocation(data) {
  const { data: result, error } = await supabase
    .from('locations')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateLocation(id, updates) {
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLocation(id) {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
}

// Project CRUD
export async function createProject(data) {
  const { data: result, error } = await supabase
    .from('projects')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// Phase CRUD
export async function createPhase(data) {
  const { data: result, error } = await supabase
    .from('phases')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updatePhase(id, updates) {
  const { data, error } = await supabase
    .from('phases')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePhase(id) {
  const { error } = await supabase.from('phases').delete().eq('id', id);
  if (error) throw error;
}

// Task CRUD
export async function createTask(data) {
  const { data: result, error } = await supabase
    .from('tasks')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateTask(id, updates, options = {}) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // Auto-update phase status based on task completion
  if (data && data.phase_id) {
    try {
      // Get all tasks for this phase and the phase info
      const [{ data: phaseTasks }, { data: phase }] = await Promise.all([
        supabase.from('tasks').select('completed').eq('phase_id', data.phase_id),
        supabase.from('phases').select('project_id').eq('id', data.phase_id).single()
      ]);

      if (phaseTasks && phaseTasks.length > 0) {
        const completedCount = phaseTasks.filter(t => t.completed).length;
        let newStatus;
        if (completedCount === 0) {
          newStatus = 'pending';
        } else if (completedCount === phaseTasks.length) {
          newStatus = 'completed';
        } else {
          newStatus = 'in-progress';
        }

        // Update phase status
        await supabase
          .from('phases')
          .update({ status: newStatus })
          .eq('id', data.phase_id);
      }

      // Log activity if task was just completed and not from admin
      if (updates.completed === true && !options.skipLog && phase?.project_id) {
        const taskLabel = data.label
          .replace('[PM] ', '')
          .replace('[PM-TEXT] ', '')
          .replace('[PM-DATE] ', '');

        await supabase.from('activity_log').insert({
          project_id: phase.project_id,
          task_id: id,
          action: 'task_completed',
          description: taskLabel,
          actor_type: options.actorType || 'property_manager'
        });
      }
    } catch (statusErr) {
      console.error('Error auto-updating phase status:', statusErr);
    }
  }

  return data;
}

// Activity Log functions
export async function fetchActivityLog(projectId = null) {
  let query = supabase
    .from('activity_log')
    .select(`
      *,
      project:projects(project_number, location:locations(name, property:properties(name)))
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function deleteActivityLog(id) {
  const { error } = await supabase.from('activity_log').delete().eq('id', id);
  if (error) throw error;
}

export async function clearActivityLog(projectId = null) {
  let query = supabase.from('activity_log').delete();
  if (projectId) {
    query = query.eq('project_id', projectId);
  } else {
    query = query.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  }
  const { error } = await query;
  if (error) throw error;
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// Equipment CRUD
export async function createEquipment(data) {
  const { data: result, error } = await supabase
    .from('equipment')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateEquipment(id, updates) {
  const { data, error } = await supabase
    .from('equipment')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEquipment(id) {
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) throw error;
}

// Fetch phases and tasks for a project (admin detail view)
export async function fetchProjectDetails(projectId) {
  const [phasesResult, equipmentResult] = await Promise.all([
    supabase
      .from('phases')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_number'),
    supabase
      .from('equipment')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
  ]);

  const phases = phasesResult.data || [];
  const phaseIds = phases.map(p => p.id);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('phase_id', phaseIds)
    .order('sort_order');

  return {
    phases: phases.map(phase => ({
      ...phase,
      tasks: (tasks || []).filter(t => t.phase_id === phase.id)
    })),
    equipment: equipmentResult.data || []
  };
}

// ============================================
// SURVEY TRACKING
// ============================================
export async function recordSurveyClick(surveyToken) {
  // Use API endpoint to bypass RLS
  const response = await fetch('/api/survey-track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ surveyToken, action: 'click' })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to record survey click');
  }

  return true;
}

export async function recordSurveyCompletion(surveyToken) {
  // Use API endpoint to bypass RLS
  const response = await fetch('/api/survey-track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ surveyToken, action: 'complete' })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to record survey completion');
  }

  return true;
}

export async function getProjectBySurveyToken(surveyToken) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_number, survey_clicks')
    .eq('survey_token', surveyToken)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// GLOBAL DOCUMENTS
// ============================================
export async function fetchGlobalDocuments() {
  const { data, error } = await supabase
    .from('global_documents')
    .select('*')
    .order('label');
  if (error) throw error;
  return data || [];
}

export async function fetchGlobalDocumentByKey(key) {
  const { data, error } = await supabase
    .from('global_documents')
    .select('*')
    .eq('key', key)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateGlobalDocument(id, updates) {
  const { data, error } = await supabase
    .from('global_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// EMAIL TEMPLATES
// ============================================
export async function fetchEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchEmailTemplateByKey(key) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', key)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateEmailTemplate(id, updates) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatDate(dateString) {
  if (!dateString) return '';
  // Append T00:00:00 to interpret as local midnight, not UTC
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function calculateDaysRemaining(dateString) {
  if (!dateString) return 0;
  // Append T00:00:00 to interpret as local midnight, not UTC
  const target = new Date(dateString + 'T00:00:00');
  const today = new Date();
  const diff = target - today;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
