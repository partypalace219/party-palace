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

    const { items, customerInfo, paymentType, depositAmount } = await req.json()

    // Determine if this is a deposit or full payment
    const isDeposit = paymentType === 'deposit'

    let lineItems: any[]

    if (isDeposit) {
      // For deposit: create a single line item for the deposit amount
      const itemNames = items.map((item: any) => item.name).join(', ')
      const fullTotal = items.reduce((sum: number, item: any) => sum + item.price, 0)
      const remainingBalance = fullTotal - depositAmount

      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Booking Deposit',
            description: `Deposit for: ${itemNames}. Remaining balance: $${remainingBalance} due after design confirmation.`,
          },
          unit_amount: Math.round(depositAmount * 100), // Stripe uses cents
        },
        quantity: 1,
      }]
    } else {
      // For full payment: create line items for each cart item
      lineItems = items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(item.price * 100), // Stripe uses cents
        },
        quantity: 1,
      }))
    }

    // Calculate totals for metadata
    const fullTotal = items.reduce((sum: number, item: any) => sum + item.price, 0)
    const amountPaid = isDeposit ? depositAmount : fullTotal
    const remainingBalance = isDeposit ? fullTotal - depositAmount : 0

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/#checkout-success`,
      cancel_url: `${req.headers.get('origin')}/#checkout`,
      customer_email: customerInfo.email,
      metadata: {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        event_date: customerInfo.eventDate,
        event_type: customerInfo.eventType,
        venue: customerInfo.venue || '',
        notes: customerInfo.notes || '',
        payment_type: isDeposit ? 'deposit' : 'full',
        order_items: items.map((item: any) => item.name).join(', '),
        full_total: fullTotal.toString(),
        amount_paid: amountPaid.toString(),
        remaining_balance: remainingBalance.toString(),
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
