import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Axios Instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('safesight_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('safesight_token');
      localStorage.removeItem('safesight_username');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (credentials) => api.post('/auth/login', credentials);

// ── Workers ───────────────────────────────────────────────────────────────────
export const getWorkers       = ()         => api.get('/workers');
export const getWorkersInside = ()         => api.get('/workers/inside');
export const createWorker     = (data)     => api.post('/workers/create', data); // generates QR
export const updateWorker     = (id, data) => api.put(`/workers/${id}`, data);
export const deleteWorker     = (id)       => api.delete(`/workers/${id}`);
export const getWorkerByQR    = (qrCode)   => api.get(`/workers/qr/${qrCode}`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const scanWorker         = (workerId)        => api.post('/attendance/scan', { workerId });
export const workerEntry        = (qrCode, photo)   => api.post('/attendance/entry', { qrCode, photo });
export const workerExit         = (qrCode)          => api.post('/attendance/exit', { qrCode });
export const getAttendance      = ()                => api.get('/attendance');
export const getTodayAttendance = ()                => api.get('/attendance/today');

// ── Zone Access ───────────────────────────────────────────────────────────────
export const requestZoneAccess      = (data)                => api.post('/zones/request', data);
export const approveZoneAccess      = (requestId, approve)  => api.post('/zones/approve', { requestId, approve }); 
export const getActiveZoneAccess    = ()                    => api.get('/zones/active');
export const getZoneAccess          = ()                    => api.get('/zones/active');
export const getPendingZoneRequests = ()                    => api.get('/zones/active'); // Filters handled by backend if needed


// ── PPE Violations ────────────────────────────────────────────────────────────
export const getViolations      = (params) => api.get('/violations', { params });
export const getTodayViolations = ()       => api.get('/violations/today');
export const resolveViolation   = (id)     => api.patch(`/violations/${id}/resolve`);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats  = ()       => api.get('/dashboard/stats');

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getViolationAnalytics = () => api.get('/analytics/violations');

export default api;

// ── PPE Configuration ─────────────────────────────────────────────────────────
export const getPPEConfigs = () => api.get('/ppe-config');
export const getEnabledPPEConfigs = () => api.get('/ppe-config/enabled');
export const createPPEConfig = (data) => api.post('/ppe-config', data);
export const updatePPEConfig = (id, data) => api.put(`/ppe-config/${id}`, data);
export const togglePPEConfig = (id) => api.patch(`/ppe-config/${id}/toggle`);
export const deletePPEConfig = (id) => api.delete(`/ppe-config/${id}`);
export const addPPETrainingImage = (id, imageUrl) => api.post(`/ppe-config/${id}/training-image`, { imageUrl });
