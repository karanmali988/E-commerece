'use strict';

/* ==========================================================
   cart.js - shopping cart + wishlist + demo checkout (every page)
   Saved in the browser (localStorage), so it survives refresh.
   Needs: products.js and card.js loaded before this file.
   ========================================================== */

/* ---------- 1. Saving and loading ---------- */
const store = {
  read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: ignore */ }
  }
};

// the maths (add, remove, totals, shipping) lives in cart-logic.js so it can be tested
const { FREE_SHIPPING_OVER } = ShopLogic;

// keep only items whose product still exists (protects against old saved data)
let cart = store.read('spree_cart').filter((i) => i && productById(i.id) && i.qty > 0); // [{ id, size, qty }]
let wishlist = store.read('spree_wish').map(Number).filter((id) => productById(id));    // [id, id, ...]

const saveCart = () => { store.write('spree_cart', cart); refreshCart(); };
const saveWish = () => { store.write('spree_wish', wishlist); refreshWish(); };

const cartCount = () => ShopLogic.cartCount(cart);
const cartSubtotal = () => ShopLogic.cartSubtotal(cart, productById);
const shippingFor = ShopLogic.shippingFor;

/* ---------- 2. Cart actions ---------- */
function addToCart(id, size, qty = 1) { cart = ShopLogic.addToCart(cart, id, size, qty); saveCart(); }
function changeQty(index, delta) { cart = ShopLogic.changeQty(cart, index, delta); saveCart(); }
function removeItem(index) { cart = ShopLogic.removeItem(cart, index); saveCart(); }

function toggleWish(id) {
  const i = wishlist.indexOf(id);
  if (i === -1) wishlist.push(id); else wishlist.splice(i, 1);
  saveWish();
  return i === -1; // true = added
}

/* ---------- 3. Header buttons (found by their icon, so the HTML stays simple) ---------- */
document.querySelectorAll('.action-btn').forEach((btn) => {
  const icon = btn.querySelector('ion-icon');
  if (!icon) return;
  const badge = btn.querySelector('.count');
  const name = icon.getAttribute('name');

  if (name === 'person-outline') { btn.setAttribute('data-open-account', ''); btn.setAttribute('aria-label', 'Log in'); }
  if (name === 'home-outline') { btn.setAttribute('data-go-home', ''); btn.setAttribute('aria-label', 'Home'); }
  if (name === 'bag-handle-outline' && badge) {
    badge.setAttribute('data-cart-count', '');
    btn.setAttribute('data-open-cart', '');
    btn.setAttribute('aria-label', 'Open cart');
  }
  if (name === 'heart-outline' && badge) {
    badge.setAttribute('data-wish-count', '');
    btn.setAttribute('data-open-wish', '');
    btn.setAttribute('aria-label', 'Open wishlist');
  }
});

function refreshCart() {
  document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = cartCount(); });
  renderDrawer();
}

function refreshWish() {
  document.querySelectorAll('[data-wish-count]').forEach((el) => { el.textContent = wishlist.length; });

  // heart on the product page
  document.querySelectorAll('[data-wish-btn]').forEach((el) => {
    const on = wishlist.includes(Number(el.dataset.wishBtn));
    el.classList.toggle('active', on);
    const icon = el.querySelector('ion-icon');
    if (icon) icon.setAttribute('name', on ? 'heart' : 'heart-outline');
  });

  // hearts on product cards
  document.querySelectorAll('.showcase[data-id]').forEach((card) => {
    const btn = card.querySelector('[data-action="wish"]');
    if (!btn) return;
    const on = wishlist.includes(Number(card.dataset.id));
    btn.classList.toggle('active', on);
    const icon = btn.querySelector('ion-icon');
    if (icon) icon.setAttribute('name', on ? 'heart' : 'heart-outline');
  });

  renderWish();
}

/* ---------- 4. The slide-in panels (cart + wishlist) ---------- */
const drawer = document.createElement('div');
drawer.innerHTML = `
  <div class="cart-overlay" data-cart-overlay></div>

  <aside class="cart-drawer" data-cart-panel aria-label="Shopping cart">
    <div class="cart-head">
      <h2 data-cart-title>Shopping cart</h2>
      <button class="cart-close" data-cart-close aria-label="Close cart"><ion-icon name="close-outline"></ion-icon></button>
    </div>
    <div class="cart-items" data-cart-items></div>
    <div class="cart-foot" data-cart-foot></div>
  </aside>

  <aside class="cart-drawer" data-wish-panel aria-label="Wishlist">
    <div class="cart-head">
      <h2>Wishlist</h2>
      <button class="cart-close" data-cart-close aria-label="Close wishlist"><ion-icon name="close-outline"></ion-icon></button>
    </div>
    <div class="cart-items" data-wish-items></div>
  </aside>

  <div class="cart-toast" data-cart-toast></div>`;
document.body.appendChild(drawer);

const cartOverlay = drawer.querySelector('[data-cart-overlay]');
const cartPanel = drawer.querySelector('[data-cart-panel]');
const wishPanel = drawer.querySelector('[data-wish-panel]');
const cartTitleEl = drawer.querySelector('[data-cart-title]');
const itemsEl = drawer.querySelector('[data-cart-items]');
const footEl = drawer.querySelector('[data-cart-foot]');
const wishItemsEl = drawer.querySelector('[data-wish-items]');
const toastEl = drawer.querySelector('[data-cart-toast]');

let cartView = 'cart';  // 'cart' | 'checkout' | 'done'
let lastOrder = null;

function openCart(view) {
  cartView = view || 'cart';
  renderDrawer();
  wishPanel.classList.remove('open');
  cartOverlay.classList.add('open');
  cartPanel.classList.add('open');
}
const startCheckout = () => openCart('checkout'); // used by "Buy now"

function openWish() {
  renderWish();
  cartPanel.classList.remove('open');
  cartOverlay.classList.add('open');
  wishPanel.classList.add('open');
}

function closeCart() {
  cartOverlay.classList.remove('open');
  cartPanel.classList.remove('open');
  wishPanel.classList.remove('open');
}

function renderDrawer() {
  if (cartView === 'checkout' && !cart.length) cartView = 'cart';

  /* order placed */
  if (cartView === 'done' && lastOrder) {
    cartTitleEl.textContent = 'Order placed';
    itemsEl.innerHTML = `
      <div class="co-done">
        <ion-icon name="checkmark-circle-outline"></ion-icon>
        <h3>Thank you, ${escapeHtml(lastOrder.name)}!</h3>
        <p>Your demo order <strong>${escapeHtml(lastOrder.id)}</strong> (${lastOrder.count} item${lastOrder.count === 1 ? '' : 's'}, ${money(lastOrder.total)}) was placed.<br>
        No payment was taken and nothing will be shipped.</p>
      </div>`;
    footEl.innerHTML = '<button class="cart-checkout" data-cart-close>Continue shopping</button>';
    return;
  }

  if (!cart.length) {
    cartTitleEl.textContent = 'Shopping cart';
    itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    footEl.innerHTML = '';
    return;
  }

  const subtotal = cartSubtotal();
  const shipping = shippingFor(subtotal);
  const totals = `
    <div class="cart-line"><span>Subtotal (${cartCount()} item${cartCount() === 1 ? '' : 's'})</span><span>${money(subtotal)}</span></div>
    <div class="cart-line"><span>Shipping</span><span>${shipping ? money(shipping) : 'Free'}</span></div>
    <div class="cart-line total"><span>Total</span><strong>${money(subtotal + shipping)}</strong></div>`;

  /* delivery form */
  if (cartView === 'checkout') {
    cartTitleEl.textContent = 'Checkout';
    const user = typeof currentUser === 'function' ? currentUser() : null;
    itemsEl.innerHTML = `
      <form class="co-form" id="co-form" data-checkout-form>
        <button type="button" class="co-back" data-cart-back>&larr; Back to cart</button>
        <h3>Delivery details</h3>
        <label>Full name<input name="name" required autocomplete="name" value="${user ? escapeHtml(user.name) : ''}"></label>
        <label>Mobile number<input name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="98765 43210" pattern="(\\+91[ \\-]?)?[6-9][0-9]{4}[ \\-]?[0-9]{5}" title="10-digit Indian mobile number starting with 6-9, e.g. 98765 43210"></label>
        <label>Address<textarea name="address" rows="2" required autocomplete="street-address" placeholder="House no., street, area"></textarea></label>
        <label>City<input name="city" required autocomplete="address-level2" placeholder="e.g. Pune"></label>
        <label>PIN code<input name="pin" required inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="e.g. 411001" pattern="[1-9][0-9]{5}" title="6-digit PIN code"></label>
        <div class="co-summary">
          ${cart.map((item) => {
            const p = productById(item.id);
            return `<p><span>${escapeHtml(p.name)}${item.size ? ` (${escapeHtml(item.size)})` : ''} &times; ${item.qty}</span><span>${money(p.price * item.qty)}</span></p>`;
          }).join('')}
        </div>
      </form>`;
    footEl.innerHTML = `
      ${totals}
      <p class="cart-demo-note">Demo store: no real payment is taken.</p>
      <button type="submit" form="co-form" class="cart-checkout">Place order (demo)</button>`;
    return;
  }

  /* normal cart */
  cartTitleEl.textContent = 'Shopping cart';
  itemsEl.innerHTML = cart.map((item, i) => {
    const p = productById(item.id);
    return `
      <div class="cart-item">
        <a href="${productUrl(p.id)}"><img src="./assets/images/products/${p.img}" alt="${escapeHtml(p.name)}"></a>
        <div class="cart-item-info">
          <a href="${productUrl(p.id)}" class="cart-item-name">${escapeHtml(p.name)}</a>
          ${item.size ? `<p class="cart-item-meta">Size: ${escapeHtml(item.size)}</p>` : ''}
          <p class="cart-item-price">${money(p.price)}</p>
          <div class="cart-qty">
            <button data-cart-minus="${i}" aria-label="Less">−</button>
            <span>${item.qty}</span>
            <button data-cart-plus="${i}" aria-label="More">+</button>
            <button class="cart-remove" data-cart-remove="${i}">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');
  footEl.innerHTML = `
    ${totals}
    ${subtotal < FREE_SHIPPING_OVER ? `<p class="cart-demo-note">Add ${money(FREE_SHIPPING_OVER - subtotal)} more for free shipping.</p>` : ''}
    <button class="cart-checkout" data-cart-checkout>Proceed to checkout</button>
    <p class="cart-demo-note" style="margin:10px 0 0">Demo store: checkout does not take real payments.</p>`;
}

function renderWish() {
  if (!wishlist.length) {
    wishItemsEl.innerHTML = '<p class="cart-empty">Your wishlist is empty.<br>Tap the heart on a product to save it.</p>';
    return;
  }
  wishItemsEl.innerHTML = wishlist.map((id) => {
    const p = productById(id);
    return `
      <div class="cart-item">
        <a href="${productUrl(p.id)}"><img src="./assets/images/products/${p.img}" alt="${escapeHtml(p.name)}"></a>
        <div class="cart-item-info">
          <a href="${productUrl(p.id)}" class="cart-item-name">${escapeHtml(p.name)}</a>
          <p class="cart-item-price">${money(p.price)}</p>
          <div class="cart-qty">
            ${p.sizes.length
              ? `<a class="wish-view" href="${productUrl(p.id)}">Choose size</a>`
              : `<button type="button" class="wish-add" data-wish-add="${p.id}">Add to cart</button>`}
            <button class="cart-remove" data-wish-remove="${p.id}">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

let toastTimer;
function showCartToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ---------- 5. Clicks ---------- */
document.addEventListener('click', (e) => {
  const t = e.target;

  if (t.closest('[data-cart-close]') || t.closest('[data-cart-overlay]')) return closeCart();
  if (t.closest('[data-open-cart]')) { e.preventDefault(); return openCart(); }
  if (t.closest('[data-open-wish]')) { e.preventDefault(); return openWish(); }

  const minus = t.closest('[data-cart-minus]');
  const plus = t.closest('[data-cart-plus]');
  const remove = t.closest('[data-cart-remove]');
  if (minus) return changeQty(Number(minus.dataset.cartMinus), -1);
  if (plus) return changeQty(Number(plus.dataset.cartPlus), 1);
  if (remove) return removeItem(Number(remove.dataset.cartRemove));

  if (t.closest('[data-cart-checkout]')) { cartView = 'checkout'; return renderDrawer(); }
  if (t.closest('[data-cart-back]')) { cartView = 'cart'; return renderDrawer(); }

  // wishlist panel
  const wishRemove = t.closest('[data-wish-remove]');
  const wishAdd = t.closest('[data-wish-add]');
  if (wishRemove) {
    toggleWish(Number(wishRemove.dataset.wishRemove));
    return showCartToast('Removed from wishlist');
  }
  if (wishAdd) {
    addToCart(Number(wishAdd.dataset.wishAdd), null, 1);
    return showCartToast('Added to cart');
  }

  // buttons on product cards (home page) and the "add to cart" buttons in the lists
  const showcase = t.closest('.showcase');
  const action = t.closest('[data-action], .add-cart-btn');
  if (!showcase || !action || !showcase.dataset.id) return;

  const p = productById(showcase.dataset.id);
  if (!p) return;
  const kind = action.dataset.action || 'quick-add';

  if (kind === 'view') { window.location.href = productUrl(p.id); return; }
  if (kind === 'wish') {
    showCartToast(toggleWish(p.id) ? 'Added to wishlist' : 'Removed from wishlist');
    return;
  }
  if (kind === 'compare') {
    if (typeof toggleCompare === 'function') toggleCompare(p.id);
    return;
  }
  if (kind === 'quick-add') {
    if (p.sizes.length) { window.location.href = productUrl(p.id); return; } // needs a size first
    addToCart(p.id, null, 1);
    showCartToast('Added to cart');
  }
});

// demo "payment": validate the form, make an order number, empty the cart
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-checkout-form]');
  if (!form) return;
  e.preventDefault();
  if (!cart.length) return;

  const subtotal = cartSubtotal();
  lastOrder = {
    id: 'SS-' + String(Date.now()).slice(-6),
    name: String(new FormData(form).get('name') || '').trim() || 'friend',
    count: cartCount(),
    total: subtotal + shippingFor(subtotal)
  };
  cart = [];
  cartView = 'done';
  saveCart();
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

refreshCart();
refreshWish();
