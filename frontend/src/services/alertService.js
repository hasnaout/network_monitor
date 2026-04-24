import { api } from './api';

// 🔵 GET ALL ALERTS
export const getAlerts = () => api.get('/api/alerts/');