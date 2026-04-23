import { apiFetch } from './api';

export function getDevices(token) {
  return apiFetch('/api/devices/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getDeviceById(token, id) {
  return apiFetch(`/api/devices/${id}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createDevice(token, data) {
  return apiFetch('/api/devices/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}