import { apiFetch } from './api';

export function getOpenAlerts(token) {
  return apiFetch('/api/alerts/open/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}