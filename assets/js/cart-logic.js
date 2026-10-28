'use strict';

/* ==========================================================
   cart-logic.js - the shop's "brain", with NO page code inside.

   Every function here only takes values and returns new values
   (nothing touches the page or localStorage). That is why it can be
   tested from the terminal:   npm test

   Used by: cart.js (cart), shop.js (sort / price / load more),
            product.js (reviews, recently viewed).
   ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); // Node (tests)
  else root.ShopLogic = factory();                                              // browser
})(typeof self !== 'undefined' ? self : this, function () {

  const MAX_QTY = 10;             // most of one item in the cart
  const FREE_SHIPPING_OVER = 499; // rupees - same number as the banner on the page
  const SHIPPING_FEE = 49;        // rupees
  const PAGE_SIZE = 8;            // products shown before "Load more"
  const MAX_RECENT = 8;           // recently viewed list length

  const toCents = (n) => Math.round(n * 100) / 100;

  /* ---------- cart (cart = [{ id, size, qty }]) ---------- */
  function addToCart(cart, id, size, qty = 1) {
    const amount = Math.max(1, Math.floor(Number(qty)) || 1);
    const found = cart.find((i) => i.id === id && i.size === size);
    if (found) {
      return cart.map((i) => (i === found ? { ...i, qty: Math.min(MAX_QTY, i.qty + amount) } : i));
    }
    return [...cart, { id, size, qty: Math.min(MAX_QTY, amount) }];
  }

  function changeQty(cart, index, delta) {
    const item = cart[index];
    if (!item) return cart;
    const qty = item.qty + delta;
    if (qty < 1) return cart.filter((_, i) => i !== index);   // going below 1 removes it
    return cart.map((it, i) => (i === index ? { ...it, qty: Math.min(MAX_QTY, qty) } : it));
  }

  const removeItem = (cart, index) => cart.filter((_, i) => i !== index);

  const cartCount = (cart) => cart.reduce((sum, i) => sum + i.qty, 0);

  // getProduct(id) -> product or undefined (unknown products are skipped)
  function cartSubtotal(cart, getProduct) {
    return toCents(cart.reduce((sum, i) => {
      const p = getProduct(i.id);
      return p ? sum + p.price * i.qty : sum;
    }, 0));
  }

  const shippingFor = (subtotal) => (subtotal <= 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE);

  /* ---------- price filter, sorting, "load more" ---------- */
  function toNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;   // blank / negative / junk = no limit
  }

  function filterByPrice(products, min, max) {
    let lo = toNumber(min);
    let hi = toNumber(max);
    if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo];  // typed backwards: swap
    return products.filter((p) => (lo === null || p.price >= lo) && (hi === null || p.price <= hi));
  }

  // sort: '' (keep original order) | 'price-asc' | 'price-desc' | 'rating' | 'name'
  function sortProducts(products, sort) {
    const compare = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      name: (a, b) => a.name.localeCompare(b.name)
    }[sort];
    const copy = products.slice();           // never change the original list
    return compare ? copy.sort(compare) : copy;
  }

  function paginate(list, visible) {
    const items = list.slice(0, visible);
    return { items, total: list.length, hasMore: items.length < list.length };
  }

  /* ---------- reviews ---------- */
  function averageRating(reviews) {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  // returns { ok: true, review } or { ok: false, error }
  function validateReview(input) {
    const name = String(input.name || '').trim();
    const comment = String(input.comment || '').trim();
    const rating = Number(input.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Please choose a star rating.' };
    if (!name) return { ok: false, error: 'Please enter your name.' };
    if (name.length > 40) return { ok: false, error: 'Name is too long (40 characters max).' };
    if (comment.length < 5) return { ok: false, error: 'Please write at least 5 characters.' };
    if (comment.length > 500) return { ok: false, error: 'Review is too long (500 characters max).' };
    return { ok: true, review: { name, rating, comment } };
  }

  /* ---------- recently viewed ---------- */
  // newest first, no duplicates, limited length
  const pushRecent = (list, id, max = MAX_RECENT) => [id, ...list.filter((x) => x !== id)].slice(0, max);

  return {
    MAX_QTY, FREE_SHIPPING_OVER, SHIPPING_FEE, PAGE_SIZE, MAX_RECENT,
    addToCart, changeQty, removeItem, cartCount, cartSubtotal, shippingFor,
    filterByPrice, sortProducts, paginate,
    averageRating, validateReview, pushRecent
  };
});
