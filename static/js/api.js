// ShopVerse - Central API & Client State Manager

const API_BASE = '';

const state = {
  user: null,
  token: localStorage.getItem('shopverse_token') || null,
  cart: JSON.parse(localStorage.getItem('shopverse_cart') || '[]'),
  currentCategory: 'All',
  searchQuery: '',
  sortBy: 'featured',
  inStockOnly: false
};

// Generic API Client with automatic JWT injection
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 204) {
      return null;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'An unexpected server error occurred.');
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// Global Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-xl transition-all ${
    type === 'success' ? 'bg-slate-900 border border-slate-700' : 
    type === 'error' ? 'bg-red-600' : 'bg-indigo-600'
  }`;

  const icon = type === 'success' ? 
    `<svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>` :
    type === 'error' ?
    `<svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>` :
    `<svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Check and restore user session from token
async function initAuth() {
  if (!state.token) {
    updateAuthUI();
    return;
  }
  try {
    const user = await apiFetch('/api/auth/me');
    state.user = user;
  } catch (err) {
    console.warn("Session expired or invalid token:", err);
    state.token = null;
    state.user = null;
    localStorage.removeItem('shopverse_token');
  }
  updateAuthUI();
}

// Update Navigation & Auth UI elements
function updateAuthUI() {
  const authSection = document.getElementById('auth-section');
  const navOrders = document.getElementById('nav-btn-orders');
  const navAdmin = document.getElementById('nav-btn-admin');
  const mobileOrders = document.getElementById('mobile-nav-orders');
  const mobileAdmin = document.getElementById('mobile-nav-admin');

  if (state.user) {
    // Logged in
    const roleBadge = state.user.role === 'admin' 
      ? `<span class="bg-purple-100 text-purple-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">Admin</span>`
      : `<span class="bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">Customer</span>`;

    authSection.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="hidden sm:flex flex-col text-right">
          <span class="text-xs font-bold text-slate-800 leading-tight">${state.user.full_name}</span>
          <div class="flex items-center justify-end gap-1 mt-0.5">${roleBadge}</div>
        </div>
        <button onclick="handleLogout()" title="Sign Out" class="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>
    `;

    if (navOrders) navOrders.classList.remove('hidden');
    if (mobileOrders) mobileOrders.classList.remove('hidden');

    if (state.user.role === 'admin') {
      if (navAdmin) navAdmin.classList.remove('hidden');
      if (mobileAdmin) mobileAdmin.classList.remove('hidden');
    } else {
      if (navAdmin) navAdmin.classList.add('hidden');
      if (mobileAdmin) mobileAdmin.classList.add('hidden');
    }
  } else {
    // Logged out
    authSection.innerHTML = `
      <button onclick="openAuthModal('login')" class="text-xs font-bold text-slate-700 hover:text-indigo-600 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 transition shadow-xs">
        Sign In
      </button>
    `;
    if (navOrders) navOrders.classList.add('hidden');
    if (mobileOrders) mobileOrders.classList.add('hidden');
    if (navAdmin) navAdmin.classList.add('hidden');
    if (mobileAdmin) mobileAdmin.classList.add('hidden');
  }
}

// Quick 1-click login for test reviewers
async function quickLogin(role) {
  const credentials = role === 'admin' 
    ? { email: 'admin@store.com', password: 'admin123' }
    : { email: 'user@store.com', password: 'user123' };

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    state.token = res.access_token;
    state.user = res.user;
    localStorage.setItem('shopverse_token', res.access_token);
    updateAuthUI();
    closeAuthModal();
    showToast(`Signed in as ${role === 'admin' ? 'Store Admin' : 'Customer'}!`);

    if (role === 'admin') {
      showView('admin');
    } else {
      showView('catalog');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('shopverse_token');
  updateAuthUI();
  showToast('Signed out successfully.');
  showView('catalog');
}
