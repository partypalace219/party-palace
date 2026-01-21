        // Product Data
        // Products will be loaded from Supabase
        let products = [];
        
        // Fetch products from Supabase on page load
        async function loadProducts() {
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
                    category: p.category,
                    price: p.price,
                    priceLabel: p.price_label,
                    description: p.description,
                    icon: p.emoji,
                    popular: p.featured,
                    hasGallery: true
                }));
                
                // Attach images from productGalleryImages if available
                if (typeof productGalleryImages !== 'undefined') {
                    products.forEach(product => {
                        const images = productGalleryImages[product.name];
                        if (images && images.length > 0) {
                            product.images = images;
                        }
                    });
                }
                
                console.log('Loaded', products.length, 'products from Supabase');
                
                // Initialize the app after products are loaded
                initializeApp();
            } catch (error) {
                console.error('Error loading products from Supabase:', error);
                // Fallback to empty array if fetch fails
                products = [];
            }
        }

        // Wait for DOM to be ready, then load products
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadProducts);
        } else {
            // DOM already loaded
            loadProducts();
        }


        const gradients = {
            arches: 'linear-gradient(135deg, #667eea, #764ba2)',
            columns: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            walls: 'linear-gradient(135deg, #fa709a, #fee140)',
            centerpieces: 'linear-gradient(135deg, #f093fb, #f5576c)',
            services: 'linear-gradient(135deg, #43e97b, #38f9d7)'
        };
        const categoryLabels = {
            arches: 'Arches',
            columns: 'Columns',
            walls: 'Walls',
            centerpieces: 'Centerpieces',
            services: 'Services'
        };
        let currentFilter = 'all';
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
            document.querySelectorAll('.nav-desktop button[data-page], .mobile-menu button[data-page]').forEach(btn => {
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
                const validPages = ['home', 'partydecor', 'services', 'gallery', 'partyrentals', 'prints3d', 'engraving', 'contact'];
                
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
                const validPages = ['home', 'partydecor', 'services', 'gallery', 'partyrentals', 'prints3d', 'engraving', 'contact'];
                
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
            const validPages = ['home', 'partydecor', 'services', 'gallery', 'partyrentals', 'prints3d', 'engraving', 'contact'];
            
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
            const imageContent = hasImages 
                ? `<img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`
                : `<span>${product.icon}</span>`;
            const imageStyle = hasImages 
                ? 'overflow: hidden;' 
                : `background: ${gradients[product.category]}`;
            
            return `
                <div class="product-card product-card-clickable" onclick="navigateToProduct('${productSlug}')" data-product-slug="${productSlug}">
                    <div class="product-image" style="${imageStyle}">
                        ${imageContent}
                        ${product.popular ? '<div class="product-badge">Popular</div>' : ''}
                    </div>
                    <div class="product-info">
                        <div class="product-category">${isService ? 'Service' : categoryLabels[product.category]}</div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-description">${product.description}</div>
                        <div class="product-price">
                            $${product.price}
                            <span class="product-price-label">${product.priceLabel}</span>
                        </div>
                        <button onclick="event.stopPropagation(); inquireProduct('${product.name}')" class="btn btn-primary" style="width: 100%">Get Quote</button>
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
            return 'home';
        }
        
        // Render product detail page
        function renderProductDetail(product) {
            const container = document.getElementById('productDetailContent');
            if (!container || !product) return;
            
            const hasImages = product.images && product.images.length > 0;
            const gradient = gradients[product.category] || 'linear-gradient(135deg, #667eea, #764ba2)';
            const backPage = getCategoryPage(product.category);
            const backLabel = categoryLabels[product.category] || 'Back';
            
            // Generate main image
            const mainImage = hasImages 
                ? `<img src="${product.images[0]}" alt="${product.name}" id="productMainImage">`
                : `<div class="placeholder" style="background: ${gradient}">${product.icon}</div>`;
            
            // Generate thumbnails
            let thumbnailsHtml = '';
            if (hasImages && product.images.length > 1) {
                thumbnailsHtml = `<div class="product-detail-thumbnails">
                    ${product.images.map((img, idx) => `
                        <div class="product-detail-thumb ${idx === 0 ? 'active' : ''}" onclick="changeProductImage('${img}', this)">
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
                        <h1 class="product-detail-title">${product.name}</h1>
                        <div class="product-detail-price">
                            $${product.price} <span class="label">${product.priceLabel}</span>
                        </div>
                        <p class="product-detail-description">${product.description}</p>
                        
                        ${features}
                        
                        <div class="product-detail-cta">
                            <button onclick="inquireProduct('${product.name}')" class="btn btn-primary">
                                ✉️ Request a Quote
                            </button>
                            <button onclick="navigate('contact')" class="btn btn-outline">
                                📞 Contact Us
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Change main product image (for thumbnail clicks)
        function changeProductImage(src, thumb) {
            const mainImg = document.getElementById('productMainImage');
            if (mainImg) {
                mainImg.src = src;
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
                services: ['Professional consultation', 'Full setup and teardown', 'Custom design options', 'Satisfaction guaranteed']
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
            const filtered = currentFilter === 'all'
                ? products.filter(p => partyDecorCategories.includes(p.category))
                : products.filter(p => p.category === currentFilter);
            
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
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });
            
            renderCatalog();
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
        function handleSubmit(e) {
            e.preventDefault();
            
            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            const eventType = document.getElementById('contactEventType').value;
            const message = document.getElementById('contactMessage').value.trim();
            const statusDiv = document.getElementById('formStatus');
            
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
            
            statusDiv.className = 'form-status success';
            statusDiv.textContent = "✓ Thank you! Your message has been sent. We'll contact you within 24 hours.";
            
            document.getElementById('contactForm').reset();
            
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
                    errorDiv.innerHTML = '✗ ' + errors.join('<br>✗ ');
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
                
                // Update hidden form inputs
                this.updateHiddenInputs(waiverData);
                
                // Update UI (both waiver and booking button)
                this.updateUI();
                if (typeof BookingGate !== 'undefined') {
                    BookingGate.updateSubmitButton();
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
                        statusIndicator.innerHTML = '<span style="color: #059669;">✓ Waiver Signed</span>';
                        statusIndicator.className = 'waiver-status signed';
                    } else {
                        statusIndicator.innerHTML = '<span style="color: #DC2626;">⚠ Waiver Required</span>';
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
                        errorDiv.innerHTML = '✗ You must sign the Liability Waiver before completing your booking.';
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
                    errorDiv.innerHTML = '✗ ' + errors.join('<br>✗ ');
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
                
                // Update hidden form inputs
                this.updateHiddenInputs(contractData);
                
                // Update UI (both contract and booking button)
                this.updateUI();
                BookingGate.updateSubmitButton();
                
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
                        statusIndicator.innerHTML = '<span style="color: #059669;">✓ Contract Signed</span>';
                        statusIndicator.className = 'waiver-status signed';
                    } else {
                        statusIndicator.innerHTML = '<span style="color: #DC2626;">⚠ Contract Required</span>';
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
            
            // Update the booking submit button state
            updateSubmitButton: function() {
                // REPLACE THIS SELECTOR IF NEEDED - targets booking form submit button
                const bookingSubmitBtn = document.getElementById('bookingSubmitBtn') || 
                                         document.querySelector('.booking-form button[type="submit"]') ||
                                         document.querySelector('#bookingForm button[type="submit"]');
                
                const bothSigned = this.areBothSigned();
                
                if (bookingSubmitBtn) {
                    bookingSubmitBtn.disabled = !bothSigned;
                    if (!bothSigned) {
                        bookingSubmitBtn.classList.add('btn-disabled');
                        let missingDocs = [];
                        if (!this.isContractSigned()) missingDocs.push('Party Palace Agreement');
                        if (!this.isWaiverSigned()) missingDocs.push('Liability Waiver');
                        bookingSubmitBtn.title = 'Please sign: ' + missingDocs.join(' and ');
                    } else {
                        bookingSubmitBtn.classList.remove('btn-disabled');
                        bookingSubmitBtn.title = '';
                    }
                }
            },
            
            // Check before form submission - opens missing modal
            checkBeforeSubmit: function(e) {
                const contractSigned = BookingGate.isContractSigned();
                const waiverSigned = BookingGate.isWaiverSigned();
                
                if (!contractSigned || !waiverSigned) {
                    e.preventDefault();
                    
                    // Show inline error
                    const errorDiv = document.getElementById('bookingDocumentsError');
                    if (errorDiv) {
                        let missingDocs = [];
                        if (!contractSigned) missingDocs.push('Party Palace Agreement');
                        if (!waiverSigned) missingDocs.push('Liability Waiver');
                        errorDiv.style.display = 'block';
                        errorDiv.innerHTML = '✗ You must sign the following before completing your booking:<br>• ' + missingDocs.join('<br>• ');
                    }
                    
                    // Open the first missing document's modal (contract first, then waiver)
                    if (!contractSigned) {
                        ContractModal.open();
                    } else if (!waiverSigned) {
                        WaiverModal.open();
                    }
                    
                    return false;
                }
                return true;
            },
            
            // Initialize booking gate
            init: function() {
                this.updateSubmitButton();
                
                // Gate booking form submission
                // REPLACE THIS SELECTOR IF NEEDED
                const bookingForm = document.getElementById('bookingForm') ||
                                   document.querySelector('.booking-form');
                if (bookingForm) {
                    // Remove old single-document check if exists
                    bookingForm.removeEventListener('submit', WaiverModal.checkBeforeSubmit);
                    // Add dual-document check
                    bookingForm.addEventListener('submit', this.checkBeforeSubmit);
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
        // INITIALIZATION
        // ============================================

        // Initialize app function (called after products are loaded from Supabase)
        function initializeApp() {
            renderCatalog();
            renderServices();
            WaiverModal.init();
            ContractModal.init();
            BookingGate.init();
            ColorPalette.init();
            initPageFromHash();
        }
