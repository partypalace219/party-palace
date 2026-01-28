// Supabase Edge Function: create-checkout-session
// Deploy this via Supabase Dashboard > Edge Functions > Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'

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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2023-10-16',
    })

    const { items, customerInfo, paymentType, paymentAmount, hasProducts, shipping, tax, shippingAddress } = await req.json()

    // Get item names for the description
    const itemNames = items.map((item: any) => item.name).join(', ')
    const itemsSubtotal = items.reduce((sum: number, item: any) => sum + item.price, 0)

    // Build line items
    const lineItems: any[] = []

    if (hasProducts) {
      // For products: charge full amount with shipping and tax
      // Add items subtotal
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Products',
            description: itemNames,
          },
          unit_amount: Math.round(itemsSubtotal * 100),
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

    // Calculate total for metadata
    const totalAmount = hasProducts
      ? itemsSubtotal + (shipping || 0) + (tax || 0)
      : (paymentType === 'full' ? itemsSubtotal : paymentAmount)

    // Build shipping address for Stripe if available
    const shippingAddressCollection = hasProducts ? {
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
    } : {}

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://thepartypalace.in/#checkout-success',
      cancel_url: 'https://thepartypalace.in/#checkout',
      customer_email: customerInfo.email,
      ...shippingAddressCollection,
      metadata: {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        event_date: customerInfo.eventDate || '',
        event_type: customerInfo.eventType || '',
        venue: customerInfo.venue || '',
        notes: customerInfo.notes || '',
        order_items: itemNames,
        items_subtotal: itemsSubtotal.toString(),
        shipping: (shipping || 0).toString(),
        tax: (tax || 0).toString(),
        total_amount: totalAmount.toString(),
        payment_type: hasProducts ? 'full' : paymentType,
        has_products: hasProducts ? 'true' : 'false',
        shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : '',
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Stripe error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
