# Phase 4: Frontend Refactor - Research

**Researched:** 2026-04-09
**Domain:** Vanilla JS ES module decomposition, static-HTML-to-dynamic migration, CSS class extraction
**Confidence:** HIGH — all findings are from direct codebase inspection, no external library research needed

## Summary

`app.js` is a 5,633-line monolith wrapped in a single `<script>` tag in `index.html`. The file is organized into logical sections separated by comment banners but no module boundaries. The split into `cart.js`, `products.js`, `checkout.js`, `staff.js`, and `ui.js` is a cut-and-paste decomposition — the primary challenge is dependency management: all functions currently share the same global scope, so cross-module calls require explicit exports and imports.

The dual product system (static HTML cards + dynamic JS append) currently works by having `renderDynamicEngravingProducts` and `renderDynamicPrints3dProducts` read `existingSlugs` from already-rendered static cards and appending only NEW products. FE-02 eliminates this hybrid: the static `<div class="product-card ...">` blocks are removed from `index.html` and BOTH grids are rendered entirely from Supabase. This also eliminates the slug-deduplication logic in the render functions.

FE-03 is a targeted inline-style audit: the `renderDynamic*` functions (and the static HTML cards they replace) contain 10–15 distinct inline style patterns that need named CSS classes. Most are variants of already-existing `.product-card`, `.product-image`, `.product-info`, `.product-price` rules — they just need minor additions to `styles.css`. The hero slideshow fix (FE-04) is minimal: store `setInterval`'s return value in a module-level variable and call `clearInterval` before re-initializing.

**Primary recommendation:** Execute plans in sequence — 04-01 (module split) first because 04-02 and 04-03 modify the same JS functions that 04-01 moves; doing the split first avoids editing the wrong file.

---

## Codebase Facts

### app.js Function-to-Module Map

All functions currently live at global scope inside one `<script>` block. The ES module split is a physical relocation — no logic changes, only export/import wiring.

| Function Range (lines) | Functions | Target Module |
|------------------------|-----------|---------------|
| 1–111 | `loadProducts`, `loadProductImages` | `products.js` |
| 113–231 | `renderDynamicProducts`, `renderDynamicEngravingProducts`, `renderDynamicPrints3dProducts` | `products.js` |
| 234–255 | `initHeroSlideshow` | `ui.js` |
| 257–281 | `gradients`, `categoryLabels`, `currentFilter` constants | `products.js` |
| 282–416 | `saveCart`, `cartHasProducts`, `cartHasServicesOnly`, `getProductSubtotal`, `getServiceSubtotal`, `getProductDiscount`, `getDiscountedProductSubtotal`, `getShippingCost`, `getTaxAmount`, `getGrandTotal`, `updateShippingVisibility` | `cart.js` |
| 417–1219 | `updateCartCount`, `addToCart`, `addEngravingToCart`, `addEngravingToCartFromDetail`, `addTieredEngravingToCart`, `addTieredKeychainToCart`, `addCustomKeychainToCart`, `addCustomizableKeychainToCart`, `addTieredAcrylicToCart`, `addTieredWoodRoundsToCart`, `addTieredCoasterToCart`, `updateStarFidgetPrice`, `addStarFidgetToCart`, `addSpinnerToCart`, `addFlexiFishToCart`, `addSnakeToCart`, `addHeartGiftBoxToCart`, `addMoonAndBackToCart`, `addHeartCoasterSetToCart`, `addRoundStarCoasterSetToCart`, `addSquareCoffeeBeanCoasterToCart`, `addHexagonShapedCoasterToCart`, `addOctagonFidgetToCart`, `addInfinityCubeToCart`, `addFlexiDinoToCart`, `addSnailToCart`, `addTwistyLizardToCart`, `removeFromCart`, `clearCart`, `getCartTotal` | `cart.js` |
| 1237–1353 | `applyCoupon`, `removeCoupon`, `showCouponMessage`, `getDiscountedTotal`, `updateCheckoutWithDiscount` | `checkout.js` |
| 1354–1395 | `toggleCart`, `renderCartItems`, `goToCheckout` | `cart.js` |
| 1408–1925 | `renderCheckoutItems`, `initPaymentOptions`, `updatePaymentUI`, `updatePaymentButtonText`, `getSelectedPaymentAmount`, `getPaymentType`, `createOrderInSupabase`, `displaySuccessOrderSummary`, `saveSignedDocument`, `showNotification`, `handleCheckoutSubmit`, `submitViaEmail` | `checkout.js` |
| 1926–2116 | `navigate`, `initPageFromHash`, `toggleMobileMenu`, `closeMobileMenu`, popstate/pageshow event listeners | `ui.js` |
| 2117–2165 | `createProductCard` | `products.js` |
| 2172–2401 | `navigateToProduct`, `bookConsultation`, `getProductBySlug`, `getCategoryPage`, `renderProductDetail`, `changeProductImage`, `getProductFeatures` | `products.js` |
| 2402–2560 | `renderCatalog`, `renderServices`, `filterProducts`, `filterEngravingProducts`, `filter3DProducts`, `inquireProduct`, `formatPhone`, `selectContactService`, `handleSubmit` | `products.js` |
| 2621–3589 | `updateProductOptions`, `handleCustomOrderSubmit`, modals/order form handlers | `checkout.js` |
| 2722–3588 | `WaiverModal`, `ContractModal`, `NoRefundModal`, `BookingGate`, `ColorPalette` objects | `checkout.js` |
| 3590–3838 | `renderGallery`, `initGalleryFilters`, `filterGallery`, `getCategoryForProduct`, `openLightbox`, `closeLightbox`, `changeLightboxImage`, `updateLightboxImage`, `createLightbox`, `openProductLightbox` | `ui.js` |
| 3839–3887 | `initializeApp` | `ui.js` |
| 3888–5633 | All `staff*` functions, barcode scanner | `staff.js` |

### Shared State Problem (Critical for Module Split)

These variables are read AND written by functions landing in DIFFERENT modules:

| Variable | Defined in | Read/written by |
|----------|-----------|-----------------|
| `products` (array) | `products.js` | `cart.js` (addToCart lookups), `checkout.js` (renderCheckoutItems), `ui.js` (renderGallery) |
| `cart` (array) | `cart.js` | `checkout.js` (renderCheckoutItems, createOrderInSupabase), `ui.js` (updateCartCount) |
| `currentFilter` | `products.js` | `products.js` only — safe |
| `staffProducts`, `staffUser`, etc. | `staff.js` | `staff.js` only — safe |
| `gradients`, `categoryLabels` | `products.js` | `products.js` only — safe |
| `DB_PRODUCTS_URL`, `DB_ANON_KEY`, `DB_FETCH_HEADERS` | `products.js` | `staff.js` also uses its own fetch with `DB_ANON_KEY` inline |

**Resolution pattern:** Export `products` and `cart` as mutable arrays from their home modules; other modules import the reference. Because arrays are objects (reference semantics in JS), mutations via `.push()`, `.splice()`, `.forEach()` etc. are visible to all importers without reassignment.

### Functions Called from index.html onclick Attributes

These must remain globally accessible after the module split:

```
navigateToProduct, addToCart, addEngravingToCart, addEngravingToCartFromDetail,
addTieredEngravingToCart, addTieredKeychainToCart, addCustomKeychainToCart,
addCustomizableKeychainToCart, addTieredAcrylicToCart, addTieredWoodRoundsToCart,
addTieredCoasterToCart, updateStarFidgetPrice, addStarFidgetToCart, addSpinnerToCart,
addFlexiFishToCart, addSnakeToCart, addHeartGiftBoxToCart, addMoonAndBackToCart,
addHeartCoasterSetToCart, addRoundStarCoasterSetToCart, addSquareCoffeeBeanCoasterToCart,
addHexagonShapedCoasterToCart, addOctagonFidgetToCart, addInfinityCubeToCart,
addFlexiDinoToCart, addSnailToCart, addTwistyLizardToCart, removeFromCart, clearCart,
toggleCart, goToCheckout, navigate, toggleMobileMenu, closeMobileMenu, filterProducts,
filterEngravingProducts, filter3DProducts, bookConsultation, changeProductImage,
inquireProduct, selectContactService, handleSubmit, handleCustomOrderSubmit,
applyCoupon, removeCoupon, updateProductOptions, updatePanelPrice, openLightbox,
closeLightbox, changeLightboxImage, filterGallery,
handleStaffLogin, handleStaffLogout, handleStaffProductSubmit, handleStaffDeleteProduct,
openStaffProductModal, editStaffProduct, confirmStaffDelete, openStaffModal,
closeStaffModal, toggleDiscountField, filterOrders, viewOrderDetail, saveOrderStatus,
updateOrderStatus, exportOrdersCSV, exportProductsCSV, exportCustomersCSV,
searchCustomers, renderCustomerList, buildCustomerList, filterActivityLog,
toggleProductSelection, toggleSelectAll, sortStaffTable, clearSelection, bulkDeleteSelected,
switchStaffImageTab, handleStaffFileSelect, removeStaffImage, openStaffScannerModal,
closeStaffScannerModal, startBarcodeCamera, fillFormFromScan, lookupBarcode
```

**Pattern:** Each module must attach its global-facing functions to `window`:
```js
// products.js
window.navigateToProduct = navigateToProduct;
window.addToCart = addToCart;
// etc.
```

### index.html Script Tag Change (FE-01)

**Current:**
```html
<script src="product_image_urls.js?v=4"></script>
<script src="app.js?v=4"></script>
```

**After refactor:**
```html
<script src="product_image_urls.js"></script>
<script type="module" src="products.js"></script>
<script type="module" src="cart.js"></script>
<script type="module" src="checkout.js"></script>
<script type="module" src="ui.js"></script>
<script type="module" src="staff.js"></script>
```

`product_image_urls.js` remains a plain script (not a module) because it sets `window.productGalleryImages` — accessed via `typeof productGalleryImages` in `loadProducts`. Supabase client CDN (`@supabase/supabase-js@2`) and `supabase-client.js` also remain plain scripts since `supabaseClient` is accessed globally by `staff.js`.

**Important:** ES modules are deferred by default (equivalent to `defer`) — they execute after HTML parsing completes. The existing `if (document.readyState === 'loading')` guards at top level of `app.js` remain appropriate.

**Important:** ES modules have their own scope — variables defined with `let`/`const`/`var` do NOT leak to `window` automatically. That is why `window.X = X` assignments are required for onclick handlers.

---

## Standard Stack

No new libraries. This refactor uses only:

| Technology | Version | Purpose |
|------------|---------|---------|
| Native ES Modules | Browser-native (all modern browsers) | `import`/`export` without bundler |
| Supabase JS CDN | v2 (already loaded) | Unchanged — `supabaseClient` global used by `staff.js` |
| CSS custom properties | Browser-native | Replacing inline styles with class-based rules |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Module File Structure

```
party-palace/
├── app.js                   → DELETE after split complete
├── products.js              → product data, rendering, filtering, navigation
├── cart.js                  → cart state, add/remove, cart UI
├── checkout.js              → checkout flow, payment, orders, modals (Waiver/Contract/NoRefund/BookingGate/ColorPalette)
├── staff.js                 → all staff portal functions
├── ui.js                    → navigate(), initHeroSlideshow(), gallery, initializeApp()
├── product_image_urls.js    → unchanged (plain script, sets window.productGalleryImages)
├── supabase-client.js       → unchanged (plain script, sets window.supabaseClient)
└── styles.css               → add ~10 new classes for FE-03
```

### Pattern 1: Module with Window Exports

Each module exports its public API to `window` for onclick compatibility:

```js
// products.js (example structure)
import { cart, saveCart } from './cart.js';

const DB_PRODUCTS_URL = '...';
const DB_ANON_KEY = '...';
const DB_FETCH_HEADERS = { ... };

let products = [];
export { products };

// ... all product functions ...

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadProducts());
} else {
    loadProducts();
}

// Global exports for onclick handlers
window.navigateToProduct = navigateToProduct;
window.addToCart = addToCart;
// etc.
```

### Pattern 2: Circular Dependency Avoidance

`products.js` calls `initializeApp()` (in `ui.js`) after load. `ui.js` calls `renderCatalog()`, `renderServices()`, `renderGallery()` (in `products.js`). This is a circular dependency.

**Resolution:** Use a late-binding import or pass `initializeApp` as a callback parameter:

```js
// products.js
async function loadProducts(skipInit) {
    // ...load...
    renderDynamicProducts();
    if (!skipInit) {
        // Dynamic import to break cycle
        const { initializeApp } = await import('./ui.js');
        initializeApp();
    }
}
```

OR pass it as a parameter during bootstrap:

```js
// ui.js  (main entry point)
import { loadProducts } from './products.js';
// ui.js is the root — it imports everything else, products.js does NOT import ui.js
// loadProducts accepts an optional callback
loadProducts(false, initializeApp);
```

The second approach (ui.js as root) is cleaner. `ui.js` imports from `products.js` and `cart.js` but `products.js` and `cart.js` do NOT import `ui.js`.

### Pattern 3: Shared Mutable State

```js
// cart.js
export const cart = JSON.parse(localStorage.getItem('partyPalaceCart')) || [];
// Mutate in place: cart.push(...), cart.splice(...) — importers see changes

// products.js
export let products = [];
// Reassign via: products.length = 0; products.push(...newProducts);
// OR: use Object.assign on a wrapper object
```

**Note on `products` reassignment:** `products = dbProducts.map(...)` in `loadProducts` performs a full reassignment. If other modules hold `import { products }` they will NOT see the new array after reassignment — they hold the old reference.

**Fix:** Never reassign `products` — mutate it in place:
```js
// Instead of:  products = dbProducts.map(p => ({ ... }));
// Do:
products.length = 0;
products.push(...dbProducts.map(p => ({ ... })));
```

### Pattern 4: FE-04 Hero Slideshow Timer Fix

The current code calls `setInterval` without storing the return value, so it cannot be cleared:

```js
// CURRENT (broken on re-init):
setInterval(() => { ... }, 5000);

// FIXED:
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
    }, 5000);
}
```

**When is stacking triggered?** Currently `initHeroSlideshow` is called once at page load (the DOMContentLoaded guard at lines 251–255). The success criterion says "rapid tab switching or page revisits" — mobile browsers use bfcache which can trigger `pageshow` with `event.persisted = true`. The `pageshow` handler calls `navigate(page, false)` which does NOT call `initHeroSlideshow`. However, if modules are re-evaluated on bfcache restore in some browsers, the top-level `initHeroSlideshow()` call could run again. Storing and clearing the interval is the correct prevention regardless of the exact trigger.

---

## FE-02: Dual Product System Elimination

### What Exists Now

**61 total static product cards** in `index.html`:
- 54 `prints3d-product` cards (lines 538–1337)
- 7 `engraving-product` cards (lines 1386–1640+)

The static cards have inline styles and hardcoded product data (names, prices, images, onclick handlers). The dynamic functions (`renderDynamicEngravingProducts`, `renderDynamicPrints3dProducts`) read `existingSlugs` from these static cards and only append DB products NOT already present.

### After FE-02

1. Remove ALL 61 static `<div class="product-card ...">` blocks from `index.html`, leaving only the grid container `<div class="products-grid" id="prints3dGrid">` and `<div class="products-grid" id="engravingGrid">` (empty).
2. Rewrite `renderDynamicEngravingProducts` and `renderDynamicPrints3dProducts` to render ALL products from Supabase (remove the `existingSlugs` deduplication logic, render ALL category-matching products).
3. The custom `addSnakeToCart()`, `addStarFidgetToCart()` etc. specialty handlers — these still need to be callable. After FE-02 the dynamic renderer uses `addToCart(product.name)` which calls the generic `addToCart`. The specialty handlers for color-selection (e.g., `addSnakeToCart` reads `#snakeColor` select) are tied to the static HTML's color-select inputs. **This is a data migration concern**: the color picker UI currently lives in the static card HTML. Dynamic rendering would need to include color selector HTML, OR those products migrate to using a different UX. This must be noted in the plan.

**Key insight:** The specialty `add*ToCart` functions (snake, fidget spinner, flexi fish, etc.) reference DOM IDs that are currently in the static HTML cards (`#snakeColor`, `#starFidgetColor`, etc.). When static cards are removed, those IDs disappear. The dynamic renderer must either: (a) generate equivalent select elements in the dynamic card HTML, or (b) the products page navigates directly to product detail where color selection lives.

Looking at the existing product detail page logic (`renderProductDetail` at line 2233), it handles color selection for products with options. The simplest migration for color-dependent products is to route them through `navigateToProduct` (detail page) instead of direct add-to-cart from the grid — which matches how Supabase-only products already work.

---

## FE-03: Inline Style to CSS Class Mapping

### Inline Styles in renderDynamicEngravingProducts (app.js lines 145–176)

| Inline Style | New CSS Class | Already Exists? |
|-------------|---------------|-----------------|
| `display: flex; flex-direction: column` on `.product-card` | `.product-card` already has `display:flex; flex-direction:column` | YES — `.product-card` in styles.css line 1322 |
| `background: var(--gray-100); overflow: hidden; cursor: pointer; position: relative` on `.product-image` | `.product-image-clickable` | NO — needs adding |
| `width: 100%; height: 100%; object-fit: cover; object-position: center` on img | `.product-img-cover` | NO — needs adding |
| `width: 100%; height: 100%; object-fit: contain; object-position: center` on img | `.product-img-contain` | NO — needs adding |
| `flex: 1; display: flex; flex-direction: column` on `.product-info` | `.product-info` already has this | YES — styles.css line 1456 |
| `cursor: pointer` on `.product-name` | `.product-name-clickable` | NO — needs adding |
| `margin: 0.5rem 0; font-size: 0.9rem; color: var(--gray-600)` on size div | `.product-size-label` | NO — needs adding |
| Tiered pricing container: `margin-bottom: 0.75rem; font-size: 0.85rem; background: var(--gray-50); padding: 0.75rem; border-radius: 6px` | `.pricing-tiers` | NO — needs adding |
| Tiered pricing header: `font-weight: 600; margin-bottom: 0.5rem; color: var(--gray-800)` | `.pricing-tiers-header` | NO — needs adding |
| Pricing row: `display: flex; justify-content: space-between; margin-bottom: 0.25rem` | `.pricing-row` | NO — needs adding |
| Price value: `font-weight: 600` on span | `.pricing-row-value` | NO — needs adding |
| `margin-top: auto` on `.product-price` | `.product-price-auto` or add modifier | NO — needs adding |
| Button: `width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: auto` | `.btn-block-cart` | NO — needs adding |
| Button: `width: 100%; margin-top: 0.5rem` on outline btn | `.btn-block-mt` | NO — needs adding |

### Inline Styles in renderDynamicPrints3dProducts (app.js lines 211–223)

Same patterns as engraving except:
- `.product-image` uses `object-fit: contain` (not cover) — mapped to `.product-img-contain`
- No tiered pricing

### Inline Styles in Static HTML Cards (index.html) — Same Pattern

The 61 static cards have the same inline patterns. Since FE-02 removes them entirely, FE-03 only needs to add the CSS classes for the DYNAMIC renderer (not the static HTML, which won't exist after FE-02). Plans 04-02 and 04-03 should be executed together or 04-02 first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| ES module bundling | Custom concatenation script | Native browser ES modules — no build step needed |
| Cross-module state synchronization | Event bus / pub-sub system | Shared mutable arrays (in-place mutation, reference semantics) |
| CSS utility framework | Tailwind-style utility classes | Targeted named semantic classes specific to this component |

---

## Common Pitfalls

### Pitfall 1: `products` Array Reassignment Breaking Imports

**What goes wrong:** `products.js` does `products = dbProducts.map(...)` — a reassignment. Any other module that imported `{ products }` holds a stale reference to the old empty array.

**Why it happens:** ES module imports of primitive values and reassigned bindings do NOT stay live in all cases for mutable arrays when the binding itself is replaced.

**How to avoid:** Never reassign `products`. Instead, mutate in-place: `products.length = 0; products.push(...newItems);`

**Warning signs:** `products` appears empty in cart or checkout modules even after loadProducts completes.

### Pitfall 2: Inline Script Functions Lose Scope

**What goes wrong:** The inline `<script>` blocks in `index.html` (the Did We Make Your Day Better section at line 3343, the search handler at 3359, the cursor effect at 3502) call functions like `resetLoveQuestionSection` and `navigate` that will move to ES modules.

**Why it happens:** ES modules do NOT pollute `window` by default. Inline scripts calling `navigate(...)` or `handleSearch` will get "undefined is not a function" errors.

**How to avoid:** Each module must explicitly assign `window.functionName = functionName` for every function referenced from inline scripts or HTML onclick attributes. Audit ALL inline `<script>` blocks and HTML event handlers before declaring the split complete.

**Inline scripts to audit:**
- Line 3343–3499: `resetLoveQuestionSection`, calls `navigate` indirectly
- Line 3359: `handleSearch` function (defined inline — keep inline or move to `ui.js` + export)
- Line 3502–3741: cursor effect (self-contained, keep inline)

### Pitfall 3: Script Load Order with ES Modules

**What goes wrong:** `product_image_urls.js` (plain script) sets `window.productGalleryImages`. If `products.js` (module) runs before this plain script finishes, `typeof productGalleryImages === 'undefined'` will be true and gallery images won't attach.

**Why it happens:** ES modules are deferred but plain scripts before them in document order complete first (synchronously during parsing). As long as `product_image_urls.js` is listed BEFORE the module `<script>` tags, it will be available. Preserve this order.

**How to avoid:** Keep `<script src="product_image_urls.js">` as the FIRST script tag, before all module tags.

### Pitfall 4: Static Card Removal Breaks Specialty Cart Functions

**What goes wrong:** Removing static prints3d/engraving cards from `index.html` removes DOM elements that specialty cart functions (e.g., `addSnakeToCart()`, `addStarFidgetToCart()`) reference by ID (`#snakeColor`, `#starFidgetColor`, `#snakePalette`, etc.).

**Why it happens:** Those functions read color selection state from inputs embedded in the static cards.

**How to avoid:** The dynamic renderer for prints3d must either (a) include color-picker HTML for products that need it (complex), or (b) route all products to `navigateToProduct` where color selection happens in the detail page. Option (b) is the correct approach — the detail page already handles customization UI for these products. Update the dynamic cards to NOT include color selectors and rely on View Details → product detail for customization.

### Pitfall 5: Hero Slideshow Timer Stacking on bfcache

**What goes wrong:** Mobile Safari restores pages from bfcache on back navigation, re-running top-level script execution, which calls `initHeroSlideshow()` again without clearing the previous `setInterval`. Multiple timers run simultaneously, causing erratic image switching.

**How to avoid:** Store the interval reference at module scope and `clearInterval` before re-initializing. See Pattern 4 above.

---

## Code Examples

### ES Module Export Pattern

```js
// cart.js
export const cart = JSON.parse(localStorage.getItem('partyPalaceCart')) || [];
const SHIPPING_RATE = 5.99;
const FREE_SHIPPING_THRESHOLD = 49;
const TAX_RATE = 0.07;

export function saveCart() { ... }
export function cartHasProducts() { ... }
// ... etc.

// Global exports for onclick/inline script compatibility
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.toggleCart = toggleCart;
window.goToCheckout = goToCheckout;
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
```

```js
// ui.js — root entry point, imports and initializes everything
import { loadProducts, products, renderCatalog, renderServices, renderGallery } from './products.js';
import { cart, updateCartCount, renderCartItems } from './cart.js';

export function initializeApp() {
    renderCatalog();
    renderServices();
    renderGallery();
    WaiverModal.init();
    ContractModal.init();
    NoRefundModal.init();
    BookingGate.init();
    ColorPalette.init();
    initPageFromHash();
    updateCartCount();
    renderCartItems();
    initStaffPortal(); // imported from staff.js
}

// Boot
loadProducts(false); // products.js calls initializeApp after load
```

### In-Place Array Mutation Pattern

```js
// products.js — safe reassignment pattern
export const products = [];

async function loadProducts(skipInit) {
    const dbProducts = await fetchFromSupabase();
    // SAFE: mutate in place, all importers see the update
    products.length = 0;
    products.push(...dbProducts.map(p => transformProduct(p)));
    renderDynamicProducts();
    if (!skipInit) initializeApp();
}
```

### Dynamic Engraving Card (FE-02 + FE-03 combined)

After migration, the dynamic renderer generates ALL cards (no existingSlugs check) using CSS classes instead of inline styles:

```js
function renderDynamicEngravingProducts() {
    const grid = document.getElementById('engravingGrid');
    if (!grid) return;
    grid.innerHTML = ''; // clear entirely — no static cards remain

    const engravingProducts = products.filter(p => p.category === 'engraving');

    engravingProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card engraving-product';
        card.dataset.material = product.material || 'Wood';
        // No inline style="display: flex; flex-direction: column" — .product-card already has this

        const image = product.images?.[0] || '';
        const icon = product.icon || '🪵';
        const slug = product.slug;

        card.innerHTML = `
            <div class="product-image product-image-clickable" onclick="navigateToProduct('${slug}')">
                ${image
                    ? `<img src="" alt="" loading="lazy" class="product-img-cover" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${icon}</span>';">`
                    : `<span>${icon}</span>`
                }
                ${product.sale ? '<div class="product-badge sale-badge">Sale</div>' : ''}
                ${product.popular ? '<div class="product-badge popular-badge">Popular</div>' : ''}
            </div>
            <div class="product-info">
                <div class="product-name product-name-clickable" onclick="navigateToProduct('${slug}')"></div>
                <div class="product-description"></div>
                ${product.size ? `<div class="product-size-label"><strong>Size:</strong> ${product.size}</div>` : ''}
                ${buildPriceHtml(product)}
                <button onclick="navigateToProduct('${slug}')" class="btn btn-primary btn-block-mt">View Details</button>
            </div>`;

        card.querySelector('.product-name').textContent = product.name;
        card.querySelector('.product-description').textContent = product.description || '';
        const img = card.querySelector('.product-img-cover');
        if (img) { img.src = image; img.alt = product.name; }
        grid.appendChild(card);
    });
}
```

### CSS Classes to Add to styles.css

```css
/* Product image clickable variant (replaces inline background+overflow+cursor) */
.product-image-clickable {
    background: var(--gray-100);
    overflow: hidden;
    cursor: pointer;
}

/* Product image fill modes */
.product-img-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
}

.product-img-contain {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
}

/* Clickable product name */
.product-name-clickable {
    cursor: pointer;
}

/* Size label row */
.product-size-label {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    color: var(--gray-600);
}

/* Tiered pricing block */
.pricing-tiers {
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
    background: var(--gray-50);
    padding: 0.75rem;
    border-radius: 6px;
}

.pricing-tiers-header {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--gray-800);
}

.pricing-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
}

.pricing-row-value {
    font-weight: 600;
}

/* Product price pushed to bottom */
.product-price-bottom {
    margin-top: auto;
}

/* Full-width buttons */
.btn-block {
    width: 100%;
}

.btn-block-mt {
    width: 100%;
    margin-top: 0.5rem;
}

.btn-block-cart {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Single monolith `app.js` | ES modules with `import`/`export` | Browser-native, no bundler needed |
| Static HTML product cards | Fully dynamic Supabase render | Single source of truth, instant updates |
| Inline styles for component layout | Named CSS classes | Consistent, overridable, DRY |

---

## Open Questions

1. **Color-selector specialty functions for prints3d products**
   - What we know: Static cards for Snake, Star Fidget, Spinner, Flexi Fish, Octagon Fidget, Infinity Cube, Flexi Dino, Snail, Twisty Lizard contain inline `<select>` color pickers; matching `addSnakeToCart()` etc. functions read these inputs.
   - What's unclear: Are color selections accessible from the product detail page (renderProductDetail)?
   - Recommendation: Verify `renderProductDetail` handles color options for these products. If yes, update dynamic cards to route to View Details (not Add to Cart). If no, the dynamic renderer needs to include color picker HTML in the generated card — a more complex change.

2. **`supabase-client.js` global dependency in `staff.js`**
   - What we know: `supabase-client.js` sets `window.supabaseClient` as a plain script; `staff.js` uses `supabaseClient` directly.
   - What's unclear: When `staff.js` becomes an ES module, it needs `supabaseClient` to be available at the time staff functions run (not at parse time).
   - Recommendation: Access `window.supabaseClient` explicitly in `staff.js` or import as a dynamic import after DOM ready.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `app.js` (5,633 lines) — function inventory, dependency mapping, shared state analysis
- Direct code inspection of `index.html` — static card count (61 total: 54 prints3d, 7 engraving), script tag locations, inline script blocks
- Direct code inspection of `styles.css` (4,635 lines) — existing class inventory for FE-03 gap analysis

### Secondary (MEDIUM confidence)
- MDN ES Modules specification — module scope isolation, `window` assignment requirement, deferred execution behavior (well-established web standard, HIGH confidence in practice)

---

## Metadata

**Confidence breakdown:**
- Function-to-module mapping: HIGH — derived from direct line-by-line code inspection
- Shared state dependency graph: HIGH — direct code inspection
- CSS class gap analysis: HIGH — direct styles.css inspection vs inline styles
- Module loading order: HIGH — web standard behavior
- Circular dependency resolution: MEDIUM — pattern is sound but exact wire-up must be verified during execution

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (codebase is internal, not subject to external library changes)
