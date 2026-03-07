(function initPlaytalkApiConfig() {
  const API_BASE_URL = 'https://playtalk-ae8z.onrender.com';

  function normalizePath(path) {
    if (!path) return '/';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function buildApiUrl(path) {
    return `${API_BASE_URL}${normalizePath(path)}`;
  }

  function getAuthToken() {
    return localStorage.getItem('playtalk_auth_token') || '';
  }

  function buildAuthHeaders(extraHeaders) {
    const headers = {
      ...(extraHeaders || {})
    };
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  window.PlaytalkApi = {
    baseUrl: API_BASE_URL,
    url: buildApiUrl,
    getAuthToken,
    authHeaders: buildAuthHeaders
  };
})();
