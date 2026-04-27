// ui.js — Navigation, gallery, hero slideshow, app bootstrap
// Root ES module entry point — imported by index.html

import { loadProducts, products, categoryLabels, renderCatalog, renderServices, renderDynamicProducts, createProductCard, navigateToProduct, renderProductDetail, filterProducts, getProductBySlug, filterEngravingProducts, filter3DProducts } from './products.js';
import { cart, updateCartCount, renderCartItems, toggleCart } from './cart.js';
import { WaiverModal, ContractModal, NoRefundModal, BookingGate, ColorPalette, initPaymentOptions, renderCheckoutItems, showNotification, applyCoupon, removeCoupon, displaySuccessOrderSummary, createOrderInSupabase } from './checkout.js';
import { clearCart } from './cart.js';
import { initStaffPortal } from './staff.js';

// Re-export navigate and initHeroSlideshow for use by other modules
export { initializeApp, navigate, initHeroSlideshow };

// ============================================
// HERO SLIDESHOW
// ============================================

let heroSlideshowInterval = null;

function initHeroSlideshow() {
    const slideshow = document.getElementById('heroSlideshow');
    if (!slideshow) return;

    const images = slideshow.querySelectorAll('.slideshow-img');
    if (images.length <= 1) return;

    // Clear any existing timer before starting a new one
    if (heroSlideshowInterval) {
        clearInterval(heroSlideshowInterval);
        heroSlideshowInterval = null;
    }

    let currentIndex = 0;

    heroSlideshowInterval = setInterval(() => {
        images[currentIndex].style.opacity = '0';
        currentIndex = (currentIndex + 1) % images.length;
        images[currentIndex].style.opacity = '1';
    }, 5000); // Change image every 5 seconds
}

// Initialize slideshow when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroSlideshow);
} else {
    initHeroSlideshow();
}

// ============================================
// NAVIGATION
// ============================================

function navigate(page, addToHistory = true, customHash = null) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target page
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update nav buttons (desktop and mobile)
    // For product pages, highlight the parent category
    const navPage = page === 'product' ? 'partydecor' : page;
    document.querySelectorAll('.nav-left button[data-page], .nav-right-links button[data-page], .mobile-menu button[data-page]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === navPage);
    });

    // Close mobile menu
    closeMobileMenu();

    // Scroll to top
    window.scrollTo(0, 0);

    // Render content if needed
    if (page === 'partydecor') {
        renderCatalog();
    } else if (page === 'services') {
        renderServices();
    } else if (page === 'gallery') {
        renderGallery();
    } else if (page === 'prints3d' || page === 'engraving') {
        renderDynamicProducts();
    }

    // Hide cursor effect on staff portal
    const cursorCanvas = document.getElementById('cursor-canvas');
    if (cursorCanvas) {
        cursorCanvas.style.display = page === 'staff' ? 'none' : '';
    }

    // ============================================
    // BROWSER HISTORY SUPPORT (for back/forward)
    // ============================================
    // Push state to browser history so back/forward buttons work
    // ALWAYS use hash (even for home) to ensure consistent behavior on mobile
    if (addToHistory) {
        const hash = customHash || page;
        const newUrl = window.location.pathname + '#' + hash;
        history.pushState({ page: page, hash: hash }, '', newUrl);
    }
}

// ============================================
// HANDLE BROWSER BACK/FORWARD BUTTONS
// ============================================
// Listen for popstate event (fired when user clicks back/forward)
window.addEventListener('popstate', function(event) {
    // Get page from state or URL hash
    let page = null;

    if (event.state && event.state.page) {
        page = event.state.page;
        // If it's a product page, render the product detail
        if (page === 'product' && event.state.hash) {
            const slug = event.state.hash.replace('product-', '');
            const product = getProductBySlug(slug);
            if (product) {
                renderProductDetail(product);
            }
        }
    } else {
        // Fallback: check URL hash
        const hash = window.location.hash.replace('#', '');
        const validPages = ['home', 'partydecor', 'services', 'gallery', 'partyrentals', 'prints3d', 'engraving', 'jewelry', 'contact', 'checkout', 'checkout-success', 'staff'];

        // Check if it's a product page
        if (hash && hash.startsWith('product-')) {
            const slug = hash.replace('product-', '');
            const product = getProductBySlug(slug);
            if (product) {
                renderProductDetail(product);
                page = 'product';
            }
        } else if (hash && validPages.includes(hash)) {
            page = hash;
        }
    }

    // Navigate to page (or home if none found)
    navigate(page || 'home', false);
});

// ============================================
// HANDLE MOBILE BFCACHE (pageshow event)
// ============================================
// Mobile Safari and some browsers use bfcache - this ensures
// the page state is correct when returning via back/forward
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was restored from bfcache - sync display with URL
        const hash = window.location.hash.replace('#', '');
        const validPages = ['home', 'partydecor', 'services', 'gallery', 'partyrentals', 'prints3d', 'engraving', 'jewelry', 'contact', 'checkout', 'checkout-success', 'staff'];

        // Check if it's a product page
        if (hash && hash.startsWith('product-')) {
            const slug = hash.replace('product-', '');
            const product = getProductBySlug(slug);
            if (product) {
                renderProductDetail(product);
                navigate('product', false);
                return;
            }
        }

        const page = (hash && validPages.includes(hash)) ? hash : 'home';
        navigate(page, false);
    }
});

// ============================================
// HANDLE INITIAL PAGE LOAD (from URL hash)
// ============================================
// On page load, check if there's a hash in the URL and navigate to that page
function initPageFromHash() {
    const hash = window.location.hash.replace('#', '');
    const validPages = ['home', 'partydecor', 'services', 'gallery', 'partyrentals', 'prints3d', 'engraving', 'jewelry', 'contact', 'checkout', 'checkout-success', 'staff'];

    // Check if it's a product page (hash starts with "product-")
    if (hash && hash.startsWith('product-')) {
        const slug = hash.replace('product-', '');
        const product = getProductBySlug(slug);
        if (product) {
            renderProductDetail(product);
            navigate('product', false);
            history.replaceState({ page: 'product', hash: hash }, '', window.location.pathname + '#' + hash);
            return;
        }
    }

    // Handle checkout success - show success page with order details
    if (hash === 'checkout-success') {
        // Get order info and cart before clearing
        const orderInfo = JSON.parse(localStorage.getItem('partyPalaceOrderInfo') || '{}');
        const orderCart = JSON.parse(localStorage.getItem('partyPalaceCart') || '[]');

        // Display order summary if available
        if (orderInfo.paymentType) {
            displaySuccessOrderSummary(orderInfo);
        }

        // Create order in Supabase
        if (orderInfo.name && orderCart.length > 0) {
            createOrderInSupabase(orderInfo, orderCart);
        }

        // Clear cart and order info
        clearCart();
        localStorage.removeItem('partyPalaceOrderInfo');
        navigate('checkout-success', false);
        history.replaceState({ page: 'checkout-success', hash: hash }, '', window.location.pathname + '#' + hash);
        return;
    }

    if (hash && validPages.includes(hash)) {
        // Navigate to the hashed page
        navigate(hash, false);
        history.replaceState({ page: hash, hash: hash }, '', window.location.pathname + '#' + hash);
    } else {
        // No hash - set home with #home hash for consistent back/forward
        navigate('home', false);
        history.replaceState({ page: 'home', hash: 'home' }, '', window.location.pathname + '#home');
    }
}

// Mobile Menu
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('mobileMenuToggle');
    menu.classList.toggle('active');
    toggle.classList.toggle('active');
}
function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('mobileMenuToggle');
    menu.classList.remove('active');
    toggle.classList.remove('active');
}

// ============================================
// GALLERY
// ============================================

function renderGallery() {
    const galleryMasonry = document.getElementById('galleryMasonry');
    if (!galleryMasonry || typeof productGalleryImages === 'undefined') return;

    // Collect all images from all products with category data
    const allImages = [];
    for (const [productName, images] of Object.entries(productGalleryImages)) {
        const product = products.find(p => p.name === productName);
        const productCategory = product ? product.category : 'gallery';

        // Map product category to gallery filter bucket (uses canonical DB names after migration)
        let filterCategory = 'party-decor';
        if (productCategory === '3D Prints') filterCategory = '3d-prints';
        else if (productCategory === 'Engraving') filterCategory = 'engraving';
        else if (productCategory === 'Party Decor') filterCategory = 'party-decor';

        images.forEach(imageUrl => {
            allImages.push({
                url: imageUrl,
                title: productName,
                category: getCategoryForProduct(productName),
                filterCategory: filterCategory
            });
        });
    }

    // Shuffle images for variety
    const shuffledImages = allImages.sort(() => Math.random() - 0.5);

    // Render gallery items with staggered animation delays
    galleryMasonry.innerHTML = shuffledImages.map((item, index) => `
        <div class="gallery-item"
             data-category="${item.filterCategory}"
             onclick="openLightbox(${index})"
             style="animation-delay: ${(index % 20) * 0.05}s">
            <img src="${item.url}" alt="${item.title}" loading="lazy">
            <div class="gallery-item-overlay">
                <p class="gallery-item-title">${item.title}</p>
                <p class="gallery-item-category">${item.category}</p>
            </div>
        </div>
    `).join('');

    // Store images globally for lightbox
    window.galleryImages = shuffledImages;

    // Update image count
    const countEl = document.getElementById('galleryImageCount');
    if (countEl) countEl.textContent = shuffledImages.length;

    // Initialize filter buttons
    initGalleryFilters();
}

function initGalleryFilters() {
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            filterGallery(filter);
        });
    });
}

function filterGallery(filter) {
    const items = document.querySelectorAll('.gallery-item');
    let visibleCount = 0;

    items.forEach((item, index) => {
        const category = item.dataset.category;
        const shouldShow = filter === 'all' || category === filter;

        if (shouldShow) {
            item.classList.remove('hidden');
            item.style.animationDelay = `${(visibleCount % 20) * 0.05}s`;
            item.style.animation = 'none';
            // Trigger reflow
            item.offsetHeight;
            item.style.animation = 'galleryFadeIn 0.6s forwards';
            visibleCount++;
        } else {
            item.classList.add('hidden');
        }
    });

    // Update count
    const countEl = document.getElementById('galleryImageCount');
    if (countEl) countEl.textContent = visibleCount;

    // Update lightbox images to only include visible items
    const allImages = window.galleryImages || [];
    window.filteredGalleryImages = allImages.filter(img =>
        filter === 'all' || img.filterCategory === filter
    );
}

function getCategoryForProduct(productName) {
    const product = products.find(p => p.name === productName);
    if (!product) return 'Gallery';
    return categoryLabels[product.category] || 'Gallery';
}

// Lightbox functionality
let currentLightboxIndex = 0;

function openLightbox(index) {
    currentLightboxIndex = index;
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        createLightbox();
    }
    updateLightboxImage();
    document.getElementById('lightbox').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.body.style.overflow = '';
}

function changeLightboxImage(direction) {
    const images = window.galleryImages || [];
    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = images.length - 1;
    if (currentLightboxIndex >= images.length) currentLightboxIndex = 0;
    updateLightboxImage();
}

function updateLightboxImage() {
    const images = window.galleryImages || [];
    const image = images[currentLightboxIndex];
    if (!image) return;

    document.getElementById('lightboxImg').src = image.url;
    document.getElementById('lightboxTitle').textContent = image.title;
    document.getElementById('lightboxCategory').textContent = image.category;
    document.getElementById('lightboxCounter').textContent = `${currentLightboxIndex + 1} / ${images.length}`;
}

function createLightbox() {
    const lightboxHTML = `
        <div id="lightbox" class="lightbox" onclick="if(event.target === this) closeLightbox()">
            <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
            <button class="lightbox-prev" onclick="event.stopPropagation(); changeLightboxImage(-1)">&#10094;</button>
            <div class="lightbox-content">
                <img id="lightboxImg" src="" alt="">
                <div class="lightbox-caption">
                    <p id="lightboxTitle"></p>
                    <p id="lightboxCategory"></p>
                    <p id="lightboxCounter"></p>
                </div>
            </div>
            <button class="lightbox-next" onclick="event.stopPropagation(); changeLightboxImage(1)">&#10095;</button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('lightbox').style.display === 'flex') {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') changeLightboxImage(-1);
            if (e.key === 'ArrowRight') changeLightboxImage(1);
        }
    });
}

// Open lightbox for product detail page images
function openProductLightbox(index) {
    // Use current product images if available, otherwise fallback to gallery
    const images = window.currentProductImages || window.galleryImages || [];
    if (images.length === 0) return;

    // Temporarily switch to product images
    window.galleryImages = images;
    openLightbox(index);
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize app function (called after products are loaded from Supabase)
function initializeApp() {
    renderCatalog();
    renderServices();
    renderGallery();

    // Clear signed documents on each visit - documents are saved to database,
    // but users should sign fresh each session for checkout
    localStorage.removeItem('partypalace_waiver_signed');
    localStorage.removeItem('partypalace_contract_signed');

    WaiverModal.init();
    ContractModal.init();
    NoRefundModal.init();
    BookingGate.init();
    ColorPalette.init();
    initPageFromHash();
    updateCartCount();
    renderCartItems();

    // Set up coupon input Enter key listener
    const couponInput = document.getElementById('couponCodeInput');
    if (couponInput) {
        couponInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCoupon();
            }
        });
    }

    // Initialize staff portal
    initStaffPortal();
}

// ============================================
// WINDOW EXPORTS
// ============================================

window.navigate = navigate;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.openLightbox = openLightbox;
window.openProductLightbox = openProductLightbox;
window.closeLightbox = closeLightbox;
window.changeLightboxImage = changeLightboxImage;
window.filterGallery = filterGallery;

// Re-export products.js window functions (navigate calls renderCatalog etc, ensure available globally)
window.renderCatalog = renderCatalog;
window.renderServices = renderServices;
window.renderDynamicProducts = renderDynamicProducts;
window.loadProducts = loadProducts;

// Re-export checkout window functions via ui.js bootstrap
window.showNotification = showNotification;
window.renderCheckoutItems = renderCheckoutItems;
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;

// ============================================
// BOOT: Start the app by loading products
// ============================================
// loadProducts(false) triggers: fetch -> renderDynamicProducts -> initializeApp (via dynamic import)
loadProducts(false);
