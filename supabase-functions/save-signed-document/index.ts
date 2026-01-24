// Supabase Edge Function: save-signed-document
// Saves signed contracts/waivers to database and sends email notifications
// Deploy this via Supabase Dashboard > Edge Functions > Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SMTP Configuration - Use Gmail SMTP
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER') // partypalace.in@gmail.com
const SMTP_PASS = Deno.env.get('SMTP_PASS') // Gmail App Password

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { documentType, documentData } = await req.json()

    // Validate input
    if (!documentType || !documentData) {
      return new Response(
        JSON.stringify({ error: 'Missing documentType or documentData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save to database
    const tableName = documentType === 'contract' ? 'signed_contracts' : 'signed_waivers'

    const { data, error } = await supabaseClient
      .from(tableName)
      .insert([{
        full_name: documentData.fullName,
        signature: documentData.signature,
        event_date: documentData.eventDate || null,
        signed_date: documentData.date,
        accepted: documentData.accepted,
        timestamp: documentData.timestamp,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
      }])
      .select()

    if (error) {
      console.error('Database error:', error)
      // Continue anyway to send email notification
    }

    // Send email notification to business
    if (SMTP_USER && SMTP_PASS) {
      try {
        await sendBusinessNotification({
          documentType,
          fullName: documentData.fullName,
          signature: documentData.signature,
          eventDate: documentData.eventDate || 'Not specified',
          signedDate: documentData.date,
          timestamp: documentData.timestamp,
        })
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, saved: !error }),
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

async function sendBusinessNotification(data: {
  documentType: string
  fullName: string
  signature: string
  eventDate: string
  signedDate: string
  timestamp: string
}) {
  const documentTitle = data.documentType === 'contract' ? 'Party Palace Agreement' : 'Liability Waiver'

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: ${data.documentType === 'contract' ? '#667eea' : '#059669'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9f9f9; }
    .section { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .label { font-weight: bold; color: #666; }
    .signature-box { font-family: 'Brush Script MT', cursive; font-size: 24px; color: #333; padding: 10px; background: #fafafa; border: 1px dashed #ccc; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Document Signed</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${documentTitle}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2 style="margin-top: 0; color: #333;">Signer Information</h2>
      <p><span class="label">Full Name:</span> ${data.fullName}</p>
      <p><span class="label">Event Date:</span> ${data.eventDate}</p>
      <p><span class="label">Date Signed:</span> ${data.signedDate}</p>
      <p><span class="label">Timestamp:</span> ${new Date(data.timestamp).toLocaleString()}</p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: #333;">Electronic Signature</h2>
      <div class="signature-box">${data.signature}</div>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
      This document has been electronically signed and saved to your database.
    </p>
  </div>
</body>
</html>
  `

  const client = await getSmtpClient()

  try {
    await client.send({
      from: `Party Palace <${SMTP_USER}>`,
      to: SMTP_USER!, // Send to yourself
      subject: `${documentTitle} Signed by ${data.fullName}`,
      content: `${documentTitle} signed by ${data.fullName} on ${data.signedDate}`,
      html: emailHtml,
    })
    console.log('Business notification sent for:', data.fullName)
  } finally {
    await client.close()
  }
}
