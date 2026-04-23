import { api } from './api';

export const getAlerts = () => api.get('/api/alerts/');