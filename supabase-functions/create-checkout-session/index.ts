// Supabase Edge Function: create-checkout-session
// Uses Stripe API directly via fetch (no SDK)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  'https://thepartypalace.in',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') as string

    const { items, customerInfo, paymentType, paymentAmount, hasProducts, shipping, tax, couponCode, shippingAddress } = await req.json()

    // --- Server-side price verification ---
    // Only look up items that have a UUID id (DB products). Items without id
    // (services, legacy 3D-print cart items) keep their client-supplied price.
    const productIds = items
      .filter((item: any) => item.id)
      .map((item: any) => item.id)

    let priceMap = new Map<string, number>()

    if (productIds.length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') as string,
        Deno.env.get('SB_SERVICE_KEY') as string
      )

      const { data: dbProducts, error } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', productIds)

      if (error) {
        console.error('Supabase price lookup error:', error)
        return new Response(
          JSON.stringify({ error: 'Could not verify product prices. Please try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      for (const p of (dbProducts || [])) {
        priceMap.set(p.id, p.price)
      }
    }

    // Replace client-supplied prices with server-authoritative prices for DB products
    const verifiedItems = items.map((item: any) => {
      if (!item.id) return item  // service / local item — keep client price
      const serverPrice = priceMap.get(item.id)
      return { ...item, price: serverPrice !== undefined ? serverPrice : null }
    })

    // Reject if any DB product could not be resolved
    const unresolved = verifiedItems.filter((item: any) => item.id && item.price === null)
    if (unresolved.length > 0) {
      return new Response(
        JSON.stringify({ error: 'One or more products could not be verified. Please refresh and try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Server-side coupon validation ---
    const couponMap: Record<string, number> = JSON.parse(Deno.env.get('COUPON_CODES') || '{}')

    const productSubtotal = verifiedItems
      .filter((item: any) => item.id)  // discount applies only to DB products
      .reduce((sum: number, item: any) => sum + item.price, 0)

    let discountAmount = 0
    if (couponCode) {
      const upperCode = String(couponCode).toUpperCase()
      const discountPercent = couponMap[upperCode]
      if (discountPercent === undefined) {
        return new Response(
          JSON.stringify({ error: `Coupon code "${couponCode}" is not valid.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      discountAmount = productSubtotal * (discountPercent / 100)
    }

    // Get item names for the description
    const itemNames = verifiedItems.map((item: any) => item.name).join(', ')
    const itemsSubtotal = verifiedItems.reduce((sum: number, item: any) => sum + item.price, 0)

    // Apply server-calculated discount
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

    // Calculate total for metadata (with server-verified discount applied)
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
