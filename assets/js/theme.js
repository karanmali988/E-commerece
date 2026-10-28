'use strict';

/* ==========================================================
   theme.js - light / dark mode
   Loaded in the <head> so the saved theme is applied BEFORE the page
   is drawn (no white flash). First visit follows the computer's setting.
   Any button with  data-theme-toggle  switches it.
   ========================================================== */
(function () {
  const KEY = 'spree_theme';

  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = () => document.documentElement.getAttribute('data-theme');

  document.documentElement.setAttribute('data-theme', saved() || (systemPrefersDark ? 'dark' : 'light'));

  // buttons show what a click will switch TO
  function updateButtons() {
    const dark = current() === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const icon = btn.querySelector('ion-icon');
      const label = btn.querySelector('[data-theme-label]');
      if (icon) icon.setAttribute('name', dark ? 'sunny-outline' : 'moon-outline');
      if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-theme-toggle]')) return;
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (err) { /* ignore */ }
    updateButtons();
  });

  document.addEventListener('DOMContentLoaded', updateButtons);
})();
