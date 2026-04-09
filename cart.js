// cart.js — Cart state, add/remove functions, cart UI
import { products } from './products.js';

export const cart = JSON.parse(localStorage.getItem('partyPalaceCart')) || [];

// Constants for shipping and tax
const SHIPPING_RATE = 5.99;
const FREE_SHIPPING_THRESHOLD = 49;
const TAX_RATE = 0.07; // 7% Indiana sales tax

export function saveCart() {
    localStorage.setItem('partyPalaceCart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
    updateShippingVisibility();
}

// Check if cart has shippable products (3D prints or engraving)
export function cartHasProducts() {
    return cart.some(item => item.category === 'prints3d' || item.category === 'engraving');
}

// Check if cart has services only (party decor)
export function cartHasServicesOnly() {
    return cart.length > 0 && !cartHasProducts();
}

// Get subtotal of products only (3D prints, engraving)
export function getProductSubtotal() {
    return cart
        .filter(item => item.category === 'prints3d' || item.category === 'engraving')
        .reduce((sum, item) => sum + item.price, 0);
}

// Get subtotal of services only (party decor)
export function getServiceSubtotal() {
    return cart
        .filter(item => item.category !== 'prints3d' && item.category !== 'engraving')
        .reduce((sum, item) => sum + item.price, 0);
}

// Get discount amount — always 0 client-side; server calculates from verified prices
export function getProductDiscount() {
    return 0;
}

// Get discounted product subtotal
export function getDiscountedProductSubtotal() {
    return getProductSubtotal() - getProductDiscount();
}

// Calculate shipping cost (free over $49, otherwise $5.99) - based on original product subtotal
export function getShippingCost() {
    if (!cartHasProducts()) return 0;
    const productSubtotal = getProductSubtotal();
    return productSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATE;
}

// Calculate tax (7% on discounted products only)
export function getTaxAmount() {
    if (!cartHasProducts()) return 0;
    return getDiscountedProductSubtotal() * TAX_RATE;
}

// Get grand total including shipping and tax (with discount applied to products)
export function getGrandTotal() {
    const discountedProductSubtotal = getDiscountedProductSubtotal();
    const serviceSubtotal = getServiceSubtotal();
    const shipping = getShippingCost();
    const tax = getTaxAmount();
    return discountedProductSubtotal + serviceSubtotal + shipping + tax;
}

// Show/hide shipping address section based on cart contents
export function updateShippingVisibility() {
    const shippingSection = document.getElementById('shippingAddressSection');
    const eventDetailsSection = document.getElementById('eventDetailsSection');
    const documentsSection = document.querySelector('.checkout-documents-box');
    const depositInfoBox = document.querySelector('.deposit-info-box');
    const paymentOptionsSection = document.getElementById('paymentOptionsSection');
    const agreementSection = document.getElementById('agreementSection');

    const hasProducts = cartHasProducts();
    const hasServices = getServiceSubtotal() > 0;
    const productsOnly = hasProducts && !hasServices;

    if (shippingSection) {
        shippingSection.style.display = hasProducts ? 'block' : 'none';
    }

    // Hide event details for product-only orders
    if (eventDetailsSection) {
        eventDetailsSection.style.display = productsOnly ? 'none' : 'block';
    }

    // Only show documents section if cart has services
    if (documentsSection) {
        documentsSection.style.display = hasServices ? 'block' : 'none';
    }

    // Hide deposit info box for product-only orders (products pay full amount)
    if (depositInfoBox) {
        depositInfoBox.style.display = productsOnly ? 'none' : 'block';
    }

    // Hide payment options (deposit/full) for product-only orders
    if (paymentOptionsSection) {
        paymentOptionsSection.style.display = productsOnly ? 'none' : 'block';
    }

    // Agreement section handling:
    // - For products: only show noRefundCheckbox (about final sale)
    // - For services: show both checkboxes
    const agreementCheckboxLabel = document.getElementById('agreementCheckboxLabel');
    const noRefundCheckboxLabel = document.getElementById('noRefundCheckboxLabel');

    if (agreementCheckboxLabel) {
        // Hide the agreement/waiver checkbox for product-only orders
        agreementCheckboxLabel.style.display = productsOnly ? 'none' : 'flex';
    }
    if (noRefundCheckboxLabel) {
        // Show no-refund checkbox only if cart has products
        noRefundCheckboxLabel.style.display = hasProducts ? 'flex' : 'none';
    }

    // Update checkout button text based on cart contents
    const checkoutBtnText = document.getElementById('checkoutBtnText');
    if (checkoutBtnText) {
        if (productsOnly) {
            const total = getGrandTotal();
            checkoutBtnText.textContent = `Pay $${total.toFixed(2)} Now`;
        } else {
            // For services, show deposit amount
            const depositInput = document.getElementById('depositAmount');
            const depositAmount = depositInput ? parseFloat(depositInput.value) || 50 : 50;
            checkoutBtnText.textContent = `Pay $${depositAmount} Deposit to Book`;
        }
    }
}

export function updateCartCount() {
    const countEl = document.getElementById('cartCount');
    const navBadge = document.getElementById('cartCountBadge');
    const mobileCartCount = document.getElementById('mobileCartCount');

    if (countEl) {
        countEl.textContent = cart.length;
        countEl.style.display = cart.length > 0 ? 'flex' : 'none';
    }

    // Update nav bar cart badge
    if (navBadge) {
        navBadge.textContent = cart.length;
        navBadge.style.display = cart.length > 0 ? 'block' : 'none';
    }

    // Update mobile menu cart count
    if (mobileCartCount) {
        mobileCartCount.textContent = cart.length;
        mobileCartCount.style.display = cart.length > 0 ? 'inline-block' : 'none';
    }
}

export function addToCart(productNameOrObj) {
    let itemToAdd;

    // Handle both string (product name) and object (direct item) inputs
    if (typeof productNameOrObj === 'string') {
        const product = products.find(p => p.name === productNameOrObj);
        if (!product) return;

        itemToAdd = {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.images ? product.images[0] : null
        };
    } else if (typeof productNameOrObj === 'object' && productNameOrObj !== null) {
        // Direct item object passed (e.g., from 3D print products with color)
        itemToAdd = {
            id: productNameOrObj.id || null,
            name: productNameOrObj.name,
            price: productNameOrObj.price,
            category: productNameOrObj.category || 'prints3d',
            image: productNameOrObj.image || null
        };
    } else {
        return;
    }

    // Check if already in cart
    if (cart.find(item => item.name === itemToAdd.name)) {
        showNotification('Item already in cart!', 'info');
        return;
    }

    cart.push(itemToAdd);

    saveCart();
    showNotification(`${itemToAdd.name} added to cart!`, 'success');
}

// Get selected engraving material from filter buttons
function getSelectedEngravingMaterial() {
    const activeBtn = document.querySelector('#engravingFilterButtons .filter-btn.active');
    if (activeBtn) {
        const material = activeBtn.dataset.material;
        return material === 'all' ? 'Wood' : material; // Default to Wood if "All" is selected
    }
    return 'Wood';
}

// Add engraving product to cart with quantity, material, and special instructions
export function addEngravingToCart(productName, basePrice, productId) {
    const qtyInput = document.getElementById(productId + '-qty');
    const instructionsInput = document.getElementById(productId + '-instructions');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = getSelectedEngravingMaterial();

    // Create item name with material and quantity
    const baseItemName = productName.replace('Engraved ', '');
    const itemName = qty > 1
        ? `${material} ${baseItemName} (x${qty})`
        : `${material} ${baseItemName}`;
    const totalPrice = basePrice * qty;

    // Check if same item with same material already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(baseItemName) && item.material === material
    );

    if (existingIndex !== -1) {
        // Update existing item
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        // Add new item
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty
        });
        showNotification(`${itemName} added to cart!`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
}

// Add engraving product to cart from detail page
export function addEngravingToCartFromDetail(productName, basePrice, productSlug) {
    const qtyInput = document.getElementById('detailEngravingQty');
    const instructionsInput = document.getElementById('detailEngravingInstructions');
    const materialInput = document.getElementById('detailEngravingMaterial');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = materialInput ? materialInput.value : 'Wood';

    // Check if this is a tiered pricing product (Edge Glued Square Panel)
    const product = products.find(p => p.slug === productSlug);
    if (product && product.tieredPricing) {
        // Check for 11+ quantity - redirect to contact
        if (qty >= 11) {
            showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
            window.navigate('contact');
            return;
        }

        // Calculate tiered pricing
        let pricePerUnit;
        if (qty === 1) {
            pricePerUnit = 39.99;
        } else if (qty >= 2 && qty <= 5) {
            pricePerUnit = 36.99;
        } else if (qty >= 6 && qty <= 10) {
            pricePerUnit = 30.99;
        }
        basePrice = pricePerUnit;
    }

    // Create item name with material and quantity
    const baseItemName = productName.replace('Engraved ', '');
    const itemName = qty > 1
        ? `${material} ${baseItemName} (x${qty})`
        : `${material} ${baseItemName}`;
    const totalPrice = Math.round(basePrice * qty * 100) / 100;

    // Check if same item with same material already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(baseItemName) && item.material === material
    );

    if (existingIndex !== -1) {
        // Update existing item
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        // Add new item
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty
        });
        showNotification(`${itemName} added to cart!`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
    if (materialInput) materialInput.selectedIndex = 0;
}

// Add engraving product with tiered pricing to cart
export function addTieredEngravingToCart(productName, productId) {
    const qtyInput = document.getElementById(productId + '-qty');
    const instructionsInput = document.getElementById(productId + '-instructions');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = getSelectedEngravingMaterial();

    // Check for 11+ quantity - redirect to contact
    if (qty >= 11) {
        showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
        window.navigate('contact');
        return;
    }

    // Calculate tiered pricing for Edge Glued Square Panel
    let pricePerUnit;
    if (qty === 1) {
        pricePerUnit = 39.99;
    } else if (qty >= 2 && qty <= 5) {
        pricePerUnit = 36.99;
    } else if (qty >= 6 && qty <= 10) {
        pricePerUnit = 30.99;
    }

    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;
    const itemName = qty > 1
        ? `${material} ${productName} (x${qty})`
        : `${material} ${productName}`;

    // Check if same item with same material already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(productName) && item.material === material
    );

    if (existingIndex !== -1) {
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        });
        showNotification(`${itemName} added to cart! ($${pricePerUnit.toFixed(2)} each)`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
}

// Add tiered keychain to cart (different pricing than panels)
export function addTieredKeychainToCart(productName, productId) {
    const qtyInput = document.getElementById(productId + '-qty');
    const instructionsInput = document.getElementById(productId + '-instructions');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = getSelectedEngravingMaterial();

    // Check for 11+ quantity - redirect to contact
    if (qty >= 11) {
        showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
        window.navigate('contact');
        return;
    }

    // Calculate tiered pricing for Rectangle Wood Keychain
    let pricePerUnit;
    if (qty === 1) {
        pricePerUnit = 5.99;
    } else if (qty >= 2 && qty <= 5) {
        pricePerUnit = 4.99;
    } else if (qty >= 6 && qty <= 10) {
        pricePerUnit = 2.99;
    }

    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;
    const itemName = qty > 1
        ? `${material} ${productName} (x${qty})`
        : `${material} ${productName}`;

    // Check if same item with same material already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(productName) && item.material === material
    );

    if (existingIndex !== -1) {
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        });
        showNotification(`${itemName} added to cart! ($${pricePerUnit.toFixed(2)} each)`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
}

export function addCustomKeychainToCart(productName, productId) {
    const qtyInput = document.getElementById(productId + '-qty');
    const instructionsInput = document.getElementById(productId + '-instructions');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = getSelectedEngravingMaterial();

    // Check for 11+ quantity - redirect to contact
    if (qty >= 11) {
        showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
        window.navigate('contact');
        return;
    }

    // Calculate tiered pricing for Customizable Keychains
    let pricePerUnit;
    if (qty === 1) {
        pricePerUnit = 4.99;
    } else if (qty >= 2 && qty <= 5) {
        pricePerUnit = 3.99;
    } else if (qty >= 6 && qty <= 10) {
        pricePerUnit = 2.99;
    }

    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;
    const itemName = qty > 1
        ? `${material} ${productName} (x${qty})`
        : `${material} ${productName}`;

    // Check if same item with same material already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(productName) && item.material === material
    );

    if (existingIndex !== -1) {
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        });
        showNotification(`${itemName} added to cart! ($${pricePerUnit.toFixed(2)} each)`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
}

export function addCustomizableKeychainToCart() {
    const customTextInput = document.getElementById('keychainCustomText');
    const customText = customTextInput ? customTextInput.value.trim() : '';

    if (!customText) {
        showNotification('Please enter customization text for your keychain', 'error');
        return;
    }

    const itemName = `Customizable Keychain: "${customText}"`;

    const item = {
        name: itemName,
        price: 4.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/customizable-keychains/keychain1.jpeg',
        category: 'prints3d',
        customText: customText
    };

    cart.push(item);
    saveCart();
    showNotification(`${itemName} added to cart!`, 'success');

    // Clear the text field
    if (customTextInput) customTextInput.value = '';
}

export function addTieredAcrylicToCart(productName, productId) {
    const qtyInput = document.getElementById(productId + '-qty');
    const instructionsInput = document.getElementById(productId + '-instructions');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = 'Acrylic';

    // Check for 11+ quantity - redirect to contact
    if (qty >= 11) {
        showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
        window.navigate('contact');
        return;
    }

    // Calculate tiered pricing for Black Acrylic Plexiglass Sheet
    let pricePerUnit;
    if (qty === 1) {
        pricePerUnit = 54.99;
    } else if (qty >= 2 && qty <= 5) {
        pricePerUnit = 51.99;
    } else if (qty >= 6 && qty <= 10) {
        pricePerUnit = 45.99;
    }

    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;
    const itemName = qty > 1
        ? `${material} ${productName} (x${qty})`
        : `${material} ${productName}`;

    // Check if same item already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(productName)
    );

    if (existingIndex !== -1) {
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        });
        showNotification(`${itemName} added to cart! ($${pricePerUnit.toFixed(2)} each)`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
}

export function addTieredWoodRoundsToCart(productName, productId) {
    const qtyInput = document.getElementById(productId + '-qty');
    const instructionsInput = document.getElementById(productId + '-instructions');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = 'Wood';

    // Check for 11+ quantity - redirect to contact
    if (qty >= 11) {
        showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
        window.navigate('contact');
        return;
    }

    // Calculate tiered pricing for Unfinished Rustic Wood Rounds
    let pricePerUnit;
    if (qty === 1) {
        pricePerUnit = 54.99;
    } else if (qty >= 2 && qty <= 5) {
        pricePerUnit = 51.99;
    } else if (qty >= 6 && qty <= 10) {
        pricePerUnit = 45.99;
    }

    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;
    const itemName = qty > 1
        ? `${material} ${productName} (x${qty})`
        : `${material} ${productName}`;

    // Check if same item already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(productName)
    );

    if (existingIndex !== -1) {
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        });
        showNotification(`${itemName} added to cart! ($${pricePerUnit.toFixed(2)} each)`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
}

export function addTieredCoasterToCart(productName, productId) {
    const qtyInput = document.getElementById(productId + '-qty');
    const instructionsInput = document.getElementById(productId + '-instructions');

    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    const material = 'Wood';

    // Check for 11+ quantity - redirect to contact
    if (qty >= 11) {
        showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
        window.navigate('contact');
        return;
    }

    // Calculate tiered pricing for Round Basswood Plywood Coaster
    let pricePerUnit;
    if (qty === 1) {
        pricePerUnit = 5.99;
    } else if (qty >= 2 && qty <= 5) {
        pricePerUnit = 4.49;
    } else if (qty >= 6 && qty <= 10) {
        pricePerUnit = 2.49;
    }

    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;
    const itemName = qty > 1
        ? `${material} ${productName} (x${qty})`
        : `${material} ${productName}`;

    // Check if same item already in cart
    const existingIndex = cart.findIndex(item =>
        item.name.includes(productName)
    );

    if (existingIndex !== -1) {
        cart[existingIndex] = {
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        };
        showNotification(`${itemName} updated in cart!`, 'success');
    } else {
        cart.push({
            name: itemName,
            price: totalPrice,
            category: 'engraving',
            material: material,
            instructions: instructions,
            quantity: qty,
            pricePerUnit: pricePerUnit
        });
        showNotification(`${itemName} added to cart! ($${pricePerUnit.toFixed(2)} each)`, 'success');
    }

    saveCart();

    // Clear the form
    if (qtyInput) qtyInput.value = 1;
    if (instructionsInput) instructionsInput.value = '';
}

// Star Fidget size selector functions
export function updateStarFidgetPrice() {
    const select = document.getElementById('starFidgetSize');
    const priceDisplay = document.getElementById('starFidgetPrice');
    if (select && priceDisplay) {
        const price = select.value === 'medium' ? '$11.99' : '$6.99';
        priceDisplay.textContent = price;
    }
}

export function addStarFidgetToCart() {
    const select = document.getElementById('starFidgetSize');
    const size = select ? select.value : 'small';
    const price = size === 'medium' ? 11.99 : 6.99;
    const sizeName = size === 'medium' ? 'Medium' : 'Small';

    addToCart({
        name: `Star Fidget (${sizeName})`,
        price: price,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/star-fidget/fidget1.jpeg'
    });
}

export function addSpinnerToCart() {
    const select = document.getElementById('spinnerColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `Finger Fidget Spinner (${color})`,
        price: 8.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/finger-fidget-spinner/spinner1.jpeg'
    });
}

export function addFlexiFishToCart() {
    const select = document.getElementById('flexiFishColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `Flexi Fish (${color})`,
        price: 5.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flexi-fish/fish1.jpeg'
    });
}

export function addSnakeToCart() {
    const select = document.getElementById('snakeColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `3 Foot Snake (${color})`,
        price: 24.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/3-foot-snake/snake1.jpeg'
    });
}

export function addHeartGiftBoxToCart() {
    const select = document.getElementById('heartGiftBoxColor');
    const color = select ? select.value : 'Red';

    addToCart({
        name: `Heart Gift Box (${color})`,
        price: 19.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/heart-gift-box/decor1.jpeg'
    });
}

export function addMoonAndBackToCart() {
    const select = document.getElementById('moonAndBackColor');
    const color = select ? select.value : 'White';

    addToCart({
        name: `Moon and Back (${color})`,
        price: 12.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/moon-and-back/decor1.jpeg'
    });
}

export function addHeartCoasterSetToCart() {
    const select = document.getElementById('heartCoasterSetColor');
    const color = select ? select.value : 'Red';

    addToCart({
        name: `Heart Shaped Coaster Set (${color})`,
        price: 14.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/heart-shaped-coaster-set/decor1.jpeg'
    });
}

export function addRoundStarCoasterSetToCart() {
    const select = document.getElementById('roundStarCoasterSetColor');
    const color = select ? select.value : 'White';

    addToCart({
        name: `Round Star Coaster Set (${color})`,
        price: 14.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/round-star-coaster-set/decor1.jpeg'
    });
}

export function addSquareCoffeeBeanCoasterToCart() {
    const select = document.getElementById('squareCoffeeBeanCoasterColor');
    const color = select ? select.value : 'Brown';

    addToCart({
        name: `Square Coffee Bean Coaster (${color})`,
        price: 14.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/square-coffee-bean-coaster/decor1.jpeg'
    });
}

export function addHexagonShapedCoasterToCart() {
    const select = document.getElementById('hexagonShapedCoasterColor');
    const color = select ? select.value : 'Black';

    addToCart({
        name: `Hexagon Shaped Coaster (${color})`,
        price: 14.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/hexagon-shaped-coaster/decor1.jpeg'
    });
}

export function addOctagonFidgetToCart() {
    const select = document.getElementById('octagonFidgetColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `Octagon Fidget (${color})`,
        price: 4.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/octagon-fidget/fidget1.jpeg'
    });
}

export function addInfinityCubeToCart() {
    const select = document.getElementById('infinityCubeColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `Infinity Cube (${color})`,
        price: 8.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/infinity-cube/cube1.jpeg'
    });
}

export function addFlexiDinoToCart() {
    const select = document.getElementById('flexiDinoColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `Flexi Dinosaur (${color})`,
        price: 5.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flexi-dinosaur/dino1.jpeg'
    });
}

export function addSnailToCart() {
    const select = document.getElementById('snailColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `Snail (${color})`,
        price: 3.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/snail/snail1.jpeg'
    });
}

export function addTwistyLizardToCart() {
    const select = document.getElementById('twistyLizardColor');
    const color = select ? select.value : 'Yellow';

    addToCart({
        name: `Twisty Lizard (${color})`,
        price: 15.99,
        image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/twisty-lizard/lizard1.jpeg'
    });
}

export function removeFromCart(productName) {
    const idx = cart.findIndex(item => item.name === productName);
    if (idx !== -1) cart.splice(idx, 1);
    saveCart();
}

export function clearCart() {
    cart.length = 0;
    saveCart();
}

export function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price, 0);
}

export function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    const isOpen = sidebar.classList.contains('open');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    document.body.style.overflow = isOpen ? '' : 'hidden';
}

export function renderCartItems() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    const totalEl = document.getElementById('cartTotal');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-empty"><p>Your cart is empty</p><button class="btn btn-primary" onclick="toggleCart(); navigate(\'partydecor\')">Browse Products</button></div>';
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image" style="background-image: url('${item.image || ''}'); background-color: #f0f0f0"></div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.name}')">&times;</button>
        </div>
    `).join('');

    if (totalEl) {
        totalEl.textContent = '$' + getCartTotal();
    }
}

export function goToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    toggleCart();
    window.navigate('checkout');
    // renderCheckoutItems is called from checkout.js via window
    if (typeof window.renderCheckoutItems === 'function') {
        window.renderCheckoutItems();
    }
}

// showNotification is defined in checkout.js and exported to window
// Use window.showNotification as fallback, or define locally
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    // Inline fallback in case checkout.js not yet loaded
    const existing = document.querySelector('.cart-notification');
    if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.className = `cart-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// Global window exports for onclick handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.toggleCart = toggleCart;
window.goToCheckout = goToCheckout;
window.updateCartCount = updateCartCount;
window.addEngravingToCart = addEngravingToCart;
window.addEngravingToCartFromDetail = addEngravingToCartFromDetail;
window.addTieredEngravingToCart = addTieredEngravingToCart;
window.addTieredKeychainToCart = addTieredKeychainToCart;
window.addCustomKeychainToCart = addCustomKeychainToCart;
window.addCustomizableKeychainToCart = addCustomizableKeychainToCart;
window.addTieredAcrylicToCart = addTieredAcrylicToCart;
window.addTieredWoodRoundsToCart = addTieredWoodRoundsToCart;
window.addTieredCoasterToCart = addTieredCoasterToCart;
window.updateStarFidgetPrice = updateStarFidgetPrice;
window.addStarFidgetToCart = addStarFidgetToCart;
window.addSpinnerToCart = addSpinnerToCart;
window.addFlexiFishToCart = addFlexiFishToCart;
window.addSnakeToCart = addSnakeToCart;
window.addHeartGiftBoxToCart = addHeartGiftBoxToCart;
window.addMoonAndBackToCart = addMoonAndBackToCart;
window.addHeartCoasterSetToCart = addHeartCoasterSetToCart;
window.addRoundStarCoasterSetToCart = addRoundStarCoasterSetToCart;
window.addSquareCoffeeBeanCoasterToCart = addSquareCoffeeBeanCoasterToCart;
window.addHexagonShapedCoasterToCart = addHexagonShapedCoasterToCart;
window.addOctagonFidgetToCart = addOctagonFidgetToCart;
window.addInfinityCubeToCart = addInfinityCubeToCart;
window.addFlexiDinoToCart = addFlexiDinoToCart;
window.addSnailToCart = addSnailToCart;
window.addTwistyLizardToCart = addTwistyLizardToCart;
