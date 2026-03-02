const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// ─── Metrics ────────────────────────────────────────────────────

export function getFactoryMetrics(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const qs = params.toString();
  return fetchJSON(`/metrics/factory${qs ? '?' + qs : ''}`);
}

export function getWorkerMetrics(workerId, startDate, endDate) {
  const params = new URLSearchParams();
  if (workerId) params.set('worker_id', workerId);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const qs = params.toString();
  return fetchJSON(`/metrics/workers${qs ? '?' + qs : ''}`);
}

export function getWorkstationMetrics(stationId, startDate, endDate) {
  const params = new URLSearchParams();
  if (stationId) params.set('station_id', stationId);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const qs = params.toString();
  return fetchJSON(`/metrics/workstations${qs ? '?' + qs : ''}`);
}

// ─── Workers & Workstations ─────────────────────────────────────

export function getWorkers() {
  return fetchJSON('/workers');
}

export function getWorkstations() {
  return fetchJSON('/workstations');
}

// ─── Events ─────────────────────────────────────────────────────

export function getEvents(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.set(key, val);
  });
  const qs = params.toString();
  return fetchJSON(`/events${qs ? '?' + qs : ''}`);
}

export function ingestEvent(event) {
  return fetchJSON('/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export function ingestEventBatch(events) {
  return fetchJSON('/events/batch', {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
}

// ─── Data Management ────────────────────────────────────────────

export function seedData(days = 5, clear = false) {
  return fetchJSON(`/seed?days=${days}&clear=${clear}`, { method: 'POST' });
}

export function clearAllEvents() {
  return fetchJSON('/events/all', { method: 'DELETE' });
}
