// ShopVerse - Main Catalog, Cart, Checkout, and Navigation Logic

let activeProducts = [];
let currentModalProduct = null;
let modalQuantity = 1;
let activePromoCode = null;
let promoDiscount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadCategories();
  await loadProducts();
  renderCartDrawer();
  updateCartBadge();
});

// View Navigation Switcher
function showView(viewName) {
  const views = ['catalog', 'checkout', 'order-success', 'track', 'orders', 'admin'];
  views.forEach(v => {
    const el = document.getElementById(`${v}-view`);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(`${viewName}-view`);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update nav button active states
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('text-indigo-600', 'bg-indigo-50/50', 'font-semibold');
  });
  const activeNavBtn = document.getElementById(`nav-btn-${viewName}`);
  if (activeNavBtn) {
    activeNavBtn.classList.add('text-indigo-600', 'bg-indigo-50/50', 'font-semibold');
  }

  // Trigger data refreshes if necessary
  if (viewName === 'orders') {
    loadUserOrders();
  } else if (viewName === 'admin') {
    loadAdminDashboard();
  } else if (viewName === 'checkout') {
    prepareCheckoutView();
  }
}

function toggleMobileMenu() {
  const m = document.getElementById('mobile-menu');
  if (m) m.classList.toggle('hidden');
}

// ----------------- CATALOG & PRODUCTS -----------------
async function loadCategories() {
  try {
    const categories = await apiFetch('/api/products/categories');
    const container = document.getElementById('category-pills');
    if (!container) return;

    container.innerHTML = categories.map(cat => `
      <button 
        onclick="selectCategory('${cat.name}')" 
        class="category-pill px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
          state.currentCategory === cat.name 
            ? 'bg-indigo-600 text-white shadow-xs' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }"
      >
        ${cat.name} (${cat.count})
      </button>
    `).join('');
  } catch (err) {
    console.error("Failed to load categories:", err);
  }
}

function selectCategory(catName) {
  state.currentCategory = catName;
  loadCategories();
  loadProducts();
}

let searchDebounceTimeout = null;
function handleSearchInput(e) {
  clearTimeout(searchDebounceTimeout);
  state.searchQuery = e.target.value.trim();
  searchDebounceTimeout = setTimeout(() => {
    loadProducts();
  }, 300);
}

function resetFilters() {
  state.currentCategory = 'All';
  state.searchQuery = '';
  document.getElementById('search-input').value = '';
  document.getElementById('sort-select').value = 'featured';
  document.getElementById('stock-filter').checked = false;
  loadCategories();
  loadProducts();
}

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  const emptyState = document.getElementById('product-empty-state');
  if (!grid) return;

  const sortSelect = document.getElementById('sort-select');
  const stockFilter = document.getElementById('stock-filter');

  const params = new URLSearchParams();
  if (state.currentCategory && state.currentCategory !== 'All') {
    params.append('category', state.currentCategory);
  }
  if (state.searchQuery) {
    params.append('search', state.searchQuery);
  }
  if (sortSelect && sortSelect.value) {
    params.append('sort_by', sortSelect.value);
  }
  if (stockFilter && stockFilter.checked) {
    params.append('in_stock_only', 'true');
  }

  try {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <svg class="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <p class="text-xs font-semibold">Loading catalog...</p>
      </div>
    `;

    const products = await apiFetch(`/api/products?${params.toString()}`);
    activeProducts = products;

    if (!products || products.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = products.map(product => {
      const isOutOfStock = product.stock <= 0;
      const isLowStock = product.stock > 0 && product.stock <= 5;
      
      let badge = '';
      if (isOutOfStock) {
        badge = `<span class="bg-red-500/90 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">Sold Out</span>`;
      } else if (isLowStock) {
        badge = `<span class="bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">Only ${product.stock} Left</span>`;
      } else if (product.is_featured) {
        badge = `<span class="bg-indigo-600/90 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">Featured</span>`;
      }

      return `
        <div class="product-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md flex flex-col group">
          <!-- Image Box -->
          <div class="relative aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer" onclick="openProductDetail(${product.id})">
            <img 
              src="${product.image_url}" 
              alt="${product.name}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'"
            >
            <div class="absolute top-3 left-3 flex flex-col gap-1">
              ${badge}
            </div>
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <span class="text-amber-500">★</span>
              <span>${product.rating ? product.rating.toFixed(1) : '4.8'}</span>
            </div>
          </div>

          <!-- Product Details -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600">${product.category}</span>
              <h3 
                onclick="openProductDetail(${product.id})" 
                class="font-bold text-slate-800 text-sm hover:text-indigo-600 transition cursor-pointer mt-1 line-clamp-1"
                title="${product.name}"
              >
                ${product.name}
              </h3>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                ${product.description}
              </p>
            </div>

            <div class="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Price</span>
                <span class="text-lg font-black text-slate-900">$${product.price.toFixed(2)}</span>
              </div>

              <button 
                onclick="addToCart(${product.id}, 1)" 
                ${isOutOfStock ? 'disabled' : ''}
                class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isOutOfStock 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:shadow-indigo-600/30'
                }"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-red-500 text-sm">Failed to load products: ${err.message}</div>`;
  }
}

// ----------------- PRODUCT DETAIL MODAL -----------------
function openProductDetail(productId) {
  const product = activeProducts.find(p => p.id === productId);
  if (!product) return;

  currentModalProduct = product;
  modalQuantity = 1;

  document.getElementById('modal-img').src = product.image_url;
  document.getElementById('modal-cat').textContent = product.category;
  document.getElementById('modal-title').textContent = product.name;
  document.getElementById('modal-desc').textContent = product.description;
  document.getElementById('modal-price').textContent = `$${product.price.toFixed(2)}`;
  document.getElementById('modal-rating').innerHTML = `★ ${product.rating ? product.rating.toFixed(1) : '4.8'}`;
  document.getElementById('modal-reviews').textContent = `${product.num_reviews || 45} customer reviews`;
  document.getElementById('modal-qty').textContent = '1';

  const stockBadge = document.getElementById('modal-stock-badge');
  const addBtn = document.getElementById('modal-add-btn');

  if (product.stock <= 0) {
    stockBadge.textContent = 'Out of Stock';
    stockBadge.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800';
    addBtn.disabled = true;
    addBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else if (product.stock <= 5) {
    stockBadge.textContent = `Only ${product.stock} Left!`;
    stockBadge.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
    addBtn.disabled = false;
    addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  } else {
    stockBadge.textContent = 'In Stock';
    stockBadge.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
    addBtn.disabled = false;
    addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  document.getElementById('product-detail-modal').classList.remove('hidden');
}

function closeProductDetailModal() {
  document.getElementById('product-detail-modal').classList.add('hidden');
  currentModalProduct = null;
}

function adjustModalQty(delta) {
  if (!currentModalProduct) return;
  const newQty = modalQuantity + delta;
  if (newQty >= 1 && newQty <= Math.min(currentModalProduct.stock, 10)) {
    modalQuantity = newQty;
    document.getElementById('modal-qty').textContent = modalQuantity;
  }
}

function addModalItemToCart() {
  if (!currentModalProduct) return;
  addToCart(currentModalProduct.id, modalQuantity);
  closeProductDetailModal();
}

// ----------------- SHOPPING CART MANAGEMENT -----------------
function addToCart(productId, qty = 1) {
  const product = activeProducts.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    showToast('This product is currently out of stock.', 'error');
    return;
  }

  const existingIndex = state.cart.findIndex(i => i.productId === productId);
  if (existingIndex > -1) {
    const desiredTotal = state.cart[existingIndex].quantity + qty;
    if (desiredTotal > product.stock) {
      showToast(`Cannot add more. Only ${product.stock} units available in stock.`, 'error');
      return;
    }
    state.cart[existingIndex].quantity = desiredTotal;
  } else {
    if (qty > product.stock) {
      showToast(`Only ${product.stock} units available in stock.`, 'error');
      return;
    }
    state.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
      quantity: qty,
      maxStock: product.stock
    });
  }

  saveCart();
  renderCartDrawer();
  updateCartBadge();
  showToast(`Added "${product.name}" to cart!`);
}

function updateCartQuantity(productId, delta) {
  const index = state.cart.findIndex(i => i.productId === productId);
  if (index === -1) return;

  const item = state.cart[index];
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > item.maxStock) {
    showToast(`Maximum available stock reached (${item.maxStock}).`, 'error');
    return;
  }

  item.quantity = newQty;
  saveCart();
  renderCartDrawer();
  updateCartBadge();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.productId !== productId);
  saveCart();
  renderCartDrawer();
  updateCartBadge();
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderCartDrawer();
  updateCartBadge();
  showToast('Cart cleared.');
}

function saveCart() {
  localStorage.setItem('shopverse_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const count = state.cart.reduce((acc, item) => acc + item.quantity, 0);
  if (badge) {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('scale-0');
      badge.classList.add('scale-100');
    } else {
      badge.classList.remove('scale-100');
      badge.classList.add('scale-0');
    }
  }
  const drawerCount = document.getElementById('drawer-item-count');
  if (drawerCount) drawerCount.textContent = count;
}

function toggleCartDrawer(isOpen) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-drawer-backdrop');
  if (isOpen) {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  } else {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  }
}

function renderCartDrawer() {
  const list = document.getElementById('cart-drawer-items');
  const emptyState = document.getElementById('cart-drawer-empty');
  const footer = document.getElementById('cart-drawer-footer');
  const subtotalEl = document.getElementById('drawer-subtotal');
  if (!list) return;

  if (state.cart.length === 0) {
    list.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (footer) footer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (footer) footer.classList.remove('hidden');

  let subtotal = 0;
  list.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="py-3.5 flex items-center gap-3">
        <img src="${item.imageUrl}" alt="${item.name}" class="w-14 h-14 object-cover rounded-xl bg-slate-100 shrink-0">
        <div class="flex-1 min-w-0">
          <h4 class="text-xs font-bold text-slate-800 truncate">${item.name}</h4>
          <span class="text-xs font-extrabold text-indigo-600 block mt-0.5">$${item.price.toFixed(2)}</span>
          <div class="flex items-center gap-2 mt-1.5">
            <button onclick="updateCartQuantity(${item.productId}, -1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center text-slate-600">-</button>
            <span class="text-xs font-bold text-slate-800 w-4 text-center">${item.quantity}</span>
            <button onclick="updateCartQuantity(${item.productId}, 1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center text-slate-600">+</button>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-slate-900 block">$${itemTotal.toFixed(2)}</span>
          <button onclick="removeFromCart(${item.productId})" class="text-[11px] text-red-500 hover:text-red-700 mt-1">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
}

// ----------------- CHECKOUT WORKFLOW -----------------
function proceedToCheckout() {
  if (state.cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }
  toggleCartDrawer(false);
  showView('checkout');
}

function prepareCheckoutView() {
  if (state.user) {
    const nameInput = document.getElementById('cust-name');
    const emailInput = document.getElementById('cust-email');
    if (nameInput && !nameInput.value) nameInput.value = state.user.full_name || '';
    if (emailInput && !emailInput.value) emailInput.value = state.user.email || '';
  }
  renderCheckoutSummary();
}

function applyCheckoutPromo() {
  const input = document.getElementById('checkout-promo-input');
  const promoTag = document.getElementById('promo-applied-tag');
  if (!input) return;

  const code = input.value.trim().toUpperCase();
  if (code === 'SAVE10' || code === 'WELCOME10') {
    activePromoCode = code;
    promoTag.textContent = `Promo "${code}" applied (10% Discount)!`;
    promoTag.classList.remove('hidden');
    showToast('Promo code applied: 10% OFF!');
  } else if (code === 'FREESHIP') {
    activePromoCode = code;
    promoTag.textContent = `Promo "${code}" applied (Free Shipping)!`;
    promoTag.classList.remove('hidden');
    showToast('Free shipping coupon applied!');
  } else {
    showToast('Invalid promo code. Try SAVE10 or FREESHIP.', 'error');
    activePromoCode = null;
    promoTag.classList.add('hidden');
  }
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const list = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('co-subtotal');
  const discountRow = document.getElementById('co-discount-row');
  const discountEl = document.getElementById('co-discount');
  const taxEl = document.getElementById('co-tax');
  const shippingEl = document.getElementById('co-shipping');
  const totalEl = document.getElementById('co-total');
  if (!list) return;

  let subtotal = 0;
  list.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="py-2.5 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2.5">
          <img src="${item.imageUrl}" class="w-10 h-10 object-cover rounded-lg bg-slate-100">
          <div>
            <p class="font-bold text-slate-800 line-clamp-1">${item.name}</p>
            <span class="text-slate-400">Qty: ${item.quantity} × $${item.price.toFixed(2)}</span>
          </div>
        </div>
        <span class="font-bold text-slate-800">$${itemTotal.toFixed(2)}</span>
      </div>
    `;
  }).join('');

  // Discount calculation
  let discount = 0;
  if (activePromoCode === 'SAVE10' || activePromoCode === 'WELCOME10') {
    discount = subtotal * 0.10;
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * 0.05; // 5% tax

  let shipping = (subtotal >= 50.0 || activePromoCode === 'FREESHIP') ? 0.0 : 5.0;
  const total = Math.max(0, taxableAmount + tax + shipping);

  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (discount > 0) {
    discountRow.classList.remove('hidden');
    discountEl.textContent = `-$${discount.toFixed(2)}`;
  } else {
    discountRow.classList.add('hidden');
  }

  taxEl.textContent = `$${tax.toFixed(2)}`;
  shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  totalEl.textContent = `$${total.toFixed(2)}`;
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  if (state.cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  const submitBtn = document.getElementById('submit-order-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    <span>Processing Order...</span>
  `;

  const paymentMethodEl = document.querySelector('input[name="payment_method"]:checked');
  const payload = {
    customer_name: document.getElementById('cust-name').value.trim(),
    customer_email: document.getElementById('cust-email').value.trim(),
    customer_phone: document.getElementById('cust-phone').value.trim() || null,
    shipping_address: document.getElementById('cust-address').value.trim(),
    city: document.getElementById('cust-city').value.trim(),
    postal_code: document.getElementById('cust-postal').value.trim(),
    country: document.getElementById('cust-country').value,
    payment_method: paymentMethodEl ? paymentMethodEl.value : 'card',
    promo_code: activePromoCode,
    items: state.cart.map(i => ({
      product_id: i.productId,
      quantity: i.quantity
    }))
  };

  try {
    const order = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Reset Cart
    state.cart = [];
    saveCart();
    renderCartDrawer();
    updateCartBadge();
    loadProducts(); // Refresh stock in catalog

    // Display confirmation screen
    document.getElementById('success-order-num').textContent = order.order_number;
    document.getElementById('success-cust-name').textContent = order.customer_name;
    document.getElementById('success-total').textContent = `$${order.total_amount.toFixed(2)}`;
    
    document.getElementById('success-track-btn').onclick = () => {
      document.getElementById('track-search-input').value = order.order_number;
      showView('track');
      searchTracking();
    };

    showView('order-success');
    showToast('Order confirmed successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      <span>Place Order & Pay</span>
    `;
  }
}

// ----------------- AUTH MODAL LOGIC -----------------
function openAuthModal(tab = 'login') {
  setAuthTab(tab);
  document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('register-error').classList.add('hidden');
}

function setAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    loginTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    loginTab.classList.remove('text-slate-400');
    regTab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
    regTab.classList.add('text-slate-400');
  } else {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    regTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    regTab.classList.remove('text-slate-400');
    loginTab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
    loginTab.classList.add('text-slate-400');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    state.token = res.access_token;
    state.user = res.user;
    localStorage.setItem('shopverse_token', res.access_token);
    updateAuthUI();
    closeAuthModal();
    showToast(`Welcome back, ${res.user.full_name}!`);

    if (res.user.role === 'admin') {
      showView('admin');
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('register-error');
  errorEl.classList.add('hidden');

  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password, role })
    });

    state.token = res.access_token;
    state.user = res.user;
    localStorage.setItem('shopverse_token', res.access_token);
    updateAuthUI();
    closeAuthModal();
    showToast(`Account created! Welcome, ${res.user.full_name}!`);

    if (res.user.role === 'admin') {
      showView('admin');
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}
