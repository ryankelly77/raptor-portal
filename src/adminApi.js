// Admin API client for authenticated CRUD operations
// Uses JWT token from sessionStorage for authentication

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
    // If unauthorized, could trigger re-auth flow
    if (response.status === 401) {
      console.error('Admin session expired or invalid');
      // Could dispatch event or redirect to login
    }
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

// ============================================
// PROJECTS API
// ============================================

export async function fetchProjects() {
  const response = await fetch('/api/admin/projects', {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchProject(id) {
  const response = await fetch(`/api/admin/projects?id=${id}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function createProject(data) {
  const response = await fetch('/api/admin/projects', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateProject(id, updates) {
  const response = await fetch('/api/admin/projects', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, ...updates })
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteProject(id) {
  const response = await fetch(`/api/admin/projects?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return true;
}

// ============================================
// PHASES API
// ============================================

export async function fetchPhases(projectId) {
  const response = await fetch(`/api/admin/phases?project_id=${projectId}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchPhase(id) {
  const response = await fetch(`/api/admin/phases?id=${id}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function createPhase(data) {
  const response = await fetch('/api/admin/phases', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updatePhase(id, updates) {
  const response = await fetch('/api/admin/phases', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, ...updates })
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deletePhase(id) {
  const response = await fetch(`/api/admin/phases?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return true;
}

// ============================================
// TASKS API
// ============================================

export async function fetchTasks(phaseId) {
  const response = await fetch(`/api/admin/tasks?phase_id=${phaseId}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchTask(id) {
  const response = await fetch(`/api/admin/tasks?id=${id}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function createTask(data) {
  const response = await fetch('/api/admin/tasks', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateTask(id, updates) {
  const response = await fetch('/api/admin/tasks', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, ...updates })
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteTask(id) {
  const response = await fetch(`/api/admin/tasks?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return true;
}

// ============================================
// PROPERTY MANAGERS API
// ============================================

export async function fetchPropertyManagers() {
  const response = await fetch('/api/admin/property-managers', {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchPropertyManager(id) {
  const response = await fetch(`/api/admin/property-managers?id=${id}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function createPropertyManager(data) {
  const response = await fetch('/api/admin/property-managers', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updatePropertyManager(id, updates) {
  const response = await fetch('/api/admin/property-managers', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, ...updates })
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deletePropertyManager(id) {
  const response = await fetch(`/api/admin/property-managers?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return true;
}

// ============================================
// PROPERTIES API
// ============================================

export async function fetchProperties() {
  const response = await fetch('/api/admin/properties', {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchProperty(id) {
  const response = await fetch(`/api/admin/properties?id=${id}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function createProperty(data) {
  const response = await fetch('/api/admin/properties', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateProperty(id, updates) {
  const response = await fetch('/api/admin/properties', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, ...updates })
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteProperty(id) {
  const response = await fetch(`/api/admin/properties?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return true;
}

// ============================================
// LOCATIONS API
// ============================================

export async function fetchLocations() {
  const response = await fetch('/api/admin/locations', {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchLocation(id) {
  const response = await fetch(`/api/admin/locations?id=${id}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function fetchLocationsByProperty(propertyId) {
  const response = await fetch(`/api/admin/locations?property_id=${propertyId}`, {
    headers: getAuthHeaders()
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function createLocation(data) {
  const response = await fetch('/api/admin/locations', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function updateLocation(id, updates) {
  const response = await fetch('/api/admin/locations', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, ...updates })
  });
  const result = await handleResponse(response);
  return result.data;
}

export async function deleteLocation(id) {
  const response = await fetch(`/api/admin/locations?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return true;
}
