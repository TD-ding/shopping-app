let products = [];
let cart = [];
let allCategories = [];

// --- Init ---
async function init() {
  await Promise.all([loadProducts(), loadCategories()]);
  bindEvents();
  renderProducts();
}

async function loadProducts() {
  const res = await fetch('/api/products');
  products = await res.json();
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  allCategories = ['all', ...(await res.json())];
}

function bindEvents() {
  // 分类按钮
  const catBar = document.getElementById('category-bar');
  allCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (cat === 'all' ? ' active' : '');
    btn.dataset.category = cat;
    btn.textContent = cat === 'all' ? '全部' : cat;
    catBar.appendChild(btn);
  });

  catBar.addEventListener('click', e => {
    if (!e.target.classList.contains('cat-btn')) return;
    catBar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderProducts();
  });

  // 搜索
  document.getElementById('search-input').addEventListener('input', renderProducts);

  // 导航
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchPage(btn.dataset.page);
    });
  });

  // 弹窗关闭
  document.getElementById('modal-close').addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCheckoutModal();
  });

  // 结算表单
  document.getElementById('checkout-form').addEventListener('submit', submitOrder);
}

// --- Products ---
function renderProducts() {
  const keyword = document.getElementById('search-input').value.trim().toLowerCase();
  const activeCat = document.querySelector('.cat-btn.active')?.dataset.category || 'all';

  const filtered = products.filter(p => {
    const matchCat = activeCat === 'all' || p.category === activeCat;
    const matchSearch = !keyword || p.name.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword);
    return matchCat && matchSearch;
  });

  const grid = document.getElementById('product-grid');

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="cart-empty"><div class="empty-icon">🔍</div><p>没有找到匹配的商品</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <div class="product-info">
        <h3>${p.name}</h3>
        <p class="desc">${p.description}</p>
        <div class="product-bottom">
          <span class="price">${p.price}</span>
          <button class="btn-primary" onclick="addToCart(${p.id})">加入购物车</button>
        </div>
      </div>
    </div>
  `).join('');
}

// --- Cart ---
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCartBadge();
  showToast(`已加入「${product.name}」`);
}

function updateCartBadge() {
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-count').textContent = total;
}

function renderCart() {
  const container = document.getElementById('cart-content');

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty"><div class="empty-icon">🛒</div><p>购物车是空的，去逛逛吧</p></div>';
    return;
  }

  const itemsHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <span class="price">${item.price}</span>
      </div>
      <div class="qty-control">
        <button onclick="changeQty(${item.id}, -1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty(${item.id}, 1)">+</button>
      </div>
      <button class="btn-danger" onclick="removeFromCart(${item.id})">删除</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  container.innerHTML = `
    ${itemsHTML}
    <div class="cart-footer">
      <div class="cart-total">合计：<span>¥${total.toFixed(2)}</span></div>
      <button class="btn-primary btn-checkout" onclick="openCheckoutModal()">去结算</button>
    </div>
  `;
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
  updateCartBadge();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  updateCartBadge();
  renderCart();
}

// --- Checkout Modal ---
function openCheckoutModal() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const summaryItems = cart.map(item => `
    <div class="summary-item">
      <span>${item.name} × ${item.quantity}</span>
      <span>¥${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');

  document.getElementById('order-summary').innerHTML = `
    <h4>订单明细</h4>
    ${summaryItems}
    <div class="summary-total">
      <span>合计</span>
      <span>¥${total.toFixed(2)}</span>
    </div>
  `;

  document.getElementById('checkout-modal').classList.add('show');
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').classList.remove('show');
}

async function submitOrder(e) {
  e.preventDefault();

  const order = {
    name: document.getElementById('order-name').value.trim(),
    phone: document.getElementById('order-phone').value.trim(),
    address: document.getElementById('order-address').value.trim(),
    items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity }))
  };

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });

  if (!res.ok) {
    const err = await res.json();
    showToast(err.error);
    return;
  }

  cart = [];
  updateCartBadge();
  closeCheckoutModal();
  document.getElementById('checkout-form').reset();
  showToast('下单成功！');
  switchPage('orders');
  renderOrders();
}

// --- Orders ---
async function renderOrders() {
  const res = await fetch('/api/orders');
  const orders = await res.json();
  const container = document.getElementById('orders-content');

  if (orders.length === 0) {
    container.innerHTML = '<div class="orders-empty"><div class="empty-icon">📦</div><p>暂无订单</p></div>';
    return;
  }

  container.innerHTML = orders.reverse().map(order => `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">订单号：${order.id}</span>
        <span class="order-date">${new Date(order.createdAt).toLocaleString('zh-CN')}</span>
      </div>
      <div class="order-body">
        ${order.items.map(item => `
          <div class="order-product">
            <span>${item.name} × ${item.quantity}</span>
            <span>¥${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-footer">
        <span class="order-address">${order.name} / ${order.phone} / ${order.address}</span>
        <span class="order-total">¥${order.total.toFixed(2)}</span>
      </div>
    </div>
  `).join('');
}

// --- Page Switch ---
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  if (page === 'cart') renderCart();
  if (page === 'orders') renderOrders();
}

// --- Toast ---
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// --- Start ---
init();
