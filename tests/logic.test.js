'use strict';

/* Tests for assets/js/cart-logic.js
   Run with:  npm test      (needs Node 18 or newer, no packages to install) */

const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../assets/js/cart-logic.js');

// a few fake products so the tests do not depend on products.js
const P = [
  { id: 1, name: 'Banana shirt', price: 10, rating: 3 },
  { id: 2, name: 'apple hat', price: 25.5, rating: 5 },
  { id: 3, name: 'Cherry shoes', price: 60, rating: 4 },
  { id: 4, name: 'Date watch', price: 25.5, rating: 5 }
];
const getProduct = (id) => P.find((p) => p.id === id);

/* ---------------- cart ---------------- */
test('addToCart adds a new line', () => {
  assert.deepEqual(L.addToCart([], 1, 'M', 2), [{ id: 1, size: 'M', qty: 2 }]);
});

test('addToCart merges the same product + size', () => {
  const cart = L.addToCart([{ id: 1, size: 'M', qty: 1 }], 1, 'M', 2);
  assert.deepEqual(cart, [{ id: 1, size: 'M', qty: 3 }]);
});

test('addToCart keeps different sizes as separate lines', () => {
  const cart = L.addToCart([{ id: 1, size: 'M', qty: 1 }], 1, 'L', 1);
  assert.equal(cart.length, 2);
});

test('addToCart works for products without size (null)', () => {
  const cart = L.addToCart(L.addToCart([], 4, null), 4, null);
  assert.deepEqual(cart, [{ id: 4, size: null, qty: 2 }]);
});

test('addToCart never goes above the max quantity', () => {
  assert.equal(L.addToCart([{ id: 1, size: null, qty: 9 }], 1, null, 5)[0].qty, L.MAX_QTY);
  assert.equal(L.addToCart([], 1, null, 99)[0].qty, L.MAX_QTY);
});

test('addToCart ignores bad quantities (0, negative, text)', () => {
  assert.equal(L.addToCart([], 1, null, 0)[0].qty, 1);
  assert.equal(L.addToCart([], 1, null, -4)[0].qty, 1);
  assert.equal(L.addToCart([], 1, null, 'abc')[0].qty, 1);
});

test('cart functions do not change the cart you pass in', () => {
  const cart = Object.freeze([Object.freeze({ id: 1, size: null, qty: 1 })]);
  assert.doesNotThrow(() => {
    L.addToCart(cart, 1, null, 1);
    L.changeQty(cart, 0, 1);
    L.removeItem(cart, 0);
  });
});

test('changeQty adds and subtracts', () => {
  const cart = [{ id: 1, size: null, qty: 2 }];
  assert.equal(L.changeQty(cart, 0, 1)[0].qty, 3);
  assert.equal(L.changeQty(cart, 0, -1)[0].qty, 1);
});

test('changeQty below 1 removes the line', () => {
  assert.deepEqual(L.changeQty([{ id: 1, size: null, qty: 1 }], 0, -1), []);
});

test('changeQty is capped and ignores a wrong index', () => {
  const cart = [{ id: 1, size: null, qty: 10 }];
  assert.equal(L.changeQty(cart, 0, 1)[0].qty, 10);
  assert.equal(L.changeQty(cart, 5, 1), cart);
});

test('removeItem removes only that line', () => {
  const cart = [{ id: 1, size: null, qty: 1 }, { id: 2, size: null, qty: 1 }];
  assert.deepEqual(L.removeItem(cart, 0), [{ id: 2, size: null, qty: 1 }]);
});

test('cartCount adds up quantities', () => {
  assert.equal(L.cartCount([{ id: 1, qty: 2 }, { id: 2, qty: 3 }]), 5);
  assert.equal(L.cartCount([]), 0);
});

test('cartSubtotal multiplies price x quantity and skips unknown products', () => {
  const cart = [{ id: 1, size: null, qty: 2 }, { id: 2, size: null, qty: 1 }, { id: 999, size: null, qty: 5 }];
  assert.equal(L.cartSubtotal(cart, getProduct), 45.5);
});

test('cartSubtotal has no floating point noise', () => {
  const cheap = (id) => ({ id, price: 0.1 });
  assert.equal(L.cartSubtotal([{ id: 1, qty: 3 }], cheap), 0.3);
});

test('shipping is free for an empty cart and at/over the free limit', () => {
  assert.equal(L.shippingFor(0), 0);
  assert.equal(L.shippingFor(L.FREE_SHIPPING_OVER), 0);
  assert.equal(L.shippingFor(L.FREE_SHIPPING_OVER + 200), 0);
});

test('shipping rules are in rupees (free over 499, otherwise 49)', () => {
  assert.equal(L.FREE_SHIPPING_OVER, 499);
  assert.equal(L.SHIPPING_FEE, 49);
});

test('shipping costs the fee under the free limit', () => {
  assert.equal(L.shippingFor(10), L.SHIPPING_FEE);
  assert.equal(L.shippingFor(L.FREE_SHIPPING_OVER - 0.01), L.SHIPPING_FEE);
});

/* ---------------- price filter ---------------- */
test('filterByPrice with min and max (both ends included)', () => {
  assert.deepEqual(L.filterByPrice(P, 10, 25.5).map((p) => p.id), [1, 2, 4]);
});

test('filterByPrice with only min or only max', () => {
  assert.deepEqual(L.filterByPrice(P, 30, '').map((p) => p.id), [3]);
  assert.deepEqual(L.filterByPrice(P, '', 10).map((p) => p.id), [1]);
});

test('filterByPrice treats blank, negative and junk as "no limit"', () => {
  assert.equal(L.filterByPrice(P, '', '').length, 4);
  assert.equal(L.filterByPrice(P, -5, 'abc').length, 4);
  assert.equal(L.filterByPrice(P, null, undefined).length, 4);
});

test('filterByPrice swaps min and max typed backwards', () => {
  assert.deepEqual(L.filterByPrice(P, 60, 10).map((p) => p.id), [1, 2, 3, 4]);
});

/* ---------------- sorting ---------------- */
test('sortProducts by price, low to high and high to low', () => {
  assert.deepEqual(L.sortProducts(P, 'price-asc').map((p) => p.id), [1, 2, 4, 3]);
  assert.deepEqual(L.sortProducts(P, 'price-desc').map((p) => p.id), [3, 2, 4, 1]);
});

test('sortProducts by rating (best first) keeps ties in original order', () => {
  assert.deepEqual(L.sortProducts(P, 'rating').map((p) => p.id), [2, 4, 3, 1]);
});

test('sortProducts by name ignores upper/lower case', () => {
  assert.deepEqual(L.sortProducts(P, 'name').map((p) => p.name),
    ['apple hat', 'Banana shirt', 'Cherry shoes', 'Date watch']);
});

test('sortProducts with no/unknown option keeps the order and never changes the original', () => {
  const before = P.map((p) => p.id);
  assert.deepEqual(L.sortProducts(P, '').map((p) => p.id), before);
  assert.deepEqual(L.sortProducts(P, 'nonsense').map((p) => p.id), before);
  L.sortProducts(P, 'price-desc');
  assert.deepEqual(P.map((p) => p.id), before);
});

/* ---------------- load more ---------------- */
test('paginate shows the first N and says if there is more', () => {
  const list = [1, 2, 3, 4, 5];
  assert.deepEqual(L.paginate(list, 2), { items: [1, 2], total: 5, hasMore: true });
  assert.deepEqual(L.paginate(list, 5), { items: list, total: 5, hasMore: false });
  assert.deepEqual(L.paginate(list, 50), { items: list, total: 5, hasMore: false });
  assert.deepEqual(L.paginate([], 8), { items: [], total: 0, hasMore: false });
});

/* ---------------- reviews ---------------- */
test('averageRating rounds to one decimal and handles no reviews', () => {
  assert.equal(L.averageRating([]), 0);
  assert.equal(L.averageRating([{ rating: 5 }, { rating: 4 }]), 4.5);
  assert.equal(L.averageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }]), 4.3);
});

test('validateReview accepts a good review and trims text', () => {
  const r = L.validateReview({ name: '  Asha ', rating: '4', comment: '  Great quality!  ' });
  assert.deepEqual(r, { ok: true, review: { name: 'Asha', rating: 4, comment: 'Great quality!' } });
});

test('validateReview rejects missing or wrong rating', () => {
  for (const rating of [0, 6, 2.5, '', undefined, 'x']) {
    assert.equal(L.validateReview({ name: 'A', rating, comment: 'Nice one' }).ok, false);
  }
});

test('validateReview rejects empty name, short and too long comment', () => {
  assert.equal(L.validateReview({ name: '  ', rating: 5, comment: 'Nice one' }).ok, false);
  assert.equal(L.validateReview({ name: 'A', rating: 5, comment: 'ok' }).ok, false);
  assert.equal(L.validateReview({ name: 'A', rating: 5, comment: 'x'.repeat(501) }).ok, false);
  assert.equal(L.validateReview({ name: 'x'.repeat(41), rating: 5, comment: 'Nice one' }).ok, false);
});

/* ---------------- recently viewed ---------------- */
test('pushRecent puts the newest first and removes duplicates', () => {
  assert.deepEqual(L.pushRecent([1, 2, 3], 3), [3, 1, 2]);
  assert.deepEqual(L.pushRecent([], 7), [7]);
});

test('pushRecent keeps only the newest few', () => {
  const full = [1, 2, 3, 4, 5, 6, 7, 8];
  const next = L.pushRecent(full, 9);
  assert.equal(next.length, L.MAX_RECENT);
  assert.deepEqual(next.slice(0, 2), [9, 1]);
  assert.equal(next.includes(8), false);
});
