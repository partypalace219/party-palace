// products.js — Product data loading, rendering, filtering, navigation, catalog
import { cart, addToCart, saveCart, updateCartCount } from './cart.js';

// Product Data
// Products will be loaded from Supabase — exported as mutable const array (never reassigned)
export const products = [];

// Fetch products from Supabase on page load
// Two-phase: phase 1 fetches all metadata (fast), phase 2 fetches image_url in background
const DB_PRODUCTS_URL = 'https://nsedpvrqhxcikhlieize.supabase.co/rest/v1/products';
const DB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g';
const DB_FETCH_HEADERS = { 'apikey': DB_ANON_KEY, 'Authorization': 'Bearer ' + DB_ANON_KEY };

export async function loadProducts(skipInit) {
    try {
        // Phase 1: fetch all columns EXCEPT image_url (avoids statement timeout)
        const cols = 'id,name,slug,category,price,sale,emoji,featured,price_label,description,size,material';
        const response = await fetch(`${DB_PRODUCTS_URL}?select=${cols}&limit=500`, { headers: DB_FETCH_HEADERS });

        if (!response.ok) throw new Error('Supabase error: ' + response.status);
        const dbProducts = await response.json();
        if (!Array.isArray(dbProducts)) throw new Error('Unexpected response: ' + JSON.stringify(dbProducts).slice(0, 100));

        // Transform database products to match app format (in-place mutation)
        products.length = 0;
        products.push(...dbProducts.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            category: p.category,
            price: p.price,
            priceLabel: p.price_label,
            description: p.description,
            icon: p.emoji,
            popular: p.featured,
            sale: p.sale || false,
            image_url: null,
            size: p.size,
            material: p.material,
            hasGallery: true
        })));

        // Attach images from productGalleryImages if available
        products.forEach(product => {
            if (typeof productGalleryImages !== 'undefined') {
                const images = productGalleryImages[product.name];
                if (images && images.length > 0) {
                    product.images = images;
                }
            }
        });

        console.log('Loaded', products.length, 'products from Supabase');

        // Render immediately with what we have (images may be emoji fallbacks for now)
        renderDynamicProducts();
        if (!skipInit) {
            // Dynamic import to break the circular dependency: products.js -> ui.js
            const { initializeApp } = await import('./ui.js');
            initializeApp();
        }

        // Phase 2 (background): fetch image_url in chunks of 20 using ID filter
        loadProductImages();

    } catch (error) {
        console.error('Error loading products from Supabase:', error);
        products.length = 0;
        if (!skipInit) {
            const { initializeApp } = await import('./ui.js');
            initializeApp();
        }
    }
}

// Fetch image_url for all products in the background (20 at a time to avoid timeout)
async function loadProductImages() {
    const ids = products.map(p => p.id).filter(Boolean);
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
                const product = products.find(p => p.id === row.id);
                if (product && !product.images?.length) {
                    product.image_url = row.image_url;
                    product.images = [row.image_url];
                    anyUpdated = true;
                }
            });
        } catch (e) { /* continue on error */ }
        if (i + PAGE < ids.length) await new Promise(r => setTimeout(r, 200));
    }

    // Re-render sections that needed images
    if (anyUpdated) {
        renderDynamicProducts();
        if (typeof renderCatalog === 'function') renderCatalog();
    }
}

// Dynamically append products from Supabase that aren't already in the static HTML
export function renderDynamicProducts() {
    renderDynamicEngravingProducts();
    renderDynamicPrints3dProducts();
}

export function renderDynamicEngravingProducts() {
    const grid = document.getElementById('engravingGrid');
    if (!grid) return;

    // Clear grid entirely -- all engraving products come from Supabase
    grid.innerHTML = '';

    const engravingProducts = products.filter(p => p.category === 'engraving' && p.slug);

    engravingProducts.forEach(product => {
        const slug = product.slug;
        const image = product.images ? product.images[0] : '';
        const icon = product.icon || '🪵';
        const material = product.material || 'Wood';
        const size = product.size || '';

        let priceHtml = '';
        if (product.tieredPricing && product.tieredPricing.length > 0) {
            const tiers = product.tieredPricing.map(t =>
                `<div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;"><span>${t.label}:</span><span style="font-weight: 600;">${t.price}</span></div>`
            ).join('');
            priceHtml = `
                <div style="margin-bottom: 0.75rem; font-size: 0.85rem; background: var(--gray-50); padding: 0.75rem; border-radius: 6px;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--gray-800);">Pricing:</div>
                    ${tiers}
                </div>`;
        } else {
            priceHtml = `<div class="product-price" style="margin-top: auto;">$${(product.price || 0).toFixed(2)}</div>`;
        }

        const card = document.createElement('div');
        card.className = 'product-card engraving-product';
        card.dataset.material = material;
        card.style.cssText = 'display: flex; flex-direction: column;';
        card.innerHTML = `
            <div class="product-image" style="background: var(--gray-100); overflow: hidden; cursor: pointer; position: relative;" onclick="navigateToProduct('${slug}')">
                ${image ? `<img src="" alt="" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${icon}</span>';">` : `<span>${icon}</span>`}
                ${product.sale ? '<div class="product-badge sale-badge">Sale</div>' : ''}
                ${product.popular ? '<div class="product-badge popular-badge">Popular</div>' : ''}
            </div>
            <div class="product-info" style="flex: 1; display: flex; flex-direction: column;">
                <div class="product-name" style="cursor: pointer;" onclick="navigateToProduct('${slug}')"></div>
                <div class="product-description"></div>
                ${size ? `<div style="margin: 0.5rem 0; font-size: 0.9rem; color: var(--gray-600);"><strong>Size:</strong> ${size}</div>` : ''}
                ${priceHtml}
                <button onclick="navigateToProduct('${slug}')" class="btn btn-primary" style="width: 100%; margin-top: auto;">View Details</button>
            </div>`;
        card.querySelector('.product-name').textContent = product.name;
        card.querySelector('.product-description').textContent = product.description || '';
        const imgEl1 = card.querySelector('.product-image img');
        if (imgEl1) { imgEl1.src = image; imgEl1.alt = product.name; }
        grid.appendChild(card);
    });
}

export function renderDynamicPrints3dProducts() {
    const grid = document.getElementById('prints3dGrid');
    if (!grid) return;

    // Clear grid entirely -- all 3D prints products come from Supabase
    grid.innerHTML = '';

    const prints3dProducts = products.filter(p => p.category === 'prints3d' && p.slug);

    prints3dProducts.forEach(product => {
        const slug = product.slug;
        const image = product.images ? product.images[0] : '';
        const icon = product.icon || '🖨️';
        const subcategory = product.material || 'Other';

        const card = document.createElement('div');
        card.className = 'product-card prints3d-product';
        card.dataset.category = subcategory;
        card.style.cssText = 'display: flex; flex-direction: column;';
        card.innerHTML = `
            <div class="product-image" style="background: var(--gray-100); overflow: hidden; cursor: pointer; position: relative;" onclick="navigateToProduct('${slug}')">
                ${image ? `<img src="" alt="" loading="lazy" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${icon}</span>';">` : `<span>${icon}</span>`}
                ${product.sale ? '<div class="product-badge sale-badge">Sale</div>' : ''}
                ${product.popular ? '<div class="product-badge popular-badge">Popular</div>' : ''}
            </div>
            <div class="product-info" style="flex: 1; display: flex; flex-direction: column;">
                <div class="product-name" style="cursor: pointer;" onclick="navigateToProduct('${slug}')"></div>
                <div class="product-description"></div>
                <div class="product-price" style="margin-top: auto;">$${(product.price || 0).toFixed(2)}</div>
                <button onclick="navigateToProduct('${slug}')" class="btn btn-primary add-to-cart-btn" style="width: 100%;">View Details</button>
            </div>`;
        card.querySelector('.product-name').textContent = product.name;
        card.querySelector('.product-description').textContent = product.description || '';
        const imgEl2 = card.querySelector('.product-image img');
        if (imgEl2) { imgEl2.src = image; imgEl2.alt = product.name; }
        grid.appendChild(card);
    });
}

export const gradients = {
    arches: 'linear-gradient(135deg, #667eea, #764ba2)',
    columns: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    walls: 'linear-gradient(135deg, #fa709a, #fee140)',
    centerpieces: 'linear-gradient(135deg, #f093fb, #f5576c)',
    services: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    engraving: 'linear-gradient(135deg, #8B4513, #D2691E)',
    prints3d: 'linear-gradient(135deg, #00d2ff, #3a7bd5)'
};
export const categoryLabels = {
    arches: 'Arches',
    columns: 'Columns',
    walls: 'Walls',
    centerpieces: 'Centerpieces',
    services: 'Services',
    engraving: 'Engraving',
    prints3d: '3D Prints'
};

let currentFilter = 'all';

// Product Card HTML
export function createProductCard(product, isService = false) {
    // Generate product slug for URL
    const productSlug = product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check if product has real images
    const hasImages = product.images && product.images.length > 0;
    const hasSecondImage = product.images && product.images.length > 1;
    const imageContent = hasImages
        ? `<img src="${product.images[0]}" alt="${product.name}" loading="lazy" class="primary-image" style="width: 100%; height: 100%; object-fit: contain; object-position: center;">${hasSecondImage ? `<img src="${product.images[1]}" alt="${product.name} alternate view" loading="lazy" class="secondary-image">` : ''}`
        : `<span>${product.icon}</span>`;
    const imageStyle = hasImages
        ? 'background: var(--gray-50);'
        : `background: ${gradients[product.category]}`;
    const imageClass = hasSecondImage ? 'has-secondary' : '';

    return `
        <div class="product-card product-card-clickable" onclick="navigateToProduct('${productSlug}')" data-product-slug="${productSlug}">
            <div class="product-image ${imageClass}" style="${imageStyle}">
                ${imageContent}
                ${product.sale ? '<div class="product-badge sale-badge">Sale</div>' : ''}
                ${product.popular ? '<div class="product-badge popular-badge">Popular</div>' : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${isService ? 'Service' : categoryLabels[product.category]}</div>
                <div class="product-name" data-product-name></div>
                <div class="product-description" data-product-desc></div>
                <div class="product-price">
                    <span class="product-price-label">Starting at</span>
                    <span class="product-price-amount">$${product.price}</span>
                </div>
                ${['arches', 'columns', 'walls', 'centerpieces'].includes(product.category) ? `
                <button onclick="event.stopPropagation(); bookConsultation('${product.name}', ${product.price})" class="btn btn-primary" style="width: 100%">
                    Book Free Consultation
                </button>
                ` : `
                <button onclick="event.stopPropagation(); addToCart('${product.name}')" class="btn btn-primary" style="width: 100%">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    Add to Cart
                </button>
                `}
                <button onclick="event.stopPropagation(); navigateToProduct('${productSlug}')" class="btn btn-outline" style="width: 100%; margin-top: 0.5rem;">View Details</button>
            </div>
        </div>
    `;
}

// Navigate to individual product page
export function navigateToProduct(slug) {
    const product = getProductBySlug(slug);
    if (product) {
        renderProductDetail(product);
        window.navigate('product', true, 'product-' + slug);
    }
}

// Book consultation - navigate to contact page with product info pre-filled
export function bookConsultation(productName, productPrice) {
    // Store selected product info for the contact form
    window.consultationProduct = {
        name: productName,
        price: productPrice
    };

    // Navigate to contact page and select the Party Decor form
    window.navigate('contact');

    // Wait for page to load, then select Party Decor and pre-fill info
    setTimeout(() => {
        selectContactService('partyDecor');

        // Show the selected product banner
        const banner = document.getElementById('selectedProductBanner');
        const nameEl = document.getElementById('selectedProductName');
        const priceEl = document.getElementById('selectedProductPrice');

        if (banner && nameEl && priceEl) {
            nameEl.textContent = productName;
            priceEl.textContent = `$${productPrice}`;
            banner.style.display = 'block';
        }

        // Pre-fill the message with product info
        const messageEl = document.getElementById('contactMessage');
        if (messageEl) {
            messageEl.value = `I'm interested in booking a consultation for: ${productName} (Starting at $${productPrice})\n\nPlease contact me to discuss my event details.`;
        }
    }, 150);
}

// Get product by slug
export function getProductBySlug(slug) {
    return products.find(p => {
        const productSlug = p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return productSlug === slug;
    });
}

// Get category back link
function getCategoryPage(category) {
    const partyDecorCategories = ['arches', 'columns', 'walls', 'centerpieces'];
    if (partyDecorCategories.includes(category)) return 'partydecor';
    if (category === 'services') return 'services';
    if (category === 'engraving') return 'engraving';
    if (category === 'prints3d') return 'prints3d';
    return 'home';
}

// Render product detail page
export function renderProductDetail(product) {
    const container = document.getElementById('productDetailContent');
    if (!container || !product) return;

    const hasImages = product.images && product.images.length > 0;
    const gradient = gradients[product.category] || 'linear-gradient(135deg, #667eea, #764ba2)';
    const backPage = getCategoryPage(product.category);

    // Get back label based on category
    const backLabels = {
        'partydecor': 'Party Decor',
        'services': 'Services',
        'engraving': 'Engraving',
        'home': 'Home'
    };
    const backLabel = backLabels[backPage] || 'Home';

    // Generate main image (clickable to open lightbox)
    const mainImage = hasImages
        ? `<img src="${product.images[0]}" alt="" id="productMainImage" loading="lazy" onclick="openProductLightbox(0)" style="cursor: pointer;">`
        : `<div class="placeholder" style="background: ${gradient}">${product.icon}</div>`;

    // Store current product images for lightbox
    window.currentProductImages = hasImages ? product.images.map((img, idx) => ({
        url: img,
        title: product.name,
        category: categoryLabels[product.category] || product.category
    })) : [];

    // Generate thumbnails (also clickable)
    let thumbnailsHtml = '';
    if (hasImages && product.images.length > 1) {
        thumbnailsHtml = `<div class="product-detail-thumbnails">
            ${product.images.map((img, idx) => `
                <div class="product-detail-thumb ${idx === 0 ? 'active' : ''}" onclick="changeProductImage('${img}', this, ${idx})">
                    <img src="${img}" alt="${product.name} ${idx + 1}" loading="lazy">
                </div>
            `).join('')}
        </div>`;
    }

    // Generate features based on category
    const features = getProductFeatures(product);

    container.innerHTML = `
        <div class="product-detail-header">
            <button class="product-detail-back" onclick="navigate('${backPage}')">
                ← Back to ${backLabel}
            </button>
        </div>

        <div class="product-detail-content">
            <div class="product-detail-gallery">
                <div class="product-detail-main-image" style="${!hasImages ? 'background: ' + gradient : ''}">
                    ${mainImage}
                </div>
                ${thumbnailsHtml}
            </div>

            <div class="product-detail-info">
                <span class="product-detail-category">${categoryLabels[product.category] || product.category}</span>
                ${product.sale ? '<span style="display: inline-block; background: #059669; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">Sale</span>' : ''}
                ${product.popular ? '<span style="display: inline-block; background: var(--red-accent); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem; margin-left: 0.5rem;">Popular</span>' : ''}
                <h1 class="product-detail-title"></h1>
                <div class="product-detail-price">
                    <span class="label">${product.category === 'engraving' ? 'Price' : 'Starting at'}</span>
                    <span class="amount">$${product.price}</span>
                </div>
                <p class="product-detail-description"></p>
                ${(product.category === 'prints3d' || product.category === 'engraving') ? '<span class="product-detail-processing">🕐 Processing: 3-10 business days</span>' : ''}

                ${features}

                ${product.category === 'engraving' ? `
                <div class="product-detail-cta">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Material</label>
                        <div style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; background-color: #f9fafb; color: #374151;">
                            ${product.material || 'Wood'}
                        </div>
                        <input type="hidden" id="detailEngravingMaterial" value="${product.material || 'Wood'}">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Special Instructions</label>
                        <textarea id="detailEngravingInstructions" placeholder="Enter any text, names, dates, or design requests..." rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; resize: vertical;"></textarea>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Quantity</label>
                        <input type="number" id="detailEngravingQty" value="1" min="1" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                    </div>
                    ${product.tieredPricing ? `
                    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <p style="font-weight: 600; margin-bottom: 0.5rem; color: #166534;">Bulk Pricing:</p>
                        <ul style="margin: 0; padding-left: 1.5rem; color: #166534;">
                            <li>1 item: $39.99 each</li>
                            <li>2-5 items: $36.99 each</li>
                            <li>6-10 items: $30.99 each</li>
                            <li>11+ items: Contact for pricing</li>
                        </ul>
                    </div>
                    ` : ''}
                    <button onclick="addEngravingToCartFromDetail('${product.name}', ${product.price}, '${product.slug}')" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        Add to Cart
                    </button>
                </div>
                ` : ['arches', 'columns', 'walls', 'centerpieces'].includes(product.category) ? `
                <div class="product-detail-cta">
                    <button onclick="bookConsultation('${product.name}', ${product.price})" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%;">
                        Book Free Consultation
                    </button>
                </div>
                ` : `
                <div class="product-detail-cta">
                    <button onclick="addToCart('${product.name}')" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        Add to Cart
                    </button>
                    <button onclick="bookConsultation('${product.name}', ${product.price})" class="btn btn-outline" style="margin-top: 0.75rem;">
                        Book Free Consultation
                    </button>
                </div>
                `}
            </div>
        </div>
    `;
    container.querySelector('.product-detail-title').textContent = product.name;
    container.querySelector('.product-detail-description').textContent = product.description || '';
    const detailImg = container.querySelector('#productMainImage');
    if (detailImg) detailImg.alt = product.name;
}

// Change main product image (for thumbnail clicks)
export function changeProductImage(src, thumb, index) {
    const mainImg = document.getElementById('productMainImage');
    if (mainImg) {
        mainImg.src = src;
        // Update the onclick to open lightbox at the correct index
        mainImg.onclick = () => openProductLightbox(index || 0);
    }
    // Update active thumbnail
    document.querySelectorAll('.product-detail-thumb').forEach(t => t.classList.remove('active'));
    if (thumb) thumb.classList.add('active');
}

// Get product features based on category
function getProductFeatures(product) {
    const featuresByCategory = {
        arches: ['Custom color combinations', 'Indoor or outdoor setup', 'Professional installation included', 'Same-day setup available'],
        columns: ['Matching pairs available', 'Height customization', 'LED lighting options', 'Themed decorations'],
        walls: ['Custom sizes available', 'Photo-ready backdrop', 'Delivery and setup included', 'Perfect for events of any size'],
        centerpieces: ['Table-ready arrangements', 'Color matching available', 'Bulk discounts for large orders', 'Custom themes welcome'],
        services: ['Professional consultation', 'Full setup and teardown', 'Custom design options', 'Satisfaction guaranteed'],
        engraving: ['Custom text and designs', 'Bulk order discounts available', 'Perfect for gifts and events'],
        prints3d: ['High-quality 3D printed', 'Custom colors available', 'Ships within 3-10 business days', 'Perfect for home decor and gifts']
    };

    const categoryFeatures = featuresByCategory[product.category] || featuresByCategory.services;

    return `
        <div class="product-detail-features">
            <h4>What's Included</h4>
            <ul>
                ${categoryFeatures.map(f => `<li>${f}</li>`).join('')}
            </ul>
        </div>
    `;
}

// Render Catalog
export function renderCatalog() {
    const partyDecorCategories = ['arches', 'columns', 'walls', 'centerpieces'];
    let filtered = currentFilter === 'all'
        ? products.filter(p => partyDecorCategories.includes(p.category))
        : products.filter(p => p.category === currentFilter);

    // Sort popular items first (by price high to low) when viewing all products
    if (currentFilter === 'all') {
        const popularItems = filtered.filter(p => p.popular).sort((a, b) => b.price - a.price);
        const otherItems = filtered.filter(p => !p.popular);
        filtered = [...popularItems, ...otherItems];
    }

    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = filtered.map(p => createProductCard(p)).join('');
    productsGrid.querySelectorAll('[data-product-name]').forEach((el, i) => {
        el.textContent = filtered[i].name;
    });
    productsGrid.querySelectorAll('[data-product-desc]').forEach((el, i) => {
        el.textContent = filtered[i].description || '';
    });
}

// Render Services
export function renderServices() {
    const services = products.filter(p => p.category === 'services');
    const servicesGrid = document.getElementById('servicesGrid');
    servicesGrid.innerHTML = services.map(p => createProductCard(p, true)).join('');
    servicesGrid.querySelectorAll('[data-product-name]').forEach((el, i) => {
        el.textContent = services[i].name;
    });
    servicesGrid.querySelectorAll('[data-product-desc]').forEach((el, i) => {
        el.textContent = services[i].description || '';
    });
}

// Filter Products
export function filterProducts(category) {
    currentFilter = category;

    // Update filter buttons
    document.querySelectorAll('#catalogFilterButtons .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    renderCatalog();
}

// Filter Engraving Products by Material
export function filterEngravingProducts(material) {
    // Update filter buttons
    document.querySelectorAll('#engravingFilterButtons .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.material === material);
    });

    // Show/hide products based on material
    document.querySelectorAll('#engravingGrid .engraving-product').forEach(product => {
        const productMaterials = product.dataset.material.split(',');
        if (material === 'all' || productMaterials.includes(material)) {
            product.style.display = 'flex';
        } else {
            product.style.display = 'none';
        }
    });
}

// Filter 3D Prints by Category
export function filter3DProducts(category) {
    // Update filter buttons
    document.querySelectorAll('#prints3dFilterButtons .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    // Show/hide products based on category
    document.querySelectorAll('#prints3dGrid .prints3d-product').forEach(product => {
        const productCategories = product.dataset.category.split(',');
        if (category === 'all' || productCategories.includes(category)) {
            product.style.display = 'flex';
        } else {
            product.style.display = 'none';
        }
    });
}

// Inquire Product
function inquireProduct(productName) {
    window.navigate('contact');
    setTimeout(() => {
        document.getElementById('contactMessage').value = `I'm interested in getting a quote for: ${productName}`;
    }, 100);
}

// Format Phone
export function formatPhone(input) {
    let value = input.value.replace(/\D/g, '').slice(0, 10);
    if (value.length > 0) {
        if (value.length <= 3) {
            value = '(' + value;
        } else if (value.length <= 6) {
            value = '(' + value.slice(0, 3) + ') ' + value.slice(3);
        } else {
            value = '(' + value.slice(0, 3) + ') ' + value.slice(3, 6) + '-' + value.slice(6);
        }
    }
    input.value = value;
}

// Contact page service selection
export function selectContactService(service) {
    const partyDecorCard = document.getElementById('partyDecorCard');
    const customOrderCard = document.getElementById('customOrderCard');
    const partyDecorForm = document.getElementById('partyDecorForm');
    const customOrderForm = document.getElementById('customOrderForm');

    if (service === 'partyDecor') {
        // Style party decor card as selected
        partyDecorCard.style.border = '3px solid var(--primary)';
        partyDecorCard.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25))';
        partyDecorCard.querySelector('h3').style.color = 'var(--primary)';
        partyDecorCard.querySelector('span').style.display = 'inline-block';

        // Style custom order card as unselected
        customOrderCard.style.border = '3px solid var(--gray-300)';
        customOrderCard.style.background = 'white';
        customOrderCard.querySelector('h3').style.color = 'var(--gray-700)';
        customOrderCard.querySelector('span').style.display = 'none';

        // Show/hide forms
        partyDecorForm.style.display = 'block';
        customOrderForm.style.display = 'none';
    } else {
        // Style custom order card as selected
        customOrderCard.style.border = '3px solid var(--primary)';
        customOrderCard.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25))';
        customOrderCard.querySelector('h3').style.color = 'var(--primary)';
        customOrderCard.querySelector('span').style.display = 'inline-block';

        // Style party decor card as unselected
        partyDecorCard.style.border = '3px solid var(--gray-300)';
        partyDecorCard.style.background = 'white';
        partyDecorCard.querySelector('h3').style.color = 'var(--gray-700)';
        partyDecorCard.querySelector('span').style.display = 'none';

        // Show/hide forms
        partyDecorForm.style.display = 'none';
        customOrderForm.style.display = 'block';
    }
}

export async function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const eventType = document.getElementById('contactEventType').value;
    const message = document.getElementById('contactMessage').value.trim();
    const honeypot = document.getElementById('contactWebsite')?.value || '';
    const statusDiv = document.getElementById('formStatus');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!name || !email || !phone || !eventType || !message) {
        statusDiv.className = 'form-status error';
        statusDiv.textContent = '✗ Please fill in all required fields.';
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        statusDiv.className = 'form-status error';
        statusDiv.textContent = '✗ Please enter a valid email address.';
        return;
    }

    // Show sending status
    statusDiv.className = 'form-status';
    statusDiv.textContent = 'Sending...';
    if (submitBtn) submitBtn.disabled = true;

    // Include selected product if they came from a product page
    const selectedProduct = window.consultationProduct || null;

    try {
        const response = await fetch('https://nsedpvrqhxcikhlieize.supabase.co/functions/v1/send-contact-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g'
            },
            body: JSON.stringify({
                formType: 'contact',
                formData: { name, email, phone, eventType, message, selectedProduct },
                honeypot
            })
        });

        if (response.ok) {
            statusDiv.className = 'form-status success';
            statusDiv.textContent = "✓ Thank you! Your message has been sent. We'll contact you within 24 hours.";
            document.getElementById('contactForm').reset();
            // Clear selected product after successful submission
            window.consultationProduct = null;
            const banner = document.getElementById('selectedProductBanner');
            if (banner) banner.style.display = 'none';
        } else {
            throw new Error('Failed to send');
        }
    } catch (error) {
        console.error('Error sending contact form:', error);
        statusDiv.className = 'form-status error';
        statusDiv.textContent = '✗ Sorry, there was an error sending your message. Please try calling us at 219-344-2416.';
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }

    setTimeout(() => {
        statusDiv.className = 'form-status';
        statusDiv.textContent = '';
    }, 5000);
}

// Global window exports for onclick handlers
// products array exposed globally so inline scripts in index.html can access it
window.products = products;
window.navigateToProduct = navigateToProduct;
window.bookConsultation = bookConsultation;
window.changeProductImage = changeProductImage;
window.filterProducts = filterProducts;
window.filterEngravingProducts = filterEngravingProducts;
window.filter3DProducts = filter3DProducts;
window.inquireProduct = inquireProduct;
window.formatPhone = formatPhone;
window.selectContactService = selectContactService;
window.handleSubmit = handleSubmit;
