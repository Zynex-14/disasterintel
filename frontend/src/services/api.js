let rawBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL_ ||
  import.meta.env.VITE_API_URL ||
  '/api/v1'
).trim();

if (rawBaseUrl.startsWith('http') && !rawBaseUrl.includes('/api')) {
  rawBaseUrl = `${rawBaseUrl.replace(/\/+$/, '')}/api/v1`;
}

const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP Error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => fetchJson('/health'),

  // System & Telemetry
  getSystemInfo: () => fetchJson('/system/info'),
  getDataStatus: () => fetchJson('/data-status'),

  // Locations
  getLocations: () => fetchJson('/locations'),
  getLocationById: (id) => fetchJson(`/locations/${id}`),

  // Current Weather
  getCurrentWeather: (locationId = 1) => fetchJson(`/weather/current?location_id=${locationId}`),

  // Forecast
  getForecast: (locationId = 1, horizon = '72h') => 
    fetchJson(`/forecast?location_id=${locationId}&horizon=${horizon}`),

  getModelForecasts: (locationId = 1) => 
    fetchJson(`/forecast/models?location_id=${locationId}`),

  getBlendedForecast: (locationId = 1, variable = 'rainfall', method = 'random_forest') =>
    fetchJson(`/forecast/blended?location_id=${locationId}&variable=${variable}&method=${method}`),

  getMultiModelComparison: (locationId = 1, horizon = '48h') =>
    fetchJson(`/forecast/compare?location_id=${locationId}&horizon=${horizon}`),

  // Risk
  getDisasterRisk: (locationId = 1) =>
    fetchJson(`/risk?location_id=${locationId}`),

  // Radar & Spatial Grid
  getRadarSites: () => fetchJson('/weather/radar/sites'),
  getRadarNowcast: (scenario) => fetchJson(`/weather/radar/nowcast${scenario ? '?scenario=' + scenario : ''}`),
  getSpatialMesh: (scenario) => fetchJson(`/weather/spatial-mesh${scenario ? '?scenario=' + scenario : ''}`),

  // Explainability
  getPredictionExplainability: (locationId = 1, variable = 'rainfall', leadHours = 24) =>
    fetchJson(`/forecast/explain?location_id=${locationId}&variable=${variable}&lead_hours=${leadHours}`),

  // Alerts, CAP Protocol & Incident Action Plan
  getAlerts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.locationId) query.set('location_id', params.locationId);
    if (params.severity) query.set('severity', params.severity);
    if (params.hazardType) query.set('hazard_type', params.hazardType);
    if (params.status) query.set('status', params.status);
    const queryString = query.toString();
    return fetchJson(`/alerts${queryString ? '?' + queryString : ''}`);
  },

  getCapXmlUrl: () => `${API_BASE_URL}/alerts/cap.xml`,
  getIncidentActionPlan: () => fetchJson('/alerts/briefing/incident-action-plan'),
  triggerEmergencyBroadcast: () => fetchJson('/alerts/broadcast', { method: 'POST' }),
  resolveAlert: (alertId) => fetchJson(`/alerts/${alertId}/resolve`, { method: 'POST' }),

  // Metrics
  getMetrics: () => fetchJson('/metrics'),
  getMetricsDetails: () => fetchJson('/metrics/details'),

  // Admin Retraining & Scenarios
  triggerRetraining: () => fetchJson('/admin/train', { method: 'POST' }),
  getScenario: () => fetchJson('/admin/scenario'),
  setScenario: (scenario) => fetchJson('/admin/scenario', {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  }),
};
