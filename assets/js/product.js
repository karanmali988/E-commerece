'use strict';

/* ==========================================================
   product.js - builds the product detail page
   Open it like:  product.html?id=7
   Needs: products.js, card.js, cart.js loaded before this file.
   ========================================================== */

const root = document.getElementById('pd-root');
const product = productById(new URLSearchParams(window.location.search).get('id'));

if (!product) {
  document.title = 'Product not found - Shopping Spree';
  root.innerHTML = `
    <div class="pd-notfound">
      <h1>Sorry, we could not find that product.</h1>
      <a href="./index.html" class="pd-btn pd-btn-cart">Back to the shop</a>
    </div>`;
} else {
  buildPage(product);
}

function buildPage(p) {
  document.title = `${p.name} - Shopping Spree`;

  // recently viewed: show the earlier ones, then remember this one
  const earlier = getRecent().filter((id) => id !== p.id).slice(0, 4).map(productById);
  addRecent(p.id);

  // broad group (Clothes, Footwear...) used for the breadcrumb and "More in" link
  const GROUPS = [['clothes', 'Clothes'], ['footwear', 'Footwear'], ['jewelry', 'Jewelry'], ['watch', 'Watch'],
    ['perfume', 'Perfume'], ['cosmetics', 'Cosmetics'], ['accessories', 'Accessories'], ['hat', 'Hat & caps']];
  const group = (GROUPS.find(([tag]) => p.tags.includes(tag)) || [, labelFor(p)])[1];
  const label = labelFor(p);
  const name = escapeHtml(p.name);
  const images = [...new Set([p.img, p.hover])];
  const discount = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  const available = p.stock > 0;
  const maxQty = Math.min(10, p.stock);

  // delivery date: 4 days from today
  const delivery = new Date();
  delivery.setDate(delivery.getDate() + 4);
  const deliveryText = delivery.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const stockHtml = !available
    ? '<p class="pd-stock out">Currently unavailable</p>'
    : p.stock > 10
      ? '<p class="pd-stock in">In stock</p>'
      : `<p class="pd-stock low">Only ${p.stock} left in stock</p>`;

  const priceHtml = `
    <div class="pd-price-row">
      ${discount ? `<span class="pd-discount">-${discount}%</span>` : ''}
      <span class="pd-price">${money(p.price)}</span>
    </div>
    ${p.oldPrice ? `<p class="pd-mrp">M.R.P.: <del>${money(p.oldPrice)}</del>${discount ? ` &nbsp; You save ${money(p.oldPrice - p.price)}` : ''}</p>` : ''}
    <p class="pd-tax">Inclusive of all taxes</p>`;

  const sizesHtml = p.sizes.length ? `
    <div class="pd-block">
      <p class="pd-label">Size: <strong data-size-name>Select a size</strong></p>
      <div class="pd-sizes" data-sizes>
        ${p.sizes.map((s) => `<button type="button" class="pd-size" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
      </div>
      <p class="pd-error" data-size-error hidden>Please choose a size first.</p>
    </div>` : '';

  const qtyOptions = Array.from({ length: maxQty || 1 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');

  const details = [
    ['Category', group === label ? label : `${group} / ${label}`],
    ['Sold by', 'Shopping Spree'],
    ['Product code', `SS-${String(p.id).padStart(4, '0')}`],
    ['Rating', `${p.rating} out of 5`],
    ...(p.sizes.length ? [['Available sizes', p.sizes.join(', ')]] : []),
    ['Availability', available ? `${p.stock} in stock` : 'Out of stock']
  ];

  // related: products that share the most tags with this one
  const related = PRODUCTS
    .filter((o) => o.id !== p.id)
    .map((o) => ({ o, score: o.tags.filter((t) => p.tags.includes(t)).length }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.o.id - b.o.id)
    .slice(0, 4)
    .map((r) => r.o);

  root.innerHTML = `
    <div class="pd-container">

      <nav class="pd-breadcrumb" aria-label="Breadcrumb">
        <a href="./index.html">Home</a>
        <ion-icon name="chevron-forward-outline"></ion-icon>
        <a href="./index.html?category=${encodeURIComponent(group)}">${escapeHtml(group)}</a>
        <ion-icon name="chevron-forward-outline"></ion-icon>
        <span>${name}</span>
      </nav>

      <section class="pd-layout">

        <!-- 1. pictures -->
        <div class="pd-gallery">
          ${images.length > 1 ? `
          <div class="pd-thumbs" data-thumbs>
            ${images.map((img, i) => `
              <button type="button" class="pd-thumb${i === 0 ? ' active' : ''}" data-img="${img}" aria-label="Picture ${i + 1}">
                <img src="./assets/images/products/${img}" alt="${name} picture ${i + 1}">
              </button>`).join('')}
          </div>` : ''}
          <div class="pd-zoom" data-zoom>
            ${p.badge ? `<p class="showcase-badge ${p.badge.class} pd-badge">${escapeHtml(p.badge.text)}</p>` : ''}
            <img src="./assets/images/products/${images[0]}" alt="${name}" data-main-img>
          </div>
        </div>

        <!-- 2. information -->
        <div class="pd-info">
          <a href="./index.html?category=${encodeURIComponent(group)}" class="pd-cat-link">More in ${escapeHtml(group)}</a>
          <h1 class="pd-title">${name}</h1>

          <div class="pd-rating">
            <span class="pd-stars">${starsHtml(p.rating)}</span>
            <span>${p.rating}.0 out of 5</span>
            <a href="#reviews" class="rv-link" data-rv-link></a>
          </div>

          <hr>
          ${priceHtml}
          <hr>

          ${sizesHtml}

          <div class="pd-block">
            <h2 class="pd-heading">About this item</h2>
            <ul class="pd-features">
              ${p.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
            </ul>
          </div>

          <div class="pd-block">
            <h2 class="pd-heading">Description</h2>
            <p class="pd-description">${escapeHtml(p.description)}</p>
          </div>

          <div class="pd-block">
            <h2 class="pd-heading">Product details</h2>
            <table class="pd-table">
              ${details.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}
            </table>
          </div>
        </div>

        <!-- 3. buy box -->
        <aside class="pd-buybox">
          <p class="pd-price pd-price-box">${money(p.price)}</p>
          <p class="pd-delivery"><strong>Delivery</strong> by <strong>${escapeHtml(deliveryText)}</strong></p>
          ${stockHtml}

          <label class="pd-qty">Quantity
            <select data-qty ${available ? '' : 'disabled'}>${qtyOptions}</select>
          </label>

          <p class="pd-error" data-buy-size-error hidden>Please choose a size first.</p>

          <button type="button" class="pd-btn pd-btn-cart" data-add ${available ? '' : 'disabled'}>Add to cart</button>
          <button type="button" class="pd-btn pd-btn-buy" data-buy ${available ? '' : 'disabled'}>Buy now</button>

          <button type="button" class="pd-wish" data-wish-btn="${p.id}">
            <ion-icon name="heart-outline"></ion-icon>
            <span>Add to wishlist</span>
          </button>

          <p class="pd-sold">Sold by <strong>Shopping Spree</strong></p>
        </aside>

      </section>

      <section class="pd-reviews" id="reviews" aria-label="Customer reviews">
        <h2 class="pd-related-title">Customer reviews</h2>
        <div class="rv-top-row">
          <div class="rv-summary" data-rv-summary></div>
          <form class="rv-form" data-rv-form novalidate>
            <h3>Write a review</h3>
            <div class="rv-pick" data-rv-pick role="radiogroup" aria-label="Your rating">
              ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="rv-pick-star" data-rv-star="${n}" role="radio" aria-checked="false" aria-label="${n} star${n === 1 ? '' : 's'}">★</button>`).join('')}
            </div>
            <label>Your name<input name="name" maxlength="40" autocomplete="name"></label>
            <label>Your review<textarea name="comment" rows="3" maxlength="500" placeholder="What did you like or dislike?"></textarea></label>
            <p class="pd-error" data-rv-error hidden></p>
            <button type="submit" class="pd-btn pd-btn-cart">Submit review</button>
            <p class="rv-note">Demo: reviews are saved in this browser only.</p>
          </form>
        </div>
        <div class="rv-list" data-rv-list></div>
      </section>

      ${related.length ? `
      <section class="pd-related">
        <h2 class="pd-related-title">Customers also viewed</h2>
        <div class="product-grid">${related.map(cardHtml).join('')}</div>
      </section>` : ''}

      ${earlier.length ? `
      <section class="pd-related">
        <h2 class="pd-related-title">Recently viewed</h2>
        <div class="product-grid">${earlier.map(cardHtml).join('')}</div>
      </section>` : ''}

    </div>`;

  wirePage(p);
  wireReviews(p);
  refreshWish();
  if (typeof refreshCompare === 'function') refreshCompare();
}

function wirePage(p) {
  const mainImg = root.querySelector('[data-main-img]');
  const zoomBox = root.querySelector('[data-zoom]');
  const qtySelect = root.querySelector('[data-qty]');
  let selectedSize = null;

  // thumbnails change the big picture
  root.querySelectorAll('.pd-thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.pd-thumb').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      mainImg.src = `./assets/images/products/${btn.dataset.img}`;
    });
  });

  // hover zoom (mouse only)
  zoomBox.addEventListener('mousemove', (e) => {
    const r = zoomBox.getBoundingClientRect();
    mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    mainImg.classList.add('zoomed');
  });
  zoomBox.addEventListener('mouseleave', () => mainImg.classList.remove('zoomed'));

  // size buttons
  const sizeName = root.querySelector('[data-size-name]');
  root.querySelectorAll('.pd-size').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.pd-size').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
      sizeName.textContent = selectedSize;
      root.querySelectorAll('[data-size-error], [data-buy-size-error]').forEach((el) => { el.hidden = true; });
    });
  });

  // returns true when the cart accepted the item
  function addCurrent() {
    if (p.sizes.length && !selectedSize) {
      root.querySelectorAll('[data-size-error], [data-buy-size-error]').forEach((el) => { el.hidden = false; });
      const sizes = root.querySelector('[data-sizes]');
      if (sizes) sizes.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    addToCart(p.id, selectedSize, Number(qtySelect.value) || 1);
    return true;
  }

  root.querySelector('[data-add]').addEventListener('click', () => {
    if (addCurrent()) showCartToast('Added to cart');
  });
  root.querySelector('[data-buy]').addEventListener('click', () => {
    if (addCurrent()) startCheckout();   // straight to the checkout form
  });

  // wishlist
  root.querySelector('.pd-wish').addEventListener('click', () => {
    showCartToast(toggleWish(p.id) ? 'Added to wishlist' : 'Removed from wishlist');
  });
}


/* ---------- Reviews (saved in localStorage as { productId: [review, ...] }) ---------- */
function loadReviews(id) {
  try {
    const all = JSON.parse(localStorage.getItem('spree_reviews'));
    return all && !Array.isArray(all) && Array.isArray(all[id]) ? all[id] : [];
  } catch (e) { return []; }
}

function saveReviews(id, list) {
  try {
    const raw = JSON.parse(localStorage.getItem('spree_reviews'));
    const all = raw && !Array.isArray(raw) ? raw : {};
    all[id] = list;
    localStorage.setItem('spree_reviews', JSON.stringify(all));
    return true;
  } catch (e) { return false; }
}

// (a function, not a const, because buildPage() runs near the top of this file)
function starText(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

function renderReviews(p) {
  const list = loadReviews(p.id);
  const avg = ShopLogic.averageRating(list);
  const countText = `${list.length} customer review${list.length === 1 ? '' : 's'}`;

  root.querySelector('[data-rv-summary]').innerHTML = list.length
    ? `<p class="rv-avg"><strong>${avg}</strong> out of 5</p>
       <p class="rv-stars-display" aria-label="${avg} out of 5 stars">${starText(Math.round(avg))}</p>
       <p class="rv-count">${countText}</p>`
    : '<p class="rv-empty">No reviews yet.<br>Be the first to review this product!</p>';

  const link = root.querySelector('[data-rv-link]');
  link.textContent = list.length ? `(${countText})` : '';

  root.querySelector('[data-rv-list]').innerHTML = list.map((r) => `
    <article class="rv-item">
      <div class="rv-item-top">
        <strong>${escapeHtml(r.name)}</strong>
        <span class="rv-stars-display" aria-label="${r.rating} out of 5 stars">${starText(r.rating)}</span>
        <time>${escapeHtml(new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))}</time>
      </div>
      <p class="rv-text">${escapeHtml(r.comment)}</p>
      <button type="button" class="rv-del" data-rv-del="${escapeHtml(r.id)}">Delete</button>
    </article>`).join('');
}

function wireReviews(p) {
  const form = root.querySelector('[data-rv-form]');
  const errorEl = root.querySelector('[data-rv-error]');
  const stars = root.querySelectorAll('[data-rv-star]');
  let rating = 0;

  const user = typeof currentUser === 'function' ? currentUser() : null;
  if (user) form.elements.name.value = user.name;

  const paintStars = () => stars.forEach((b) => {
    const on = Number(b.dataset.rvStar) <= rating;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(Number(b.dataset.rvStar) === rating));
  });
  stars.forEach((b) => b.addEventListener('click', () => { rating = Number(b.dataset.rvStar); paintStars(); errorEl.hidden = true; }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = ShopLogic.validateReview({ name: form.elements.name.value, rating, comment: form.elements.comment.value });
    if (!result.ok) { errorEl.textContent = result.error; errorEl.hidden = false; return; }

    const review = { ...result.review, id: String(Date.now()) + Math.random().toString(36).slice(2, 6), date: new Date().toISOString() };
    if (!saveReviews(p.id, [review, ...loadReviews(p.id)])) {
      errorEl.textContent = 'Could not save the review (browser storage is blocked).';
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;
    form.elements.comment.value = '';
    rating = 0; paintStars();
    renderReviews(p);
    showCartToast('Thanks for your review!');
  });

  root.querySelector('[data-rv-list]').addEventListener('click', (e) => {
    const del = e.target.closest('[data-rv-del]');
    if (!del) return;
    saveReviews(p.id, loadReviews(p.id).filter((r) => r.id !== del.dataset.rvDel));
    renderReviews(p);
    showCartToast('Review deleted');
  });

  renderReviews(p);
}

// category label on a card (Related / Recently viewed) -> open that category on the home page
root.addEventListener('click', (e) => {
  const link = e.target.closest('a.showcase-category');
  if (!link) return;
  e.preventDefault();
  window.location.href = `./index.html?category=${encodeURIComponent(link.textContent.trim())}`;
});
