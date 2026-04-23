export async function refreshAccessToken(apiUrl, refreshToken) {
  const res = await fetch(`${apiUrl}/api/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    throw new Error('Refresh failed');
  }

  const data = await res.json();
  if (!data?.access) {
    throw new Error('Refresh missing access token');
  }

  return {
    accessToken: data.access,
    refreshToken: data.refresh || refreshToken,
  };
}

export async function fetchJsonWithAuth(url, { apiUrl, auth, onTokensUpdate, options = {} }) {
  const doFetch = async (accessToken) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, { ...options, headers });
    return res;
  };

  let res = await doFetch(auth?.accessToken);

  if (res.status === 401 && auth?.refreshToken) {
    const newTokens = await refreshAccessToken(apiUrl, auth.refreshToken);
    onTokensUpdate?.(newTokens);
    res = await doFetch(newTokens.accessToken);
  }

  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof payload === 'object' && payload?.detail ? payload.detail : `HTTP ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return payload;
}

