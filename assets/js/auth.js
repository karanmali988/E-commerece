'use strict';

/* ==========================================================
   auth.js - login / sign-up popup (replaces the old newsletter popup)

   DEMO ONLY: accounts are kept in this browser's localStorage and
   passwords are hashed, but there is no server. A real store would
   check the login on a backend.

   - The popup opens by itself ONCE per browser session (only on pages
     with <body data-login-popup>), and never if you are logged in.
   - The person icon in the header opens it any time.
   Needs: cart.js loaded before this file (showCartToast).
   ========================================================== */
(function () {
  const USERS_KEY = 'spree_users';      // [{ name, email, hash }]
  const SESSION_KEY = 'spree_session';  // { name, email }
  const SEEN_KEY = 'spree_login_seen';  // sessionStorage: popup already shown
  const AUTO_OPEN_AFTER_MS = 5000;

  /* ---------- storage helpers (never crash if storage is blocked) ---------- */
  const readJson = (area, key, fallback) => {
    try { return JSON.parse(area.getItem(key)) || fallback; } catch (e) { return fallback; }
  };
  const writeJson = (area, key, value) => {
    try { area.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  };

  let memorySeen = false; // used only if sessionStorage is blocked
  const hasSeenPopup = () => {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return memorySeen; }
  };
  const markPopupSeen = () => {
    memorySeen = true;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
  };

  const getUser = () => readJson(localStorage, SESSION_KEY, null);
  window.currentUser = getUser;

  /* ---------- password hashing (demo-grade) ---------- */
  // `brand` is part of the text that gets hashed. Accounts made before the
  // rename (when the store was called "Anon") were saved with 'anon', so
  // login also accepts that, and those people can still log in.
  async function hashPassword(email, password, brand = 'spree') {
    const text = `${brand}:${email}:${password}`;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; // fallback when crypto.subtle is not available
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return 'x' + h.toString(16);
  }

  /* ---------- build the popup ---------- */
  const el = document.createElement('div');
  el.className = 'modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Login');
  el.innerHTML = `
    <div class="modal-close-overlay" data-auth-close></div>
    <div class="modal-content">
      <button class="modal-close-btn" data-auth-close aria-label="Close"><ion-icon name="close-outline"></ion-icon></button>
      <div class="auth" data-auth-body></div>
    </div>`;
  document.body.appendChild(el);
  const body = el.querySelector('[data-auth-body]');

  let mode = 'login'; // 'login' | 'signup'

  function renderForm() {
    const signup = mode === 'signup';
    body.innerHTML = `
      <div class="auth-tabs">
        <button type="button" class="auth-tab ${signup ? '' : 'active'}" data-auth-mode="login">Log in</button>
        <button type="button" class="auth-tab ${signup ? 'active' : ''}" data-auth-mode="signup">Create account</button>
      </div>
      <h3 class="auth-title">${signup ? 'Join Shopping Spree' : 'Welcome back'}</h3>
      <p class="auth-desc">${signup ? 'Create an account to save your details for checkout.' : 'Log in to your Shopping Spree account.'}</p>
      <form data-auth-form novalidate>
        ${signup ? '<label class="auth-field">Name<input type="text" name="name" autocomplete="name" required></label>' : ''}
        <label class="auth-field">Email<input type="email" name="email" autocomplete="email" required></label>
        <label class="auth-field">Password<input type="password" name="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></label>
        <p class="auth-error" data-auth-error role="alert"></p>
        <button type="submit" class="auth-submit">${signup ? 'Create account' : 'Log in'}</button>
      </form>
      <button type="button" class="auth-skip" data-auth-close>Continue as guest</button>
      <p class="auth-note">Demo store: your account stays in this browser only.</p>`;
  }

  function renderAccount(user) {
    body.innerHTML = `
      <div class="auth-account">
        <ion-icon name="person-circle-outline"></ion-icon>
        <h3 class="auth-title">Hi, ${escapeHtml(user.name)}</h3>
        <p>${escapeHtml(user.email)}</p>
        <button type="button" class="auth-submit" data-auth-logout>Log out</button>
      </div>`;
  }

  function openAuth(forceMode) {
    const user = getUser();
    if (user) renderAccount(user);
    else { mode = forceMode || mode; renderForm(); }
    el.classList.add('open');
    markPopupSeen();
    const first = body.querySelector('input');
    if (first) setTimeout(() => first.focus(), 50);
  }
  function closeAuth() { el.classList.remove('open'); }
  const isOpen = () => el.classList.contains('open');
  window.openAuth = openAuth;
  window.isAuthOpen = isOpen;

  /* ---------- header user buttons ---------- */
  function refreshUserButtons() {
    const user = getUser();
    document.querySelectorAll('[data-open-account]').forEach((btn) => {
      const icon = btn.querySelector('ion-icon');
      btn.classList.toggle('is-logged-in', !!user);
      btn.title = user ? `Signed in as ${user.name}` : 'Log in';
      btn.setAttribute('aria-label', user ? `Account of ${user.name}` : 'Log in');
      if (icon) icon.setAttribute('name', user ? 'person' : 'person-outline');
    });
  }

  /* ---------- submit ---------- */
  async function handleSubmit(form) {
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');
    const name = String(data.get('name') || '').trim();
    const errorEl = form.querySelector('[data-auth-error]');
    const fail = (msg) => { errorEl.textContent = msg; };

    if (mode === 'signup' && !name) return fail('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Please enter a valid email address.');
    if (password.length < 6) return fail('Password must be at least 6 characters.');

    const users = readJson(localStorage, USERS_KEY, []);
    const hash = await hashPassword(email, password);
    const existing = users.find((u) => u.email === email);

    let user;
    if (mode === 'signup') {
      if (existing) return fail('An account with this email already exists. Please log in.');
      user = { name, email, hash };
      users.push(user);
      writeJson(localStorage, USERS_KEY, users);
    } else {
      const legacyHash = existing ? await hashPassword(email, password, 'anon') : null;
      if (!existing || (existing.hash !== hash && existing.hash !== legacyHash)) return fail('Wrong email or password.');
      user = existing;
    }

    writeJson(localStorage, SESSION_KEY, { name: user.name, email: user.email });
    refreshUserButtons();
    closeAuth();
    showCartToast(mode === 'signup' ? `Welcome to Shopping Spree, ${user.name}!` : `Welcome back, ${user.name}!`);
  }

  /* ---------- clicks / keys ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-open-account]')) { e.preventDefault(); return openAuth('login'); }
    if (!el.contains(t)) return;

    if (t.closest('[data-auth-close]')) return closeAuth();
    const tab = t.closest('[data-auth-mode]');
    if (tab) { mode = tab.dataset.authMode; return renderForm(); }
    if (t.closest('[data-auth-logout]')) {
      try { localStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
      refreshUserButtons();
      closeAuth();
      showCartToast('You are logged out');
    }
  });

  el.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-auth-form]');
    if (!form) return;
    e.preventDefault();
    handleSubmit(form);
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuth(); });

  /* ---------- start ---------- */
  refreshUserButtons();

  // open once per session on pages that ask for it (index.html), and only for guests
  if (document.body.hasAttribute('data-login-popup') && !getUser() && !hasSeenPopup()) {
    setTimeout(() => {
      if (!getUser() && !hasSeenPopup()) openAuth('login');
    }, AUTO_OPEN_AFTER_MS);
  }
})();
