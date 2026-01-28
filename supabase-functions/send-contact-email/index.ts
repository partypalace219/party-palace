// Supabase Edge Function: send-contact-email
// Handles contact form submissions and sends email notifications
// Deploy this via Supabase Dashboard > Edge Functions > Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SMTP Configuration - Use Gmail SMTP
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER') // partypalace.in@gmail.com
const SMTP_PASS = Deno.env.get('SMTP_PASS') // Gmail App Password

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 5 // Max 5 submissions per hour per IP

serve(async (req) => {
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

    // Check SMTP configuration
    if (!SMTP_USER || !SMTP_PASS) {
      console.error('SMTP not configured')
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
      <p class="product-name">${data.selectedProduct!.name}</p>
      <p class="product-price">Starting at $${data.selectedProduct!.price}</p>
    </div>
    ` : ''}

    <div class="section">
      <h2 style="margin-top: 0; color: #667eea;">Customer Information</h2>
      <p><span class="label">Name:</span> ${data.name}</p>
      <p><span class="label">Email:</span> <a href="mailto:${data.email}">${data.email}</a></p>
      <p><span class="label">Phone:</span> <a href="tel:${data.phone}">${data.phone}</a></p>
      <p><span class="label">Event Type:</span> ${data.eventType}</p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: #667eea;">Message</h2>
      <div class="message-box">
        ${data.message.replace(/\n/g, '<br>')}
      </div>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
      <strong>Action Required:</strong> Respond to this inquiry within 24 hours.
    </p>
  </div>
</body>
</html>
  `

  const client = await getSmtpClient()

  // Include product in subject if available
  const subject = hasProduct
    ? `New Inquiry: ${data.name} - ${data.selectedProduct!.name}`
    : `New Inquiry: ${data.name} - ${data.eventType}`

  const plainText = hasProduct
    ? `New contact inquiry from ${data.name}\n\nInterested Product: ${data.selectedProduct!.name} (Starting at $${data.selectedProduct!.price})\n\nEmail: ${data.email}\nPhone: ${data.phone}\nEvent Type: ${data.eventType}\n\nMessage:\n${data.message}`
    : `New contact inquiry from ${data.name}\n\nEmail: ${data.email}\nPhone: ${data.phone}\nEvent Type: ${data.eventType}\n\nMessage:\n${data.message}`

  try {
    await client.send({
      from: `Party Palace Website <${SMTP_USER}>`,
      to: SMTP_USER!, // Send to yourself
      replyTo: data.email, // So you can reply directly to customer
      subject,
      content: plainText,
      html: emailHtml,
    })
    console.log('Contact email sent for:', data.name)
  } finally {
    await client.close()
  }
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
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${orderTypeLabels[data.orderType] || data.orderType}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2 style="margin-top: 0; color: #059669;">Customer Information</h2>
      <p><span class="label">Name:</span> ${data.name}</p>
      <p><span class="label">Email:</span> <a href="mailto:${data.email}">${data.email}</a></p>
      <p><span class="label">Phone:</span> <a href="tel:${data.phone}">${data.phone}</a></p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: #059669;">Order Details</h2>
      <p><span class="label">Order Type:</span> ${orderTypeLabels[data.orderType] || data.orderType}</p>
      <p><span class="label">Product:</span> ${data.product}</p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: #059669;">Project Description</h2>
      <div class="description-box">
        ${data.description.replace(/\n/g, '<br>')}
      </div>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
      <strong>Action Required:</strong> Send a quote within 24-48 hours.
    </p>
  </div>
</body>
</html>
  `

  const client = await getSmtpClient()

  try {
    await client.send({
      from: `Party Palace Website <${SMTP_USER}>`,
      to: SMTP_USER!, // Send to yourself
      replyTo: data.email, // So you can reply directly to customer
      subject: `Custom Order: ${data.name} - ${orderTypeLabels[data.orderType] || data.orderType}`,
      content: `New custom order request from ${data.name}\n\nEmail: ${data.email}\nPhone: ${data.phone}\nOrder Type: ${data.orderType}\nProduct: ${data.product}\n\nDescription:\n${data.description}`,
      html: emailHtml,
    })
    console.log('Custom order email sent for:', data.name)
  } finally {
    await client.close()
  }
}