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

    const { items, customerInfo, paymentType, paymentAmount } = await req.json()

    // Get item names for the description
    const itemNames = items.map((item: any) => item.name).join(', ')
    const estimatedTotal = items.reduce((sum: number, item: any) => sum + item.price, 0)

    // Determine payment details based on type
    const isFullPayment = paymentType === 'full'
    const amount = isFullPayment ? estimatedTotal : paymentAmount

    // Create line item based on payment type
    const lineItems = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: isFullPayment
            ? 'Party Palace Order - Full Payment'
            : 'Booking Deposit - Party Palace',
          description: isFullPayment
            ? `Full payment for: ${itemNames}.`
            : `Deposit to secure booking for: ${itemNames}. Remaining balance of $${estimatedTotal - amount} due before event.`,
        },
        unit_amount: Math.round(amount * 100), // Stripe uses cents
      },
      quantity: 1,
    }]

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://thepartypalace.in/#checkout-success',
      cancel_url: 'https://thepartypalace.in/#checkout',
      customer_email: customerInfo.email,
      metadata: {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        event_date: customerInfo.eventDate,
        event_type: customerInfo.eventType,
        venue: customerInfo.venue || '',
        notes: customerInfo.notes || '',
        order_items: itemNames,
        estimated_total: estimatedTotal.toString(),
        payment_type: paymentType,
        amount_paid: amount.toString(),
        remaining_balance: isFullPayment ? '0' : (estimatedTotal - amount).toString(),
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
