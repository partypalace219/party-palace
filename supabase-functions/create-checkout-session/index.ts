// Supabase Edge Function: create-checkout-session
// Uses Stripe API directly via fetch (no SDK)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') as string

    const { items, customerInfo, paymentType, paymentAmount, hasProducts, shipping, tax, discount, shippingAddress } = await req.json()

    // Get item names for the description
    const itemNames = items.map((item: any) => item.name).join(', ')
    const itemsSubtotal = items.reduce((sum: number, item: any) => sum + item.price, 0)

    // Apply discount to product subtotal (discount only applies to products)
    const discountAmount = discount || 0
    const discountedSubtotal = itemsSubtotal - discountAmount

    // Build line items
    const lineItems: any[] = []

    if (hasProducts) {
      // For products: charge discounted amount with shipping and tax
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Products',
            description: discountAmount > 0 ? `${itemNames} (Discount applied: -$${discountAmount.toFixed(2)})` : itemNames,
          },
          unit_amount: Math.round(discountedSubtotal * 100),
        },
        quantity: 1,
      })

      // Add shipping if applicable
      if (shipping > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shipping',
              description: 'Standard shipping (3-10 business days)',
            },
            unit_amount: Math.round(shipping * 100),
          },
          quantity: 1,
        })
      }

      // Add tax
      if (tax > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Sales Tax',
              description: 'Indiana sales tax (7%)',
            },
            unit_amount: Math.round(tax * 100),
          },
          quantity: 1,
        })
      }
    } else {
      // For services: deposit or full payment
      const isFullPayment = paymentType === 'full'
      const amount = isFullPayment ? itemsSubtotal : paymentAmount

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: isFullPayment
              ? 'Party Palace Order - Full Payment'
              : 'Booking Deposit - Party Palace',
            description: isFullPayment
              ? `Full payment for: ${itemNames}.`
              : `Deposit to secure booking for: ${itemNames}. Remaining balance of $${itemsSubtotal - amount} due before event.`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      })
    }

    // Calculate total for metadata (with discount applied)
    const totalAmount = hasProducts
      ? discountedSubtotal + (shipping || 0) + (tax || 0)
      : (paymentType === 'full' ? itemsSubtotal : paymentAmount)

    // Build request body for Stripe API
    const params = new URLSearchParams()
    params.append('payment_method_types[]', 'card')
    params.append('mode', 'payment')
    params.append('success_url', 'https://thepartypalace.in/#checkout-success')
    params.append('cancel_url', 'https://thepartypalace.in/#checkout')
    params.append('customer_email', customerInfo.email)

    // Add line items
    lineItems.forEach((item, index) => {
      params.append(`line_items[${index}][price_data][currency]`, item.price_data.currency)
      params.append(`line_items[${index}][price_data][product_data][name]`, item.price_data.product_data.name)
      params.append(`line_items[${index}][price_data][product_data][description]`, item.price_data.product_data.description)
      params.append(`line_items[${index}][price_data][unit_amount]`, item.price_data.unit_amount.toString())
      params.append(`line_items[${index}][quantity]`, item.quantity.toString())
    })

    // Add shipping address collection for products
    if (hasProducts) {
      params.append('shipping_address_collection[allowed_countries][]', 'US')
    }

    // Add metadata
    params.append('metadata[customer_name]', customerInfo.name)
    params.append('metadata[customer_phone]', customerInfo.phone)
    params.append('metadata[event_date]', customerInfo.eventDate || '')
    params.append('metadata[event_type]', customerInfo.eventType || '')
    params.append('metadata[venue]', customerInfo.venue || '')
    params.append('metadata[notes]', customerInfo.notes || '')
    params.append('metadata[order_items]', itemNames)
    params.append('metadata[items_subtotal]', itemsSubtotal.toString())
    params.append('metadata[discount]', discountAmount.toString())
    params.append('metadata[shipping]', (shipping || 0).toString())
    params.append('metadata[tax]', (tax || 0).toString())
    params.append('metadata[total_amount]', totalAmount.toString())
    params.append('metadata[payment_type]', hasProducts ? 'full' : paymentType)
    params.append('metadata[has_products]', hasProducts ? 'true' : 'false')
    params.append('metadata[shipping_address]', shippingAddress ? JSON.stringify(shippingAddress) : '')

    // Call Stripe API directly
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await response.json()

    if (!response.ok) {
      console.error('Stripe API error:', session)
      throw new Error(session.error?.message || 'Failed to create checkout session')
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
