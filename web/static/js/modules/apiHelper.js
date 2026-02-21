/**
 * apiHelper.js — LifeOS API Helper
 * إضافة JWT إلى جميع الطلبات المحمية
 */

(function() {
  const TOKEN_KEY = 'lifeos_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * إرجاع headers تحتوي على JWT للمسارات المحمية
   */
  function getAuthHeaders(includeJson) {
    const headers = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  /**
   * تنفيذ fetch مع JWT تلقائياً
   */
  function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, { ...options, headers });
  }

  window.LifeOSApi = {
    getToken,
    setToken,
    getAuthHeaders,
    apiFetch,
  };
})();
