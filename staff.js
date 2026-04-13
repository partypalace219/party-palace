// staff.js — Staff portal module
// Uses window.supabaseClient (set by supabase CDN plain script)
// Uses window.loadProducts, window.renderCatalog, window.renderServices (set by products.js)

const DB_PRODUCTS_URL = 'https://nsedpvrqhxcikhlieize.supabase.co/rest/v1/products';
const DB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g';
const DB_FETCH_HEADERS = { 'apikey': DB_ANON_KEY, 'Authorization': 'Bearer ' + DB_ANON_KEY };

let staffProducts = [];
let staffCurrentFilter = 'all';
let staffUser = null;
let staffPortalInitialized = false;
let staffSearchQuery = '';
let staffSortColumn = 'name';
let staffSortDirection = 'asc';
let staffSelectedIds = new Set();
let staffOrders = [];
let staffOrdersFilter = 'all';

function initStaffPortal() {
    if (staffPortalInitialized) return;
    staffPortalInitialized = true;

    // Login form
    const loginForm = document.getElementById('staff-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleStaffLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('staff-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleStaffLogout);
    }

    // Add product button
    const addBtn = document.getElementById('staff-add-product-btn');
    if (addBtn) {
        addBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openStaffProductModal();
        });
    }

    // Scan barcode button
    const scanBtn = document.getElementById('staff-scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openStaffScannerModal();
        });
    }

    // Product form
    const productForm = document.getElementById('staff-product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleStaffProductSubmit);
    }

    // Delete confirmation
    const deleteBtn = document.getElementById('staff-confirm-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleStaffDeleteProduct);
    }

    // Filter buttons - use delegation
    const filtersContainer = document.getElementById('staff-filters');
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.staff-filter-btn');
            if (btn) {
                document.querySelectorAll('.staff-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                staffCurrentFilter = btn.dataset.category;
                renderStaffProducts();
            }
        });
    }

    // Search input
    const searchInput = document.getElementById('staff-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            staffSearchQuery = e.target.value.toLowerCase().trim();
            renderStaffProducts();
        });
    }

    // Scanner: Start camera button
    const startCamBtn = document.getElementById('staff-start-camera');
    if (startCamBtn) {
        startCamBtn.addEventListener('click', startBarcodeCamera);
    }

    // Scanner: Stop camera button
    const stopCamBtn = document.getElementById('staff-stop-camera');
    if (stopCamBtn) {
        stopCamBtn.addEventListener('click', stopBarcodeCamera);
    }

    // Scanner: Manual lookup
    const lookupBtn = document.getElementById('staff-lookup-barcode');
    if (lookupBtn) {
        lookupBtn.addEventListener('click', function() {
            const barcode = document.getElementById('staff-manual-barcode').value.trim();
            if (barcode) {
                lookupBarcode(barcode);
            }
        });
    }

    // Scanner: Enter key on barcode input
    const barcodeInput = document.getElementById('staff-manual-barcode');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = this.value.trim();
                if (barcode) lookupBarcode(barcode);
            }
        });
    }

    // Scanner: Fill form from scanned product
    const fillBtn = document.getElementById('staff-fill-from-scan');
    if (fillBtn) {
        fillBtn.addEventListener('click', fillFormFromScan);
    }

    // Scanner: Add as new product (not found case)
    const addScannedBtn = document.getElementById('staff-add-scanned');
    if (addScannedBtn) {
        addScannedBtn.addEventListener('click', function() {
            const barcode = document.getElementById('staff-scan-result-barcode').textContent;
            closeStaffScannerModal();
            openStaffProductModal();
            document.getElementById('staff-product-name').value = '';
            document.getElementById('staff-product-description').value = 'Barcode: ' + barcode;
        });
    }

    // Check if already logged in
    checkStaffAuth();

    console.log('Staff portal initialized');
}

async function checkStaffAuth() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            staffUser = session.user;
            showStaffDashboard();
        }
    } catch (error) {
        console.log('Staff auth check:', error);
    }
}

async function handleStaffLogin(e) {
    e.preventDefault();
    const email = document.getElementById('staff-email').value;
    const password = document.getElementById('staff-password').value;
    const errorEl = document.getElementById('staff-login-error');

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        staffUser = data.user;
        errorEl.style.display = 'none';
        showStaffDashboard();
        showStaffToast('Welcome back!', 'success');
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    }
}

async function handleStaffLogout() {
    await window.supabaseClient.auth.signOut();
    staffUser = null;
    document.getElementById('staff-auth-section').style.display = 'block';
    document.getElementById('staff-dashboard-section').style.display = 'none';
    showStaffToast('Logged out successfully');
}

async function showStaffDashboard() {
    document.getElementById('staff-auth-section').style.display = 'none';
    document.getElementById('staff-dashboard-section').style.display = 'block';

    // Reset filter state
    staffCurrentFilter = 'all';

    // Update user info
    const email = staffUser?.email || 'Staff';
    const name = email.split('@')[0];
    document.getElementById('staff-user-name').textContent = name;
    document.getElementById('staff-user-email').textContent = email;

    // Load products, orders, and activity log
    await loadStaffProducts();
    await loadStaffOrders();
    await loadActivityLog();
    updateStaffStats();
    populateStaffFilters();
    renderStaffProducts();
    renderStaffOrders();
    updateSalesReports();
    renderActivityLog();
    buildCustomerList();
    renderCustomerList();
}

async function loadStaffProducts() {
    try {
        // Fetch without image_url first (avoids Supabase free-tier statement timeout)
        const { data: dbProducts, error } = await window.supabaseClient
            .from('products')
            .select('id,name,slug,category,price,cost,sale,discount_percent,description,emoji,featured');

        if (error) throw error;

        // Load products from Supabase
        staffProducts = dbProducts.map(p => {
            // Use productGalleryImages for known products, image_url loaded in background
            let image = null;
            if (typeof productGalleryImages !== 'undefined' && productGalleryImages[p.name]) {
                image = productGalleryImages[p.name][0];
            }
            return {
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price || 0,
                cost: p.cost || 0,
                description: p.description,
                emoji: p.emoji,
                featured: p.featured,
                sale: p.sale || false,
                discount_percent: p.discount_percent || null,
                image: image,
                image_url: null
            };
        });

        // Fetch image_url in background (20 at a time to avoid timeout)
        loadStaffProductImages();

    } catch (error) {
        console.error('Error loading staff products:', error);
        showStaffToast('Failed to load products', 'error');
    }
}

async function loadStaffProductImages() {
    const ids = staffProducts.map(p => p.id).filter(Boolean);
    const PAGE = 20;
    let anyUpdated = false;
    for (let i = 0; i < ids.length; i += PAGE) {
        const chunk = ids.slice(i, i + PAGE);
        try {
            const r = await fetch(`${DB_PRODUCTS_URL}?select=id,image_url&id=in.(${chunk.join(',')})`, { headers: DB_FETCH_HEADERS });
            if (!r.ok) continue;
            const batch = await r.json();
            if (!Array.isArray(batch)) continue;
            batch.forEach(row => {
                if (!row.image_url) return;
                const sp = staffProducts.find(p => p.id === row.id);
                if (sp && !sp.image) { sp.image = row.image_url; sp.image_url = row.image_url; anyUpdated = true; }
            });
        } catch (e) { /* continue */ }
        if (i + PAGE < ids.length) await new Promise(r => setTimeout(r, 200));
    }
    if (anyUpdated && typeof renderStaffProducts === 'function') renderStaffProducts();
}

function updateStaffStats() {
    document.getElementById('staff-total-products').textContent = staffProducts.length;

    // Count total products sold from orders
    const productsSold = staffOrders.reduce((sum, order) => {
        return sum + (order.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
    }, 0);
    document.getElementById('staff-products-sold').textContent = productsSold;

    const saleCount = staffProducts.filter(p => p.sale).length;
    document.getElementById('staff-on-sale').textContent = saleCount;

    const popularCount = staffProducts.filter(p => p.featured).length;
    document.getElementById('staff-popular-count').textContent = popularCount;

    // Profit calculations
    const totalRevenue = staffProducts.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalCost = staffProducts.reduce((sum, p) => sum + (p.cost || 0), 0);
    const productsWithCost = staffProducts.filter(p => p.cost > 0);
    const avgMargin = productsWithCost.length > 0
        ? (productsWithCost.reduce((sum, p) => sum + (((p.price - p.cost) / p.price) * 100), 0) / productsWithCost.length).toFixed(1)
        : 0;

    document.getElementById('staff-total-revenue').textContent = '$' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('staff-total-cost').textContent = '$' + totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('staff-products-need-cost').textContent = staffProducts.filter(p => !p.cost || p.cost === 0).length;
    document.getElementById('staff-profit-margin').textContent = avgMargin + '%';
}

function populateStaffFilters() {
    const filtersContainer = document.getElementById('staff-filters');
    const categories = [...new Set(staffProducts.map(p => p.category))].sort();

    filtersContainer.innerHTML = '<button class="staff-filter-btn active" data-category="all">ALL</button>';

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'staff-filter-btn';
        btn.dataset.category = cat;
        btn.textContent = cat.toUpperCase();
        filtersContainer.appendChild(btn);
    });
}

// ============================================
// ORDERS MANAGEMENT
// ============================================

async function loadStaffOrders() {
    try {
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        staffOrders = orders || [];
        console.log('Loaded', staffOrders.length, 'orders');
    } catch (error) {
        console.error('Error loading orders:', error);
        staffOrders = [];
    }
}

// Activity Log
let staffActivityLog = [];
let staffActivityFilter = 'all';

async function logActivity(action, entityType, entityId, entityName, details = null) {
    try {
        const userEmail = staffUser?.email || 'unknown';
        const { error } = await window.supabaseClient
            .from('activity_log')
            .insert([{
                action,
                entity_type: entityType,
                entity_id: entityId,
                entity_name: entityName,
                details,
                user_email: userEmail
            }]);

        if (error) {
            console.error('Error logging activity:', error);
            return;
        }

        // Refresh the activity log display
        await loadActivityLog();
        renderActivityLog();
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

async function loadActivityLog() {
    try {
        const { data: logs, error } = await window.supabaseClient
            .from('activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        staffActivityLog = logs || [];
    } catch (error) {
        console.error('Error loading activity log:', error);
        staffActivityLog = [];
    }
}

function renderActivityLog() {
    const container = document.getElementById('staff-activity-log');
    if (!container) return;

    let filteredLogs = staffActivityLog;
    if (staffActivityFilter !== 'all') {
        filteredLogs = staffActivityLog.filter(log => log.entity_type === staffActivityFilter);
    }

    if (filteredLogs.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-400); font-size: 0.875rem; text-align: center; padding: 2rem;">No activity recorded yet</p>';
        return;
    }

    container.innerHTML = filteredLogs.map(log => {
        const timeAgo = getTimeAgo(new Date(log.created_at));
        const actionIcon = getActionIcon(log.action);
        const actionColor = getActionColor(log.action);

        return `
            <div class="staff-activity-item">
                <div class="staff-activity-icon" style="background: ${actionColor}20; color: ${actionColor};">
                    ${actionIcon}
                </div>
                <div class="staff-activity-content">
                    <div class="staff-activity-text">
                        <strong>${log.action}</strong> ${log.entity_type}: ${log.entity_name || log.entity_id || 'Unknown'}
                        ${log.details ? `<span class="staff-activity-details">${log.details}</span>` : ''}
                    </div>
                    <div class="staff-activity-meta">
                        <span>${log.user_email}</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function getActionIcon(action) {
    const icons = {
        'Added': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        'Updated': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        'Deleted': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        'Status changed': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
        'New order': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>'
    };
    return icons[action] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';
}

function getActionColor(action) {
    const colors = {
        'Added': '#16a34a',
        'Updated': '#2563eb',
        'Deleted': '#dc2626',
        'Status changed': '#d97706',
        'New order': '#9333ea'
    };
    return colors[action] || '#6b7280';
}

function filterActivityLog() {
    const filter = document.getElementById('staff-activity-filter');
    staffActivityFilter = filter ? filter.value : 'all';
    renderActivityLog();
}
window.filterActivityLog = filterActivityLog;

// Customer List
let staffCustomers = [];
let staffCustomerSearch = '';

function buildCustomerList() {
    // Build customer list from orders
    const customerMap = {};

    staffOrders.forEach(order => {
        const email = order.customer_email;
        if (!email) return;

        if (!customerMap[email]) {
            customerMap[email] = {
                email: email,
                name: order.customer_name || 'Unknown',
                phone: order.customer_phone || '',
                orderCount: 0,
                totalSpent: 0,
                lastOrderDate: null
            };
        }

        customerMap[email].orderCount++;
        customerMap[email].totalSpent += parseFloat(order.total) || 0;

        // Keep name/phone from most recent order
        const orderDate = new Date(order.created_at);
        if (!customerMap[email].lastOrderDate || orderDate > customerMap[email].lastOrderDate) {
            customerMap[email].lastOrderDate = orderDate;
            if (order.customer_name) customerMap[email].name = order.customer_name;
            if (order.customer_phone) customerMap[email].phone = order.customer_phone;
        }
    });

    // Convert to array and sort by total spent
    staffCustomers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
}

function renderCustomerList() {
    const tbody = document.getElementById('staff-customers-body');
    const emptyState = document.getElementById('staff-customers-empty');
    const table = document.getElementById('staff-customers-table');
    const countEl = document.getElementById('staff-customers-count');

    if (!tbody) return;

    // Filter by search
    let filteredCustomers = staffCustomers;
    if (staffCustomerSearch) {
        const search = staffCustomerSearch.toLowerCase();
        filteredCustomers = staffCustomers.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search) ||
            (c.phone && c.phone.includes(search))
        );
    }

    if (countEl) {
        countEl.textContent = `${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`;
    }

    if (filteredCustomers.length === 0) {
        if (table) table.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = `<p>${staffCustomerSearch ? `No customers matching "${staffCustomerSearch}"` : 'No customers found'}</p>`;
        }
        return;
    }

    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = filteredCustomers.map(customer => `
        <tr>
            <td><strong>${customer.name}</strong></td>
            <td><a href="mailto:${customer.email}" style="color: var(--primary-color);">${customer.email}</a></td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.orderCount}</td>
            <td style="font-weight: 600; color: var(--emerald-600);">$${customer.totalSpent.toFixed(2)}</td>
            <td>${customer.lastOrderDate ? customer.lastOrderDate.toLocaleDateString() : '-'}</td>
        </tr>
    `).join('');
}

function searchCustomers() {
    const searchInput = document.getElementById('staff-customer-search');
    staffCustomerSearch = searchInput ? searchInput.value.toLowerCase() : '';
    renderCustomerList();
}
window.searchCustomers = searchCustomers;

function exportCustomersCSV() {
    if (staffCustomers.length === 0) {
        showStaffToast('No customers to export', 'error');
        return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Last Order'];
    const rows = staffCustomers.map(c => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        c.email || '',
        c.phone || '',
        c.orderCount,
        c.totalSpent.toFixed(2),
        c.lastOrderDate ? c.lastOrderDate.toLocaleDateString() : ''
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `party-palace-customers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showStaffToast(`Exported ${staffCustomers.length} customers to CSV`, 'success');
}
window.exportCustomersCSV = exportCustomersCSV;

function renderStaffOrders() {
    const tbody = document.getElementById('staff-orders-body');
    const emptyState = document.getElementById('staff-orders-empty');
    const table = document.getElementById('staff-orders-table');
    const resultsText = document.getElementById('staff-orders-results');

    if (!tbody) return;

    let filteredOrders = staffOrders;
    if (staffOrdersFilter !== 'all') {
        filteredOrders = staffOrders.filter(o => o.status === staffOrdersFilter);
    }

    if (filteredOrders.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        resultsText.textContent = staffOrdersFilter === 'all'
            ? 'No orders yet'
            : `No ${staffOrdersFilter} orders`;
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';
    resultsText.textContent = `Showing ${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''}`;

    tbody.innerHTML = filteredOrders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        const itemCount = order.items ? order.items.length : 0;
        const statusClass = getOrderStatusClass(order.status);
        const paymentClass = getPaymentStatusClass(order.payment_status);

        return `
            <tr>
                <td><strong>${order.order_number}</strong></td>
                <td>${date}</td>
                <td>
                    <div>${order.customer_name}</div>
                    <div style="font-size: 0.75rem; color: var(--gray-500);">${order.customer_email}</div>
                </td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td><strong>$${(order.total || 0).toFixed(2)}</strong></td>
                <td><span class="staff-status-badge ${paymentClass}">${(order.payment_status || 'unpaid').toUpperCase()}</span></td>
                <td><span class="staff-status-badge ${statusClass}">${(order.status || 'pending').toUpperCase()}</span></td>
                <td>
                    <div class="staff-actions-cell">
                        <button class="staff-action-btn" onclick="viewOrderDetail('${order.id}')" title="View">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="staff-action-btn" onclick="updateOrderStatus('${order.id}')" title="Update Status">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getOrderStatusClass(status) {
    const classes = {
        'pending': 'regular',
        'processing': 'new',
        'shipped': 'sale',
        'delivered': 'sale',
        'cancelled': 'regular'
    };
    return classes[status] || 'regular';
}

function getPaymentStatusClass(status) {
    const classes = {
        'unpaid': 'regular',
        'partial': 'new',
        'paid': 'sale',
        'refunded': 'regular'
    };
    return classes[status] || 'regular';
}

function filterOrders(status) {
    staffOrdersFilter = status;
    renderStaffOrders();
}
window.filterOrders = filterOrders;

function viewOrderDetail(orderId) {
    const order = staffOrders.find(o => o.id === orderId);
    if (!order) return;

    const date = new Date(order.created_at).toLocaleString();
    const items = order.items || [];

    const content = document.getElementById('staff-order-detail-content');
    content.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0;">Order ${order.order_number}</h4>
                <span class="staff-status-badge ${getOrderStatusClass(order.status)}">${(order.status || 'pending').toUpperCase()}</span>
            </div>
            <p style="color: var(--gray-500); font-size: 0.875rem; margin: 0;">${date}</p>
        </div>

        <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--gray-50); border-radius: 8px;">
            <h5 style="margin: 0 0 0.5rem; font-size: 0.875rem; color: var(--gray-500);">CUSTOMER</h5>
            <p style="margin: 0; font-weight: 600;">${order.customer_name}</p>
            <p style="margin: 0.25rem 0; font-size: 0.875rem;">${order.customer_email}</p>
            ${order.customer_phone ? `<p style="margin: 0.25rem 0; font-size: 0.875rem;">${order.customer_phone}</p>` : ''}
            ${order.shipping_address ? `<p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--gray-600);">${order.shipping_address}</p>` : ''}
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h5 style="margin: 0 0 0.75rem; font-size: 0.875rem; color: var(--gray-500);">ITEMS</h5>
            ${items.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-200);">
                    <span>${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
                    <span style="font-weight: 600;">$${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>

        <div style="padding: 1rem; background: var(--gray-100); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Subtotal</span>
                <span>$${(order.subtotal || 0).toFixed(2)}</span>
            </div>
            ${order.shipping > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Shipping</span>
                <span>$${order.shipping.toFixed(2)}</span>
            </div>` : ''}
            ${order.tax > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Tax</span>
                <span>$${order.tax.toFixed(2)}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.1rem; border-top: 2px solid var(--gray-300); padding-top: 0.5rem; margin-top: 0.5rem;">
                <span>Total</span>
                <span>$${(order.total || 0).toFixed(2)}</span>
            </div>
        </div>

        ${order.notes ? `
        <div style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border-radius: 8px;">
            <h5 style="margin: 0 0 0.5rem; font-size: 0.875rem; color: #92400e;">NOTES</h5>
            <p style="margin: 0; font-size: 0.875rem;">${order.notes}</p>
        </div>` : ''}

        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <select id="order-status-select" style="padding: 0.5rem; border: 1px solid var(--gray-300); border-radius: 6px;">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button class="btn btn-primary" onclick="saveOrderStatus('${order.id}')">Update Status</button>
        </div>
    `;

    document.getElementById('staff-order-modal-title').textContent = `Order ${order.order_number}`;
    openStaffModal('staff-order-modal');
}
window.viewOrderDetail = viewOrderDetail;

async function saveOrderStatus(orderId) {
    const newStatus = document.getElementById('order-status-select').value;
    const order = staffOrders.find(o => o.id === orderId);
    const orderNumber = order?.order_number || orderId;

    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        if (error) throw error;

        showStaffToast('Order status updated', 'success');
        closeStaffModal('staff-order-modal');

        // Log activity
        logActivity('Status changed', 'order', orderId, orderNumber, `Changed to ${newStatus}`);

        await loadStaffOrders();
        renderStaffOrders();
        updateSalesReports();
    } catch (error) {
        console.error('Error updating order:', error);
        showStaffToast('Error updating order: ' + error.message, 'error');
    }
}
window.saveOrderStatus = saveOrderStatus;

function updateOrderStatus(orderId) {
    viewOrderDetail(orderId);
}
window.updateOrderStatus = updateOrderStatus;

function exportOrdersCSV() {
    let orders = staffOrders;
    if (staffOrdersFilter !== 'all') {
        orders = staffOrders.filter(o => o.status === staffOrdersFilter);
    }

    if (orders.length === 0) {
        showStaffToast('No orders to export', 'error');
        return;
    }

    const headers = ['Order Number', 'Date', 'Customer Name', 'Email', 'Phone', 'Items', 'Subtotal', 'Shipping', 'Tax', 'Total', 'Payment Status', 'Order Status', 'Notes'];
    const rows = orders.map(o => {
        const itemsSummary = (o.items || []).map(i => `${i.name} x${i.quantity || 1}`).join('; ');
        return [
            o.order_number,
            new Date(o.created_at).toLocaleDateString(),
            `"${(o.customer_name || '').replace(/"/g, '""')}"`,
            o.customer_email || '',
            o.customer_phone || '',
            `"${itemsSummary.replace(/"/g, '""')}"`,
            (o.subtotal || 0).toFixed(2),
            (o.shipping || 0).toFixed(2),
            (o.tax || 0).toFixed(2),
            (o.total || 0).toFixed(2),
            o.payment_status || 'unpaid',
            o.status || 'pending',
            `"${(o.notes || '').replace(/"/g, '""')}"`
        ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `party-palace-orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showStaffToast(`Exported ${orders.length} orders to CSV`, 'success');
}
window.exportOrdersCSV = exportOrdersCSV;

function updateSalesReports() {
    const periodSelect = document.getElementById('staff-reports-period');
    const period = periodSelect ? periodSelect.value : '30';

    // Filter orders by time period
    let filteredOrders = staffOrders;
    if (period !== 'all') {
        const days = parseInt(period);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        filteredOrders = staffOrders.filter(o => new Date(o.created_at) >= cutoff);
    }

    // Calculate metrics - use amount_paid for actual revenue received
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.amount_paid) || parseFloat(o.total) || 0), 0);
    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Count unique customers by email
    const uniqueEmails = new Set(filteredOrders.map(o => o.customer_email).filter(Boolean));
    const customerCount = uniqueEmails.size;

    // Update UI
    const revenueEl = document.getElementById('staff-report-revenue');
    const ordersEl = document.getElementById('staff-report-orders');
    const avgEl = document.getElementById('staff-report-avg');
    const customersEl = document.getElementById('staff-report-customers');

    if (revenueEl) revenueEl.textContent = '$' + totalRevenue.toFixed(2);
    if (ordersEl) ordersEl.textContent = orderCount;
    if (avgEl) avgEl.textContent = '$' + avgOrderValue.toFixed(2);
    if (customersEl) customersEl.textContent = customerCount;

    // Calculate top selling items
    const itemCounts = {};
    filteredOrders.forEach(order => {
        (order.items || []).forEach(item => {
            const name = item.name || 'Unknown';
            const qty = item.quantity || 1;
            if (!itemCounts[name]) {
                itemCounts[name] = { name, quantity: 0, revenue: 0 };
            }
            itemCounts[name].quantity += qty;
            itemCounts[name].revenue += (item.price || 0) * qty;
        });
    });

    // Sort by quantity sold and get top 5
    const topItems = Object.values(itemCounts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    // Render top selling items
    const bestsellersListEl = document.getElementById('staff-bestsellers-list');
    if (bestsellersListEl) {
        if (topItems.length === 0) {
            bestsellersListEl.innerHTML = '<p style="color: var(--gray-400); font-size: 0.875rem;">No sales data yet</p>';
        } else {
            bestsellersListEl.innerHTML = topItems.map((item, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-200);">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="width: 24px; height: 24px; background: var(--gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: var(--gray-500);">${idx + 1}</span>
                        <span style="font-weight: 500;">${item.name}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="color: var(--gray-500); font-size: 0.875rem;">${item.quantity} sold</span>
                        <span style="font-weight: 600; color: var(--emerald-600);">$${item.revenue.toFixed(2)}</span>
                    </div>
                </div>
            `).join('');
        }
    }
}
window.updateSalesReports = updateSalesReports;

function renderStaffProducts() {
    const tbody = document.getElementById('staff-table-body');
    const emptyState = document.getElementById('staff-empty');
    const table = document.getElementById('staff-table');
    const resultsText = document.getElementById('staff-filter-results');
    const bulkActions = document.getElementById('staff-bulk-actions');
    const selectAllCheckbox = document.getElementById('staff-select-all');

    // Filter by category
    let filteredProducts = staffProducts;
    if (staffCurrentFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === staffCurrentFilter);
    }

    // Filter by search query
    if (staffSearchQuery) {
        filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(staffSearchQuery) ||
            p.category.toLowerCase().includes(staffSearchQuery) ||
            (p.description && p.description.toLowerCase().includes(staffSearchQuery))
        );
    }

    // Sort products
    filteredProducts = [...filteredProducts].sort((a, b) => {
        let aVal, bVal;
        switch (staffSortColumn) {
            case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
            case 'category': aVal = a.category.toLowerCase(); bVal = b.category.toLowerCase(); break;
            case 'cost': aVal = a.cost || 0; bVal = b.cost || 0; break;
            case 'price': aVal = a.price || 0; bVal = b.price || 0; break;
            case 'profit': aVal = (a.price || 0) - (a.cost || 0); bVal = (b.price || 0) - (b.cost || 0); break;
            default: aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase();
        }
        if (aVal < bVal) return staffSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return staffSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Update sort indicators in header
    document.querySelectorAll('.staff-table th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === staffSortColumn) {
            th.classList.add(staffSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });

    if (filteredProducts.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        resultsText.textContent = staffSearchQuery
            ? `No products matching "${staffSearchQuery}"`
            : (staffCurrentFilter === 'all' ? 'No products found' : `No products in ${staffCurrentFilter}`);
        if (bulkActions) bulkActions.style.display = 'none';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    let resultsLabel = `Showing ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`;
    if (staffCurrentFilter !== 'all') resultsLabel += ` in ${staffCurrentFilter}`;
    if (staffSearchQuery) resultsLabel += ` matching "${staffSearchQuery}"`;
    resultsText.textContent = resultsLabel;

    // Update bulk actions visibility
    updateBulkActionsUI();

    tbody.innerHTML = filteredProducts.map(product => {
        const profit = (product.price || 0) - (product.cost || 0);
        const profitClass = profit >= 0 ? 'positive' : 'negative';
        const statusTags = [];
        if (product.featured) statusTags.push('<span class="staff-status-badge new">POPULAR</span>');
        if (product.sale) statusTags.push('<span class="staff-status-badge sale">SALE</span>');
        if (statusTags.length === 0) statusTags.push('<span class="staff-status-badge regular">REGULAR</span>');
        const isSelected = staffSelectedIds.has(product.id);

        return `
            <tr class="${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
                <td><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleProductSelection('${product.id}')"></td>
                <td>
                    ${product.image
                        ? `<img src="${product.image}" alt="${product.name}" class="staff-table-thumb">`
                        : `<div class="staff-table-thumb-placeholder">${product.emoji || '📦'}</div>`
                    }
                </td>
                <td><strong style="cursor: pointer; text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.2s;" onmouseover="this.style.textDecorationColor='currentColor'" onmouseout="this.style.textDecorationColor='transparent'" onclick="editStaffProduct('${String(product.id).replace(/'/g, "\\'")}')">${product.name}</strong></td>
                <td><span class="staff-category-tag">${product.category}</span></td>
                <td class="staff-cost-cell">$${(product.cost || 0).toFixed(2)}</td>
                <td class="staff-price-cell">$${(product.price || 0).toFixed(2)}</td>
                <td class="staff-profit-cell ${profitClass}">$${profit.toFixed(2)}</td>
                <td>${statusTags.join(' ')}</td>
                <td>
                    <div class="staff-actions-cell">
                        <button class="staff-action-btn" onclick="editStaffProduct('${String(product.id).replace(/'/g, "\\'")}')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="staff-action-btn delete" onclick="confirmStaffDelete('${String(product.id).replace(/'/g, "\\'")}', '${product.name.replace(/'/g, "\\'")}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Update select all checkbox state
    if (selectAllCheckbox) {
        const visibleIds = filteredProducts.map(p => p.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every(id => staffSelectedIds.has(id));
        selectAllCheckbox.checked = allSelected;
    }
}

// Sort staff table
function sortStaffTable(column) {
    if (staffSortColumn === column) {
        staffSortDirection = staffSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        staffSortColumn = column;
        staffSortDirection = 'asc';
    }
    renderStaffProducts();
}
window.sortStaffTable = sortStaffTable;

// Toggle individual product selection
function toggleProductSelection(productId) {
    if (staffSelectedIds.has(productId)) {
        staffSelectedIds.delete(productId);
    } else {
        staffSelectedIds.add(productId);
    }
    renderStaffProducts();
}
window.toggleProductSelection = toggleProductSelection;

// Toggle select all
function toggleSelectAll(checkbox) {
    const visibleProducts = getFilteredProducts();
    if (checkbox.checked) {
        visibleProducts.forEach(p => staffSelectedIds.add(p.id));
    } else {
        visibleProducts.forEach(p => staffSelectedIds.delete(p.id));
    }
    renderStaffProducts();
}
window.toggleSelectAll = toggleSelectAll;

// Get currently filtered products
function getFilteredProducts() {
    let filtered = staffProducts;
    if (staffCurrentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === staffCurrentFilter);
    }
    if (staffSearchQuery) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(staffSearchQuery) ||
            p.category.toLowerCase().includes(staffSearchQuery)
        );
    }
    return filtered;
}

// Update bulk actions UI
function updateBulkActionsUI() {
    const bulkActions = document.getElementById('staff-bulk-actions');
    const selectedCount = document.getElementById('staff-selected-count');
    if (bulkActions && selectedCount) {
        if (staffSelectedIds.size > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = `${staffSelectedIds.size} selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

// Clear selection
function clearSelection() {
    staffSelectedIds.clear();
    renderStaffProducts();
}
window.clearSelection = clearSelection;

// Bulk delete selected products
async function bulkDeleteSelected() {
    if (staffSelectedIds.size === 0) return;

    const count = staffSelectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} product${count > 1 ? 's' : ''}? This cannot be undone.`)) {
        return;
    }

    try {
        const idsToDelete = Array.from(staffSelectedIds);
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .in('id', idsToDelete);

        if (error) throw error;

        showStaffToast(`Deleted ${count} product${count > 1 ? 's' : ''}`, 'success');

        // Log activity
        logActivity('Deleted', 'product', 'bulk', `${count} products`, `Bulk deleted ${count} items`);

        staffSelectedIds.clear();
        await loadStaffProducts();
        updateStaffStats();
        populateStaffFilters();
        renderStaffProducts();
        if (typeof window.loadProducts === 'function') await window.loadProducts(true);
    } catch (error) {
        console.error('Bulk delete error:', error);
        showStaffToast('Error deleting products: ' + error.message, 'error');
    }
}
window.bulkDeleteSelected = bulkDeleteSelected;

// Export products to CSV
function exportProductsCSV() {
    const products = getFilteredProducts();
    if (products.length === 0) {
        showStaffToast('No products to export', 'error');
        return;
    }

    const headers = ['Name', 'Category', 'Price', 'Cost', 'Profit', 'Profit Margin', 'Popular', 'On Sale', 'Description'];
    const rows = products.map(p => {
        const profit = (p.price || 0) - (p.cost || 0);
        const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(1) + '%' : '0%';
        return [
            `"${(p.name || '').replace(/"/g, '""')}"`,
            p.category || '',
            (p.price || 0).toFixed(2),
            (p.cost || 0).toFixed(2),
            profit.toFixed(2),
            margin,
            p.featured ? 'Yes' : 'No',
            p.sale ? 'Yes' : 'No',
            `"${(p.description || '').replace(/"/g, '""')}"`
        ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `party-palace-products-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showStaffToast(`Exported ${products.length} products to CSV`, 'success');
}
window.exportProductsCSV = exportProductsCSV;

// Staff Modal Functions
function openStaffModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeStaffModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;

function toggleDiscountField() {
    const saleCheckbox = document.getElementById('staff-product-sale');
    const discountGroup = document.getElementById('staff-discount-group');
    if (discountGroup) {
        discountGroup.style.display = saleCheckbox.checked ? 'block' : 'none';
    }
}
window.toggleDiscountField = toggleDiscountField;

function openStaffProductModal(product = null) {
    const form = document.getElementById('staff-product-form');
    const title = document.getElementById('staff-modal-title');

    form.reset();
    removeStaffImage();

    if (product) {
        title.textContent = 'Edit Product';
        staffEditingProductId = product.id;
        document.getElementById('staff-product-id').value = product.id;
        document.getElementById('staff-product-name').value = product.name;
        document.getElementById('staff-product-category').value = product.category;
        document.getElementById('staff-product-price').value = product.price;
        document.getElementById('staff-product-cost').value = product.cost > 0 ? product.cost : '';
        document.getElementById('staff-product-description').value = product.description || '';
        document.getElementById('staff-product-emoji').value = product.emoji || '';
        document.getElementById('staff-product-image').value = product.image_url || product.image || '';
        document.getElementById('staff-product-featured').checked = product.featured;
        document.getElementById('staff-product-sale').checked = product.sale;
        document.getElementById('staff-product-discount').value = product.discount_percent || '';
    } else {
        title.textContent = 'Add New Product';
        staffEditingProductId = null;
        document.getElementById('staff-product-id').value = '';
        document.getElementById('staff-product-discount').value = '';
    }

    // Show/hide discount field based on sale checkbox
    toggleDiscountField();

    openStaffModal('staff-product-modal');
}
window.openStaffProductModal = openStaffProductModal;

function editStaffProduct(id) {
    const product = staffProducts.find(p => String(p.id) === String(id));
    if (product) {
        openStaffProductModal(product);
    } else {
        showStaffToast('Product not found', 'error');
    }
}
window.editStaffProduct = editStaffProduct;

function confirmStaffDelete(id, name) {
    document.getElementById('staff-delete-id').value = id;
    document.getElementById('staff-delete-name').textContent = name;
    openStaffModal('staff-delete-modal');
}
window.confirmStaffDelete = confirmStaffDelete;

let staffEditingProductId = null;

let staffProductSubmitting = false;
async function handleStaffProductSubmit(e) {
    e.preventDefault();
    if (staffProductSubmitting) return;
    staffProductSubmitting = true;

    const submitBtn = e.target.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    const id = staffEditingProductId;
    const isEditing = id != null;

    const name = document.getElementById('staff-product-name').value;
    const discountValue = document.getElementById('staff-product-discount').value;
    const productData = {
        name: name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        category: document.getElementById('staff-product-category').value,
        price: parseFloat(document.getElementById('staff-product-price').value) || 0,
        cost: parseFloat(document.getElementById('staff-product-cost').value) || 0,
        sale: document.getElementById('staff-product-sale').checked,
        discount_percent: discountValue ? parseInt(discountValue) : null,
        description: document.getElementById('staff-product-description').value,
        emoji: document.getElementById('staff-product-emoji').value,
        featured: document.getElementById('staff-product-featured').checked,
        image_url: document.getElementById('staff-product-image').value || null
    };

    try {
        if (isEditing) {
            // Update existing product
            const { data, error } = await window.supabaseClient
                .from('products')
                .update(productData)
                .eq('id', id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                // Update matched no rows — likely an RLS policy issue
                showStaffToast('Update blocked — go to Supabase > Authentication > Policies and add an UPDATE policy for the products table', 'error');
                return;
            }
        } else {
            // Insert new product
            const { data, error } = await window.supabaseClient
                .from('products')
                .insert(productData)
                .select();

            if (error) throw error;
        }

        staffEditingProductId = null;
        showStaffToast(isEditing ? 'Product updated!' : 'Product added!', 'success');
        closeStaffModal('staff-product-modal');

        // Log activity
        logActivity(isEditing ? 'Updated' : 'Added', 'product', id || 'new', productData.name);

        await loadStaffProducts();
        updateStaffStats();
        populateStaffFilters();
        renderStaffProducts();

        // Reload main site products without re-initializing the app (stay on staff page)
        if (typeof window.loadProducts === 'function') await window.loadProducts(true);
        if (typeof window.renderCatalog === 'function') window.renderCatalog();
        if (typeof window.renderServices === 'function') window.renderServices();
    } catch (error) {
        console.error('Error saving product:', error);
        showStaffToast('Error: ' + error.message, 'error');
    } finally {
        staffProductSubmitting = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Product'; }
    }
}
window.handleStaffProductSubmit = handleStaffProductSubmit;

async function handleStaffDeleteProduct() {
    const id = document.getElementById('staff-delete-id').value;
    const productName = document.getElementById('staff-delete-name')?.textContent || 'Unknown';

    if (!id) {
        showStaffToast('No product selected for deletion', 'error');
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        closeStaffModal('staff-delete-modal');
        showStaffToast('Product deleted', 'success');

        // Log activity
        logActivity('Deleted', 'product', id, productName);

        await loadStaffProducts();
        updateStaffStats();
        populateStaffFilters();
        renderStaffProducts();

        // Reload main site products without re-initializing the app (stay on staff page)
        if (typeof window.loadProducts === 'function') await window.loadProducts(true);
        if (typeof window.renderCatalog === 'function') window.renderCatalog();
        if (typeof window.renderServices === 'function') window.renderServices();
    } catch (error) {
        console.error('Error deleting product:', error);
        showStaffToast('Failed to delete product', 'error');
    }
}
window.handleStaffDeleteProduct = handleStaffDeleteProduct;

function showStaffToast(message, type = '') {
    const container = document.getElementById('staff-toast-container');
    const toast = document.createElement('div');
    toast.className = `staff-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Staff Image Upload Functions
function switchStaffImageTab(tab) {
    document.querySelectorAll('.staff-image-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.staff-image-panel').forEach(p => p.classList.remove('active'));

    document.querySelector(`.staff-image-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`staff-${tab}-panel`).classList.add('active');
}
window.switchStaffImageTab = switchStaffImageTab;

function handleStaffFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showStaffToast('Please select an image file', 'error');
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = async (e) => {
        document.getElementById('staff-preview-img').src = e.target.result;
        document.getElementById('staff-upload-preview').style.display = 'block';
        document.getElementById('staff-upload-placeholder').style.display = 'none';

        // Upload to Supabase Storage via direct REST API with auth token
        showStaffToast('Uploading image...', '');
        try {
            const { data: sessionData } = await window.supabaseClient.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) throw new Error('Not authenticated — please log out and log back in');

            const fileName = `product-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const uploadUrl = `https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/product-images/${fileName}`;

            const res = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'apikey': DB_ANON_KEY,
                    'x-upsert': 'true',
                    'Content-Type': file.type
                },
                body: file
            });

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`Upload failed (${res.status}): ${errBody}`);
            }

            const publicUrl = `https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/${fileName}`;
            document.getElementById('staff-product-image').value = publicUrl;
            showStaffToast('Image uploaded!', 'success');
        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            showStaffToast('Upload failed: ' + uploadError.message, 'error');
            document.getElementById('staff-product-image').value = e.target.result;
        }
    };
    reader.readAsDataURL(file);
}
window.handleStaffFileSelect = handleStaffFileSelect;

function removeStaffImage() {
    document.getElementById('staff-preview-img').src = '';
    document.getElementById('staff-upload-preview').style.display = 'none';
    document.getElementById('staff-upload-placeholder').style.display = 'flex';
    document.getElementById('staff-file-input').value = '';
    document.getElementById('staff-product-image').value = '';
}
window.removeStaffImage = removeStaffImage;

// Setup drag and drop for file upload
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('staff-file-upload');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                document.getElementById('staff-file-input').files = e.dataTransfer.files;
                handleStaffFileSelect({ target: { files: e.dataTransfer.files } });
            }
        });
    }
});

// ============================================
// BARCODE SCANNER FUNCTIONS
// ============================================

let scannerStream = null;
let scannerInterval = null;
let lastScannedBarcode = null;
let lastScannedProductData = null;

function openStaffScannerModal() {
    // Reset scanner state
    resetScannerUI();
    openStaffModal('staff-scanner-modal');
    // Auto-focus the barcode input so physical scanners work immediately
    setTimeout(() => {
        document.getElementById('staff-manual-barcode').focus();
    }, 100);
}
window.openStaffScannerModal = openStaffScannerModal;

function closeStaffScannerModal() {
    stopBarcodeCamera();
    closeStaffModal('staff-scanner-modal');
}
window.closeStaffScannerModal = closeStaffScannerModal;

function resetScannerUI() {
    document.getElementById('staff-manual-barcode').value = '';
    document.getElementById('staff-scan-loading').style.display = 'none';
    document.getElementById('staff-scan-found').style.display = 'none';
    document.getElementById('staff-scan-notfound').style.display = 'none';
    lastScannedBarcode = null;
    lastScannedProductData = null;
}

async function startBarcodeCamera() {
    const container = document.getElementById('staff-camera-container');
    const placeholder = document.getElementById('staff-camera-placeholder');
    const stopBtn = document.getElementById('staff-stop-camera');
    const video = document.getElementById('staff-camera-video');
    const status = document.getElementById('staff-camera-status');

    try {
        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        video.srcObject = scannerStream;
        await video.play();

        container.style.display = 'block';
        placeholder.style.display = 'none';
        stopBtn.style.display = 'block';
        status.textContent = 'Scanning...';

        // Use BarcodeDetector API if available (Chrome/Edge)
        if ('BarcodeDetector' in window) {
            const detector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf']
            });

            scannerInterval = setInterval(async () => {
                try {
                    const barcodes = await detector.detect(video);
                    if (barcodes.length > 0) {
                        const barcode = barcodes[0].rawValue;
                        status.textContent = 'Found: ' + barcode;
                        document.getElementById('staff-manual-barcode').value = barcode;
                        stopBarcodeCamera();
                        lookupBarcode(barcode);
                    }
                } catch (err) {
                    // Detection frame error, continue scanning
                }
            }, 300);
        } else {
            // Fallback: no BarcodeDetector support
            status.textContent = 'Camera active — BarcodeDetector not supported in this browser. Please enter barcode manually.';
        }

    } catch (err) {
        console.error('Camera error:', err);
        showStaffToast('Could not access camera: ' + err.message, 'error');
    }
}
window.startBarcodeCamera = startBarcodeCamera;

function stopBarcodeCamera() {
    const container = document.getElementById('staff-camera-container');
    const placeholder = document.getElementById('staff-camera-placeholder');
    const stopBtn = document.getElementById('staff-stop-camera');
    const video = document.getElementById('staff-camera-video');

    if (scannerInterval) {
        clearInterval(scannerInterval);
        scannerInterval = null;
    }

    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }

    video.srcObject = null;
    container.style.display = 'none';
    placeholder.style.display = 'block';
    stopBtn.style.display = 'none';
}

async function lookupBarcode(barcode) {
    lastScannedBarcode = barcode;
    lastScannedProductData = null;

    // Show loading, hide results
    document.getElementById('staff-scan-loading').style.display = 'block';
    document.getElementById('staff-scan-found').style.display = 'none';
    document.getElementById('staff-scan-notfound').style.display = 'none';

    // 1. Check existing inventory first
    const localMatch = staffProducts.find(p =>
        p.name && p.name.toLowerCase().includes(barcode.toLowerCase())
    );

    if (localMatch) {
        lastScannedProductData = {
            name: localMatch.name,
            brand: 'Already in inventory',
            category: localMatch.category,
            price: localMatch.price,
            description: localMatch.description || '',
            image: localMatch.image || null,
            emoji: localMatch.emoji || '',
            barcode: barcode,
            source: 'inventory'
        };
        showScanResult(lastScannedProductData);
        return;
    }

    // 2. Try Open Food Facts API (free, no key needed)
    try {
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
        if (offResponse.ok) {
            const offData = await offResponse.json();
            if (offData.status === 1 && offData.product) {
                const p = offData.product;
                lastScannedProductData = {
                    name: p.product_name || p.product_name_en || '',
                    brand: p.brands || '',
                    category: guessCategory(p.categories_tags || [], p.product_name || ''),
                    price: 0,
                    description: buildDescription(p),
                    image: p.image_front_url || p.image_url || null,
                    emoji: '',
                    barcode: barcode,
                    source: 'openfoodfacts'
                };
                showScanResult(lastScannedProductData);
                return;
            }
        }
    } catch (err) {
        console.log('Open Food Facts lookup failed:', err);
    }

    // 3. Try UPC ItemDB (free tier)
    try {
        const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`);
        if (upcResponse.ok) {
            const upcData = await upcResponse.json();
            if (upcData.items && upcData.items.length > 0) {
                const item = upcData.items[0];
                lastScannedProductData = {
                    name: item.title || '',
                    brand: item.brand || '',
                    category: guessCategory([], item.title || ''),
                    price: item.lowest_recorded_price || item.highest_recorded_price || 0,
                    description: item.description || '',
                    image: (item.images && item.images.length > 0) ? item.images[0] : null,
                    emoji: '',
                    barcode: barcode,
                    source: 'upcitemdb'
                };
                showScanResult(lastScannedProductData);
                return;
            }
        }
    } catch (err) {
        console.log('UPC ItemDB lookup failed:', err);
    }

    // 4. Nothing found
    document.getElementById('staff-scan-loading').style.display = 'none';
    document.getElementById('staff-scan-result-barcode').textContent = barcode;
    document.getElementById('staff-scan-notfound').style.display = 'block';
}
window.lookupBarcode = lookupBarcode;

function guessCategory(tags, name) {
    const text = (tags.join(' ') + ' ' + name).toLowerCase();
    if (text.includes('balloon') || text.includes('party') || text.includes('decor')) return 'arches';
    if (text.includes('centerpiece') || text.includes('vase') || text.includes('flower')) return 'centerpieces';
    if (text.includes('column') || text.includes('pillar')) return 'columns';
    if (text.includes('wall') || text.includes('backdrop')) return 'walls';
    if (text.includes('rental') || text.includes('tent') || text.includes('chair')) return 'rentals';
    if (text.includes('engrav') || text.includes('wood') || text.includes('laser')) return 'engraving';
    if (text.includes('3d') || text.includes('print') || text.includes('lithophane')) return 'prints3d';
    return '';
}

function buildDescription(product) {
    const parts = [];
    if (product.brands) parts.push('Brand: ' + product.brands);
    if (product.quantity) parts.push('Size: ' + product.quantity);
    if (product.categories) parts.push('Type: ' + product.categories.split(',').slice(0, 2).join(', '));
    return parts.join(' | ');
}

function showScanResult(data) {
    document.getElementById('staff-scan-loading').style.display = 'none';

    const foundEl = document.getElementById('staff-scan-found');
    const imgEl = document.getElementById('staff-scan-found-img');
    const nameEl = document.getElementById('staff-scan-found-name');
    const brandEl = document.getElementById('staff-scan-found-brand');
    const barcodeEl = document.getElementById('staff-scan-found-barcode');
    const detailsEl = document.getElementById('staff-scan-found-details');

    nameEl.textContent = data.name || 'Unknown Product';
    brandEl.textContent = data.brand || '';
    barcodeEl.textContent = 'Barcode: ' + data.barcode;

    if (data.image) {
        imgEl.src = data.image;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }

    // Build detail chips
    let detailsHtml = '';
    if (data.category) {
        detailsHtml += `<div style="background: var(--gray-700); padding: 4px 8px; border-radius: 4px;"><span style="color: var(--gray-400);">Category:</span> <span style="color: var(--gray-200);">${data.category}</span></div>`;
    }
    if (data.price) {
        detailsHtml += `<div style="background: var(--gray-700); padding: 4px 8px; border-radius: 4px;"><span style="color: var(--gray-400);">Price:</span> <span style="color: var(--gray-200);">$${parseFloat(data.price).toFixed(2)}</span></div>`;
    }
    if (data.source === 'inventory') {
        detailsHtml += `<div style="background: rgba(34,197,94,0.13); padding: 4px 8px; border-radius: 4px; color: #22c55e;">Already in inventory</div>`;
    } else {
        detailsHtml += `<div style="background: rgba(0,102,255,0.13); padding: 4px 8px; border-radius: 4px; color: #0066FF;">From: ${data.source}</div>`;
    }
    detailsEl.innerHTML = detailsHtml;

    foundEl.style.display = 'block';
}

function fillFormFromScan() {
    if (!lastScannedProductData) return;

    const data = lastScannedProductData;
    closeStaffScannerModal();
    openStaffProductModal();

    // Auto-fill all form fields from the scanned data
    if (data.name) {
        document.getElementById('staff-product-name').value = data.name;
    }
    if (data.category) {
        document.getElementById('staff-product-category').value = data.category;
    }
    if (data.price) {
        document.getElementById('staff-product-price').value = parseFloat(data.price).toFixed(2);
    }
    if (data.description) {
        document.getElementById('staff-product-description').value = data.description;
    }
    if (data.emoji) {
        document.getElementById('staff-product-emoji').value = data.emoji;
    }
    if (data.image) {
        document.getElementById('staff-product-image').value = data.image;
    }

    showStaffToast('Form filled from barcode scan', 'success');
}
window.fillFormFromScan = fillFormFromScan;

// ============================================
// STAFF PORTAL EXPORTS
// ============================================
window.handleStaffLogin = handleStaffLogin;
window.handleStaffLogout = handleStaffLogout;

export { initStaffPortal };
