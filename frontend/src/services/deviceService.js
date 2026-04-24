import { api } from './api';


export const getDevices = () => api.get('/api/devices/');
export const getDeviceById = (id) => api.get(`/api/devices/${id}/`);