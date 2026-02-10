const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}
  if (!res.ok) {
    const msg = data?.detail?.message || data?.detail || (Array.isArray(data?.detail) ? data.detail.map(d => d.msg).join(', ') : res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data;
}

// Auth
export const auth = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

// Forms (admin)
export const forms = {
  list: (status) => api(`/forms${status ? `?status=${status}` : ''}`),
  get: (id) => api(`/forms/${id}`),
  create: (body) => api('/forms', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/forms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  publish: (id, publish) => api(`/forms/${id}/publish`, { method: 'POST', body: JSON.stringify({ publish }) }),
  delete: (id) => api(`/forms/${id}`, { method: 'DELETE' }),
};

// Submissions
export const submissions = {
  list: (formId, page = 1, pageSize = 20, filter) => {
    let q = `formId=${formId}&page=${page}&pageSize=${pageSize}`;
    if (filter && Object.keys(filter).length) q += `&filter=${encodeURIComponent(JSON.stringify(filter))}`;
    return api(`/submissions?${q}`);
  },
  exportCsv: async (formId) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/submissions/export?formId=${formId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${formId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// Charts
export const charts = {
  list: (formId) => api(`/charts${formId ? `?formId=${formId}` : ''}`),
  get: (id) => api(`/charts/${id}`),
  getData: (id) => api(`/charts/${id}/data`),
  create: (body) => api('/charts', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id) => api(`/charts/${id}`, { method: 'DELETE' }),
};

// Public (no auth)
export async function getPublishedForm(slug) {
  const res = await fetch(`${API_BASE}/public/forms/${slug}`);
  if (!res.ok) throw new Error('Form not found');
  return res.json();
}

export async function submitPublicForm(slug, data) {
  const res = await fetch(`${API_BASE}/public/forms/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const text = await res.text();
  let out = null;
  try {
    out = text ? JSON.parse(text) : null;
  } catch (_) {}
  if (!res.ok) {
    const err = out?.detail;
    const msg = err?.message || (err?.errors ? JSON.stringify(err.errors) : text || res.statusText);
    const e = new Error(msg);
    e.detail = err;
    throw e;
  }
  return out;
}
