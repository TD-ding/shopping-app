let products = [];
let cart = [];
let allCategories = [];
let currentSort = 'default';
let submitting = false;
let favFilterOn = false;

const MAX_QUANTITY = 99;
const CART_KEY = 'mini_shop_cart';
const FAV_KEY = 'mini_shop_favs';

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatPrice(value) {
  return '¥' + Number(value).toFixed(2);
}

function maskPhone(phone) {
  if (typeof phone !== 'string' || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }
function loadCart() { try { const d = localStorage.getItem(CART_KEY); if (d) cart = JSON.parse(d); } catch {} }
function getFavorites() { try { const d = localStorage.getItem(FAV_KEY); return d ? JSON.parse(d) : []; } catch { return []; } }
function saveFavorites(favs) { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch {} }
function isFavorite(id) { return getFavorites().includes(id); }
function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.push(id); }
  saveFavorites(favs);
  return idx < 0;
}

async function init() {
  loadCart();
  updateCartBadge();
  try {
    await Promise.all([loadProducts(), loadCategories()]);
    bindEvents();
    renderProducts();
  } catch (err) {
    showToast('页面加载失败，请刷新重试', 'error');
  } finally {
    document.getElementById('loading-overlay').classList.add('hidden');
  }
}

async function loadProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error();
  products = await res.json();
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error();
  allCategories = ['all', ...(await res.json())];
}

function bindEvents() {
  renderCategoryBar();

  document.getElementById('category-bar').addEventListener('click', e => {
    if (!e.target.classList.contains('cat-btn')) return;
    document.getElementById('category-bar').querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderProducts();
  });

  document.getElementById('fav-filter-btn').addEventListener('click', e => {
    favFilterOn = !favFilterOn;
    e.currentTarget.classList.toggle('active', favFilterOn);
    renderProducts();
  });

  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  searchInput.addEventListener('input', () => {
    searchClear.classList.toggle('hidden', !searchInput.value);
    renderProducts();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    renderProducts();
    searchInput.focus();
  });

  document.querySelector('.sort-bar').addEventListener('click', e => {
    if (!e.target.classList.contains('sort-btn')) return;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentSort = e.target.dataset.sort;
    renderProducts();
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchPage(btn.dataset.page);
    });
  });

  document.getElementById('modal-close').addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCheckoutModal();
  });
  document.getElementById('detail-close').addEventListener('click', closeDetailModal);
  document.getElementById('detail-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeCheckoutModal(); closeDetailModal(); }
  });

  document.getElementById('detail-add-cart').addEventListener('click', () => {
    const btn = document.getElementById('detail-add-cart');
    const id = parseInt(btn.dataset.productId);
    if (id) addToCart(id, btn);
  });

  document.getElementById('order-phone').addEventListener('input', e => {
    const hint = document.getElementById('phone-hint');
    const val = e.target.value.trim();
    if (val && !/^1[3-9]\d{9}$/.test(val)) {
      hint.textContent = '请输入正确的11位手机号';
      hint.classList.add('error');
    } else {
      hint.textContent = '';
      hint.classList.remove('error');
    }
  });

  document.getElementById('checkout-form').addEventListener('submit', submitOrder);
}

function renderCategoryBar() {
  const catBar = document.getElementById('category-bar');
  const counts = {};
  products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const btnsHTML = allCategories.map(cat => {
    const label = cat === 'all' ? '全部' : cat;
    const count = cat === 'all' ? products.length : (counts[cat] || 0);
    const active = cat === 'all' ? ' active' : '';
    return `<button class="cat-btn${active}" data-category="${escapeHTML(cat)}">${escapeHTML(label)} (${count})</button>`;
  }).join('');
  const favBtn = document.getElementById('fav-filter-btn');
  catBar.innerHTML = btnsHTML;
  catBar.appendChild(favBtn);
}

function renderProducts() {
  const keyword = document.getElementById('search-input').value.trim().toLowerCase();
  const activeCat = document.querySelector('.cat-btn.active')?.dataset.category || 'all';
  let filtered = products.filter(p => {
    const matchCat = activeCat === 'all' || p.category === activeCat;
    const matchSearch = !keyword || p.name.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword);
    const matchFav = !favFilterOn || isFavorite(p.id);
    return matchCat && matchSearch && matchFav;
  });
  if (currentSort === 'asc') filtered.sort((a, b) => a.price - b.price);
  else if (currentSort === 'desc') filtered.sort((a, b) => b.price - a.price);

  const grid = document.getElementById('product-grid');
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="cart-empty"><div class="empty-icon">🔍</div><p>没有找到匹配的商品</p></div>';
    return;
  }
  grid.innerHTML = filtered.map(p => {
    const faved = isFavorite(p.id);
    return `<div class="product-card">
      <button class="fav-btn${faved ? ' active' : ''}" onclick="handleFav(event, ${p.id})" title="${faved ? '取消收藏' : '收藏'}">
        <span class="heart-icon">${faved ? '❤️' : '🤍'}</span>
      </button>
      <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" onclick="openDetailModal(${p.id})">
      <div class="product-info">
        <h3 onclick="openDetailModal(${p.id})">${escapeHTML(p.name)}</h3>
        <p class="desc">${escapeHTML(p.description)}</p>
        <div class="product-bottom">
          <span class="price">${formatPrice(p.price)}</span>
          <button class="btn-primary" id="add-btn-${p.id}" onclick="addToCart(${p.id})">加入购物车</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function handleFav(event, productId) {
  event.stopPropagation();
  const nowFav = toggleFavorite(productId);
  const btn = event.currentTarget;
  const icon = btn.querySelector('.heart-icon');
  if (nowFav) { btn.classList.add('active'); icon.textContent = '❤️'; btn.title = '取消收藏'; }
  else { btn.classList.remove('active'); icon.textContent = '🤍'; btn.title = '收藏'; }
  if (favFilterOn) renderProducts();
}

function openDetailModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  document.getElementById('detail-title').textContent = p.name;
  document.getElementById('detail-img').src = p.image;
  document.getElementById('detail-img').alt = p.name;
  document.getElementById('detail-category').textContent = p.category;
  document.getElementById('detail-desc').textContent = p.description;
  document.getElementById('detail-price').textContent = formatPrice(p.price);
  const addBtn = document.getElementById('detail-add-cart');
  addBtn.dataset.productId = p.id;
  addBtn.textContent = '加入购物车';
  addBtn.className = 'btn-primary';
  addBtn.disabled = false;
  document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('show');
}

function addToCart(productId, detailBtn) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.quantity >= MAX_QUANTITY) { showToast(`「${product.name}」最多添加 ${MAX_QUANTITY} 件`, 'error'); return; }
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  updateCartBadge();
  saveCart();
  showToast(`已加入「${product.name}」`);
  const cardBtn = document.getElementById('add-btn-' + productId);
  if (cardBtn) setAddedState(cardBtn);
  if (detailBtn) setAddedState(detailBtn);
}

function setAddedState(btn) {
  btn.textContent = '已加入 ✓';
  btn.className = 'btn-added';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = '加入购物车'; btn.className = 'btn-primary'; btn.disabled = false; }, 2000);
}

function updateCartBadge() {
  document.getElementById('cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function renderCart() {
  const container = document.getElementById('cart-content');
  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty"><div class="empty-icon">🛒</div><p>购物车是空的，<a href="#" class="link-go-shop" onclick="switchPage(\'products\');document.querySelector(\'[data-page=products]\').click();return false;">去逛逛吧</a></p></div>';
    return;
  }
  const itemsHTML = cart.map(item => {
    const subtotal = item.price * item.quantity;
    return `<div class="cart-item">
      <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">
      <div class="cart-item-info">
        <h3>${escapeHTML(item.name)}</h3>
        <span class="price">${formatPrice(item.price)}</span>
        <div class="cart-item-subtotal">${formatPrice(item.price)} × ${item.quantity} = <span>${formatPrice(subtotal)}</span></div>
      </div>
      <div class="qty-control">
        <button onclick="changeQty(${item.id}, -1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty(${item.id}, 1)" ${item.quantity >= MAX_QUANTITY ? 'disabled title="已达上限"' : ''}>+</button>
      </div>
      <button class="btn-danger" onclick="removeFromCart(${item.id})">删除</button>
    </div>`;
  }).join('');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  container.innerHTML = `${itemsHTML}<div class="cart-footer">
    <div class="cart-total">合计：<span>${formatPrice(total)}</span></div>
    <button class="btn-primary btn-checkout" onclick="openCheckoutModal()">去结算</button>
  </div>`;
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty > MAX_QUANTITY) { showToast(`最多添加 ${MAX_QUANTITY} 件`, 'error'); return; }
  item.quantity = newQty;
  if (item.quantity <= 0) cart = cart.filter(i => i.id !== productId);
  updateCartBadge(); saveCart(); renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  updateCartBadge(); saveCart(); renderCart();
}

function openCheckoutModal() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById('order-summary').innerHTML = `<h4>订单明细</h4>
    ${cart.map(item => `<div class="summary-item"><span>${escapeHTML(item.name)} × ${item.quantity}</span><span>${formatPrice(item.price * item.quantity)}</span></div>`).join('')}
    <div class="summary-total"><span>合计</span><span>${formatPrice(total)}</span></div>`;
  document.getElementById('checkout-modal').classList.add('show');
}

function closeCheckoutModal() { document.getElementById('checkout-modal').classList.remove('show'); }

function showTopNotice(text) {
  const notice = document.getElementById('top-notice');
  document.getElementById('top-notice-text').textContent = text;
  notice.classList.add('show');
  setTimeout(() => notice.classList.remove('show'), 3000);
}

async function submitOrder(e) {
  e.preventDefault();
  if (submitting) return;
  const phone = document.getElementById('order-phone').value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) { showToast('请输入正确的11位手机号', 'error'); return; }
  submitting = true;
  const btn = document.getElementById('btn-submit-order');
  btn.disabled = true; btn.textContent = '提交中...';
  try {
    const order = {
      name: document.getElementById('order-name').value.trim(),
      phone, address: document.getElementById('order-address').value.trim(),
      items: cart.map(({ id, quantity }) => ({ id, quantity }))
    };
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    if (!res.ok) { const err = await res.json(); showToast(err.error || '下单失败', 'error'); return; }
    cart = []; updateCartBadge(); saveCart(); closeCheckoutModal();
    document.getElementById('checkout-form').reset();
    showTopNotice('🎉 下单成功！感谢您的购买');
    switchPage('orders'); renderOrders();
  } catch { showToast('网络错误，请重试', 'error'); }
  finally { submitting = false; btn.disabled = false; btn.textContent = '提交订单'; }
}

async function renderOrders() {
  let orders;
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error();
    orders = await res.json();
  } catch {
    document.getElementById('orders-content').innerHTML = '<div class="cart-empty"><div class="empty-icon">⚠️</div><p>加载订单失败，<a href="#" class="link-go-shop" onclick="renderOrders();return false;">点击重试</a></p></div>';
    return;
  }
  const container = document.getElementById('orders-content');
  if (orders.length === 0) {
    container.innerHTML = '<div class="orders-empty"><div class="empty-icon">📦</div><p>暂无订单，<a href="#" class="link-go-shop" onclick="switchPage(\'products\');document.querySelector(\'[data-page=products]\').click();return false;">去逛逛吧</a></p></div>';
    return;
  }
  container.innerHTML = orders.reverse().map(order => `<div class="order-card">
    <div class="order-header"><span class="order-id">订单号：${escapeHTML(String(order.id))}</span><span class="order-date">${escapeHTML(new Date(order.createdAt).toLocaleString('zh-CN'))}</span></div>
    <div class="order-body">${order.items.map(item => `<div class="order-product"><span>${escapeHTML(item.name)} × ${item.quantity}</span><span>${formatPrice(item.price * item.quantity)}</span></div>`).join('')}</div>
    <div class="order-footer"><span class="order-address">${escapeHTML(order.name)} / ${maskPhone(order.phone)} / ${escapeHTML(order.address)}</span><span class="order-total">${formatPrice(order.total)}</span></div>
  </div>`).join('');
}

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (page === 'cart') renderCart();
  if (page === 'orders') renderOrders();
}

function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
}

init();
