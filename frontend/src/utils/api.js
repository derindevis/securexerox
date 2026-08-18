const getRawApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return '';
};

const API_BASE = `${getRawApiUrl()}/api`;

export function getAuthToken() {
  return sessionStorage.getItem('token');
}

export function setAuthToken(token) {
  if (token) {
    sessionStorage.setItem('token', token);
  } else {
    sessionStorage.removeItem('token');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type to JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      if (Array.isArray(errJson.detail)) {
        errorDetail = errJson.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
      } else if (typeof errJson.detail === 'string') {
        errorDetail = errJson.detail;
      }
    } catch (e) {
      // fallback
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  googleAuth: (authData) => request('/auth/google', { method: 'POST', body: JSON.stringify(authData) }),
  getMe: () => request('/auth/me'),
  verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  resendVerification: (email) => request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, newPassword) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password: newPassword }) }),

  // Jobs
  createJob: (formData) => request('/jobs', { method: 'POST', body: formData }),
  getJobs: () => request('/jobs'),
  getJob: (jobId) => request(`/jobs/${jobId}`),
  deleteJob: (jobId) => request(`/jobs/${jobId}`, { method: 'DELETE' }),

  // Print / Shop Operations
  verifyPrintId: (printId) => request(`/print/verify/${printId}`, { method: 'POST' }),
  startSession: (jobId) => request(`/print/session/start/${jobId}`, { method: 'POST' }),
  recordViolation: (jobId, type) => request(`/print/session/violation/${jobId}`, { method: 'POST', body: JSON.stringify({ type }) }),
  executePrint: (jobId) => request(`/print/execute/${jobId}`, { method: 'POST' }),
  destroyDocument: (jobId) => request(`/print/destroy/${jobId}`, { method: 'POST' }),
  getQueue: () => request('/print/queue'),
  getHistory: () => request('/print/history'),
  fetchDocumentBlob: async (jobId) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/print/stream/${jobId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Failed to stream document for printing');
    }
    return response.blob();
  },
};


