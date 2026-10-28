'use strict';

/* ==========================================================
   migrate.js - keeps data saved before the rename

   The store used to be called "Anon". Cart, wishlist, accounts, reviews
   and the theme were saved under names starting with "anon_". They now
   start with "spree_". This copies old data over once, so nobody loses
   their cart or has to sign up again.
   Loaded first (in the <head>) on every page.
   ========================================================== */
(function () {
  const NAMES = ['users', 'session', 'cart', 'wish', 'compare', 'recent', 'theme', 'reviews'];
  try {
    NAMES.forEach((name) => {
      const oldKey = 'anon_' + name;
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue === null) return;
      if (localStorage.getItem('spree_' + name) === null) localStorage.setItem('spree_' + name, oldValue);
      localStorage.removeItem(oldKey);
    });
  } catch (e) { /* storage blocked: nothing to move */ }
})();
