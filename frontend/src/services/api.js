const API_URL = process.env.REACT_APP_API_URL;

export async function apiFetch(url, options = {}) {
  const res = await fetch(`${API_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = new Error('API Error');
    error.status = res.status;
    throw error;
  }

  return res.json();
}