import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword })
};

// Questions APIs
export const questionsAPI = {
    getAll: (params) => api.get('/questions', { params }),
    getById: (id) => api.get(`/questions/${id}`),
    create: (data) => api.post('/questions', data),
    update: (id, data) => api.put(`/questions/${id}`, data),
    delete: (id) => api.delete(`/questions/${id}`),
    uploadCSV: (formData) => api.post('/questions/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getStats: () => api.get('/questions/stats/overview')
};

// Papers APIs
export const papersAPI = {
    generate: (config) => api.post('/papers/generate', config),
    getAll: () => api.get('/papers'),
    getById: (id) => api.get(`/papers/${id}`),
    downloadPDF: (id, type = 'question_paper') =>
        api.post(`/papers/${id}/pdf`, { type }, { responseType: 'blob' }),
    downloadSummaryExcel: (id) =>
        api.post(`/papers/${id}/summary-excel`, {}, { responseType: 'blob' }),
    delete: (id) => api.delete(`/papers/${id}`)
};

// Admin APIs
export const adminAPI = {
    getPendingUsers: () => api.get('/admin/users/pending'),
    approveUser: (id) => api.put(`/admin/users/${id}/approve`),
    rejectUser: (id) => api.delete(`/admin/users/${id}/reject`),
    getAccessCode: () => api.get('/admin/config/access-code'),
    updateAccessCode: (code) => api.put('/admin/config/access-code', { accessCode: code })
};

export default api;
