        // Product Data
        // Products will be loaded from Supabase
        let products = [];
        
        // Fetch products from Supabase on page load
        async function loadProducts(skipInit) {
            try {
                const response = await fetch('https://nsedpvrqhxcikhlieize.supabase.co/rest/v1/products?select=*', {
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g'
                    }
                });

                const dbProducts = await response.json();

                // Transform database products to match app format
                products = dbProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    category: p.category,
                    price: p.price,
                    priceLabel: p.price_label,
                    description: p.description,
                    icon: p.emoji,
                    popular: p.featured,
                    image_url: p.image_url,
                    size: p.size,
                    material: p.material,
                    tieredPricing: p.tiered_pricing,
                    hasGallery: true
                }));

                // Attach images from productGalleryImages if available,
                // fall back to image_url from database
                products.forEach(product => {
                    if (typeof productGalleryImages !== 'undefined') {
                        const images = productGalleryImages[product.name];
                        if (images && images.length > 0) {
                            product.images = images;
                            return;
                        }
                    }
                    // Fallback: use the image_url from the database
                    if (product.image_url) {
                        product.images = [product.image_url];
                    }
                });

                // Set popular products (override database values)
                const popularProducts = ['Specialty Arch', 'Chiara Arch', 'Spiral Columns', 'Flower Walls', 'Balloon Centerpieces', 'Vases', 'Custom Lithophane'];
                products.forEach(product => {
                    product.popular = popularProducts.includes(product.name);
                });

                console.log('Loaded', products.length, 'products from Supabase');

                // Initialize the app after products are loaded (skip when refreshing from staff portal)
                if (!skipInit) {
                    initializeApp();
                }
            } catch (error) {
                console.error('Error loading products from Supabase:', error);
                // Fallback to empty array if fetch fails
                products = [];
                // Still initialize the app so event listeners are set up
                if (!skipInit) {
                    initializeApp();
                }
            }
        }

        // Wait for DOM to be ready, then load products
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                loadProducts();
                // Initialize staff portal immediately so login works even if products are loading
                initStaffPortal();
            });
        } else {
            // DOM already loaded
            loadProducts();
            initStaffPortal();
        }

        // Hero Slideshow
        function initHeroSlideshow() {
            const slideshow = document.getElementById('heroSlideshow');
            if (!slideshow) return;

            const images = slideshow.querySelectorAll('.slideshow-img');
            if (images.length <= 1) return;

            let currentIndex = 0;

            setInterval(() => {
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

        const gradients = {
            arches: 'linear-gradient(135deg, #667eea, #764ba2)',
            columns: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            walls: 'linear-gradient(135deg, #fa709a, #fee140)',
            centerpieces: 'linear-gradient(135deg, #f093fb, #f5576c)',
            services: 'linear-gradient(135deg, #43e97b, #38f9d7)',
            engraving: 'linear-gradient(135deg, #8B4513, #D2691E)',
            prints3d: 'linear-gradient(135deg, #00d2ff, #3a7bd5)'
        };
        const categoryLabels = {
            arches: 'Arches',
            columns: 'Columns',
            walls: 'Walls',
            centerpieces: 'Centerpieces',
            services: 'Services',
            engraving: 'Engraving',
            prints3d: '3D Prints'
        };


        let currentFilter = 'all';

        // Shopping Cart
        let cart = JSON.parse(localStorage.getItem('partyPalaceCart')) || [];

        function saveCart() {
            localStorage.setItem('partyPalaceCart', JSON.stringify(cart));
            updateCartCount();
            renderCartItems();
            updateShippingVisibility();
        }

        // Constants for shipping and tax
        const SHIPPING_RATE = 5.99;
        const FREE_SHIPPING_THRESHOLD = 49;
        const TAX_RATE = 0.07; // 7% Indiana sales tax

        // Check if cart has shippable products (3D prints or engraving)
        function cartHasProducts() {
            return cart.some(item => item.category === 'prints3d' || item.category === 'engraving');
        }

        // Check if cart has services only (party decor)
        function cartHasServicesOnly() {
            return cart.length > 0 && !cartHasProducts();
        }

        // Get subtotal of products only (3D prints, engraving)
        function getProductSubtotal() {
            return cart
                .filter(item => item.category === 'prints3d' || item.category === 'engraving')
                .reduce((sum, item) => sum + item.price, 0);
        }

        // Get subtotal of services only (party decor)
        function getServiceSubtotal() {
            return cart
                .filter(item => item.category !== 'prints3d' && item.category !== 'engraving')
                .reduce((sum, item) => sum + item.price, 0);
        }

        // Get discount amount (applied to products only)
        function getProductDiscount() {
            if (!appliedCouponCode || !validCoupons[appliedCouponCode]) return 0;
            const productSubtotal = getProductSubtotal();
            const discountPercent = validCoupons[appliedCouponCode].discount;
            return productSubtotal * (discountPercent / 100);
        }

        // Get discounted product subtotal
        function getDiscountedProductSubtotal() {
            return getProductSubtotal() - getProductDiscount();
        }

        // Calculate shipping cost (free over $49, otherwise $5.99) - based on original product subtotal
        function getShippingCost() {
            if (!cartHasProducts()) return 0;
            const productSubtotal = getProductSubtotal();
            return productSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATE;
        }

        // Calculate tax (7% on discounted products only)
        function getTaxAmount() {
            if (!cartHasProducts()) return 0;
            return getDiscountedProductSubtotal() * TAX_RATE;
        }

        // Get grand total including shipping and tax (with discount applied to products)
        function getGrandTotal() {
            const discountedProductSubtotal = getDiscountedProductSubtotal();
            const serviceSubtotal = getServiceSubtotal();
            const shipping = getShippingCost();
            const tax = getTaxAmount();
            return discountedProductSubtotal + serviceSubtotal + shipping + tax;
        }

        // Show/hide shipping address section based on cart contents
        function updateShippingVisibility() {
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

        function updateCartCount() {
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

        function addToCart(productNameOrObj) {
            let itemToAdd;

            // Handle both string (product name) and object (direct item) inputs
            if (typeof productNameOrObj === 'string') {
                const product = products.find(p => p.name === productNameOrObj);
                if (!product) return;

                itemToAdd = {
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    image: product.images ? product.images[0] : null
                };
            } else if (typeof productNameOrObj === 'object' && productNameOrObj !== null) {
                // Direct item object passed (e.g., from 3D print products with color)
                itemToAdd = {
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
        function addEngravingToCart(productName, basePrice, productId) {
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
        function addEngravingToCartFromDetail(productName, basePrice, productSlug) {
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
                    navigate('contact');
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
        function addTieredEngravingToCart(productName, productId) {
            const qtyInput = document.getElementById(productId + '-qty');
            const instructionsInput = document.getElementById(productId + '-instructions');

            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const instructions = instructionsInput ? instructionsInput.value.trim() : '';
            const material = getSelectedEngravingMaterial();

            // Check for 11+ quantity - redirect to contact
            if (qty >= 11) {
                showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
                navigate('contact');
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
        function addTieredKeychainToCart(productName, productId) {
            const qtyInput = document.getElementById(productId + '-qty');
            const instructionsInput = document.getElementById(productId + '-instructions');

            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const instructions = instructionsInput ? instructionsInput.value.trim() : '';
            const material = getSelectedEngravingMaterial();

            // Check for 11+ quantity - redirect to contact
            if (qty >= 11) {
                showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
                navigate('contact');
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

        function addCustomKeychainToCart(productName, productId) {
            const qtyInput = document.getElementById(productId + '-qty');
            const instructionsInput = document.getElementById(productId + '-instructions');

            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const instructions = instructionsInput ? instructionsInput.value.trim() : '';
            const material = getSelectedEngravingMaterial();

            // Check for 11+ quantity - redirect to contact
            if (qty >= 11) {
                showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
                navigate('contact');
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

        function addCustomizableKeychainToCart() {
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

        function addTieredAcrylicToCart(productName, productId) {
            const qtyInput = document.getElementById(productId + '-qty');
            const instructionsInput = document.getElementById(productId + '-instructions');

            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const instructions = instructionsInput ? instructionsInput.value.trim() : '';
            const material = 'Acrylic';

            // Check for 11+ quantity - redirect to contact
            if (qty >= 11) {
                showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
                navigate('contact');
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

        function addTieredWoodRoundsToCart(productName, productId) {
            const qtyInput = document.getElementById(productId + '-qty');
            const instructionsInput = document.getElementById(productId + '-instructions');

            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const instructions = instructionsInput ? instructionsInput.value.trim() : '';
            const material = 'Wood';

            // Check for 11+ quantity - redirect to contact
            if (qty >= 11) {
                showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
                navigate('contact');
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

        function addTieredCoasterToCart(productName, productId) {
            const qtyInput = document.getElementById(productId + '-qty');
            const instructionsInput = document.getElementById(productId + '-instructions');

            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const instructions = instructionsInput ? instructionsInput.value.trim() : '';
            const material = 'Wood';

            // Check for 11+ quantity - redirect to contact
            if (qty >= 11) {
                showNotification('For orders of 11+ items, please contact us for special pricing!', 'info');
                navigate('contact');
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
        function updateStarFidgetPrice() {
            const select = document.getElementById('starFidgetSize');
            const priceDisplay = document.getElementById('starFidgetPrice');
            if (select && priceDisplay) {
                const price = select.value === 'medium' ? '$11.99' : '$6.99';
                priceDisplay.textContent = price;
            }
        }

        function addStarFidgetToCart() {
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

        function addSpinnerToCart() {
            const select = document.getElementById('spinnerColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `Finger Fidget Spinner (${color})`,
                price: 8.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/finger-fidget-spinner/spinner1.jpeg'
            });
        }

        function addFlexiFishToCart() {
            const select = document.getElementById('flexiFishColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `Flexi Fish (${color})`,
                price: 5.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flexi-fish/fish1.jpeg'
            });
        }

        function addSnakeToCart() {
            const select = document.getElementById('snakeColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `3 Foot Snake (${color})`,
                price: 24.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/3-foot-snake/snake1.jpeg'
            });
        }

        function addHeartGiftBoxToCart() {
            const select = document.getElementById('heartGiftBoxColor');
            const color = select ? select.value : 'Red';

            addToCart({
                name: `Heart Gift Box (${color})`,
                price: 19.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/heart-gift-box/decor1.jpeg'
            });
        }

        function addMoonAndBackToCart() {
            const select = document.getElementById('moonAndBackColor');
            const color = select ? select.value : 'White';

            addToCart({
                name: `Moon and Back (${color})`,
                price: 12.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/moon-and-back/decor1.jpeg'
            });
        }

        function addHeartCoasterSetToCart() {
            const select = document.getElementById('heartCoasterSetColor');
            const color = select ? select.value : 'Red';

            addToCart({
                name: `Heart Shaped Coaster Set (${color})`,
                price: 14.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/heart-shaped-coaster-set/decor1.jpeg'
            });
        }

        function addRoundStarCoasterSetToCart() {
            const select = document.getElementById('roundStarCoasterSetColor');
            const color = select ? select.value : 'White';

            addToCart({
                name: `Round Star Coaster Set (${color})`,
                price: 14.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/round-star-coaster-set/decor1.jpeg'
            });
        }

        function addSquareCoffeeBeanCoasterToCart() {
            const select = document.getElementById('squareCoffeeBeanCoasterColor');
            const color = select ? select.value : 'Brown';

            addToCart({
                name: `Square Coffee Bean Coaster (${color})`,
                price: 14.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/square-coffee-bean-coaster/decor1.jpeg'
            });
        }

        function addHexagonShapedCoasterToCart() {
            const select = document.getElementById('hexagonShapedCoasterColor');
            const color = select ? select.value : 'Black';

            addToCart({
                name: `Hexagon Shaped Coaster (${color})`,
                price: 14.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/hexagon-shaped-coaster/decor1.jpeg'
            });
        }

        function addOctagonFidgetToCart() {
            const select = document.getElementById('octagonFidgetColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `Octagon Fidget (${color})`,
                price: 4.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/octagon-fidget/fidget1.jpeg'
            });
        }

        function addInfinityCubeToCart() {
            const select = document.getElementById('infinityCubeColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `Infinity Cube (${color})`,
                price: 8.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/infinity-cube/cube1.jpeg'
            });
        }

        function addFlexiDinoToCart() {
            const select = document.getElementById('flexiDinoColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `Flexi Dinosaur (${color})`,
                price: 5.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flexi-dinosaur/dino1.jpeg'
            });
        }

        function addSnailToCart() {
            const select = document.getElementById('snailColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `Snail (${color})`,
                price: 3.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/snail/snail1.jpeg'
            });
        }

        function addTwistyLizardToCart() {
            const select = document.getElementById('twistyLizardColor');
            const color = select ? select.value : 'Yellow';

            addToCart({
                name: `Twisty Lizard (${color})`,
                price: 15.99,
                image: 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/twisty-lizard/lizard1.jpeg'
            });
        }

        function removeFromCart(productName) {
            cart = cart.filter(item => item.name !== productName);
            saveCart();
        }

        function clearCart() {
            cart = [];
            saveCart();
        }

        function getCartTotal() {
            return cart.reduce((sum, item) => sum + item.price, 0);
        }

        // Coupon codes system
        const validCoupons = {
            'PARTY10': { discount: 10, description: '10% off' },
            'FUN30': { discount: 30, description: '30% off' },
            'FAMILY50': { discount: 50, description: '50% off' }
        };

        let appliedCouponCode = null;

        function applyCoupon() {
            const input = document.getElementById('couponCodeInput');
            const message = document.getElementById('couponMessage');
            const appliedDiv = document.getElementById('appliedCoupon');
            const appliedText = document.getElementById('appliedCouponText');

            if (!input) return;

            const code = input.value.trim().toUpperCase();

            if (!code) {
                showCouponMessage('Please enter a coupon code', 'error');
                return;
            }

            if (validCoupons[code]) {
                appliedCouponCode = code;
                const coupon = validCoupons[code];

                // Show applied coupon
                appliedText.textContent = `${code} - ${coupon.description} applied!`;
                appliedDiv.style.display = 'block';
                message.style.display = 'none';
                input.value = '';
                input.disabled = true;

                // Update totals
                updateCheckoutWithDiscount();
                showNotification(`Coupon applied: ${coupon.description}`, 'success');
            } else {
                showCouponMessage('Invalid coupon code', 'error');
                appliedCouponCode = null;
            }
        }

        function removeCoupon() {
            appliedCouponCode = null;
            const input = document.getElementById('couponCodeInput');
            const appliedDiv = document.getElementById('appliedCoupon');
            const discountRow = document.getElementById('discountRow');

            if (input) input.disabled = false;
            if (appliedDiv) appliedDiv.style.display = 'none';
            if (discountRow) discountRow.style.display = 'none';

            updateCheckoutWithDiscount();
            showNotification('Coupon removed', 'info');
        }

        function showCouponMessage(text, type) {
            const message = document.getElementById('couponMessage');
            if (!message) return;

            message.textContent = text;
            message.style.display = 'block';
            message.style.color = type === 'error' ? '#dc2626' : '#166534';

            setTimeout(() => {
                message.style.display = 'none';
            }, 3000);
        }

        function getDiscountedTotal() {
            const subtotal = getCartTotal();
            const productSubtotal = getProductSubtotal();
            const serviceSubtotal = getServiceSubtotal();

            if (appliedCouponCode && validCoupons[appliedCouponCode]) {
                const discountPercent = validCoupons[appliedCouponCode].discount;
                // Discount applies only to products, not services
                const discountAmount = productSubtotal * (discountPercent / 100);
                return {
                    subtotal: subtotal,
                    discountPercent: discountPercent,
                    discountAmount: discountAmount,
                    total: subtotal - discountAmount
                };
            }
            return {
                subtotal: subtotal,
                discountPercent: 0,
                discountAmount: 0,
                total: subtotal
            };
        }

        function updateCheckoutWithDiscount() {
            const totalEl = document.getElementById('checkoutTotal');
            const discountRow = document.getElementById('discountRow');
            const discountPercentEl = document.getElementById('discountPercent');
            const discountAmountEl = document.getElementById('discountAmount');
            const taxEl = document.getElementById('checkoutTax');
            const subtotalEl = document.getElementById('checkoutSubtotal');

            const pricing = getDiscountedTotal();
            const hasProducts = cartHasProducts();
            const shipping = getShippingCost();
            const tax = getTaxAmount();

            // Calculate final total including shipping and tax for products
            let finalTotal = pricing.total;
            if (hasProducts) {
                finalTotal = pricing.total + shipping + tax;
            }

            // Update subtotal display (discounted cart total before shipping/tax)
            if (subtotalEl) {
                subtotalEl.textContent = '$' + pricing.total.toFixed(2);
            }

            // Update tax display (tax is calculated on discounted product amount)
            if (taxEl) {
                taxEl.textContent = '$' + tax.toFixed(2);
            }

            // Update final total
            if (totalEl) {
                totalEl.textContent = '$' + finalTotal.toFixed(2);
            }

            // Update discount row display
            if (discountRow && pricing.discountPercent > 0) {
                discountRow.style.display = 'block';
                if (discountPercentEl) discountPercentEl.textContent = pricing.discountPercent;
                if (discountAmountEl) discountAmountEl.textContent = '-$' + pricing.discountAmount.toFixed(2);
            } else if (discountRow) {
                discountRow.style.display = 'none';
            }

            // Update payment button text
            updatePaymentButtonText();

            // Update payment options with discounted total
            initPaymentOptions();
        }

        function toggleCart() {
            const sidebar = document.getElementById('cartSidebar');
            const overlay = document.getElementById('cartOverlay');
            const isOpen = sidebar.classList.contains('open');

            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
            document.body.style.overflow = isOpen ? '' : 'hidden';
        }

        function renderCartItems() {
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
                    <div class="cart-item-image" style="background-image: url('${item.image || ''}'); background-color: ${gradients[item.category] ? '#f0f0f0' : '#f0f0f0'}"></div>
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

        function goToCheckout() {
            if (cart.length === 0) {
                showNotification('Your cart is empty!', 'error');
                return;
            }
            toggleCart();
            navigate('checkout');
            renderCheckoutItems();
        }

        // Deposit amount constant (minimum)
        const MIN_DEPOSIT_AMOUNT = 50;

        function renderCheckoutItems() {
            const container = document.getElementById('checkoutItems');
            const totalEl = document.getElementById('checkoutTotal');
            const cartTotalDisplay = document.getElementById('cartTotalDisplay');

            if (!container) return;

            container.innerHTML = cart.map(item => `
                <div class="checkout-item">
                    <span class="checkout-item-name">${item.name}</span>
                    <span class="checkout-item-price">$${item.price}</span>
                </div>
            `).join('');

            // Use discounted total if coupon is applied
            const pricing = getDiscountedTotal();
            const hasProducts = cartHasProducts();
            const shipping = getShippingCost();
            const tax = getTaxAmount();

            // Calculate final total including shipping and tax for products
            let finalTotal = pricing.total;
            if (hasProducts) {
                finalTotal = pricing.total + shipping + tax;
            }

            // Update subtotal, shipping, tax rows
            const subtotalRow = document.getElementById('subtotalRow');
            const shippingRow = document.getElementById('shippingRow');
            const taxRow = document.getElementById('taxRow');
            const subtotalEl = document.getElementById('checkoutSubtotal');
            const shippingEl = document.getElementById('checkoutShipping');
            const taxEl = document.getElementById('checkoutTax');
            const serviceNote = document.getElementById('serviceNote');
            const productNote = document.getElementById('productNote');

            if (hasProducts) {
                // Show shipping and tax rows for products
                if (subtotalRow) subtotalRow.style.display = 'block';
                if (shippingRow) shippingRow.style.display = 'block';
                if (taxRow) taxRow.style.display = 'block';
                if (subtotalEl) subtotalEl.textContent = '$' + pricing.total.toFixed(2);
                if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2);
                if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
                if (serviceNote) serviceNote.style.display = getServiceSubtotal() > 0 ? 'block' : 'none';
                if (productNote) productNote.style.display = 'block';
            } else {
                // Hide shipping and tax rows for services only
                if (subtotalRow) subtotalRow.style.display = 'none';
                if (shippingRow) shippingRow.style.display = 'none';
                if (taxRow) taxRow.style.display = 'none';
                if (serviceNote) serviceNote.style.display = 'block';
                if (productNote) productNote.style.display = 'none';
            }

            if (totalEl) {
                totalEl.textContent = '$' + finalTotal.toFixed(2);
            }
            if (cartTotalDisplay) {
                cartTotalDisplay.textContent = '$' + pricing.subtotal.toFixed(2);
            }

            // Update discount display
            const discountRow = document.getElementById('discountRow');
            const discountPercentEl = document.getElementById('discountPercent');
            const discountAmountEl = document.getElementById('discountAmount');

            if (discountRow && pricing.discountPercent > 0) {
                discountRow.style.display = 'block';
                if (discountPercentEl) discountPercentEl.textContent = pricing.discountPercent;
                if (discountAmountEl) discountAmountEl.textContent = '-$' + pricing.discountAmount.toFixed(2);
            } else if (discountRow) {
                discountRow.style.display = 'none';
            }

            // Update shipping visibility
            updateShippingVisibility();

            // Initialize payment options
            initPaymentOptions();

            // Set up coupon input Enter key listener
            const couponInput = document.getElementById('couponCodeInput');
            if (couponInput && !couponInput.dataset.listenerAdded) {
                couponInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCoupon();
                    }
                });
                couponInput.dataset.listenerAdded = 'true';
            }
        }

        // Payment option handling
        function initPaymentOptions() {
            const depositRadio = document.getElementById('paymentDeposit');
            const fullRadio = document.getElementById('paymentFull');
            const depositAmountSection = document.getElementById('depositAmountSection');
            const depositAmountInput = document.getElementById('depositAmountInput');
            const depositLabel = document.getElementById('depositOptionLabel');
            const fullLabel = document.getElementById('fullPaymentOptionLabel');

            if (!depositRadio || !fullRadio) return;

            function updatePaymentUI() {
                const isDeposit = depositRadio.checked;

                // Show/hide deposit amount input
                if (depositAmountSection) {
                    depositAmountSection.style.display = isDeposit ? 'block' : 'none';
                }

                // Update label styles
                if (depositLabel) {
                    depositLabel.style.borderColor = isDeposit ? 'var(--blue-primary)' : 'var(--gray-300)';
                    depositLabel.style.background = isDeposit ? '#EFF6FF' : 'white';
                }
                if (fullLabel) {
                    fullLabel.style.borderColor = !isDeposit ? 'var(--blue-primary)' : 'var(--gray-300)';
                    fullLabel.style.background = !isDeposit ? '#EFF6FF' : 'white';
                }

                // Update submit button text
                updatePaymentButtonText();
            }

            depositRadio.addEventListener('change', updatePaymentUI);
            fullRadio.addEventListener('change', updatePaymentUI);

            if (depositAmountInput) {
                depositAmountInput.addEventListener('input', updatePaymentButtonText);
            }

            // Initialize
            updatePaymentUI();
        }

        function updatePaymentButtonText() {
            const btnText = document.getElementById('checkoutBtnText');
            const depositRadio = document.getElementById('paymentDeposit');
            const depositAmountInput = document.getElementById('depositAmountInput');

            if (!btnText) return;

            // For product-only orders, show full amount (no deposit option)
            const hasProducts = cartHasProducts();
            const hasServices = getServiceSubtotal() > 0;
            const productsOnly = hasProducts && !hasServices;

            if (productsOnly) {
                const total = getGrandTotal();
                btnText.textContent = `Pay $${total.toFixed(2)} Now`;
            } else if (depositRadio && depositRadio.checked) {
                const amount = depositAmountInput ? parseInt(depositAmountInput.value) || MIN_DEPOSIT_AMOUNT : MIN_DEPOSIT_AMOUNT;
                btnText.textContent = `Pay $${amount} Deposit to Book`;
            } else {
                const pricing = getDiscountedTotal();
                btnText.textContent = `Pay $${pricing.total.toFixed(2)} in Full`;
            }
        }

        function getSelectedPaymentAmount() {
            // For product-only orders, always return full amount
            const hasProducts = cartHasProducts();
            const hasServices = getServiceSubtotal() > 0;
            const productsOnly = hasProducts && !hasServices;

            if (productsOnly) {
                return getGrandTotal();
            }

            const depositRadio = document.getElementById('paymentDeposit');
            const depositAmountInput = document.getElementById('depositAmountInput');

            if (depositRadio && depositRadio.checked) {
                const amount = depositAmountInput ? parseInt(depositAmountInput.value) || MIN_DEPOSIT_AMOUNT : MIN_DEPOSIT_AMOUNT;
                return Math.max(amount, MIN_DEPOSIT_AMOUNT); // Ensure minimum
            } else {
                const pricing = getDiscountedTotal();
                return pricing.total;
            }
        }

        function getPaymentType() {
            // For product-only orders, always return 'full'
            const hasProducts = cartHasProducts();
            const hasServices = getServiceSubtotal() > 0;
            const productsOnly = hasProducts && !hasServices;

            if (productsOnly) {
                return 'full';
            }

            const depositRadio = document.getElementById('paymentDeposit');
            return depositRadio && depositRadio.checked ? 'deposit' : 'full';
        }

        // Display order summary on success page
        function displaySuccessOrderSummary(orderInfo) {
            const summaryEl = document.getElementById('successOrderSummary');
            const messageEl = document.getElementById('successPaymentMessage');
            const amountPaidEl = document.getElementById('successAmountPaid');
            const orderTotalEl = document.getElementById('successOrderTotal');

            if (!summaryEl) return;

            // Update message
            if (messageEl) {
                messageEl.textContent = 'Your $' + orderInfo.amountPaid + ' deposit has been received. Your booking is now secured!';
            }

            // Show the summary section
            summaryEl.style.display = 'block';

            // Update amounts
            if (amountPaidEl) amountPaidEl.textContent = '$' + orderInfo.amountPaid;
            if (orderTotalEl) orderTotalEl.textContent = orderInfo.estimatedTotal ? ('$' + orderInfo.estimatedTotal + ' (estimated)') : 'To be confirmed';
        }

        // Save signed document to Supabase and send email notification
        async function saveSignedDocument(documentType, documentData) {
            try {
                const response = await fetch('https://nsedpvrqhxcikhlieize.supabase.co/functions/v1/save-signed-document', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g'
                    },
                    body: JSON.stringify({
                        documentType: documentType,
                        documentData: documentData
                    })
                });

                if (!response.ok) {
                    console.error('Failed to save signed document');
                }
            } catch (error) {
                console.error('Error saving signed document:', error);
                // Don't block the user - localStorage is the primary storage
            }
        }

        function showNotification(message, type = 'info') {
            // Remove existing notification
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

        // Initialize Stripe
        const stripe = Stripe('pk_test_51Ss8GcRqRN4ptpIlzNOiVPtsFZa1NPtmFAKU29aKRxzLKzsabhsNu81Ozn1Kmjv0B6dwN9n22TJPjvKhayF9zg2100EoROvh9I');

        async function handleCheckoutSubmit(event) {
            event.preventDefault();

            const statusEl = document.getElementById('checkoutFormStatus');
            const submitBtn = document.getElementById('checkoutSubmitBtn');
            const btnText = document.getElementById('checkoutBtnText');

            const paymentType = getPaymentType();
            const paymentAmount = getSelectedPaymentAmount();
            const hasProducts = cartHasProducts();

            // Get shipping address if cart has products
            const shippingAddress = hasProducts ? {
                address: document.getElementById('checkoutAddress')?.value || '',
                city: document.getElementById('checkoutCity')?.value || '',
                state: document.getElementById('checkoutState')?.value || 'IN',
                zip: document.getElementById('checkoutZip')?.value || ''
            } : null;

            const formData = {
                name: document.getElementById('checkoutName').value,
                email: document.getElementById('checkoutEmail').value,
                phone: document.getElementById('checkoutPhone').value,
                eventDate: document.getElementById('checkoutEventDate')?.value || '',
                eventType: document.getElementById('checkoutEventType')?.value || '',
                venue: document.getElementById('checkoutVenue')?.value || '',
                notes: document.getElementById('checkoutNotes').value,
                items: cart.map(item => `${item.name} ($${item.price})`).join(', '),
                estimatedTotal: getCartTotal(),
                paymentType: paymentType,
                amountPaid: paymentAmount,
                shippingAddress: shippingAddress
            };

            // Validate cart is not empty
            if (cart.length === 0) {
                statusEl.innerHTML = '<div class="form-error">Your cart is empty. Please add items before checkout.</div>';
                return;
            }

            // Validate shipping address for products
            if (hasProducts && shippingAddress) {
                if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.zip) {
                    statusEl.innerHTML = '<div class="form-error">Please fill in your complete shipping address.</div>';
                    return;
                }
            }

            // Validate deposit amount (only for services)
            if (!hasProducts && paymentType === 'deposit' && paymentAmount < MIN_DEPOSIT_AMOUNT) {
                statusEl.innerHTML = `<div class="form-error">Minimum deposit amount is $${MIN_DEPOSIT_AMOUNT}.</div>`;
                return;
            }

            submitBtn.disabled = true;
            submitBtn.classList.add('animation');
            statusEl.innerHTML = '';

            // Calculate shipping, tax, and discount for products
            const shipping = getShippingCost();
            const tax = getTaxAmount();
            const discount = getProductDiscount();

            try {
                // Store order info in localStorage for retrieval after payment
                localStorage.setItem('partyPalaceOrderInfo', JSON.stringify(formData));

                // Create Checkout Session via Supabase Edge Function
                const response = await fetch('https://nsedpvrqhxcikhlieize.supabase.co/functions/v1/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g'
                    },
                    body: JSON.stringify({
                        items: cart,
                        customerInfo: formData,
                        paymentType: paymentType,
                        paymentAmount: paymentAmount,
                        hasProducts: hasProducts,
                        shipping: shipping,
                        tax: tax,
                        discount: discount,
                        shippingAddress: shippingAddress
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to create checkout session');
                }

                const { url } = await response.json();

                // Show truck animation completing then redirect to Stripe
                setTimeout(() => {
                    submitBtn.classList.add('done');
                }, 1800);

                // Redirect to Stripe Checkout after animation
                setTimeout(() => {
                    window.location.href = url;
                }, 2500);

            } catch (error) {
                console.error('Checkout error:', error);

                // Fallback: Use email submission if Stripe fails
                statusEl.innerHTML = `
                    <div class="form-error">
                        Payment system temporarily unavailable.
                        <br><br>
                        <button type="button" onclick="submitViaEmail()" class="btn btn-outline" style="margin-top: 0.5rem;">
                            Submit Order via Email Instead
                        </button>
                    </div>
                `;

                submitBtn.disabled = false;
                submitBtn.classList.remove('animation');
                submitBtn.classList.remove('done');
            }
        }

        // Fallback email submission
        function submitViaEmail() {
            const formData = JSON.parse(localStorage.getItem('partyPalaceOrderInfo') || '{}');

            const subject = encodeURIComponent(`New Order Request from ${formData.name}`);
            const body = encodeURIComponent(`
New Order Request

Customer Information:
- Name: ${formData.name}
- Email: ${formData.email}
- Phone: ${formData.phone}

Event Details:
- Date: ${formData.eventDate}
- Type: ${formData.eventType}
- Venue: ${formData.venue || 'Not specified'}

Order Items:
${cart.map(item => `- ${item.name}: $${item.price}`).join('\n')}

Estimated Total: $${formData.total}

Additional Notes:
${formData.notes || 'None'}

NOTE: This order was submitted via email fallback. Payment was not collected online.
            `.trim());

            window.location.href = `mailto:partypalace.in@gmail.com?subject=${subject}&body=${body}`;

            // Clear cart
            clearCart();

            showNotification('Order submitted via email!', 'success');
        }
        // Navigation
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
            }

            // Reset "Did we make your day better" section when navigating to home
            if (page === 'home') {
                resetLoveQuestionSection();
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
                // Get order info before clearing
                const orderInfo = JSON.parse(localStorage.getItem('partyPalaceOrderInfo') || '{}');

                // Display order summary if available
                if (orderInfo.paymentType) {
                    displaySuccessOrderSummary(orderInfo);
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
        // Product Card HTML
        function createProductCard(product, isService = false) {
            // Generate product slug for URL
            const productSlug = product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            // Check if product has real images
            const hasImages = product.images && product.images.length > 0;
            const hasSecondImage = product.images && product.images.length > 1;
            const imageContent = hasImages
                ? `<img src="${product.images[0]}" alt="${product.name}" class="primary-image" style="width: 100%; height: 100%; object-fit: contain; object-position: center;">${hasSecondImage ? `<img src="${product.images[1]}" alt="${product.name} alternate view" class="secondary-image">` : ''}`
                : `<span>${product.icon}</span>`;
            const imageStyle = hasImages
                ? 'background: var(--gray-50);'
                : `background: ${gradients[product.category]}`;
            const imageClass = hasSecondImage ? 'has-secondary' : '';
            
            return `
                <div class="product-card product-card-clickable" onclick="navigateToProduct('${productSlug}')" data-product-slug="${productSlug}">
                    <div class="product-image ${imageClass}" style="${imageStyle}">
                        ${imageContent}
                        ${product.popular ? '<div class="product-badge">Popular</div>' : ''}
                    </div>
                    <div class="product-info">
                        <div class="product-category">${isService ? 'Service' : categoryLabels[product.category]}</div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-description">${product.description}</div>
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
        
        // ============================================
        // PRODUCT DETAIL PAGE FUNCTIONS
        // ============================================
        
        // Navigate to individual product page
        function navigateToProduct(slug) {
            const product = getProductBySlug(slug);
            if (product) {
                renderProductDetail(product);
                navigate('product', true, 'product-' + slug);
            }
        }

        // Book consultation - navigate to contact page with product info pre-filled
        function bookConsultation(productName, productPrice) {
            // Store selected product info for the contact form
            window.consultationProduct = {
                name: productName,
                price: productPrice
            };

            // Navigate to contact page and select the Party Decor form
            navigate('contact');

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
        function getProductBySlug(slug) {
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
        function renderProductDetail(product) {
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
                ? `<img src="${product.images[0]}" alt="${product.name}" id="productMainImage" onclick="openProductLightbox(0)" style="cursor: pointer;">`
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
                            <img src="${img}" alt="${product.name} ${idx + 1}">
                        </div>
                    `).join('')}
                </div>`;
            }
            
            // Generate features based on category
            const features = getProductFeatures(product);
            
            container.innerHTML = `
                <div class="product-detail-header">
                    <button class="product-detail-back" onclick="navigate('${backPage}')">
                        â† Back to ${backLabel}
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
                        <h1 class="product-detail-title">${product.name}</h1>
                        <div class="product-detail-price">
                            <span class="label">${product.category === 'engraving' ? 'Price' : 'Starting at'}</span>
                            <span class="amount">$${product.price}</span>
                        </div>
                        <p class="product-detail-description">${product.description}</p>
                        ${(product.category === 'prints3d' || product.category === 'engraving') ? '<span class="product-detail-processing">ðŸ• Processing: 3-10 business days</span>' : ''}

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
        }
        
        // Change main product image (for thumbnail clicks)
        function changeProductImage(src, thumb, index) {
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
        function renderCatalog() {
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

            document.getElementById('productsGrid').innerHTML = filtered.map(p => createProductCard(p)).join('');
        }
        // Render Services
        function renderServices() {
            const services = products.filter(p => p.category === 'services');
            document.getElementById('servicesGrid').innerHTML = services.map(p => createProductCard(p, true)).join('');
        }
        // Filter Products
        function filterProducts(category) {
            currentFilter = category;

            // Update filter buttons
            document.querySelectorAll('#catalogFilterButtons .filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });

            renderCatalog();
        }

        // Filter Engraving Products by Material
        function filterEngravingProducts(material) {
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
        function filter3DProducts(category) {
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
            navigate('contact');
            setTimeout(() => {
                document.getElementById('contactMessage').value = `I'm interested in getting a quote for: ${productName}`;
            }, 100);
        }
        // Format Phone
        function formatPhone(input) {
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
        // Form Submit
        // Contact page service selection
        function selectContactService(service) {
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

        async function handleSubmit(e) {
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
                statusDiv.textContent = 'âœ— Please fill in all required fields.';
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                statusDiv.className = 'form-status error';
                statusDiv.textContent = 'âœ— Please enter a valid email address.';
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
                    statusDiv.textContent = "âœ“ Thank you! Your message has been sent. We'll contact you within 24 hours.";
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
                statusDiv.textContent = 'âœ— Sorry, there was an error sending your message. Please try calling us at 219-344-2416.';
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }

            setTimeout(() => {
                statusDiv.className = 'form-status';
                statusDiv.textContent = '';
            }, 5000);
        }

        // Update product dropdown based on order type selection
        function updateProductOptions() {
            const orderType = document.getElementById('customOrderType').value;
            const productGroup = document.getElementById('productSelectGroup');
            const productSelect = document.getElementById('customOrderProduct');
            const printOptions = document.getElementById('printOptionsGroup');
            const engravingOptions = document.getElementById('engravingOptionsGroup');

            if (!orderType) {
                productGroup.style.display = 'none';
                productSelect.required = false;
                return;
            }

            // Show the product dropdown
            productGroup.style.display = 'block';
            productSelect.required = true;
            productSelect.value = ''; // Reset selection

            // Show/hide option groups based on order type
            if (orderType === '3d-print') {
                printOptions.style.display = 'block';
                engravingOptions.style.display = 'none';
            } else if (orderType === 'engraving') {
                printOptions.style.display = 'none';
                engravingOptions.style.display = 'block';
            } else if (orderType === 'both') {
                printOptions.style.display = 'block';
                engravingOptions.style.display = 'block';
            }
        }

        async function handleCustomOrderSubmit(e) {
            e.preventDefault();

            const name = document.getElementById('customOrderName').value.trim();
            const email = document.getElementById('customOrderEmail').value.trim();
            const phone = document.getElementById('customOrderPhone').value.trim();
            const orderType = document.getElementById('customOrderType').value;
            const product = document.getElementById('customOrderProduct').value;
            const description = document.getElementById('customOrderDescription').value.trim();
            const honeypot = document.getElementById('customOrderWebsite')?.value || '';
            const statusDiv = document.getElementById('customOrderFormStatus');
            const submitBtn = e.target.querySelector('button[type="submit"]');

            if (!name || !email || !phone || !orderType || !product || !description) {
                statusDiv.className = 'form-status error';
                statusDiv.textContent = 'âœ— Please fill in all required fields.';
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                statusDiv.className = 'form-status error';
                statusDiv.textContent = 'âœ— Please enter a valid email address.';
                return;
            }

            // Show sending status
            statusDiv.className = 'form-status';
            statusDiv.textContent = 'Sending...';
            if (submitBtn) submitBtn.disabled = true;

            try {
                const response = await fetch('https://nsedpvrqhxcikhlieize.supabase.co/functions/v1/send-contact-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g'
                    },
                    body: JSON.stringify({
                        formType: 'customOrder',
                        formData: { name, email, phone, orderType, product, description },
                        honeypot
                    })
                });

                if (response.ok) {
                    statusDiv.className = 'form-status success';
                    statusDiv.textContent = "âœ“ Thank you! Your custom order request has been received. We'll contact you within 24-48 hours with a quote.";
                    document.getElementById('customOrderContactForm').reset();
                } else {
                    throw new Error('Failed to send');
                }
            } catch (error) {
                console.error('Error sending custom order form:', error);
                statusDiv.className = 'form-status error';
                statusDiv.textContent = 'âœ— Sorry, there was an error sending your request. Please try calling us at 219-344-2416.';
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }

            setTimeout(() => {
                statusDiv.className = 'form-status';
                statusDiv.textContent = '';
            }, 5000);
        }

        // ============================================
        // LIABILITY WAIVER MODAL SYSTEM
        // ============================================
        
        const WaiverModal = {
            // Storage key for localStorage
            STORAGE_KEY: 'partypalace_waiver_signed',
            
            // Initialize the waiver system
            init: function() {
                this.loadSavedState();
                this.bindEvents();
                this.updateUI();
            },
            
            // Open the modal
            open: function() {
                const modal = document.getElementById('waiverModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                    // Focus the modal for accessibility
                    modal.querySelector('.waiver-modal-content').focus();
                }
            },
            
            // Close the modal
            close: function() {
                const modal = document.getElementById('waiverModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                }
            },
            
            // Validate the waiver form
            validate: function() {
                const checkbox = document.getElementById('waiverCheckbox');
                const fullName = document.getElementById('waiverFullName');
                const signature = document.getElementById('waiverSignature');
                const date = document.getElementById('waiverDate');
                const errorDiv = document.getElementById('waiverError');
                
                let errors = [];
                
                // Check checkbox
                if (!checkbox.checked) {
                    errors.push('You must agree to the Liability Waiver');
                }
                
                // Check full name
                if (!fullName.value.trim()) {
                    errors.push('Please enter your full name');
                }
                
                // Check signature (must not be empty)
                if (!signature.value.trim()) {
                    errors.push('Please type your signature');
                }
                
                // Check date
                if (!date.value) {
                    errors.push('Please select a date');
                }
                
                // Show errors or proceed
                if (errors.length > 0) {
                    errorDiv.innerHTML = 'âœ— ' + errors.join('<br>âœ— ');
                    errorDiv.style.display = 'block';
                    return false;
                }
                
                errorDiv.style.display = 'none';
                return true;
            },
            
            // Sign the waiver
            sign: function() {
                if (!this.validate()) {
                    return;
                }
                
                const fullName = document.getElementById('waiverFullName').value.trim();
                const signature = document.getElementById('waiverSignature').value.trim();
                const date = document.getElementById('waiverDate').value;
                
                // Save to localStorage
                const waiverData = {
                    accepted: true,
                    name: fullName,
                    signature: signature,
                    date: date,
                    timestamp: new Date().toISOString()
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(waiverData));

                // Save to Supabase and send email notification
                saveSignedDocument('waiver', {
                    fullName: fullName,
                    signature: signature,
                    date: date,
                    accepted: true,
                    timestamp: waiverData.timestamp
                });

                // Update hidden form inputs
                this.updateHiddenInputs(waiverData);

                // Update UI (both waiver and booking button)
                this.updateUI();
                if (typeof BookingGate !== 'undefined') {
                    BookingGate.updateSubmitButton();
                    BookingGate.updateCheckoutDocumentStatus();
                }

                // Close modal
                this.close();
            },
            
            // Load saved state from localStorage
            loadSavedState: function() {
                const saved = localStorage.getItem(this.STORAGE_KEY);
                if (saved) {
                    try {
                        const waiverData = JSON.parse(saved);
                        if (waiverData.accepted) {
                            this.updateHiddenInputs(waiverData);
                            // Pre-fill form fields
                            const fullName = document.getElementById('waiverFullName');
                            const signature = document.getElementById('waiverSignature');
                            const date = document.getElementById('waiverDate');
                            const checkbox = document.getElementById('waiverCheckbox');
                            
                            if (fullName) fullName.value = waiverData.name || '';
                            if (signature) signature.value = waiverData.signature || '';
                            if (date) date.value = waiverData.date || '';
                            if (checkbox) checkbox.checked = true;
                        }
                    } catch (e) {
                        console.error('Error loading waiver state:', e);
                    }
                }
            },
            
            // Update hidden form inputs
            updateHiddenInputs: function(data) {
                const inputs = {
                    'waiver_accepted': data.accepted ? 'true' : 'false',
                    'waiver_name': data.name || '',
                    'waiver_signature': data.signature || '',
                    'waiver_date': data.date || ''
                };
                
                for (const [id, value] of Object.entries(inputs)) {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = value;
                    }
                }
            },
            
            // Update UI based on signed state
            updateUI: function() {
                const saved = localStorage.getItem(this.STORAGE_KEY);
                const isSigned = saved && JSON.parse(saved).accepted;
                
                // Update waiver status indicator
                const statusIndicator = document.getElementById('waiverStatus');
                if (statusIndicator) {
                    if (isSigned) {
                        statusIndicator.innerHTML = '<span style="color: #059669;">âœ“ Waiver Signed</span>';
                        statusIndicator.className = 'waiver-status signed';
                    } else {
                        statusIndicator.innerHTML = '<span style="color: #DC2626;">âš  Waiver Required</span>';
                        statusIndicator.className = 'waiver-status unsigned';
                    }
                }
                
                // Update booking submit button state
                // REPLACE THIS SELECTOR IF NEEDED - targets booking form submit button
                const bookingSubmitBtn = document.getElementById('bookingSubmitBtn') || 
                                         document.querySelector('.booking-form button[type="submit"]') ||
                                         document.querySelector('#bookingForm button[type="submit"]');
                
                if (bookingSubmitBtn) {
                    bookingSubmitBtn.disabled = !isSigned;
                    if (!isSigned) {
                        bookingSubmitBtn.classList.add('btn-disabled');
                        bookingSubmitBtn.title = 'Please sign the liability waiver first';
                    } else {
                        bookingSubmitBtn.classList.remove('btn-disabled');
                        bookingSubmitBtn.title = '';
                    }
                }
            },
            
            // Check waiver before form submission
            checkBeforeSubmit: function(e) {
                const saved = localStorage.getItem(WaiverModal.STORAGE_KEY);
                const isSigned = saved && JSON.parse(saved).accepted;
                
                if (!isSigned) {
                    e.preventDefault();
                    
                    // Show inline error
                    const errorDiv = document.getElementById('bookingWaiverError');
                    if (errorDiv) {
                        errorDiv.style.display = 'block';
                        errorDiv.innerHTML = 'âœ— You must sign the Liability Waiver before completing your booking.';
                    }
                    
                    // Open the modal
                    WaiverModal.open();
                    
                    return false;
                }
                return true;
            },
            
            // Bind event listeners
            bindEvents: function() {
                // Open modal button
                const openBtn = document.getElementById('openWaiverBtn');
                if (openBtn) {
                    openBtn.addEventListener('click', () => this.open());
                }
                
                // Close modal button
                const closeBtn = document.getElementById('closeWaiverModal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }
                
                // Sign button
                const signBtn = document.getElementById('signWaiverBtn');
                if (signBtn) {
                    signBtn.addEventListener('click', () => this.sign());
                }
                
                // Close on backdrop click
                const modal = document.getElementById('waiverModal');
                if (modal) {
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            this.close();
                        }
                    });
                }
                
                // Close on Escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.close();
                    }
                });
                
                // Gate booking form submission
                // REPLACE THIS SELECTOR IF NEEDED
                const bookingForm = document.getElementById('bookingForm') ||
                                   document.querySelector('.booking-form');
                if (bookingForm) {
                    bookingForm.addEventListener('submit', this.checkBeforeSubmit);
                }
            },
            
            // Clear saved waiver (for testing/admin)
            clear: function() {
                localStorage.removeItem(this.STORAGE_KEY);
                this.updateUI();
                if (typeof BookingGate !== 'undefined') {
                    BookingGate.updateSubmitButton();
                    BookingGate.updateCheckoutDocumentStatus();
                }
                // Reset form fields
                const checkbox = document.getElementById('waiverCheckbox');
                const fullName = document.getElementById('waiverFullName');
                const signature = document.getElementById('waiverSignature');
                const date = document.getElementById('waiverDate');
                if (checkbox) checkbox.checked = false;
                if (fullName) fullName.value = '';
                if (signature) signature.value = '';
                if (date) date.value = '';
            }
        };

        // ============================================
        // PARTY DECOR & RENTALS AGREEMENT MODAL SYSTEM
        // ============================================
        
        const ContractModal = {
            // Storage key for localStorage
            STORAGE_KEY: 'partypalace_contract_signed',
            
            // Initialize the contract system
            init: function() {
                this.loadSavedState();
                this.bindEvents();
                this.updateUI();
            },
            
            // Open the modal
            open: function() {
                const modal = document.getElementById('contractModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                    // Focus the modal for accessibility
                    modal.querySelector('.waiver-modal-content').focus();
                }
            },
            
            // Close the modal
            close: function() {
                const modal = document.getElementById('contractModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                }
            },
            
            // Normalize string for comparison (lowercase, trim, collapse spaces)
            normalizeString: function(str) {
                return str.toLowerCase().trim().replace(/\s+/g, ' ');
            },
            
            // Validate the contract form
            validate: function() {
                const checkbox = document.getElementById('contractCheckbox');
                const fullName = document.getElementById('contractFullName');
                const signature = document.getElementById('contractSignature');
                const eventDate = document.getElementById('contractEventDate');
                const date = document.getElementById('contractDate');
                const errorDiv = document.getElementById('contractError');
                
                let errors = [];
                
                // Check checkbox
                if (!checkbox.checked) {
                    errors.push('You must agree to the Party Palace Agreement');
                }
                
                // Check full name
                if (!fullName.value.trim()) {
                    errors.push('Please enter your full name');
                }
                
                // Check signature (must not be empty AND must match full name)
                if (!signature.value.trim()) {
                    errors.push('Please type your signature');
                } else if (fullName.value.trim() && this.normalizeString(signature.value) !== this.normalizeString(fullName.value)) {
                    errors.push('Typed signature must match your full name exactly');
                }
                
                // Check event date
                if (!eventDate.value) {
                    errors.push('Please select your event date');
                }
                
                // Check today's date
                if (!date.value) {
                    errors.push('Please select today\'s date');
                }
                
                // Show errors or proceed
                if (errors.length > 0) {
                    errorDiv.innerHTML = 'âœ— ' + errors.join('<br>âœ— ');
                    errorDiv.style.display = 'block';
                    return false;
                }
                
                errorDiv.style.display = 'none';
                return true;
            },
            
            // Sign the contract
            sign: function() {
                if (!this.validate()) {
                    return;
                }
                
                const fullName = document.getElementById('contractFullName').value.trim();
                const signature = document.getElementById('contractSignature').value.trim();
                const eventDate = document.getElementById('contractEventDate').value;
                const date = document.getElementById('contractDate').value;
                
                // Save to localStorage
                const contractData = {
                    accepted: true,
                    name: fullName,
                    signature: signature,
                    eventDate: eventDate,
                    date: date,
                    timestamp: new Date().toISOString()
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contractData));

                // Save to Supabase and send email notification
                saveSignedDocument('contract', {
                    fullName: fullName,
                    signature: signature,
                    eventDate: eventDate,
                    date: date,
                    accepted: true,
                    timestamp: contractData.timestamp
                });

                // Update hidden form inputs
                this.updateHiddenInputs(contractData);

                // Update UI (both contract and booking button)
                this.updateUI();
                BookingGate.updateSubmitButton();
                BookingGate.updateCheckoutDocumentStatus();

                // Close modal
                this.close();
            },
            
            // Load saved state from localStorage
            loadSavedState: function() {
                const saved = localStorage.getItem(this.STORAGE_KEY);
                if (saved) {
                    try {
                        const contractData = JSON.parse(saved);
                        if (contractData.accepted) {
                            this.updateHiddenInputs(contractData);
                            // Pre-fill form fields
                            const fullName = document.getElementById('contractFullName');
                            const signature = document.getElementById('contractSignature');
                            const eventDate = document.getElementById('contractEventDate');
                            const date = document.getElementById('contractDate');
                            const checkbox = document.getElementById('contractCheckbox');
                            
                            if (fullName) fullName.value = contractData.name || '';
                            if (signature) signature.value = contractData.signature || '';
                            if (eventDate) eventDate.value = contractData.eventDate || '';
                            if (date) date.value = contractData.date || '';
                            if (checkbox) checkbox.checked = true;
                        }
                    } catch (e) {
                        console.error('Error loading contract state:', e);
                    }
                }
            },
            
            // Update hidden form inputs
            updateHiddenInputs: function(data) {
                const inputs = {
                    'contract_accepted': data.accepted ? 'true' : 'false',
                    'contract_name': data.name || '',
                    'contract_signature': data.signature || '',
                    'contract_date': data.date || '',
                    'contract_event_date': data.eventDate || ''
                };
                
                for (const [id, value] of Object.entries(inputs)) {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = value;
                    }
                }
            },
            
            // Update UI based on signed state
            updateUI: function() {
                const saved = localStorage.getItem(this.STORAGE_KEY);
                const isSigned = saved && JSON.parse(saved).accepted;
                
                // Update contract status indicator
                const statusIndicator = document.getElementById('contractStatus');
                if (statusIndicator) {
                    if (isSigned) {
                        statusIndicator.innerHTML = '<span style="color: #059669;">âœ“ Contract Signed</span>';
                        statusIndicator.className = 'waiver-status signed';
                    } else {
                        statusIndicator.innerHTML = '<span style="color: #DC2626;">âš  Contract Required</span>';
                        statusIndicator.className = 'waiver-status unsigned';
                    }
                }
            },
            
            // Bind event listeners
            bindEvents: function() {
                // Open modal button
                const openBtn = document.getElementById('openContractBtn');
                if (openBtn) {
                    openBtn.addEventListener('click', () => this.open());
                }
                
                // Close modal button
                const closeBtn = document.getElementById('closeContractModal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }
                
                // Sign button
                const signBtn = document.getElementById('signContractBtn');
                if (signBtn) {
                    signBtn.addEventListener('click', () => this.sign());
                }
                
                // Close on backdrop click
                const modal = document.getElementById('contractModal');
                if (modal) {
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            this.close();
                        }
                    });
                }
                
                // Close on Escape key (shared with waiver modal)
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.close();
                    }
                });
            },
            
            // Clear saved contract (for testing/admin)
            clear: function() {
                localStorage.removeItem(this.STORAGE_KEY);
                this.updateUI();
                BookingGate.updateSubmitButton();
                BookingGate.updateCheckoutDocumentStatus();
                // Reset form fields
                const checkbox = document.getElementById('contractCheckbox');
                const fullName = document.getElementById('contractFullName');
                const signature = document.getElementById('contractSignature');
                const eventDate = document.getElementById('contractEventDate');
                const date = document.getElementById('contractDate');
                if (checkbox) checkbox.checked = false;
                if (fullName) fullName.value = '';
                if (signature) signature.value = '';
                if (eventDate) eventDate.value = '';
                if (date) date.value = '';
            }
        };

        // ============================================
        // NO REFUND POLICY MODAL (3D Prints & Engraving)
        // ============================================

        const NoRefundModal = {
            // Initialize the modal
            init: function() {
                this.bindEvents();
            },

            // Open the modal
            open: function() {
                const modal = document.getElementById('noRefundModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                    modal.querySelector('.waiver-modal-content').focus();
                }
            },

            // Close the modal
            close: function() {
                const modal = document.getElementById('noRefundModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                }
            },

            // Bind event listeners
            bindEvents: function() {
                // Open modal button
                const openBtn = document.getElementById('openNoRefundBtn');
                if (openBtn) {
                    openBtn.addEventListener('click', () => this.open());
                }

                // Close modal button
                const closeBtn = document.getElementById('closeNoRefundModal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }

                // Close on backdrop click
                const modal = document.getElementById('noRefundModal');
                if (modal) {
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            this.close();
                        }
                    });
                }

                // Close on Escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        const modal = document.getElementById('noRefundModal');
                        if (modal && modal.style.display === 'flex') {
                            this.close();
                        }
                    }
                });
            }
        };

        // ============================================
        // BOOKING GATE - REQUIRES BOTH DOCUMENTS SIGNED
        // ============================================
        
        const BookingGate = {
            // Check if waiver is signed
            isWaiverSigned: function() {
                const saved = localStorage.getItem(WaiverModal.STORAGE_KEY);
                return saved && JSON.parse(saved).accepted;
            },
            
            // Check if contract is signed
            isContractSigned: function() {
                const saved = localStorage.getItem(ContractModal.STORAGE_KEY);
                return saved && JSON.parse(saved).accepted;
            },
            
            // Check if both documents are signed
            areBothSigned: function() {
                return this.isWaiverSigned() && this.isContractSigned();
            },
            
            // Update the checkout submit button state
            updateSubmitButton: function() {
                // Target the checkout form submit button
                const checkoutSubmitBtn = document.getElementById('checkoutSubmitBtn');
                const agreementCheckbox = document.getElementById('agreementCheckbox');
                const noRefundCheckbox = document.getElementById('noRefundCheckbox');

                // Check if cart has products vs services
                const hasProducts = cartHasProducts();
                const hasServices = getServiceSubtotal() > 0;
                const productsOnly = hasProducts && !hasServices;

                const noRefundChecked = noRefundCheckbox ? noRefundCheckbox.checked : false;

                let allComplete;
                let missing = [];

                if (productsOnly) {
                    // For product-only orders, only require noRefundCheckbox
                    allComplete = noRefundChecked;
                    if (!noRefundChecked) missing.push('no refund policy checkbox');
                } else {
                    // For services (or mixed orders), require all documents and checkboxes
                    const bothSigned = this.areBothSigned();
                    const agreementChecked = agreementCheckbox ? agreementCheckbox.checked : false;
                    allComplete = bothSigned && agreementChecked && (hasProducts ? noRefundChecked : true);
                    if (!this.isContractSigned()) missing.push('Party Palace Agreement');
                    if (!this.isWaiverSigned()) missing.push('Liability Waiver');
                    if (!agreementChecked) missing.push('confirmation checkbox');
                    if (hasProducts && !noRefundChecked) missing.push('no refund policy checkbox');
                }

                if (checkoutSubmitBtn) {
                    checkoutSubmitBtn.disabled = !allComplete;
                    if (!allComplete) {
                        checkoutSubmitBtn.classList.add('btn-disabled');
                        checkoutSubmitBtn.title = 'Please complete: ' + missing.join(', ');
                    } else {
                        checkoutSubmitBtn.classList.remove('btn-disabled');
                        checkoutSubmitBtn.title = '';
                    }
                }
            },
            
            // Check before checkout form submission - opens missing modal
            checkBeforeSubmit: function(e) {
                // Check if cart has services (party decor) - only require documents for services
                const hasServices = getServiceSubtotal() > 0;
                const productsOnly = cartHasProducts() && !hasServices;

                const noRefundCheckbox = document.getElementById('noRefundCheckbox');
                const noRefundChecked = noRefundCheckbox ? noRefundCheckbox.checked : false;

                // For product-only orders, only require the no refund acknowledgment
                if (productsOnly) {
                    if (!noRefundChecked) {
                        e.preventDefault();
                        const statusEl = document.getElementById('checkoutFormStatus');
                        if (statusEl) {
                            statusEl.className = 'form-status error';
                            statusEl.innerHTML = 'âœ— Please acknowledge that custom 3D prints and engravings are final sale with no returns or refunds.';
                            statusEl.style.display = 'block';
                        }
                        NoRefundModal.open();
                        return false;
                    }
                    return true;
                }

                // For services, require all documents and checkboxes
                const contractSigned = BookingGate.isContractSigned();
                const waiverSigned = BookingGate.isWaiverSigned();
                const agreementCheckbox = document.getElementById('agreementCheckbox');
                const agreementChecked = agreementCheckbox ? agreementCheckbox.checked : false;

                if (!contractSigned || !waiverSigned || !agreementChecked || !noRefundChecked) {
                    e.preventDefault();

                    // Show inline error on checkout form
                    const statusEl = document.getElementById('checkoutFormStatus');
                    if (statusEl) {
                        let errors = [];
                        if (!contractSigned) errors.push('Sign the Party Palace Agreement');
                        if (!waiverSigned) errors.push('Sign the Liability Waiver');
                        if (!agreementChecked) errors.push('Check the confirmation box agreeing to terms');
                        if (!noRefundChecked) errors.push('Acknowledge the no refund policy for 3D prints & engravings');
                        statusEl.className = 'form-status error';
                        statusEl.innerHTML = 'âœ— Please complete the following:<br>â€¢ ' + errors.join('<br>â€¢ ');
                        statusEl.style.display = 'block';
                    }

                    // Open the first missing document's modal (contract first, then waiver, then no refund)
                    if (!contractSigned) {
                        ContractModal.open();
                    } else if (!waiverSigned) {
                        WaiverModal.open();
                    } else if (!noRefundChecked) {
                        NoRefundModal.open();
                    }

                    return false;
                }
                return true;
            },
            
            // Update checkout page document status indicators
            updateCheckoutDocumentStatus: function() {
                const contractStatus = document.getElementById('checkoutContractStatus');
                const waiverStatus = document.getElementById('checkoutWaiverStatus');

                if (contractStatus) {
                    if (this.isContractSigned()) {
                        contractStatus.innerHTML = 'âœ“ Signed';
                        contractStatus.style.color = '#059669';
                    } else {
                        contractStatus.innerHTML = 'âš  Required';
                        contractStatus.style.color = '#DC2626';
                    }
                }

                if (waiverStatus) {
                    if (this.isWaiverSigned()) {
                        waiverStatus.innerHTML = 'âœ“ Signed';
                        waiverStatus.style.color = '#059669';
                    } else {
                        waiverStatus.innerHTML = 'âš  Required';
                        waiverStatus.style.color = '#DC2626';
                    }
                }
            },

            // Initialize booking gate - only for checkout form
            init: function() {
                this.updateSubmitButton();
                this.updateCheckoutDocumentStatus();

                // Gate checkout form submission only
                const checkoutForm = document.getElementById('checkoutForm');
                if (checkoutForm) {
                    // Add dual-document check for checkout
                    checkoutForm.addEventListener('submit', this.checkBeforeSubmit);
                }

                // Bind checkout page document buttons
                const checkoutContractBtn = document.getElementById('checkoutOpenContractBtn');
                const checkoutWaiverBtn = document.getElementById('checkoutOpenWaiverBtn');

                if (checkoutContractBtn) {
                    checkoutContractBtn.addEventListener('click', () => ContractModal.open());
                }
                if (checkoutWaiverBtn) {
                    checkoutWaiverBtn.addEventListener('click', () => WaiverModal.open());
                }

                // Bind agreement checkbox to update submit button
                const agreementCheckbox = document.getElementById('agreementCheckbox');
                if (agreementCheckbox) {
                    agreementCheckbox.addEventListener('change', () => this.updateSubmitButton());
                }

                // Bind no refund checkbox to update submit button
                const noRefundCheckbox = document.getElementById('noRefundCheckbox');
                if (noRefundCheckbox) {
                    noRefundCheckbox.addEventListener('change', () => this.updateSubmitButton());
                }
            }
        };

        // ============================================
        // COLOR PALETTE SELECTION (3D Prints Page)
        // ============================================
        
        const ColorPalette = {
            // Initialize color palette functionality
            init: function() {
                this.bindEvents('prints3dColorPalette', 'prints3d_color_preference', 'prints3dColorLabel');
                this.bindEvents('engravingColorPalette', 'engraving_color_preference', 'engravingColorLabel');
            },
            
            // Bind click events to a color palette
            bindEvents: function(paletteId, inputId, labelId) {
                const palette = document.getElementById(paletteId);
                if (!palette) return;
                
                const swatches = palette.querySelectorAll('.color-swatch');
                const hiddenInput = document.getElementById(inputId);
                const label = document.getElementById(labelId);
                
                swatches.forEach(swatch => {
                    swatch.addEventListener('click', () => {
                        // Remove selected state from all swatches in this palette
                        swatches.forEach(s => s.classList.remove('selected', 'light-color'));
                        
                        // Add selected state to clicked swatch
                        swatch.classList.add('selected');
                        
                        // Add light-color class for light colors (for dark checkmark)
                        const hex = swatch.dataset.hex;
                        if (hex === '#FFFFFF' || hex === '#FFEE58' || hex === '#C0C0C0') {
                            swatch.classList.add('light-color');
                        }
                        
                        // Get color name and hex
                        const colorName = swatch.dataset.color;
                        const colorHex = swatch.dataset.hex;
                        
                        // Update hidden input (stores both name and hex)
                        if (hiddenInput) {
                            hiddenInput.value = colorName;
                        }
                        
                        // Update label
                        if (label) {
                            label.innerHTML = `Selected: <strong>${colorName}</strong> <span style="display: inline-block; width: 14px; height: 14px; background: ${colorHex}; border-radius: 50%; vertical-align: middle; margin-left: 4px; border: 1px solid rgba(0,0,0,0.1);"></span>`;
                        }
                    });
                });
            },
            
            // Clear selection (for testing/reset)
            clear: function(paletteId, inputId, labelId) {
                const palette = document.getElementById(paletteId);
                if (!palette) return;
                
                const swatches = palette.querySelectorAll('.color-swatch');
                const hiddenInput = document.getElementById(inputId);
                const label = document.getElementById(labelId);
                
                swatches.forEach(s => s.classList.remove('selected', 'light-color'));
                if (hiddenInput) hiddenInput.value = '';
                if (label) label.textContent = 'No color selected';
            }
        };

        // ============================================
        // GALLERY WITH LIGHTBOX
        // ============================================

        function renderGallery() {
            const galleryMasonry = document.getElementById('galleryMasonry');
            if (!galleryMasonry || typeof productGalleryImages === 'undefined') return;

            // Collect all images from all products with category data
            const allImages = [];
            for (const [productName, images] of Object.entries(productGalleryImages)) {
                const product = products.find(p => p.name === productName);
                const productCategory = product ? product.category : 'gallery';

                // Map product category to filter category
                let filterCategory = 'party-decor';
                if (productCategory === 'prints3d') filterCategory = '3d-prints';
                else if (productCategory === 'engraving') filterCategory = 'engraving';
                else if (['arches', 'columns', 'walls', 'centerpieces'].includes(productCategory)) filterCategory = 'party-decor';

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

        // Make functions global
        window.openLightbox = openLightbox;
        window.openProductLightbox = openProductLightbox;
        window.closeLightbox = closeLightbox;
        window.changeLightboxImage = changeLightboxImage;

        // Make coupon functions global
        window.applyCoupon = applyCoupon;
        window.removeCoupon = removeCoupon;

        // Make cart functions global
        window.addToCart = addToCart;
        window.removeFromCart = removeFromCart;
        window.clearCart = clearCart;

        // Make 3D print product add-to-cart functions global
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
        window.addCustomizableKeychainToCart = addCustomizableKeychainToCart;
        window.updateStarFidgetPrice = updateStarFidgetPrice;

        // Make engraving product functions global
        window.addTieredEngravingToCart = addTieredEngravingToCart;
        window.addTieredKeychainToCart = addTieredKeychainToCart;
        window.addTieredAcrylicToCart = addTieredAcrylicToCart;
        window.addTieredWoodRoundsToCart = addTieredWoodRoundsToCart;
        window.addTieredCoasterToCart = addTieredCoasterToCart;

        // Make filter functions global
        window.filterProducts = filterProducts;
        window.filterEngravingProducts = filterEngravingProducts;
        window.filter3DProducts = filter3DProducts;

        // Make navigation functions global
        window.navigate = navigate;
        window.navigateToProduct = navigateToProduct;

        // Make UI toggle functions global
        window.toggleCart = toggleCart;
        window.toggleMobileMenu = toggleMobileMenu;

        // Make product detail and booking functions global
        window.bookConsultation = bookConsultation;
        window.changeProductImage = changeProductImage;
        window.addEngravingToCartFromDetail = addEngravingToCartFromDetail;
        window.submitViaEmail = submitViaEmail;

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
        // STAFF PORTAL FUNCTIONS
        // ============================================

        let staffProducts = [];
        let staffCurrentFilter = 'all';
        let staffUser = null;
        let staffPortalInitialized = false;

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
                const { data: { session } } = await supabaseClient.auth.getSession();
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
                const { data, error } = await supabaseClient.auth.signInWithPassword({
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
            await supabaseClient.auth.signOut();
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

            // Load products
            await loadStaffProducts();
            updateStaffStats();
            populateStaffFilters();
            renderStaffProducts();
        }

        async function loadStaffProducts() {
            try {
                const { data: dbProducts, error } = await supabaseClient
                    .from('products')
                    .select('*');

                if (error) throw error;

                console.log('[STAFF LOAD] First product raw:', dbProducts[0]);

                // Load products from Supabase
                staffProducts = dbProducts.map(p => {
                    // Get first image from productGalleryImages if available
                    let image = p.image_url || null;
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
                        image: image,
                        image_url: p.image_url || null
                    };
                });

            } catch (error) {
                console.error('Error loading staff products:', error);
                showStaffToast('Failed to load products', 'error');
            }
        }

        function updateStaffStats() {
            document.getElementById('staff-total-products').textContent = staffProducts.length;

            const totalValue = staffProducts.reduce((sum, p) => sum + (p.price || 0), 0);
            document.getElementById('staff-inventory-value').textContent = '$' + totalValue.toLocaleString();

            const saleCount = staffProducts.filter(p => p.sale).length;
            document.getElementById('staff-on-sale').textContent = saleCount;

            const newCount = staffProducts.filter(p => p.featured).length;
            document.getElementById('staff-new-arrivals').textContent = newCount;

            // Profit calculations
            const totalRevenue = staffProducts.reduce((sum, p) => sum + (p.price || 0), 0);
            const totalCost = staffProducts.reduce((sum, p) => sum + (p.cost || 0), 0);
            const totalProfit = totalRevenue - totalCost;
            const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

            document.getElementById('staff-total-revenue').textContent = '$' + totalRevenue.toFixed(2);
            document.getElementById('staff-total-cost').textContent = '$' + totalCost.toFixed(2);
            document.getElementById('staff-total-profit').textContent = '$' + totalProfit.toFixed(2);
            document.getElementById('staff-profit-margin').textContent = profitMargin + '%';
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

        function renderStaffProducts() {
            const tbody = document.getElementById('staff-table-body');
            const emptyState = document.getElementById('staff-empty');
            const table = document.getElementById('staff-table');
            const resultsText = document.getElementById('staff-filter-results');

            let filteredProducts = staffProducts;
            if (staffCurrentFilter !== 'all') {
                filteredProducts = staffProducts.filter(p => p.category === staffCurrentFilter);
            }

            if (filteredProducts.length === 0) {
                table.style.display = 'none';
                emptyState.style.display = 'block';
                resultsText.textContent = staffCurrentFilter === 'all'
                    ? 'No products found'
                    : `No products in ${staffCurrentFilter}`;
                return;
            }

            table.style.display = 'table';
            emptyState.style.display = 'none';
            resultsText.textContent = staffCurrentFilter === 'all'
                ? `Showing all ${filteredProducts.length} products`
                : `Showing ${filteredProducts.length} products in ${staffCurrentFilter}`;

            tbody.innerHTML = filteredProducts.map(product => {
                const profit = (product.price || 0) - (product.cost || 0);
                const profitClass = profit >= 0 ? 'positive' : 'negative';
                const status = product.featured ? 'new' : (product.sale ? 'sale' : 'regular');
                const statusText = product.featured ? 'NEW' : (product.sale ? 'SALE' : 'REGULAR');

                return `
                    <tr>
                        <td>
                            ${product.image
                                ? `<img src="${product.image}" alt="${product.name}" class="staff-table-thumb">`
                                : `<div class="staff-table-thumb-placeholder">${product.emoji || 'ðŸ“¦'}</div>`
                            }
                        </td>
                        <td><strong style="cursor: pointer; text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.2s;" onmouseover="this.style.textDecorationColor='currentColor'" onmouseout="this.style.textDecorationColor='transparent'" onclick="editStaffProduct('${String(product.id).replace(/'/g, "\\'")}')">${product.name}</strong></td>
                        <td><span class="staff-category-tag">${product.category}</span></td>
                        <td class="staff-cost-cell">$${(product.cost || 0).toFixed(2)}</td>
                        <td class="staff-price-cell">$${(product.price || 0).toFixed(2)}</td>
                        <td class="staff-profit-cell ${profitClass}">$${profit.toFixed(2)}</td>
                        <td><span class="staff-status-badge ${status}">${statusText}</span></td>
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
        }

        // Staff Modal Functions
        function openStaffModal(modalId) {
            document.getElementById(modalId).classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeStaffModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
            document.body.style.overflow = '';
        }

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
            } else {
                title.textContent = 'Add New Product';
                staffEditingProductId = null;
                document.getElementById('staff-product-id').value = '';
            }

            openStaffModal('staff-product-modal');
        }

        function editStaffProduct(id) {
            const product = staffProducts.find(p => String(p.id) === String(id));
            if (product) {
                openStaffProductModal(product);
            } else {
                showStaffToast('Product not found', 'error');
            }
        }

        function confirmStaffDelete(id, name) {
            document.getElementById('staff-delete-id').value = id;
            document.getElementById('staff-delete-name').textContent = name;
            openStaffModal('staff-delete-modal');
        }


        let staffEditingProductId = null;

        async function handleStaffProductSubmit(e) {
            e.preventDefault();

            const id = staffEditingProductId;
            const isEditing = id != null;

            const productData = {
                name: document.getElementById('staff-product-name').value,
                category: document.getElementById('staff-product-category').value,
                price: parseFloat(document.getElementById('staff-product-price').value) || 0,
                cost: parseFloat(document.getElementById('staff-product-cost').value) || 0,
                sale: document.getElementById('staff-product-sale').checked,
                description: document.getElementById('staff-product-description').value,
                emoji: document.getElementById('staff-product-emoji').value,
                featured: document.getElementById('staff-product-featured').checked,
                image_url: document.getElementById('staff-product-image').value || null
            };

            try {
                if (isEditing) {
                    // Update existing product
                    const { data, error } = await supabaseClient
                        .from('products')
                        .update(productData)
                        .eq('id', id)
                        .select();

                    if (error) throw error;

                    if (!data || data.length === 0) {
                        // Update matched no rows â€” likely an RLS policy issue
                        showStaffToast('Update blocked â€” go to Supabase > Authentication > Policies and add an UPDATE policy for the products table', 'error');
                        return;
                    }
                } else {
                    // Insert new product
                    const { data, error } = await supabaseClient
                        .from('products')
                        .insert(productData)
                        .select();

                    if (error) throw error;
                }

                staffEditingProductId = null;
                showStaffToast(isEditing ? 'Product updated!' : 'Product added!', 'success');
                closeStaffModal('staff-product-modal');
                await loadStaffProducts();
                updateStaffStats();
                populateStaffFilters();
                renderStaffProducts();

                // Reload main site products without re-initializing the app (stay on staff page)
                await loadProducts(true);
                if (typeof renderCatalog === 'function') renderCatalog();
                if (typeof renderServices === 'function') renderServices();
            } catch (error) {
                console.error('Error saving product:', error);
                showStaffToast('Error: ' + error.message, 'error');
            }
        }

        async function handleStaffDeleteProduct() {
            const id = document.getElementById('staff-delete-id').value;

            if (!id) {
                showStaffToast('No product selected for deletion', 'error');
                return;
            }

            try {
                const { error } = await supabaseClient
                    .from('products')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                closeStaffModal('staff-delete-modal');
                showStaffToast('Product deleted', 'success');
                await loadStaffProducts();
                updateStaffStats();
                populateStaffFilters();
                renderStaffProducts();

                // Reload main site products without re-initializing the app (stay on staff page)
                await loadProducts(true);
                if (typeof renderCatalog === 'function') renderCatalog();
                if (typeof renderServices === 'function') renderServices();
            } catch (error) {
                console.error('Error deleting product:', error);
                showStaffToast('Failed to delete product', 'error');
            }
        }

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

                // Upload to Supabase Storage
                showStaffToast('Uploading image...', '');
                try {
                    const fileName = `product-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    const { data, error } = await supabaseClient.storage
                        .from('product-images')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: true
                        });

                    if (error) throw error;

                    // Get public URL
                    const { data: urlData } = supabaseClient.storage
                        .from('product-images')
                        .getPublicUrl(fileName);

                    // Set the URL in the input
                    document.getElementById('staff-product-image').value = urlData.publicUrl;
                    showStaffToast('Image uploaded!', 'success');
                } catch (uploadError) {
                    console.error('Upload error:', uploadError);
                    // Try using a signed URL approach as fallback
                    try {
                        const fallbackName = `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()}`;
                        const { data: fallbackData, error: fallbackErr } = await supabaseClient.storage
                            .from('product-images')
                            .upload(fallbackName, file, { upsert: true });

                        if (!fallbackErr) {
                            const { data: urlData } = supabaseClient.storage
                                .from('product-images')
                                .getPublicUrl(fallbackName);
                            document.getElementById('staff-product-image').value = urlData.publicUrl;
                            showStaffToast('Image uploaded!', 'success');
                        } else {
                            throw fallbackErr;
                        }
                    } catch (fallbackError) {
                        console.error('Fallback upload error:', fallbackError);
                        showStaffToast('Image upload failed â€” using preview as fallback', 'error');
                        document.getElementById('staff-product-image').value = e.target.result;
                    }
                }
            };
            reader.readAsDataURL(file);
        }

        function removeStaffImage() {
            document.getElementById('staff-preview-img').src = '';
            document.getElementById('staff-upload-preview').style.display = 'none';
            document.getElementById('staff-upload-placeholder').style.display = 'flex';
            document.getElementById('staff-file-input').value = '';
            document.getElementById('staff-product-image').value = '';
        }

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

        function closeStaffScannerModal() {
            stopBarcodeCamera();
            closeStaffModal('staff-scanner-modal');
        }

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
                    status.textContent = 'Camera active â€” BarcodeDetector not supported in this browser. Please enter barcode manually.';
                }

            } catch (err) {
                console.error('Camera error:', err);
                showStaffToast('Could not access camera: ' + err.message, 'error');
            }
        }

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
