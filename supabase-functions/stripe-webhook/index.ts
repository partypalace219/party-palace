// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events and sends confirmation emails
// Deploy this via Supabase Dashboard > Edge Functions > Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Extract customer and order info from metadata
      const metadata = session.metadata || {}
      const customerEmail = session.customer_email
      const customerName = metadata.customer_name || 'Valued Customer'
      const customerPhone = metadata.customer_phone || ''
      const eventDate = metadata.event_date || 'TBD'
      const eventType = metadata.event_type || ''
      const venue = metadata.venue || ''
      const orderItems = metadata.order_items || ''
      const estimatedTotal = metadata.estimated_total || ''
      const depositAmount = metadata.deposit_amount || '50'
      const notes = metadata.notes || ''

      // Send confirmation email to customer
      if (customerEmail && RESEND_API_KEY) {
        await sendConfirmationEmail({
          to: customerEmail,
          customerName,
          customerPhone,
          eventDate,
          eventType,
          venue,
          orderItems,
          estimatedTotal,
          depositAmount,
          notes,
        })

        // Also send notification to business
        await sendBusinessNotification({
          customerEmail,
          customerName,
          customerPhone,
          eventDate,
          eventType,
          venue,
          orderItems,
          estimatedTotal,
          depositAmount,
          notes,
        })
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

async function sendConfirmationEmail(data: {
  to: string
  customerName: string
  customerPhone: string
  eventDate: string
  eventType: string
  venue: string
  orderItems: string
  estimatedTotal: string
  depositAmount: string
  notes: string
}) {
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
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #666; }
    .highlight { background: #667eea; color: white; padding: 15px; border-radius: 8px; text-align: center; }
    .highlight .amount { font-size: 32px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .cta { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Party Palace</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Booking Confirmation</p>
  </div>

  <div class="content">
    <p>Hi ${data.customerName},</p>
    <p>Thank you for your booking! Your deposit has been received and your event is now secured.</p>

    <div class="highlight">
      <p style="margin: 0; opacity: 0.9;">Deposit Paid</p>
      <div class="amount">$${data.depositAmount}</div>
    </div>

    <div class="section">
      <h2>Event Details</h2>
      <div class="detail-row">
        <span class="detail-label">Event Type:</span>
        <span>${data.eventType || 'To be confirmed'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Event Date:</span>
        <span>${data.eventDate || 'To be confirmed'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Venue:</span>
        <span>${data.venue || 'To be confirmed'}</span>
      </div>
    </div>

    <div class="section">
      <h2>Your Order</h2>
      <p>${data.orderItems || 'Custom order'}</p>
      <div class="detail-row" style="border-top: 2px solid #667eea; margin-top: 15px; padding-top: 15px;">
        <span class="detail-label">Estimated Total:</span>
        <span style="font-size: 18px; color: #667eea; font-weight: bold;">$${data.estimatedTotal}</span>
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 10px;">
        * Final pricing will be confirmed after your design consultation
      </p>
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
        <li>The remaining balance will be due before your event date</li>
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
    <p>&copy; 2022 Party Palace. All rights reserved.</p>
    <p>Professional Event Decorations | Northwest Indiana & Chicagoland</p>
  </div>
</body>
</html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Party Palace <bookings@partypalace.in>',
      to: data.to,
      subject: 'Booking Confirmed - Party Palace',
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send customer email:', error)
  } else {
    console.log('Confirmation email sent to:', data.to)
  }
}

async function sendBusinessNotification(data: {
  customerEmail: string
  customerName: string
  customerPhone: string
  eventDate: string
  eventType: string
  venue: string
  orderItems: string
  estimatedTotal: string
  depositAmount: string
  notes: string
}) {
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
    <p>Deposit: $${data.depositAmount}</p>
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
      <p><span class="label">Deposit Paid:</span> $${data.depositAmount}</p>
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

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Party Palace Bookings <bookings@partypalace.in>',
      to: 'partypalace.in@gmail.com',
      subject: `New Booking: ${data.customerName} - ${data.eventType || 'Event'}`,
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send business notification:', error)
  } else {
    console.log('Business notification sent')
  }
}
