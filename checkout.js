// checkout.js — Checkout flow, payment, coupons, orders, modals
import {
    cart,
    saveCart,
    cartHasProducts,
    cartHasServicesOnly,
    getProductSubtotal,
    getServiceSubtotal,
    getProductDiscount,
    getDiscountedProductSubtotal,
    getShippingCost,
    getTaxAmount,
    getGrandTotal,
    updateCartCount,
    clearCart,
    updateShippingVisibility
} from './cart.js';
import { products } from './products.js';

// Coupon codes system — validation is server-side only
let appliedCouponCode = null;

// Deposit amount constant (minimum)
const MIN_DEPOSIT_AMOUNT = 50;

export function applyCoupon() {
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

    // Accept any code — the server validates it at checkout
    appliedCouponCode = code;

    // Show applied coupon
    appliedText.textContent = `${code} — discount will be applied at checkout`;
    appliedDiv.style.display = 'block';
    message.style.display = 'none';
    input.value = '';
    input.disabled = true;

    updateCheckoutWithDiscount();
    showNotification('Coupon code applied — discount will be calculated at checkout', 'success');
}

export function removeCoupon() {
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
    // Discount is calculated server-side from verified prices — always return 0 here
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
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

export function renderCheckoutItems() {
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
export function initPaymentOptions() {
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

// Create order in Supabase after successful payment
export async function createOrderInSupabase(orderInfo, cartItems) {
    try {
        // Generate order number
        const orderNumber = 'PP-' + Date.now().toString(36).toUpperCase();

        // Build shipping address string
        let shippingAddress = '';
        if (orderInfo.shippingAddress) {
            const addr = orderInfo.shippingAddress;
            shippingAddress = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
        }

        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const shipping = getShippingCost ? getShippingCost() : 0;
        const tax = getTaxAmount ? getTaxAmount() : 0;
        const total = subtotal + shipping + tax;

        const orderData = {
            order_number: orderNumber,
            customer_name: orderInfo.name,
            customer_email: orderInfo.email,
            customer_phone: orderInfo.phone || null,
            shipping_address: shippingAddress || null,
            items: cartItems.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                category: item.category || 'other'
            })),
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            total: total,
            amount_paid: orderInfo.amountPaid || total,
            status: 'pending',
            payment_status: orderInfo.paymentType === 'full' ? 'paid' : 'partial',
            payment_method: 'stripe',
            notes: orderInfo.notes || null
        };

        const { error } = await window.supabaseClient
            .from('orders')
            .insert(orderData);

        if (error) {
            console.error('Error creating order:', error);
        } else {
            console.log('Order created:', orderNumber);

            // Log activity (customer checkout)
            const amountPaid = orderInfo.amountPaid || total;
            try {
                await window.supabaseClient
                    .from('activity_log')
                    .insert([{
                        action: 'New order',
                        entity_type: 'order',
                        entity_id: orderNumber,
                        entity_name: orderNumber,
                        details: `$${amountPaid.toFixed(2)} paid${amountPaid < total ? ` (deposit, total: $${total.toFixed(2)})` : ''} from ${orderInfo.name}`,
                        user_email: orderInfo.email || 'customer'
                    }]);
            } catch (logError) {
                console.error('Error logging activity:', logError);
            }
        }
    } catch (error) {
        console.error('Error creating order:', error);
    }
}

// Display order summary on success page
export function displaySuccessOrderSummary(orderInfo) {
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

export function showNotification(message, type = 'info') {
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

export async function handleCheckoutSubmit(event) {
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
        estimatedTotal: cart.reduce((sum, item) => sum + item.price, 0),
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

    // Calculate shipping and tax for products (discount is validated server-side)
    const shipping = getShippingCost();
    const tax = getTaxAmount();

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
                couponCode: appliedCouponCode || null,
                shippingAddress: shippingAddress
            })
        });

        const responseData = await response.json();

        if (response.status === 429) {
            // Rate limit hit — show friendly message directly, no email fallback
            statusEl.innerHTML = `<div class="form-error">${responseData.error || 'Too many requests. Please wait a moment and try again.'}</div>`;
            submitBtn.disabled = false;
            submitBtn.classList.remove('animation');
            return;
        }

        if (!response.ok) {
            // Surface server error message (e.g. invalid coupon, unverified product)
            throw new Error(responseData.error || 'Failed to create checkout session');
        }

        const { url } = responseData;

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

        const isValidationError = error.message && (
            error.message.includes('Coupon') ||
            error.message.includes('could not be verified') ||
            error.message.includes('not valid')
        );

        if (isValidationError) {
            // Show the server's validation message directly (coupon errors, product errors)
            statusEl.innerHTML = `<div class="form-error">${error.message}</div>`;
        } else {
            // Fallback: Use email submission if Stripe/network fails
            statusEl.innerHTML = `
                <div class="form-error">
                    Payment system temporarily unavailable.
                    <br><br>
                    <button type="button" onclick="submitViaEmail()" class="btn btn-outline" style="margin-top: 0.5rem;">
                        Submit Order via Email Instead
                    </button>
                </div>
            `;
        }

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

// Update product dropdown based on order type selection
export function updateProductOptions() {
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

export async function handleCustomOrderSubmit(e) {
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
            statusDiv.textContent = "✓ Thank you! Your custom order request has been received. We'll contact you within 24-48 hours with a quote.";
            document.getElementById('customOrderContactForm').reset();
        } else {
            throw new Error('Failed to send');
        }
    } catch (error) {
        console.error('Error sending custom order form:', error);
        statusDiv.className = 'form-status error';
        statusDiv.textContent = '✗ Sorry, there was an error sending your request. Please try calling us at 219-344-2416.';
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

export const WaiverModal = {
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
                statusIndicator.innerHTML = '<span style="color: #059669;">✓ Waiver Signed</span>';
                statusIndicator.className = 'waiver-status signed';
            } else {
                statusIndicator.innerHTML = '<span style="color: #DC2626;">⚠ Waiver Required</span>';
                statusIndicator.className = 'waiver-status unsigned';
            }
        }

        // Update booking submit button state
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

export const ContractModal = {
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

export const NoRefundModal = {
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

export const BookingGate = {
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
                    statusEl.innerHTML = '✗ Please acknowledge that custom 3D prints and engravings are final sale with no returns or refunds.';
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
                statusEl.innerHTML = '✗ Please complete the following:<br>• ' + errors.join('<br>• ');
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
                contractStatus.innerHTML = '✓ Signed';
                contractStatus.style.color = '#059669';
            } else {
                contractStatus.innerHTML = '⚠ Required';
                contractStatus.style.color = '#DC2626';
            }
        }

        if (waiverStatus) {
            if (this.isWaiverSigned()) {
                waiverStatus.innerHTML = '✓ Signed';
                waiverStatus.style.color = '#059669';
            } else {
                waiverStatus.innerHTML = '⚠ Required';
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

export const ColorPalette = {
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

// Global window exports for onclick handlers
window.showNotification = showNotification;
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
window.handleCheckoutSubmit = handleCheckoutSubmit;
window.handleCustomOrderSubmit = handleCustomOrderSubmit;
window.updateProductOptions = updateProductOptions;
window.submitViaEmail = submitViaEmail;
window.renderCheckoutItems = renderCheckoutItems;
