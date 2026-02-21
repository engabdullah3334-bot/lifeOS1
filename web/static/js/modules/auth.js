/**
 * auth.js — LifeOS Login System (API + JWT)
 * Signup, Login (email or username), Session via JWT
 */

(function() {
  const AUTH_KEY = 'lifeos_auth';
  const REMEMBER_KEY = 'lifeos_remember';
  const USER_KEY = 'lifeos_user';
  const API = window.API_URL || 'http://localhost:5000/api';

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
      user_id: user.user_id,
      email: user.email,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    localStorage.setItem(USER_KEY, user.username);
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    if (window.LifeOSApi) window.LifeOSApi.setToken(null);
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    if (!remember) localStorage.removeItem(REMEMBER_KEY);
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

  function isAuthenticated() {
    const token = window.LifeOSApi ? window.LifeOSApi.getToken() : null;
    return !!token;
  }

  async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier')?.value;
    const password = document.getElementById('login-password')?.value;
    const remember = document.getElementById('login-remember')?.checked;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    if (errorEl) errorEl.textContent = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الدخول...';
    }

    if (!identifier || !password) {
      if (errorEl) errorEl.textContent = 'يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور.';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تسجيل الدخول';
      }
      return;
    }

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password
        })
      });
      const data = await res.json();

      if (res.ok) {
        if (window.LifeOSApi) window.LifeOSApi.setToken(data.token);
        setStoredAuth(data.user, remember);
        hideLogin();
        window.dispatchEvent(new CustomEvent('lifeos:auth:login', { detail: data.user }));
      } else {
        if (errorEl) errorEl.textContent = data.error || 'فشل تسجيل الدخول';
      }
    } catch (err) {
      if (errorEl) errorEl.textContent = 'خطأ في الاتصال بالخادم. تحقق من تشغيل التطبيق.';
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'تسجيل الدخول';
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username')?.value;
    const email = document.getElementById('signup-email')?.value;
    const password = document.getElementById('signup-password')?.value;
    const errorEl = document.getElementById('signup-error');
    const submitBtn = document.getElementById('signup-submit');

    if (errorEl) errorEl.textContent = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الإنشاء...';
    }

    if (!username || !email || !password) {
      if (errorEl) errorEl.textContent = 'يرجى ملء جميع الحقول.';
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'إنشاء حساب'; }
      return;
    }

    if (password.length < 6) {
      if (errorEl) errorEl.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'إنشاء حساب'; }
      return;
    }

    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();

      if (res.ok) {
        // بعد التسجيل، تسجيل الدخول مباشرة
        const loginRes = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: email.trim().toLowerCase(), password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && window.LifeOSApi) {
          window.LifeOSApi.setToken(loginData.token);
          setStoredAuth(loginData.user, true);
          document.getElementById('login-screen')?.classList.remove('show-signup');
          hideLogin();
          window.dispatchEvent(new CustomEvent('lifeos:auth:login', { detail: loginData.user }));
        } else {
          document.getElementById('login-tab')?.click();
          if (errorEl) errorEl.textContent = 'تم إنشاء الحساب. يمكنك تسجيل الدخول الآن.';
        }
      } else {
        if (errorEl) errorEl.textContent = data.error || 'فشل إنشاء الحساب';
      }
    } catch (err) {
      if (errorEl) errorEl.textContent = 'خطأ في الاتصال بالخادم.';
    }

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'إنشاء حساب'; }
  }

  function restoreRememberMe() {
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    const user = localStorage.getItem(USER_KEY);
    const rememberCheck = document.getElementById('login-remember');
    const identifierInput = document.getElementById('login-identifier');
    if (rememberCheck) rememberCheck.checked = remember;
    if (remember && identifierInput && user) identifierInput.value = user;
  }

  function init() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (showSignup) showSignup.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      signupForm.style.display = '';
    });
    if (showLogin) showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      signupForm.style.display = 'none';
      loginForm.style.display = '';
    });

    restoreRememberMe();

    // التحقق من JWT الحالي (إن وجد)
    const token = window.LifeOSApi ? window.LifeOSApi.getToken() : null;
    if (token) {
      fetch(`${API}/auth/me`, {
        headers: { 'Authorization': 'Bearer ' + token }
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(user => {
          setStoredAuth(user, true);
          hideLogin();
        })
        .catch(() => {
          if (window.LifeOSApi) window.LifeOSApi.setToken(null);
          showLogin();
        });
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
    login: async (identifier, password, remember) => {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (res.ok && window.LifeOSApi) {
        window.LifeOSApi.setToken(data.token);
        setStoredAuth(data.user, remember);
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
