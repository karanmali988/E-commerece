'use strict';

/* ==========================================================
   shop.js - shows the products and filters them by category
   Needs: products.js (the PRODUCTS list) loaded before this.
   ========================================================== */

const gridEl = document.getElementById('product-grid');
const titleEl = document.getElementById('product-title');
const filterBar = document.getElementById('filter-bar');
const filterText = document.getElementById('filter-text');
const filterReset = document.getElementById('filter-reset');
const searchField = document.querySelector('.search-field');
const searchBtn = document.querySelector('.search-btn');

/* ---------- 0. Extra page parts added by JS: sort + price bar, "Load more", recently viewed ---------- */
const prices = PRODUCTS.map((p) => p.price);
filterBar.insertAdjacentHTML('afterend', `
  <div class="shop-toolbar">
    <label class="tb-field">Sort by
      <select id="sort-select">
        <option value="">Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="rating">Top rated</option>
        <option value="name">Name: A to Z</option>
      </select>
    </label>
    <div class="tb-field">Price (₹)
      <span class="tb-price">
        <input type="number" id="price-min" min="0" step="1" inputmode="decimal" placeholder="Min ${Math.floor(Math.min(...prices)).toLocaleString('en-IN')}" aria-label="Minimum price">
        <span>to</span>
        <input type="number" id="price-max" min="0" step="1" inputmode="decimal" placeholder="Max ${Math.ceil(Math.max(...prices)).toLocaleString('en-IN')}" aria-label="Maximum price">
      </span>
    </div>
    <button type="button" class="tb-clear" id="toolbar-clear" hidden>Clear sort &amp; price</button>
    <p class="tb-count" id="result-count" aria-live="polite"></p>
  </div>`);

gridEl.insertAdjacentHTML('afterend', `
  <div class="load-more-wrap" id="load-more-wrap" hidden>
    <button type="button" class="load-more-btn" id="load-more-btn">Load more</button>
  </div>
  <div class="recent-box" id="recent-box" hidden>
    <h2 class="title">Recently viewed</h2>
    <div class="product-grid" id="recent-grid"></div>
  </div>`);

const sortSelect = document.getElementById('sort-select');
const priceMin = document.getElementById('price-min');
const priceMax = document.getElementById('price-max');
const clearBtn = document.getElementById('toolbar-clear');
const countEl = document.getElementById('result-count');
const loadMoreWrap = document.getElementById('load-more-wrap');
const loadMoreBtn = document.getElementById('load-more-btn');

/* ---------- 1. What a clicked word means ----------
   key   = the clicked text, lowercase, only letters/numbers
   value = product tags to try, in order (first one that has products wins) */
const ALIASES = {
  // clothes
  clothes: ['clothes'], shirt: ['shirt'], shirts: ['shirt'],
  tshirt: ['tshirt'], tshirts: ['tshirt'],
  shortsandjeans: ['shorts'], shorts: ['shorts'],
  jacket: ['jacket'], jackets: ['jacket'], winterwear: ['winter'],
  dressandfrock: ['dress'], dress: ['dress'], skirt: ['dress'],
  hatandcaps: ['hat'], hat: ['hat'], innerwear: ['innerwear'], hosiery: ['hosiery'],
  // shoes
  footwear: ['footwear'], shoes: ['shoes'], sports: ['sports'], sport: ['sports'],
  formal: ['formal'], casual: ['casual'], boots: ['boots'],
  safetyshoes: ['safety', 'boots'], partywear: ['party-wear'], partywearshoes: ['party-wear'],
  cowboyshoes: ['boots'],
  // watches, glasses
  watch: ['watch'], watches: ['watch'], smartwatch: ['smartwatch', 'watch'],
  glassesandlens: ['glasses'], glasses: ['glasses'], sunglasses: ['glasses'], lenses: ['glasses'],
  // jewelry
  jewelry: ['jewelry'], jewellery: ['jewelry'], earrings: ['earrings', 'jewelry'],
  necklace: ['necklace', 'jewelry'], coupleringsonly: ['ring'], couplerings: ['ring', 'jewelry'],
  ring: ['ring', 'jewelry'], bracelets: ['bracelet', 'jewelry'], bangles: ['bangles', 'jewelry'],
  // perfume + cosmetics
  perfume: ['perfume'], prefume: ['perfume'], clothesperfume: ['clothesperfume', 'perfume'],
  deodorant: ['deodorant', 'perfume'], flowerfragrance: ['flowerfragrance', 'perfume'],
  airfreshener: ['airfreshener', 'perfume'],
  cosmetics: ['cosmetics'], makeup: ['makeup', 'cosmetics'], makeupkit: ['makeupkit', 'cosmetics'],
  shampoo: ['shampoo', 'cosmetics'], bodywash: ['bodywash', 'cosmetics'], sunscreen: ['sunscreen', 'cosmetics'],
  facewash: ['facewash', 'cosmetics'],
  // bags + accessories
  bags: ['bags'], shoppingbag: ['bags'], gymbackpack: ['bags'], purse: ['bags'],
  wallet: ['wallet', 'accessories'], belt: ['belt', 'accessories'],
  // people + other
  mens: ['men'], womens: ['women'], electronics: ['electronics']
};

// Names that are not categories: do nothing / special actions
const IGNORE = ['categories', 'blog', 'hotoffers', 'language', 'currency'];

const keyOf = (text) =>
  text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

/* ---------- 2. Draw the product cards ----------
   (the card layout itself lives in card.js) */
let baseList = PRODUCTS;     // products of the current category / search
let baseEmpty = '';
let visibleCount = ShopLogic.PAGE_SIZE;

// a NEW list (category, search, show all): start again from the first page
function render(list, emptyMessage) {
  baseList = list;
  baseEmpty = emptyMessage || '';
  visibleCount = ShopLogic.PAGE_SIZE;
  draw();
}

// draws baseList after the price filter + sort, one page at a time
function draw() {
  const filtered = ShopLogic.filterByPrice(baseList, priceMin.value, priceMax.value);
  const sorted = ShopLogic.sortProducts(filtered, sortSelect.value);
  const { items, total, hasMore } = ShopLogic.paginate(sorted, visibleCount);

  let message = baseEmpty || 'No products found.';
  if (baseList.length && !total) message = 'No products in this price range. Try changing or clearing the price filter.';

  gridEl.innerHTML = items.length ? items.map(cardHtml).join('') : `<p class="no-results">${message}</p>`;

  countEl.textContent = total ? `Showing ${items.length} of ${total} product${total === 1 ? '' : 's'}` : '';
  loadMoreWrap.hidden = !hasMore;
  loadMoreBtn.textContent = `Load more (${total - items.length} left)`;
  clearBtn.hidden = !(sortSelect.value || priceMin.value || priceMax.value);

  refreshWish();
  if (typeof refreshCompare === 'function') refreshCompare();
}

// sort / price changes: back to the first page of the same list
const redraw = () => { visibleCount = ShopLogic.PAGE_SIZE; draw(); };
sortSelect.addEventListener('change', redraw);
let priceTimer;
[priceMin, priceMax].forEach((input) => input.addEventListener('input', () => {
  clearTimeout(priceTimer);
  priceTimer = setTimeout(redraw, 250);
}));
clearBtn.addEventListener('click', () => { sortSelect.value = ''; priceMin.value = ''; priceMax.value = ''; redraw(); });
loadMoreBtn.addEventListener('click', () => { visibleCount += ShopLogic.PAGE_SIZE; draw(); });

/* ---------- 3. Filtering ---------- */
// returns { products, usedTag } for a clicked label
function findProducts(label) {
  const tags = ALIASES[keyOf(label)] || [keyOf(label)];
  for (const tag of tags) {
    const found = PRODUCTS.filter((p) => p.tags.includes(tag));
    if (found.length) return { products: found, exact: tag === tags[0] };
  }
  return { products: [], exact: false };
}

function closeMobileMenus() {
  document.querySelectorAll('.mobile-navigation-menu.active, .sidebar.active')
    .forEach((el) => el.classList.remove('active'));
  const ov = document.querySelector('[data-overlay]');
  if (ov) ov.classList.remove('active');
}

function scrollToProducts() {
  closeMobileMenus();
  titleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showAll(scroll) {
  if (searchField && !searching) searchField.value = '';
  render(PRODUCTS);
  titleEl.textContent = 'New Products';
  filterBar.hidden = true;
  if (scroll) scrollToProducts();
}

function filterBy(label) {
  if (searchField) searchField.value = '';
  const clean = label.trim();
  const { products, exact } = findProducts(clean);

  render(products, `Sorry, we don't have any products in "${escapeHtml(clean)}" yet.`);
  titleEl.textContent = clean;
  filterBar.hidden = false;

  const count = `${products.length} product${products.length === 1 ? '' : 's'}`;
  filterText.innerHTML = products.length && !exact
    ? `No exact match for <strong>${escapeHtml(clean)}</strong>, showing related items (${count})`
    : `Showing <strong>${escapeHtml(clean)}</strong> (${count})`;

  scrollToProducts();
}

if (filterReset) filterReset.addEventListener('click', () => showAll(false));

/* ---------- 3b. Search box ---------- */
let searching = false;

function runSearch(raw, scroll) {
  const query = raw.trim();
  if (!query) { searching = true; showAll(false); searching = false; return; }

  // every typed word must match the start of a word in the name, tags or description
  const words = query.toLowerCase().split(/\s+/);
  const found = PRODUCTS.filter((p) => {
    const text = [p.name, p.description, p.tags.join(' '), labelFor(p)].join(' ').toLowerCase();
    const textWords = text.split(/[^a-z0-9]+/);
    return words.every((w) => textWords.some((tw) => tw.startsWith(w)));
  });

  render(found, `No products match "${escapeHtml(query)}". Try a shorter word like "shirt" or "watch".`);
  titleEl.textContent = 'Search results';
  filterBar.hidden = false;
  filterText.innerHTML = `Showing results for <strong>${escapeHtml(query)}</strong> (${found.length} product${found.length === 1 ? '' : 's'})`;
  if (scroll) scrollToProducts();
}

if (searchField) {
  let searchTimer;
  searchField.addEventListener('input', () => {   // live results while typing
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(searchField.value, false), 200);
  });
  searchField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); runSearch(searchField.value, true); }
  });
}
if (searchBtn) searchBtn.addEventListener('click', () => runSearch(searchField ? searchField.value : '', true));

/* ---------- 4. Work out which label a click means ---------- */
function labelFromClick(target) {
  // top "category" cards (whole card is clickable)
  const card = target.closest('.category-item');
  if (card) return card.querySelector('.category-item-title').textContent;

  const link = target.closest('a');
  if (!link) return null;

  if (link.classList.contains('showcase-category')) return link.textContent;
  if (link.classList.contains('footer-category-link')) return link.textContent;

  const sidebarItem = link.closest('.sidebar-submenu-category');
  if (sidebarItem) return sidebarItem.querySelector('.product-name').textContent;

  if (link.closest('.submenu-category, .dropdown-item, .panel-list-item')) return link.textContent;
  if (link.matches('.menu-title') || link.parentElement.matches('li.menu-title')) return link.textContent;

  return null;
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a');

  // Links with href="#" would jump to the top of the page. Stop that.
  if (link && link.getAttribute('href') === '#') e.preventDefault();

  // big "Shop now" / call-to-action buttons -> show everything
  if (link && link.matches('.banner-btn, .cta-btn')) return showAll(true);

  // logo and the mobile "home" button -> back to the top, all products
  if ((link && link.matches('.header-logo')) || e.target.closest('[data-go-home]')) {
    e.preventDefault();
    closeMobileMenus();
    showAll(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const label = labelFromClick(e.target);

  // links that are only placeholders in this demo: say so instead of doing nothing
  if (!label || !label.trim()) {
    if (link && link.getAttribute('href') === '#') showCartToast('This link is a placeholder in the demo store');
    return;
  }

  const key = keyOf(label);
  if (key === 'home') { showAll(false); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

  // "Blog" and "Hot Offers" scroll to their sections on this page
  const sectionFor = { blog: '.blog', hotoffers: '.product-featured' }[key];
  if (sectionFor) {
    const section = document.querySelector(sectionFor);
    closeMobileMenus();
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (IGNORE.includes(key)) return;

  filterBy(label);
});

/* ---------- 5. Product counts (only products really in that category) ---------- */
function exactCount(label) {
  const tag = (ALIASES[keyOf(label)] || [keyOf(label)])[0];
  return PRODUCTS.filter((p) => p.tags.includes(tag)).length;
}

/* ---------- 6. Start ---------- */
showAll(false);

// numbers on the top category cards
document.querySelectorAll('.category-item').forEach((card) => {
  const title = card.querySelector('.category-item-title').textContent;
  const amount = card.querySelector('.category-item-amount');
  if (amount) amount.textContent = `(${exactCount(title)})`;
});

// numbers in the left sidebar (the "+" menus): how many products we really have
document.querySelectorAll('.sidebar-submenu-category').forEach((item) => {
  const name = item.querySelector('.product-name');
  const num = item.querySelector('data.stock');
  if (!name || !num) return;
  const n = exactCount(name.textContent);
  num.textContent = n;
  num.value = n;
  num.title = 'Products available';
});

// side lists (best sellers, new arrivals, deal of the day...): open the product page
document.querySelectorAll('.showcase').forEach((card) => {
  if (card.closest('#product-grid')) return;
  const img = card.querySelector('img');
  const p = img && productByImage(img.getAttribute('src'));
  if (!p) return;
  card.dataset.id = p.id;
  // prices come from products.js, so these lists can never disagree with the grid
  const priceEl = card.querySelector('.price');
  const oldEl = card.querySelector('del');
  if (priceEl) priceEl.textContent = money(p.price);
  if (oldEl) { if (p.oldPrice) oldEl.textContent = money(p.oldPrice); else oldEl.remove(); }
  card.querySelectorAll('a[href="#"]:not(.showcase-category)').forEach((a) => a.setAttribute('href', productUrl(p.id)));
});

// recently viewed products (saved by the product page)
const recentIds = getRecent().slice(0, 4);
if (recentIds.length) {
  document.getElementById('recent-grid').innerHTML = recentIds.map((id) => cardHtml(productById(id))).join('');
  document.getElementById('recent-box').hidden = false;
  refreshWish();
  if (typeof refreshCompare === 'function') refreshCompare();
}

// coming from a product page ("index.html?category=Sports")
const wantedCategory = new URLSearchParams(window.location.search).get('category');
if (wantedCategory) filterBy(wantedCategory);
