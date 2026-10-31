// ShopVerse - Admin Dashboard, Product CRUD, and Order Management

let adminProductsList = [];

async function loadAdminDashboard() {
  if (!state.user || state.user.role !== 'admin') {
    showToast('Admin authorization required.', 'error');
    showView('catalog');
    return;
  }

  try {
    const stats = await apiFetch('/api/admin/stats');
    
    document.getElementById('stat-revenue').textContent = `$${stats.total_revenue.toFixed(2)}`;
    document.getElementById('stat-orders').textContent = stats.total_orders;
    document.getElementById('stat-products').textContent = stats.total_products;
    
    const lowStockEl = document.getElementById('stat-low-stock');
    lowStockEl.textContent = stats.low_stock_count;
    if (stats.low_stock_count > 0) {
      lowStockEl.classList.add('text-red-600');
    } else {
      lowStockEl.classList.remove('text-red-600');
    }

    await loadAdminProducts();
    await loadAdminOrders();
  } catch (err) {
    showToast(`Failed to load admin metrics: ${err.message}`, 'error');
  }
}

function switchAdminTab(tab) {
  const prodTab = document.getElementById('admin-tab-products');
  const orderTab = document.getElementById('admin-tab-orders');
  const prodBtn = document.getElementById('admin-tab-btn-products');
  const orderBtn = document.getElementById('admin-tab-btn-orders');

  if (tab === 'products') {
    prodTab.classList.remove('hidden');
    orderTab.classList.add('hidden');
    prodBtn.className = 'pb-3 text-indigo-600 border-b-2 border-indigo-600 transition font-semibold text-sm';
    orderBtn.className = 'pb-3 text-slate-500 hover:text-slate-800 transition font-semibold text-sm';
  } else {
    prodTab.classList.add('hidden');
    orderTab.classList.remove('hidden');
    orderBtn.className = 'pb-3 text-indigo-600 border-b-2 border-indigo-600 transition font-semibold text-sm';
    prodBtn.className = 'pb-3 text-slate-500 hover:text-slate-800 transition font-semibold text-sm';
  }
}

// ----------------- ADMIN PRODUCTS MANAGEMENT -----------------
async function loadAdminProducts() {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  try {
    const products = await apiFetch('/api/products?limit=100');
    adminProductsList = products;

    tbody.innerHTML = products.map(prod => {
      const isLowStock = prod.stock <= 5;
      const stockBadge = prod.stock === 0
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">Out of Stock (0)</span>`
        : isLowStock
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">Low Stock (${prod.stock})</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">In Stock (${prod.stock})</span>`;

      return `
        <tr class="hover:bg-slate-50/70 transition">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <img src="${prod.image_url}" alt="${prod.name}" class="w-10 h-10 object-cover rounded-xl bg-slate-100 shrink-0">
              <div class="min-w-0">
                <span class="font-bold text-slate-900 block truncate max-w-xs">${prod.name}</span>
                <span class="text-[11px] text-slate-400">ID: #${prod.id}</span>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-xs font-semibold text-slate-600">${prod.category}</td>
          <td class="py-3 px-4 font-bold text-slate-900 text-xs">$${prod.price.toFixed(2)}</td>
          <td class="py-3 px-4">${stockBadge}</td>
          <td class="py-3 px-4 text-xs font-bold text-amber-500">★ ${prod.rating || 4.5}</td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="openProductModal(${prod.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
              <button onclick="handleDeleteProduct(${prod.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Failed to load admin products:", err);
  }
}

function openProductModal(productId = null) {
  const modal = document.getElementById('admin-product-modal');
  const title = document.getElementById('admin-product-modal-title');
  const form = document.getElementById('admin-product-form');
  form.reset();

  if (productId) {
    const prod = adminProductsList.find(p => p.id === productId);
    if (!prod) return;
    title.textContent = 'Edit Product Details';
    document.getElementById('admin-prod-id').value = prod.id;
    document.getElementById('admin-prod-name').value = prod.name;
    document.getElementById('admin-prod-price').value = prod.price;
    document.getElementById('admin-prod-stock').value = prod.stock;
    document.getElementById('admin-prod-cat').value = prod.category;
    document.getElementById('admin-prod-img').value = prod.image_url;
    document.getElementById('admin-prod-desc').value = prod.description;
    document.getElementById('admin-prod-featured').checked = !!prod.is_featured;
  } else {
    title.textContent = 'Add New Product';
    document.getElementById('admin-prod-id').value = '';
  }

  modal.classList.remove('hidden');
}

function closeAdminProductModal() {
  document.getElementById('admin-product-modal').classList.add('hidden');
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const prodId = document.getElementById('admin-prod-id').value;

  const payload = {
    name: document.getElementById('admin-prod-name').value.trim(),
    price: parseFloat(document.getElementById('admin-prod-price').value),
    stock: parseInt(document.getElementById('admin-prod-stock').value, 10),
    category: document.getElementById('admin-prod-cat').value.trim(),
    image_url: document.getElementById('admin-prod-img').value.trim(),
    description: document.getElementById('admin-prod-desc').value.trim(),
    is_featured: document.getElementById('admin-prod-featured').checked
  };

  try {
    if (prodId) {
      await apiFetch(`/api/products/${prodId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Product updated successfully!');
    } else {
      await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('New product added to catalog!');
    }

    closeAdminProductModal();
    await loadAdminProducts();
    await loadCategories();
    loadProducts(); // Sync catalog view
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
    return;
  }

  try {
    await apiFetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });
    showToast('Product deleted.');
    await loadAdminProducts();
    await loadCategories();
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------- ADMIN ORDERS MANAGEMENT -----------------
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-tbody');
  const filter = document.getElementById('admin-order-status-filter');
  if (!tbody) return;

  const statusParam = (filter && filter.value !== 'All') ? `?status_filter=${filter.value}` : '';

  try {
    const orders = await apiFetch(`/api/orders${statusParam}`);

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 text-xs">No orders found for this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });

      const statuses = ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];

      const options = statuses.map(s => `
        <option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>
      `).join('');

      return `
        <tr class="hover:bg-slate-50/70 transition">
          <td class="py-3 px-4">
            <span class="font-mono font-bold text-slate-900 text-xs block">${order.order_number}</span>
            <button onclick="document.getElementById('track-search-input').value = '${order.order_number}'; showView('track'); searchTracking('${order.order_number}');" class="text-[11px] text-indigo-600 hover:underline">
              Inspect Milestones
            </button>
          </td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900 text-xs block">${order.customer_name}</span>
            <span class="text-[11px] text-slate-400 block">${order.customer_email}</span>
          </td>
          <td class="py-3 px-4">
            <span class="font-bold text-slate-900 text-xs block">$${order.total_amount.toFixed(2)}</span>
            <span class="text-[11px] text-slate-400 block">${order.items.length} item(s)</span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-500">${orderDate}</td>
          <td class="py-3 px-4">
            <select 
              onchange="handleAdminStatusChange(${order.id}, this.value)"
              class="text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getStatusSelectColor(order.status)}"
            >
              ${options}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Failed to load admin orders:", err);
  }
}

function getStatusSelectColor(status) {
  switch (status) {
    case 'Pending': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Processing': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'Shipped': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'Out for Delivery': return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'Delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Cancelled': return 'bg-rose-50 text-rose-800 border-rose-200';
    default: return 'bg-slate-50 text-slate-800';
  }
}

async function handleAdminStatusChange(orderId, newStatus) {
  try {
    await apiFetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: newStatus,
        note: `Order status updated to ${newStatus} by store administrator.`
      })
    });
    showToast(`Order status updated to "${newStatus}"!`);
    loadAdminOrders();
    loadAdminDashboard();
  } catch (err) {
    showToast(`Status update failed: ${err.message}`, 'error');
  }
}
