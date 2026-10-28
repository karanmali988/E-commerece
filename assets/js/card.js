'use strict';

/* ==========================================================
   card.js - small helpers shared by the home page and the
   product page (product card layout, price format, links,
   recently viewed). Needs cart-logic.js and products.js first.
   ========================================================== */

const escapeHtml = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// rupees with Indian digit grouping: 1299 -> ₹1,299   159199 -> ₹1,59,199
const money = (n) => {
  const v = Number(n);
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};

const productUrl = (id) => `product.html?id=${id}`;

const starsHtml = (rating) =>
  [1, 2, 3, 4, 5]
    .map((n) => `<ion-icon name="${n <= rating ? 'star' : 'star-outline'}"></ion-icon>`)
    .join('');

// Small label shown on each card (first match wins)
const LABEL_ORDER = [
  ['sports', 'Sports'], ['formal', 'Formal'], ['casual', 'Casual'], ['party-wear', 'Party wear'],
  ['boots', 'Boots'], ['tshirt', 'T-shirt'], ['shirt', 'Shirt'], ['jacket', 'Jacket'],
  ['dress', 'Dress'], ['shorts', 'Shorts'], ['hat', 'Hat'], ['watch', 'Watch'],
  ['necklace', 'Necklace'], ['earrings', 'Earrings'], ['ring', 'Ring'], ['perfume', 'Perfume'],
  ['cosmetics', 'Cosmetics'], ['belt', 'Belt'], ['shoes', 'Shoes'], ['clothes', 'Clothes']
];
const labelFor = (p) => (LABEL_ORDER.find(([tag]) => p.tags.includes(tag)) || [, 'Product'])[1];

const productById = (id) => PRODUCTS.find((p) => p.id === Number(id));

// find a product from an image file name (used for the static side lists)
const productByImage = (src) => {
  const file = (src || '').split('/').pop();
  return PRODUCTS.find((p) => p.img === file);
};

/* ---------- recently viewed (ids saved in localStorage) ---------- */
const getRecent = () => {
  try {
    const list = JSON.parse(localStorage.getItem('spree_recent'));
    return Array.isArray(list) ? list.map(Number).filter((id) => productById(id)) : [];
  } catch (e) { return []; }
};
const addRecent = (id) => {
  try { localStorage.setItem('spree_recent', JSON.stringify(ShopLogic.pushRecent(getRecent(), Number(id)))); } catch (e) { /* ignore */ }
};

function cardHtml(p) {
  const name = escapeHtml(p.name);
  const url = productUrl(p.id);
  const badge = p.badge ? `<p class="showcase-badge ${p.badge.class}">${escapeHtml(p.badge.text)}</p>` : '';
  const oldPrice = p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : '';

  return `
    <div class="showcase" data-id="${p.id}">
      <div class="showcase-banner">
        <a href="${url}" class="card-img-link" aria-label="${name}">
          <img src="./assets/images/products/${p.img}" alt="${name}" width="300" class="product-img default">
          <img src="./assets/images/products/${p.hover}" alt="${name}" width="300" class="product-img hover">
        </a>
        ${badge}
        <div class="showcase-actions">
          <button class="btn-action" data-action="wish" title="Add to wishlist"><ion-icon name="heart-outline"></ion-icon></button>
          <button class="btn-action" data-action="view" title="View details"><ion-icon name="eye-outline"></ion-icon></button>
          <button class="btn-action" data-action="compare" title="Compare"><ion-icon name="repeat-outline"></ion-icon></button>
          <button class="btn-action" data-action="quick-add" title="Add to cart"><ion-icon name="bag-add-outline"></ion-icon></button>
        </div>
      </div>
      <div class="showcase-content">
        <a href="#" class="showcase-category">${labelFor(p)}</a>
        <a href="${url}"><h3 class="showcase-title">${name}</h3></a>
        <div class="showcase-rating">${starsHtml(p.rating)}</div>
        <div class="price-box">
          <p class="price">${money(p.price)}</p>
          ${oldPrice}
        </div>
      </div>
    </div>`;
}
