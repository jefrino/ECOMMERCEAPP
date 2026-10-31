// ShopVerse - Order Tracking and Customer Order History

const ORDER_STAGES = ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered"];

async function searchTracking(explicitRef) {
  const input = document.getElementById('track-search-input');
  const ref = explicitRef || (input ? input.value.trim() : '');

  const resultCard = document.getElementById('tracking-result-card');
  const notFoundCard = document.getElementById('tracking-not-found');

  if (!ref) {
    showToast('Please enter an order number or ID to track.', 'error');
    return;
  }

  try {
    const order = await apiFetch(`/api/orders/track/${encodeURIComponent(ref)}`);
    renderTrackingDetails(order);
    resultCard.classList.remove('hidden');
    notFoundCard.classList.add('hidden');
  } catch (err) {
    resultCard.classList.add('hidden');
    notFoundCard.classList.remove('hidden');
  }
}

function renderTrackingDetails(order) {
  document.getElementById('track-order-num').textContent = order.order_number;
  
  const placedDate = new Date(order.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('track-placed-date').textContent = `Placed on ${placedDate}`;

  // Status Pill
  const pill = document.getElementById('track-status-pill');
  pill.textContent = order.status;
  pill.className = getStatusPillClass(order.status);

  // Stepper Visual Progress
  renderTrackingStepper(order.status);

  // Checkpoints Activity Timeline
  const milestoneList = document.getElementById('tracking-milestone-list');
  const history = order.status_history || [];
  
  if (history.length === 0) {
    milestoneList.innerHTML = `<p class="text-xs text-slate-400 italic">No tracking updates recorded yet.</p>`;
  } else {
    milestoneList.innerHTML = history.slice().reverse().map(item => `
      <div class="flex items-start gap-3 text-xs">
        <div class="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1 shrink-0 ring-4 ring-indigo-50"></div>
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold text-slate-800">${item.status}</span>
            <span class="text-slate-400">•</span>
            <span class="text-slate-500 font-medium">${item.timestamp}</span>
          </div>
          <p class="text-slate-600 mt-0.5 leading-relaxed">${item.note || 'Status updated.'}</p>
        </div>
      </div>
    `).join('');
  }

  // Items List
  const itemsContainer = document.getElementById('track-items-list');
  itemsContainer.innerHTML = order.items.map(item => `
    <div class="flex items-center gap-3 text-xs py-1.5">
      <img src="${item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}" class="w-10 h-10 object-cover rounded-lg bg-slate-100 shrink-0">
      <div class="flex-1 min-w-0">
        <p class="font-bold text-slate-800 truncate">${item.product_name}</p>
        <span class="text-slate-400">Qty: ${item.quantity} × $${item.price.toFixed(2)}</span>
      </div>
      <span class="font-bold text-slate-800 shrink-0">$${item.total_price.toFixed(2)}</span>
    </div>
  `).join('');

  // Shipping & Payment Details
  document.getElementById('track-recipient').textContent = `${order.customer_name} (${order.customer_email})`;
  document.getElementById('track-address').textContent = `${order.shipping_address}, ${order.city}, ${order.postal_code}, ${order.country}`;
  document.getElementById('track-payment').textContent = `${order.payment_method.toUpperCase()} (${order.payment_status})`;
  document.getElementById('track-total').textContent = `$${order.total_amount.toFixed(2)}`;
}

function renderTrackingStepper(currentStatus) {
  const container = document.getElementById('tracking-steps-container');
  if (!container) return;

  if (currentStatus === 'Cancelled') {
    container.innerHTML = `
      <div class="col-span-5 bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-center font-bold">
        This order has been cancelled.
      </div>
    `;
    return;
  }

  const currentIndex = ORDER_STAGES.indexOf(currentStatus);

  container.innerHTML = ORDER_STAGES.map((stage, idx) => {
    const isCompleted = idx <= currentIndex;
    const isCurrent = idx === currentIndex;

    return `
      <div class="step-item ${isCompleted ? 'completed' : ''} flex flex-col items-center">
        <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-colors ${
          isCurrent 
            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md' 
            : isCompleted 
            ? 'bg-indigo-600 text-white' 
            : 'bg-slate-200 text-slate-500'
        }">
          ${isCompleted ? '✓' : idx + 1}
        </div>
        <span class="mt-2 font-bold text-[11px] ${isCompleted ? 'text-slate-800' : 'text-slate-400'}">${stage}</span>
      </div>
    `;
  }).join('');
}

function getStatusPillClass(status) {
  switch (status) {
    case 'Pending':
      return 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800';
    case 'Processing':
      return 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800';
    case 'Shipped':
      return 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800';
    case 'Out for Delivery':
      return 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800';
    case 'Delivered':
      return 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800';
    case 'Cancelled':
      return 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800';
    default:
      return 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800';
  }
}

// ----------------- CUSTOMER MY ORDERS VIEW -----------------
async function loadUserOrders() {
  if (!state.user) {
    showToast('Please sign in to view your orders.', 'error');
    openAuthModal('login');
    return;
  }

  const container = document.getElementById('user-orders-list');
  const emptyState = document.getElementById('user-orders-empty');
  if (!container) return;

  try {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <svg class="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <p class="text-xs font-semibold">Retrieving your orders...</p>
      </div>
    `;

    const orders = await apiFetch('/api/orders/my-orders');

    if (!orders || orders.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    container.innerHTML = orders.map(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });

      return `
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-slate-900 text-sm">${order.order_number}</span>
                <span class="${getStatusPillClass(order.status)}">${order.status}</span>
              </div>
              <span class="text-xs text-slate-400 block mt-1">Ordered on ${orderDate}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-base font-extrabold text-slate-900">$${order.total_amount.toFixed(2)}</span>
              <button 
                onclick="document.getElementById('track-search-input').value = '${order.order_number}'; showView('track'); searchTracking('${order.order_number}');" 
                class="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs transition"
              >
                Track Live
              </button>
            </div>
          </div>

          <!-- Items Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${order.items.map(item => `
              <div class="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <img src="${item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}" class="w-9 h-9 object-cover rounded-lg bg-white shrink-0">
                <div class="min-w-0 flex-1">
                  <p class="font-bold text-xs text-slate-800 truncate">${item.product_name}</p>
                  <p class="text-[11px] text-slate-500">Qty: ${item.quantity} × $${item.price.toFixed(2)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}
