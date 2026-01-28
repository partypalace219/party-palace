// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events and sends confirmation emails via SMTP
// Uses direct Stripe API calls (no SDK) for Deno compatibility

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"

// SMTP Configuration - Use Gmail SMTP
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')

// Verify Stripe webhook signature
function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const elements = signature.split(',')
    let timestamp = ''
    let sig = ''

    for (const element of elements) {
      const [key, value] = element.split('=')
      if (key === 't') timestamp = value
      if (key === 'v1') sig = value
    }

    if (!timestamp || !sig) return false

    const signedPayload = `${timestamp}.${payload}`
    const expectedSig = hmac('sha256', secret, signedPayload, 'utf8', 'hex')

    return sig === expectedSig
  } catch {
    return false
  }
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()

    // Verify webhook signature
    if (!verifyStripeSignature(body, signature, webhookSecret)) {
      console.error('Invalid signature')
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(body)

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Extract customer and order info from metadata
      const metadata = session.metadata || {}
      const customerEmail = session.customer_email
      const customerName = metadata.customer_name || 'Valued Customer'
      const customerPhone = metadata.customer_phone || ''
      const eventDate = metadata.event_date || ''
      const eventType = metadata.event_type || ''
      const venue = metadata.venue || ''
      const orderItems = metadata.order_items || ''
      const notes = metadata.notes || ''

      // New metadata fields for products
      const hasProducts = metadata.has_products === 'true'
      const itemsSubtotal = metadata.items_subtotal || '0'
      const discount = metadata.discount || '0'
      const shipping = metadata.shipping || '0'
      const tax = metadata.tax || '0'
      const totalAmount = metadata.total_amount || '0'
      const paymentType = metadata.payment_type || 'deposit'
      const shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null

      // Send emails if SMTP is configured
      if (customerEmail && SMTP_USER && SMTP_PASS) {
        try {
          if (hasProducts) {
            // Product purchase emails
            await sendProductConfirmationEmail({
              to: customerEmail,
              customerName,
              orderItems,
              itemsSubtotal: parseFloat(itemsSubtotal),
              discount: parseFloat(discount),
              shipping: parseFloat(shipping),
              tax: parseFloat(tax),
              totalAmount: parseFloat(totalAmount),
              shippingAddress,
            })

            await sendProductBusinessNotification({
              customerEmail,
              customerName,
              customerPhone,
              orderItems,
              itemsSubtotal: parseFloat(itemsSubtotal),
              discount: parseFloat(discount),
              shipping: parseFloat(shipping),
              tax: parseFloat(tax),
              totalAmount: parseFloat(totalAmount),
              shippingAddress,
            })
          } else {
            // Service booking emails
            const estimatedTotal = itemsSubtotal
            const depositAmount = paymentType === 'full' ? totalAmount : metadata.deposit_amount || '50'

            await sendBookingConfirmationEmail({
              to: customerEmail,
              customerName,
              customerPhone,
              eventDate,
              eventType,
              venue,
              orderItems,
              estimatedTotal,
              depositAmount,
              paymentType,
              notes,
            })

            await sendBookingBusinessNotification({
              customerEmail,
              customerName,
              customerPhone,
              eventDate,
              eventType,
              venue,
              orderItems,
              estimatedTotal,
              depositAmount,
              paymentType,
              notes,
            })
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError)
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook Error: ${error.message}`, { status: 400 })
  }
})

async function getSmtpClient() {
  return new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: {
        username: SMTP_USER!,
        password: SMTP_PASS!,
      },
    },
  })
}

// ============================================
// PRODUCT PURCHASE EMAILS
// ============================================

async function sendProductConfirmationEmail(data: {
  to: string
  customerName: string
  orderItems: string
  itemsSubtotal: number
  discount: number
  shipping: number
  tax: number
  totalAmount: number
  shippingAddress: any
}) {
  const shippingInfo = data.shippingAddress
    ? `${data.shippingAddress.line1}${data.shippingAddress.line2 ? ', ' + data.shippingAddress.line2 : ''}<br>
       ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}`
    : 'Address provided at checkout'

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; background: #f9f9f9; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { color: #667eea; margin-top: 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
    .detail-label { font-weight: bold; color: #666; }
    .highlight { background: #38a169; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .highlight .amount { font-size: 32px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .total-row { border-top: 2px solid #667eea; margin-top: 10px; padding-top: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Party Palace</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Order Confirmation</p>
  </div>

  <div class="content">
    <p>Hi ${data.customerName},</p>
    <p>Thank you for your order! We've received your payment and will ship your items soon.</p>

    <div class="highlight">
      <p style="margin: 0; opacity: 0.9;">Total Paid</p>
      <div class="amount">$${data.totalAmount.toFixed(2)}</div>
    </div>

    <div class="section">
      <h2>Order Summary</h2>
      <p style="margin-bottom: 15px;">${data.orderItems}</p>
      <div class="detail-row">
        <span class="detail-label">Subtotal:</span>
        <span>$${data.itemsSubtotal.toFixed(2)}</span>
      </div>
      ${data.discount > 0 ? `
      <div class="detail-row" style="color: #38a169;">
        <span class="detail-label">Discount:</span>
        <span>-$${data.discount.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">Shipping:</span>
        <span>${data.shipping > 0 ? '$' + data.shipping.toFixed(2) : 'FREE'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Tax:</span>
        <span>$${data.tax.toFixed(2)}</span>
      </div>
      <div class="detail-row total-row">
        <span class="detail-label">Total:</span>
        <span style="color: #667eea; font-size: 18px;">$${data.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    <div class="section">
      <h2>Shipping Address</h2>
      <p>${shippingInfo}</p>
    </div>

    <div class="section">
      <h2>What's Next?</h2>
      <ol style="padding-left: 20px;">
        <li>We'll prepare your order for shipment</li>
        <li>You'll receive a shipping confirmation email with tracking info</li>
        <li>Estimated delivery: 3-10 business days</li>
      </ol>
    </div>

    <div class="section" style="text-align: center;">
      <h2>Questions?</h2>
      <p>We're here to help!</p>
      <p>
        <strong>Email:</strong> partypalace.in@gmail.com<br>
        <strong>Phone:</strong> 219-344-2416
      </p>
    </div>
  </div>

  <div class="footer">
    <p>&copy; 2024 Party Palace. All rights reserved.</p>
    <p>Party Supplies & Custom Creations | Northwest Indiana & Chicagoland</p>
  </div>
</body>
</html>
  `

  const client = await getSmtpClient()

  try {
    await client.send({
      from: `Party Palace <${SMTP_USER}>`,
      to: data.to,
      subject: 'Order Confirmed - Party Palace',
      content: 'Your order has been confirmed!',
      html: emailHtml,
    })
    console.log('Product confirmation email sent to:', data.to)
  } finally {
    await client.close()
  }
}

async function sendProductBusinessNotification(data: {
  customerEmail: string
  customerName: string
  customerPhone: string
  orderItems: string
  itemsSubtotal: number
  discount: number
  shipping: number
  tax: number
  totalAmount: number
  shippingAddress: any
}) {
  const shippingInfo = data.shippingAddress
    ? `${data.shippingAddress.line1}${data.shippingAddress.line2 ? ', ' + data.shippingAddress.line2 : ''},
       ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}`
    : 'Address provided at Stripe checkout'

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #38a169; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
    .label { font-weight: bold; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Product Order!</h1>
    <p>Total: $${data.totalAmount.toFixed(2)}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2>Customer Information</h2>
      <p><span class="label">Name:</span> ${data.customerName}</p>
      <p><span class="label">Email:</span> ${data.customerEmail}</p>
      <p><span class="label">Phone:</span> ${data.customerPhone || 'Not provided'}</p>
    </div>

    <div class="section">
      <h2>Order Details</h2>
      <p><span class="label">Items:</span> ${data.orderItems}</p>
      <p><span class="label">Subtotal:</span> $${data.itemsSubtotal.toFixed(2)}</p>
      ${data.discount > 0 ? `<p><span class="label">Discount:</span> -$${data.discount.toFixed(2)}</p>` : ''}
      <p><span class="label">Shipping:</span> ${data.shipping > 0 ? '$' + data.shipping.toFixed(2) : 'FREE'}</p>
      <p><span class="label">Tax:</span> $${data.tax.toFixed(2)}</p>
      <p><span class="label">Total Paid:</span> $${data.totalAmount.toFixed(2)}</p>
    </div>

    <div class="section">
      <h2>Shipping Address</h2>
      <p>${shippingInfo}</p>
    </div>

    <p style="text-align: center; margin-top: 20px; background: #fef3c7; padding: 15px; border-radius: 8px;">
      <strong>Action Required:</strong> Prepare and ship order within 1-2 business days.
    </p>
  </div>
</body>
</html>
  `

  const client = await getSmtpClient()

  try {
    await client.send({
      from: `Party Palace Orders <${SMTP_USER}>`,
      to: SMTP_USER!,
      subject: `New Order: ${data.customerName} - $${data.totalAmount.toFixed(2)}`,
      content: `New product order from ${data.customerName}`,
      html: emailHtml,
    })
    console.log('Product business notification sent')
  } finally {
    await client.close()
  }
}

// ============================================
// SERVICE BOOKING EMAILS
// ============================================

async function sendBookingConfirmationEmail(data: {
  to: string
  customerName: string
  customerPhone: string
  eventDate: string
  eventType: string
  venue: string
  orderItems: string
  estimatedTotal: string
  depositAmount: string
  paymentType: string
  notes: string
}) {
  const isFullPayment = data.paymentType === 'full'

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; background: #f9f9f9; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { color: #667eea; margin-top: 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #666; }
    .highlight { background: #667eea; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .highlight .amount { font-size: 32px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Party Palace</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Booking Confirmation</p>
  </div>

  <div class="content">
    <p>Hi ${data.customerName},</p>
    <p>Thank you for your booking! ${isFullPayment ? 'Your full payment has been received.' : 'Your deposit has been received and your event is now secured.'}</p>

    <div class="highlight">
      <p style="margin: 0; opacity: 0.9;">${isFullPayment ? 'Total Paid' : 'Deposit Paid'}</p>
      <div class="amount">$${data.depositAmount}</div>
    </div>

    <div class="section">
      <h2>Event Details</h2>
      <div class="detail-row">
        <span class="detail-label">Event Type:</span> ${data.eventType || 'To be confirmed'}
      </div>
      <div class="detail-row">
        <span class="detail-label">Event Date:</span> ${data.eventDate || 'To be confirmed'}
      </div>
      <div class="detail-row">
        <span class="detail-label">Venue:</span> ${data.venue || 'To be confirmed'}
      </div>
    </div>

    <div class="section">
      <h2>Your Order</h2>
      <p>${data.orderItems || 'Custom order'}</p>
      <div class="detail-row" style="border-top: 2px solid #667eea; margin-top: 15px; padding-top: 15px;">
        <span class="detail-label">${isFullPayment ? 'Total Paid:' : 'Estimated Total:'}</span>
        <span style="font-size: 18px; color: #667eea; font-weight: bold;">$${data.estimatedTotal}</span>
      </div>
      ${!isFullPayment ? `
      <p style="font-size: 12px; color: #666; margin-top: 10px;">
        * Final pricing will be confirmed after your design consultation
      </p>
      ` : ''}
    </div>

    ${data.notes ? `
    <div class="section">
      <h2>Your Notes</h2>
      <p>${data.notes}</p>
    </div>
    ` : ''}

    <div class="section">
      <h2>What's Next?</h2>
      <ol style="padding-left: 20px;">
        <li>We'll contact you within 24-48 hours to schedule your design consultation</li>
        <li>During the consultation, we'll finalize colors, sizes, and design details</li>
        ${!isFullPayment ? '<li>The remaining balance will be due before your event date</li>' : ''}
      </ol>
    </div>

    <div class="section" style="text-align: center;">
      <h2>Questions?</h2>
      <p>We're here to help make your event amazing!</p>
      <p>
        <strong>Email:</strong> partypalace.in@gmail.com<br>
        <strong>Phone:</strong> 219-344-2416
      </p>
    </div>
  </div>

  <div class="footer">
    <p>&copy; 2024 Party Palace. All rights reserved.</p>
    <p>Professional Event Decorations | Northwest Indiana & Chicagoland</p>
  </div>
</body>
</html>
  `

  const client = await getSmtpClient()

  try {
    await client.send({
      from: `Party Palace <${SMTP_USER}>`,
      to: data.to,
      subject: 'Booking Confirmed - Party Palace',
      content: 'Your booking has been confirmed!',
      html: emailHtml,
    })
    console.log('Booking confirmation email sent to:', data.to)
  } finally {
    await client.close()
  }
}

async function sendBookingBusinessNotification(data: {
  customerEmail: string
  customerName: string
  customerPhone: string
  eventDate: string
  eventType: string
  venue: string
  orderItems: string
  estimatedTotal: string
  depositAmount: string
  paymentType: string
  notes: string
}) {
  const isFullPayment = data.paymentType === 'full'

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #38a169; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
    .label { font-weight: bold; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Booking Received!</h1>
    <p>${isFullPayment ? 'Full Payment' : 'Deposit'}: $${data.depositAmount}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2>Customer Information</h2>
      <p><span class="label">Name:</span> ${data.customerName}</p>
      <p><span class="label">Email:</span> ${data.customerEmail}</p>
      <p><span class="label">Phone:</span> ${data.customerPhone}</p>
    </div>

    <div class="section">
      <h2>Event Details</h2>
      <p><span class="label">Event Type:</span> ${data.eventType || 'Not specified'}</p>
      <p><span class="label">Event Date:</span> ${data.eventDate || 'Not specified'}</p>
      <p><span class="label">Venue:</span> ${data.venue || 'Not specified'}</p>
    </div>

    <div class="section">
      <h2>Order</h2>
      <p><span class="label">Items:</span> ${data.orderItems}</p>
      <p><span class="label">Estimated Total:</span> $${data.estimatedTotal}</p>
      <p><span class="label">${isFullPayment ? 'Full Payment' : 'Deposit'} Paid:</span> $${data.depositAmount}</p>
    </div>

    ${data.notes ? `
    <div class="section">
      <h2>Customer Notes</h2>
      <p>${data.notes}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 20px;">
      <strong>Action Required:</strong> Contact customer within 24-48 hours to schedule consultation.
    </p>
  </div>
</body>
</html>
  `

  const client = await getSmtpClient()

  try {
    await client.send({
      from: `Party Palace Bookings <${SMTP_USER}>`,
      to: SMTP_USER!,
      subject: `New Booking: ${data.customerName} - ${data.eventType || 'Event'}`,
      content: `New booking from ${data.customerName}`,
      html: emailHtml,
    })
    console.log('Booking business notification sent')
  } finally {
    await client.close()
  }
}
