/**
 * auth.js — LifeOS Login System (LocalStorage)
 * Route protection, Remember Me, Session management
 */

(function() {
  const AUTH_KEY = 'lifeos_auth';
  const REMEMBER_KEY = 'lifeos_remember';
  const USER_KEY = 'lifeos_user';

  // Demo users (for LocalStorage mode — replace with API/Firebase later)
  const DEMO_USERS = [
    { username: 'admin', password: 'admin123' }
  ];

  function getStoredAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.authenticated || !data.username) return null;
      return data;
    } catch (e) { return null; }
  }

  function setStoredAuth(user, remember) {
    const data = {
      authenticated: true,
      username: user.username,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    localStorage.setItem(USER_KEY, user.username);
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    if (!remember) localStorage.removeItem(REMEMBER_KEY);
  }

  function verifyUser(username, password) {
    const u = (username || '').trim().toLowerCase();
    const p = password || '';
    return DEMO_USERS.some(uu =>
      uu.username.toLowerCase() === u && uu.password === p
    );
  }

  function isAuthenticated() {
    const auth = getStoredAuth();
    if (!auth) return false;
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    if (!remember) {
      const age = Date.now() - (auth.timestamp || 0);
      if (age > 24 * 60 * 60 * 1000) {
        clearAuth();
        return false;
      }
    }
    return true;
  }

  function showLogin() {
    const loginEl = document.getElementById('login-screen');
    const appEl = document.querySelector('.app-container');
    const settingsEl = document.getElementById('settings-panel');
    if (loginEl) loginEl.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
    if (settingsEl) settingsEl.style.display = 'none';
  }

  function hideLogin() {
    const loginEl = document.getElementById('login-screen');
    const appEl = document.querySelector('.app-container');
    const settingsEl = document.getElementById('settings-panel');
    if (loginEl) loginEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';
    if (settingsEl) settingsEl.style.display = '';
  }

  function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;
    const remember = document.getElementById('login-remember')?.checked;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    if (errorEl) errorEl.textContent = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
    }

    setTimeout(() => {
      if (!username || !password) {
        if (errorEl) errorEl.textContent = 'Please enter username and password.';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
        return;
      }

      if (verifyUser(username, password)) {
        setStoredAuth({ username }, remember);
        hideLogin();
        window.dispatchEvent(new CustomEvent('lifeos:auth:login', { detail: { username } }));
      } else {
        if (errorEl) errorEl.textContent = 'Invalid username or password.';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }, 400);
  }

  function restoreRememberMe() {
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    const user = localStorage.getItem(USER_KEY);
    const rememberCheck = document.getElementById('login-remember');
    const usernameInput = document.getElementById('login-username');
    if (rememberCheck) rememberCheck.checked = remember;
    if (remember && usernameInput && user) usernameInput.value = user;
  }

  function init() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    restoreRememberMe();

    if (isAuthenticated()) {
      hideLogin();
    } else {
      showLogin();
    }
  }

  function setupLogout() {
    const btn = document.getElementById('btn-logout');
    if (btn) btn.addEventListener('click', () => window.LifeOSAuth.logout());
    const nameEl = document.getElementById('user-name');
    if (nameEl && getStoredAuth()) nameEl.textContent = getStoredAuth().username;
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupLogout();
  });

  window.addEventListener('lifeos:auth:login', () => {
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = getStoredAuth()?.username || '';
  });

  window.LifeOSAuth = {
    isAuthenticated,
    login: (u, p, remember) => {
      if (verifyUser(u, p)) {
        setStoredAuth({ username: u }, remember);
        hideLogin();
        return true;
      }
      return false;
    },
    logout: () => {
      clearAuth();
      showLogin();
      window.dispatchEvent(new Event('lifeos:auth:logout'));
    },
    getUsername: () => getStoredAuth()?.username || null
  };
})();
