'use strict';

/* ==========================================================
   compare.js - the "compare" button on product cards
   Pick up to 3 products, then open a side-by-side table.
   Saved in localStorage like the cart.
   Needs: products.js, card.js and cart.js loaded before this file.
   ========================================================== */
(function () {
  const MAX = 3;
  let ids = store.read('spree_compare').map(Number).filter((id) => productById(id)).slice(0, MAX);

  /* ---------- floating bar + modal ---------- */
  const holder = document.createElement('div');
  holder.innerHTML = `
    <div class="cmp-bar" data-cmp-bar>
      <span data-cmp-text></span>
      <button type="button" class="cmp-go" data-cmp-open>Compare now</button>
      <button type="button" class="cmp-clear" data-cmp-clear>Clear</button>
    </div>
    <div class="cmp-modal" data-cmp-modal role="dialog" aria-modal="true" aria-label="Compare products">
      <div class="cmp-box">
        <button type="button" class="cmp-close" data-cmp-close aria-label="Close"><ion-icon name="close-outline"></ion-icon></button>
        <h2>Compare products</h2>
        <div data-cmp-table></div>
      </div>
    </div>`;
  document.body.appendChild(holder);

  const bar = holder.querySelector('[data-cmp-bar]');
  const barText = holder.querySelector('[data-cmp-text]');
  const goBtn = holder.querySelector('[data-cmp-open]');
  const modalEl = holder.querySelector('[data-cmp-modal]');
  const tableEl = holder.querySelector('[data-cmp-table]');

  const save = () => { store.write('spree_compare', ids); refreshCompare(); };

  function tableHtml() {
    const list = ids.map(productById).filter(Boolean);
    if (list.length < 2) return '<p class="cmp-hint">Pick at least 2 products with the compare button to see them side by side.</p>';
    const row = (label, fn) => `<tr><th>${label}</th>${list.map((p) => `<td>${fn(p)}</td>`).join('')}</tr>`;
    return `
      <div style="overflow-x:auto">
      <table class="cmp-table">
        ${row('', (p) => `<a href="${productUrl(p.id)}"><img src="./assets/images/products/${p.img}" alt="${escapeHtml(p.name)}"></a>`)}
        ${row('Name', (p) => `<a href="${productUrl(p.id)}">${escapeHtml(p.name)}</a>`)}
        ${row('Price', (p) => `<strong>${money(p.price)}</strong>${p.oldPrice ? ` <del>${money(p.oldPrice)}</del>` : ''}`)}
        ${row('Rating', (p) => `${p.rating} / 5`)}
        ${row('Category', (p) => escapeHtml(labelFor(p)))}
        ${row('Sizes', (p) => (p.sizes.length ? escapeHtml(p.sizes.join(', ')) : 'One size'))}
        ${row('Stock', (p) => (p.stock > 0 ? `${p.stock} available` : 'Out of stock'))}
        ${row('', (p) => `<button type="button" class="cmp-remove" data-cmp-remove="${p.id}">Remove</button>`)}
      </table></div>`;
  }

  /* ---------- public functions (used by cart.js click handler) ---------- */
  window.toggleCompare = function (id) {
    id = Number(id);
    const i = ids.indexOf(id);
    if (i !== -1) { ids.splice(i, 1); save(); showCartToast('Removed from compare'); return; }
    if (ids.length >= MAX) { showCartToast(`You can compare up to ${MAX} products`); return; }
    ids.push(id);
    save();
    showCartToast(`Added to compare (${ids.length}/${MAX})`);
  };

  window.refreshCompare = function () {
    // bar
    bar.classList.toggle('show', ids.length > 0);
    barText.textContent = `${ids.length} selected`;
    goBtn.disabled = ids.length < 2;
    // highlight the buttons on cards
    document.querySelectorAll('.showcase[data-id]').forEach((card) => {
      const btn = card.querySelector('[data-action="compare"]');
      if (btn) btn.classList.toggle('active', ids.includes(Number(card.dataset.id)));
    });
    // table (if open)
    if (modalEl.classList.contains('open')) {
      if (ids.length < 2) modalEl.classList.remove('open');
      else tableEl.innerHTML = tableHtml();
    }
  };

  /* ---------- clicks ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-cmp-open]') && ids.length >= 2) {
      tableEl.innerHTML = tableHtml();
      modalEl.classList.add('open');
      return;
    }
    if (t.closest('[data-cmp-close]') || t === modalEl) return modalEl.classList.remove('open');
    if (t.closest('[data-cmp-clear]')) { ids = []; save(); return; }
    const rm = t.closest('[data-cmp-remove]');
    if (rm) { ids = ids.filter((id) => id !== Number(rm.dataset.cmpRemove)); save(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modalEl.classList.remove('open'); });

  refreshCompare();
})();
