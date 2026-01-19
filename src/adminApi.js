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
      // Clear session and force redirect to login
      sessionStorage.clear();
      window.location.href = '/admin';
      return; // Stop execution
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

export async function fetchAllPmMessages() {
  const result = await adminCrud('pm_messages', 'read');
  return result.data;
}

export async function fetchPmMessagesByPm(pmId) {
  const result = await adminCrud('pm_messages', 'read', { filters: { pm_id: pmId } });
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

export async function deletePmMessagesByPm(pmId) {
  // Need to fetch all messages for this PM and delete each one
  const messages = await fetchPmMessagesByPm(pmId);
  for (const msg of messages) {
    await adminCrud('pm_messages', 'delete', { id: msg.id });
  }
  return true;
}

export async function markPmMessagesAsRead(pmId) {
  // Fetch unread messages from PM and mark as read
  const messages = await fetchPmMessagesByPm(pmId);
  const now = new Date().toISOString();
  for (const msg of messages) {
    if (msg.sender === 'pm' && !msg.read_at) {
      await adminCrud('pm_messages', 'update', { id: msg.id, data: { read_at: now } });
    }
  }
  return true;
}

// ============================================
// GLOBAL DOCUMENTS API
// ============================================

export async function fetchGlobalDocuments() {
  const result = await adminCrud('global_documents', 'read');
  return result.data;
}

export async function updateGlobalDocument(id, updates) {
  const result = await adminCrud('global_documents', 'update', { id, data: updates });
  return result.data;
}

// ============================================
// EMAIL TEMPLATES API
// ============================================

export async function fetchEmailTemplates() {
  const result = await adminCrud('email_templates', 'read');
  return result.data;
}

export async function updateEmailTemplate(id, updates) {
  const result = await adminCrud('email_templates', 'update', { id, data: updates });
  return result.data;
}

// ============================================
// FILE UPLOAD API
// ============================================

export async function uploadFile(bucket, filePath, file) {
  // Convert file to base64
  const fileData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:...;base64, prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      bucket,
      filePath,
      fileData,
      contentType: file.type
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.clear();
      window.location.href = '/admin';
      return;
    }
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data.publicUrl;
}
