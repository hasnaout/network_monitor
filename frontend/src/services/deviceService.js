import { api } from './api';


export const getDevices = () => api.get('/api/devices/');
export const getDeviceById = (id, date) =>
  api.get(`/api/devices/${id}/`, {
    params: date ? { date } : {},
  });

export const getDeviceSoftware = (macAddress, date) =>
  api.get('/api/inventory/software/list/', {
    params: { mac_address: macAddress, date },
  });
