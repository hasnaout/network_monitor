import { apiFetch } from './api';

export async function login(username, password) {
  return apiFetch('/api/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function refreshToken(refresh) {
  return apiFetch('/api/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  });
}