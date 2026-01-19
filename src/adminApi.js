// Admin API client for authenticated CRUD operations
// Uses consolidated /api/admin/crud endpoint to stay under Vercel function limit

function getAuthHeaders() {
  const token = sessionStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function handleResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      console.error('Admin session expired or invalid');
    }
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

// Generic CRUD helper
async function adminCrud(table, action, { id, data, filters } = {}) {
  const response = await fetch('/api/admin/crud', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ table, action, id, data, filters })
  });
  return handleResponse(response);
}

// ============================================
// PROJECTS API
// ============================================

export async function fetchProjects() {
  const result = await adminCrud('projects', 'read');
  return result.data;
}

export async function fetchProject(id) {
  const result = await adminCrud('projects', 'read', { id });
  return result.data;
}

export async function createProject(data) {
  const result = await adminCrud('projects', 'create', { data });
  return result.data;
}

export async function updateProject(id, updates) {
  const result = await adminCrud('projects', 'update', { id, data: updates });
  return result.data;
}

export async function deleteProject(id) {
  await adminCrud('projects', 'delete', { id });
  return true;
}

// ============================================
// PHASES API
// ============================================

export async function fetchPhases(projectId) {
  const result = await adminCrud('phases', 'read', { filters: { project_id: projectId } });
  return result.data;
}

export async function fetchPhase(id) {
  const result = await adminCrud('phases', 'read', { id });
  return result.data;
}

export async function createPhase(data) {
  const result = await adminCrud('phases', 'create', { data });
  return result.data;
}

export async function updatePhase(id, updates) {
  const result = await adminCrud('phases', 'update', { id, data: updates });
  return result.data;
}

export async function deletePhase(id) {
  await adminCrud('phases', 'delete', { id });
  return true;
}

// ============================================
// TASKS API
// ============================================

export async function fetchTasks(phaseId) {
  const result = await adminCrud('tasks', 'read', { filters: { phase_id: phaseId } });
  return result.data;
}

export async function fetchTask(id) {
  const result = await adminCrud('tasks', 'read', { id });
  return result.data;
}

export async function createTask(data) {
  const result = await adminCrud('tasks', 'create', { data });
  return result.data;
}

export async function updateTask(id, updates) {
  const result = await adminCrud('tasks', 'update', { id, data: updates });
  return result.data;
}

export async function deleteTask(id) {
  await adminCrud('tasks', 'delete', { id });
  return true;
}

// ============================================
// PROPERTY MANAGERS API
// ============================================

export async function fetchPropertyManagers() {
  const result = await adminCrud('property_managers', 'read');
  return result.data;
}

export async function fetchPropertyManager(id) {
  const result = await adminCrud('property_managers', 'read', { id });
  return result.data;
}

export async function createPropertyManager(data) {
  const result = await adminCrud('property_managers', 'create', { data });
  return result.data;
}

export async function updatePropertyManager(id, updates) {
  const result = await adminCrud('property_managers', 'update', { id, data: updates });
  return result.data;
}

export async function deletePropertyManager(id) {
  await adminCrud('property_managers', 'delete', { id });
  return true;
}

// ============================================
// PROPERTIES API
// ============================================

export async function fetchProperties() {
  const result = await adminCrud('properties', 'read');
  return result.data;
}

export async function fetchProperty(id) {
  const result = await adminCrud('properties', 'read', { id });
  return result.data;
}

export async function fetchPropertiesByManager(propertyManagerId) {
  const result = await adminCrud('properties', 'read', { filters: { property_manager_id: propertyManagerId } });
  return result.data;
}

export async function createProperty(data) {
  const result = await adminCrud('properties', 'create', { data });
  return result.data;
}

export async function updateProperty(id, updates) {
  const result = await adminCrud('properties', 'update', { id, data: updates });
  return result.data;
}

export async function deleteProperty(id) {
  await adminCrud('properties', 'delete', { id });
  return true;
}

// ============================================
// LOCATIONS API
// ============================================

export async function fetchLocations() {
  const result = await adminCrud('locations', 'read');
  return result.data;
}

export async function fetchLocation(id) {
  const result = await adminCrud('locations', 'read', { id });
  return result.data;
}

export async function fetchLocationsByProperty(propertyId) {
  const result = await adminCrud('locations', 'read', { filters: { property_id: propertyId } });
  return result.data;
}

export async function createLocation(data) {
  const result = await adminCrud('locations', 'create', { data });
  return result.data;
}

export async function updateLocation(id, updates) {
  const result = await adminCrud('locations', 'update', { id, data: updates });
  return result.data;
}

export async function deleteLocation(id) {
  await adminCrud('locations', 'delete', { id });
  return true;
}

// ============================================
// PM MESSAGES API
// ============================================

export async function fetchPmMessages(projectId) {
  const result = await adminCrud('pm_messages', 'read', { filters: { project_id: projectId } });
  return result.data;
}

export async function fetchPmMessagesByTask(taskId) {
  const result = await adminCrud('pm_messages', 'read', { filters: { task_id: taskId } });
  return result.data;
}

export async function fetchPmMessage(id) {
  const result = await adminCrud('pm_messages', 'read', { id });
  return result.data;
}

export async function createPmMessage(data) {
  const result = await adminCrud('pm_messages', 'create', { data });
  return result.data;
}

export async function updatePmMessage(id, updates) {
  const result = await adminCrud('pm_messages', 'update', { id, data: updates });
  return result.data;
}

export async function deletePmMessage(id) {
  await adminCrud('pm_messages', 'delete', { id });
  return true;
}
