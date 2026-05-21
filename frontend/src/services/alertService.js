import { api } from './api';

export const getAlerts = (params = {}) => api.get('/api/alerts/', { params });
