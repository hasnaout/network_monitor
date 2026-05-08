import { api } from './api';


export const getDevices = () => api.get('/api/devices/');
export const getDeviceById = (id) => api.get(`/api/devices/${id}/`);
export const getDeviceSoftware = (macAddress) =>
  api.get('/api/inventory/software/list/', {
    params: { mac_address: macAddress },
  });
