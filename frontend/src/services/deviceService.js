import { api } from './api';

// 🔵 GET ALL DEVICES
export const getDevices = () => api.get('/api/devices/');

// 🔵 GET ONE DEVICE
export const getDeviceById = (id) => api.get(`/api/devices/${id}/`);