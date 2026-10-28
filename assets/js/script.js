'use strict';

/* ==========================================================
   script.js - all interactive behaviour for the store
   (toast, mobile menu, sidebar filter, accordions)
   ========================================================== */

// small helper: add/remove a class on any element
const toggleActive = (el) => el.classList.toggle('active');

/* ---------- 1. Overlay (used by the mobile menus) ---------- */
const overlay = document.querySelector('[data-overlay]');

/* ---------- 2. Notification toast ---------- */
const toast = document.querySelector('[data-toast]');
const toastCloseBtn = document.querySelector('[data-toast-close]');

// the X hides this one only; the next one still comes a minute later
if (toast && toastCloseBtn) {
  toastCloseBtn.addEventListener('click', () => toast.classList.remove('show'));
}

/* ---------- 3. Mobile menu + sidebar (filter) ----------
   open button [i] opens menu [i]:
   0 = mobile navigation, 1 = product sidebar              */
const openBtns = document.querySelectorAll('[data-mobile-menu-open-btn]');
const menus = document.querySelectorAll('[data-mobile-menu]');
const closeBtns = document.querySelectorAll('[data-mobile-menu-close-btn]');

openBtns.forEach((btn, i) => {
  const menu = menus[i];
  const closeBtn = closeBtns[i];
  if (!menu) return;

  const open = () => {
    menu.classList.add('active');
    if (overlay) overlay.classList.add('active');
  };
  const close = () => {
    menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  };

  btn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', close);
});

/* ---------- 4. Accordions (category menus) ---------- */
const accordionBtns = document.querySelectorAll('[data-accordion-btn]');
const accordions = document.querySelectorAll('[data-accordion]');

accordionBtns.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    const clicked = accordions[i];
    const wasOpen = clicked.classList.contains('active');

    // close everything first so only one is open at a time
    accordions.forEach((a) => a.classList.remove('active'));
    accordionBtns.forEach((b) => b.classList.remove('active'));

    if (!wasOpen) {
      clicked.classList.add('active');
      btn.classList.add('active');
    }
  });
});


/* ---------- 5. Random "someone just bought" popup ----------
   DEMO notification (the popup says so). It slides in once every
   minute with a new product, city and "time ago".
   Change the numbers below to change the timing.                 */
const TOAST_FIRST_DELAY_MS = 10 * 1000;  // first popup, 10 s after the page opens
const TOAST_EVERY_MS = 60 * 1000;        // then one popup every 60 s
const TOAST_VISIBLE_MS = 6 * 1000;       // how long each popup stays on screen

const toastProductName = document.querySelector('.toast-title');
const toastImg = document.querySelector('.toast-banner img');
const toastTime = document.querySelector('.toast-meta time');
const toastMessage = document.querySelector('.toast-message');

if (toast && toastProductName && typeof PRODUCTS !== 'undefined') {
  const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad',
    'Jaipur', 'Lucknow', 'Surat', 'Nagpur', 'Indore', 'Kochi', 'Chandigarh', 'Bhopal'];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  let lastId = null;
  let hideTimer;

  function updateToast() {
    // new product (never the same one twice in a row)
    let product;
    do { product = pick(PRODUCTS); } while (PRODUCTS.length > 1 && product.id === lastId);
    lastId = product.id;

    // new time: mostly minutes, sometimes seconds or hours
    const roll = Math.random();
    let text, iso;
    if (roll < 0.15) { const n = between(10, 55); text = plural(n, 'Second'); iso = `PT${n}S`; }
    else if (roll < 0.85) { const n = between(1, 59); text = plural(n, 'Minute'); iso = `PT${n}M`; }
    else { const n = between(1, 6); text = plural(n, 'Hour'); iso = `PT${n}H`; }

    toastProductName.textContent = product.name;
    toastImg.src = `./assets/images/products/${product.img}`;
    toastImg.alt = product.name;
    toastTime.textContent = text;
    toastTime.setAttribute('datetime', iso);
    toastMessage.textContent = `Someone in ${pick(CITIES)} just bought`;
    toast.dataset.productId = product.id;
  }

  // wait while the login popup is open or the tab is hidden, then try again
  function showToast() {
    const busy = document.hidden || (typeof isAuthOpen === 'function' && isAuthOpen());
    if (busy) { setTimeout(showToast, 5000); return; }

    updateToast();
    toast.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.classList.remove('show'), TOAST_VISIBLE_MS);
    setTimeout(showToast, TOAST_EVERY_MS);
  }

  setTimeout(showToast, TOAST_FIRST_DELAY_MS);

  // clicking the popup (not the X) opens that product
  toast.addEventListener('click', (e) => {
    if (e.target.closest('[data-toast-close]')) return;
    window.location.href = `product.html?id=${toast.dataset.productId}`;
  });
  toast.style.cursor = 'pointer';
}

/* ---------- 6. Scroll handle on laptops ----------
   Marks a product list while the mouse is over any part of it, so the
   CSS (extras.css) can show the scroll handle. */
document.querySelectorAll('.product-minimal .showcase-wrapper').forEach((list) => {
  list.addEventListener('mouseenter', () => list.classList.add('is-hovered'));
  list.addEventListener('mouseleave', () => list.classList.remove('is-hovered'));
});
