// Supabase Edge Function: send-contact-email
// Handles contact form submissions and sends email notifications via Resend
// Deploy this via Supabase Dashboard > Edge Functions > Create Function

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

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_ADDRESS = 'Party Palace <onboarding@resend.dev>'
const BUSINESS_EMAIL = 'partypalace.in@gmail.com'

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 5 // Max 5 submissions per hour per IP

async function sendEmail(opts: {
  from: string
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<void> {
  const body: Record<string, unknown> = {
    from: opts.from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
  }
  if (opts.replyTo) body.reply_to = opts.replyTo
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend API error ${res.status}: ${errBody}`)
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown'

    const { formType, formData, honeypot } = await req.json()

    // Honeypot check - if this field has a value, it's likely a bot
    if (honeypot) {
      console.log('Honeypot triggered - likely bot submission')
      // Return success to not alert the bot, but don't actually send
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Validate input
    if (!formType || !formData) {
      return new Response(
        JSON.stringify({ error: 'Missing formType or formData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check Resend configuration
    if (!RESEND_API_KEY) {
      console.error('Resend API key not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting check using Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SB_SERVICE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check recent submissions from this IP
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

    const { count, error: countError } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIP)
      .gte('created_at', oneHourAgo)

    if (countError) {
      console.error('Rate limit check error:', countError)
      // Continue anyway if rate limit check fails
    } else if (count !== null && count >= RATE_LIMIT_MAX_REQUESTS) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log this submission for rate limiting
    await supabase
      .from('form_submissions')
      .insert({
        ip_address: clientIP,
        form_type: formType,
        created_at: new Date().toISOString()
      })

    // Send email based on form type
    if (formType === 'contact') {
      await sendContactEmail(formData)
    } else if (formType === 'customOrder') {
      await sendCustomOrderEmail(formData)
    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown form type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendContactEmail(data: {
  name: string
  email: string
  phone: string
  eventType: string
  message: string
  selectedProduct?: { name: string; price: number } | null
}) {
  const hasProduct = data.selectedProduct && data.selectedProduct.name

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9f9f9; }
    .section { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .label { font-weight: bold; color: #666; }
    .message-box { background: #fafafa; border-left: 4px solid #667eea; padding: 15px; margin-top: 10px; }
    .product-highlight { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
    .product-highlight h2 { margin: 0 0 10px 0; color: white; }
    .product-name { font-size: 1.3em; font-weight: bold; }
    .product-price { opacity: 0.9; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Contact Inquiry</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Party Palace Website</p>
  </div>

  <div class="content">
    ${hasProduct ? `
    <div class="product-highlight">
      <h2>Interested Product</h2>
      <p class="product-name">${escapeHtml(data.selectedProduct!.name)}</p>
      <p class="product-price">Starting at $${data.selectedProduct!.price}</p>
    </div>
    ` : ''}

    <div class="section">
      <h2 style="margin-top: 0; color: #667eea;">Customer Information</h2>
      <p><span class="label">Name:</span> ${escapeHtml(data.name)}</p>
      <p><span class="label">Email:</span> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
      <p><span class="label">Phone:</span> <a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a></p>
      <p><span class="label">Event Type:</span> ${escapeHtml(data.eventType)}</p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: #667eea;">Message</h2>
      <div class="message-box">
        ${escapeHtml(data.message).replace(/\n/g, '<br>')}
      </div>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
      <strong>Action Required:</strong> Respond to this inquiry within 24 hours.
    </p>
  </div>
</body>
</html>
  `

  await sendEmail({
    from: FROM_ADDRESS,
    to: BUSINESS_EMAIL,
    replyTo: data.email,
    subject: hasProduct
      ? `New Inquiry: ${data.name} - ${data.selectedProduct!.name}`
      : `New Inquiry: ${data.name} - ${data.eventType}`,
    html: emailHtml,
  })
  console.log('Contact email sent for:', data.name)
}

async function sendCustomOrderEmail(data: {
  name: string
  email: string
  phone: string
  orderType: string
  product: string
  description: string
}) {
  const orderTypeLabels: Record<string, string> = {
    '3d-print': '3D Print',
    'engraving': 'Engraving',
    'both': '3D Print & Engraving'
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9f9f9; }
    .section { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .label { font-weight: bold; color: #666; }
    .description-box { background: #fafafa; border-left: 4px solid #059669; padding: 15px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Custom Order Request</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${orderTypeLabels[data.orderType] || escapeHtml(data.orderType)}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2 style="margin-top: 0; color: #059669;">Customer Information</h2>
      <p><span class="label">Name:</span> ${escapeHtml(data.name)}</p>
      <p><span class="label">Email:</span> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
      <p><span class="label">Phone:</span> <a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a></p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: #059669;">Order Details</h2>
      <p><span class="label">Order Type:</span> ${orderTypeLabels[data.orderType] || escapeHtml(data.orderType)}</p>
      <p><span class="label">Product:</span> ${escapeHtml(data.product)}</p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: #059669;">Project Description</h2>
      <div class="description-box">
        ${escapeHtml(data.description).replace(/\n/g, '<br>')}
      </div>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
      <strong>Action Required:</strong> Send a quote within 24-48 hours.
    </p>
  </div>
</body>
</html>
  `

  await sendEmail({
    from: FROM_ADDRESS,
    to: BUSINESS_EMAIL,
    replyTo: data.email,
    subject: `Custom Order: ${data.name} - ${orderTypeLabels[data.orderType] || data.orderType}`,
    html: emailHtml,
  })
  console.log('Custom order email sent for:', data.name)
}
