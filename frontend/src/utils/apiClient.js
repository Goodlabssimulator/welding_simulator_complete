/**
 * API Client - Axios-based HTTP client with auth interceptors.
 *
 * Paths mirror backend/src/routes/*.js exactly.
 */

import axios from 'axios';
import { API_BASE } from './constants';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// Request interceptor — attach bearer token
// ============================================================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('weldsim_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// Response interceptor — handle auth errors
// ============================================================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Don't nuke token on /auth/me failing — the useAuth hook
    // already handles that path explicitly.
    const isAuthCheck = url.includes('/auth/me');

    if (status === 401 && !isAuthCheck) {
      localStorage.removeItem('weldsim_token');
      localStorage.removeItem('weldsim_refresh_token');
      localStorage.removeItem('weldsim_user');
      // Avoid redirect loop if already on /login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Normalize error shape: expose backend's {error, code} object
    return Promise.reject(error.response?.data || error);
  }
);

// ============================================================
// Auth API  →  /api/auth/*
// ============================================================
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  logout: () => apiClient.delete('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};

// ============================================================
// Welding API  →  /api/welding/*
// ============================================================
export const weldingAPI = {
  // Get available joint types, electrodes, positions
  getConfig: () => apiClient.get('/welding/config'),

  // Session lifecycle
  startSession: (payload) => apiClient.post('/welding/session/start', payload),
  submitTelemetry: (sessionId, payload) =>
    apiClient.put(`/welding/session/${sessionId}/telemetry`, payload),
  completeSession: (sessionId, payload = {}) =>
    apiClient.post(`/welding/session/${sessionId}/complete`, payload),

  // Read
  getSession: (sessionId) => apiClient.get(`/welding/session/${sessionId}`),
  getSessions: (params) => apiClient.get('/welding/sessions', { params }),
};

// ============================================================
// Assessment API  →  /api/assessment/*
// ============================================================
export const assessmentAPI = {
  getResults: (sessionId) => apiClient.get(`/assessment/${sessionId}`),
  getDefects: (sessionId) => apiClient.get(`/assessment/${sessionId}/defects`),
  getFeedback: (sessionId) => apiClient.get(`/assessment/${sessionId}/feedback`),
  getCompetencies: (sessionId) => apiClient.get(`/assessment/${sessionId}/competency`),
};

// ============================================================
// Analytics API  →  /api/analytics/*
// ============================================================
export const analyticsAPI = {
  // Student
  getStudentSummary: (studentId) =>
    apiClient.get(`/analytics/student/${studentId}/summary`),
  getStudentTrends: (studentId, params) =>
    apiClient.get(`/analytics/student/${studentId}/trends`, { params }),
  getStudentCompetencies: (studentId) =>
    apiClient.get(`/analytics/student/${studentId}/competencies`),

  // Trainer
  getTrainerClassSummary: (params) =>
    apiClient.get('/analytics/trainer/class-summary', { params }),
  getTrainerStudentProgress: (studentId) =>
    apiClient.get(`/analytics/trainer/student/${studentId}/progress`),
  getTrainerCompetencyReport: () =>
    apiClient.get('/analytics/trainer/competency-report'),
};

// ============================================================
// Tutor API  →  /api/tutor/*
// ============================================================
export const tutorAPI = {
  getRecommendations: (studentId) =>
    apiClient.get(`/tutor/${studentId}/recommendations`),
  generatePractice: (studentId, focusArea) =>
    apiClient.post(`/tutor/${studentId}/practice`, { focusArea }),
  getProgress: (studentId) =>
    apiClient.get(`/tutor/${studentId}/progress`),
};

export default apiClient;
