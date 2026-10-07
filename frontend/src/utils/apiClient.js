/**
 * API Client - Axios-based HTTP client with auth interceptors
 */

import axios from 'axios';
import { API_BASE } from './constants';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
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

// Response interceptor - handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('weldsim_token');
      localStorage.removeItem('weldsim_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
  me: () => apiClient.get('/auth/me'),
};

// Welding API
export const weldingAPI = {
  startSession: (config) => apiClient.post('/welding/session/start', config),
  submitTelemetry: (sessionId, telemetry) => apiClient.post(`/welding/session/${sessionId}/telemetry`, telemetry),
  completeSession: (sessionId) => apiClient.post(`/welding/session/${sessionId}/complete`),
  getSessions: () => apiClient.get('/welding/sessions'),
  getSession: (sessionId) => apiClient.get(`/welding/session/${sessionId}`),
};

// Assessment API
export const assessmentAPI = {
  getResults: (sessionId) => apiClient.get(`/assessment/results/${sessionId}`),
  getHistory: () => apiClient.get('/assessment/history'),
  getCompetencies: (sessionId) => apiClient.get(`/assessment/competencies/${sessionId}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  getTrends: (params) => apiClient.get('/analytics/trends', { params }),
  getCompetencyProgress: () => apiClient.get('/analytics/competency-progress'),
  getTrainerOverview: () => apiClient.get('/analytics/trainer-overview'),
  getStudentList: (params) => apiClient.get('/analytics/students', { params }),
};

// Tutor API
export const tutorAPI = {
  getRecommendations: () => apiClient.get('/tutor/recommendations'),
  getPracticePlan: (params) => apiClient.post('/tutor/practice-plan', params),
  getProgress: () => apiClient.get('/tutor/progress'),
  getLearningPath: () => apiClient.get('/tutor/learning-path'),
  getContextualTip: (context) => apiClient.post('/tutor/contextual-tip', context),
  getMilestones: () => apiClient.get('/tutor/milestones'),
};

export default apiClient;
