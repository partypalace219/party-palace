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

// Full agreement texts
const LIABILITY_WAIVER_TEXT = `
LIABILITY WAIVER & RELEASE OF CLAIMS

PLEASE READ CAREFULLY BEFORE PROCEEDING

This Liability Waiver and Release of Claims ("Waiver") is entered into by the undersigned client ("Client") and Party Palace, located in Griffith, IN ("Company").

By booking services, submitting a deposit, completing checkout, signing electronically, or receiving services from the Company, the Client acknowledges and agrees to the following terms:

1. ASSUMPTION OF RISK

The Client understands and acknowledges that event decor services, including but not limited to balloon installations, arches, columns, walls, centerpieces, rentals, custom decor, 3D printed items, and engraved products, involve inherent risks.

These risks may include, but are not limited to:
• Tripping, slipping, or falling
• Allergic reactions, including latex exposure
• Injury to adults or children
• Property or venue damage
• Damage caused by weather, venue conditions, or guest interaction
• Improper handling or misuse of decor items

The Client voluntarily assumes all risks, known and unknown, associated with the presence, use, or interaction with the Company's products and services.

2. RELEASE OF LIABILITY

To the fullest extent permitted by law, the Client hereby releases, waives, and discharges Party Palace, its owners, employees, contractors, agents, and representatives from any and all claims, demands, actions, damages, losses, injuries, or liabilities of any kind arising out of or related to:
• Use or presence of decor or rental items
• Installation, setup, breakdown, or removal of decor
• Event attendance or guest behavior
• Venue or property conditions
• Acts or omissions of third parties

This release applies whether arising from negligence or otherwise.

3. CHILD SUPERVISION

The Client acknowledges that balloon decor, installations, and rental items are not toys. The Client agrees to supervise all children at all times.

The Company is not responsible for injuries, damages, or incidents involving unsupervised children or misuse of decor items.

4. PROPERTY & VENUE RESPONSIBILITY

The Client confirms they have obtained all necessary permissions from the venue or property owner for installations.

The Company is not responsible for:
• Damage caused by venue conditions
• Damage caused by guests, vendors, or third parties
• Damage occurring after installation is complete

The Client agrees to assume full financial responsibility for damage to Company property resulting from misuse, negligence, or guest interference.

5. WEATHER & OUTDOOR EVENTS

For outdoor events, the Client acknowledges that weather conditions may impact decor safety and durability. The Company reserves the right to modify, secure, or remove decor if conditions pose a safety risk.

The Company is not liable for damage, delays, or changes caused by weather.

6. CUSTOM WORK & APPEARANCE DISCLAIMER

The Client understands that all decor and custom items are handcrafted or custom-produced. While inspiration photos and color requests are used as references, exact duplication is not guaranteed.

Minor variations in color, size, or design do not constitute a defect or breach of service.

7. DEPOSITS, PAYMENTS & CANCELLATIONS

All deposits are non-refundable and secure the event date. Remaining balances must be paid according to the agreed terms prior to service delivery or setup.

Failure to complete payment may result in cancellation without refund.

8. PHOTO & MEDIA RELEASE

Unless the Client provides written notice otherwise, the Client grants the Company permission to photograph completed decor and installations and use such images for promotional purposes, including website and social media content.

9. GOVERNING LAW

This Waiver shall be governed by and interpreted in accordance with the laws of the State of Indiana.

10. ELECTRONIC ACKNOWLEDGMENT & CONSENT

By checking the acceptance box, typing their name and signature, and completing checkout or booking, the Client confirms that they:
• Have read and fully understand this Waiver
• Agree to all terms stated above
• Intentionally waive certain legal rights
• Consent to electronic signature and record keeping

This electronic acknowledgment constitutes a legally binding agreement.
`;

const PARTY_PALACE_AGREEMENT_TEXT = `
PARTY DECOR & RENTALS AGREEMENT

PLEASE READ CAREFULLY BEFORE BOOKING

This Party Palace Agreement ("Agreement") is entered into by the undersigned client ("Client") and Party Palace, located in Griffith, IN ("Company").

By booking services, submitting a deposit, signing electronically, or completing checkout, the Client agrees to the following terms and conditions:

1. SERVICES PROVIDED

The Company agrees to provide event decor and/or rental services as outlined in the Client's invoice, quote, or booking confirmation. Services may include, but are not limited to:
• Balloon arches, columns, walls, and centerpieces
• Custom party decor installations
• Decor rentals and related accessories
• Setup and breakdown services (if included in the booking)

All services are subject to availability and venue approval.

2. EVENT DETAILS & CLIENT RESPONSIBILITIES

The Client is responsible for providing accurate event details, including:
• Event date and time
• Venue address
• Indoor or outdoor setup confirmation
• Setup and breakdown access times

Any changes must be communicated in writing and may result in additional fees.

3. DEPOSITS & PAYMENTS

• A non-refundable deposit is required to secure the event date.
• The remaining balance must be paid in full prior to setup, delivery, or rental release.
• Failure to complete payment may result in cancellation of services without refund.
• Deposits reserve time, materials, and labor and are not transferable.

4. CANCELLATIONS & RESCHEDULING

• Deposits are non-refundable under all circumstances.
• Rescheduling is subject to availability and must be requested in writing.
• If the Company is unable to perform due to circumstances beyond its control, liability is limited to a refund of payments made, excluding the deposit where permitted by law.

5. RENTAL ITEMS & CARE

The Client agrees to:
• Use rental items only for their intended purpose
• Prevent misuse, tampering, or guest interference
• Return all rental items in the same condition received (normal wear excepted)

The Client assumes financial responsibility for:
• Lost, stolen, or damaged rental items
• Repair or replacement costs due to misuse, negligence, or guest interference

6. SETUP, BREAKDOWN & ACCESS

• Setup and breakdown times are scheduled according to the agreed event timeline.
• Delays caused by venue access issues or Client interference are not the responsibility of the Company.
• Additional labor time may result in added fees.

7. WEATHER & OUTDOOR EVENTS

For outdoor events:
• Weather conditions may impact decor safety and durability.
• The Company reserves the right to modify, secure, or remove decor if conditions pose a safety risk.
• No refunds will be issued for weather-related impacts beyond the Company's control.

8. CUSTOM DESIGN & APPEARANCE DISCLAIMER

All decor is custom-designed and handcrafted. While inspiration photos and color selections are used as references, exact replication is not guaranteed.

Variations in size, color, or arrangement do not constitute a defect or breach of contract.

9. LIABILITY & INDEMNIFICATION

All services are provided subject to the Company's Liability Waiver & Release of Claims, which is incorporated into this Agreement by reference.

The Client agrees to indemnify and hold harmless the Company from any claims, damages, or losses arising from:
• Guest behavior
• Venue conditions
• Improper use of decor or rental items

10. PHOTOGRAPHY & PROMOTIONAL USE

Unless the Client provides written notice otherwise, the Client grants the Company permission to photograph completed decor and installations and use such images for promotional purposes, including website and social media content.

11. APPOINTMENT-ONLY POLICY

The Company operates by appointment only. Communication is available via message or email outside of scheduled appointments.

12. GOVERNING LAW

This Agreement shall be governed by and interpreted in accordance with the laws of the State of Indiana.

13. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the Client and the Company and supersedes all prior discussions or representations. Any modifications must be made in writing and agreed upon by both parties.

14. ELECTRONIC ACCEPTANCE & SIGNATURE

By checking the acceptance box, typing their name, signing electronically, and completing booking or checkout, the Client confirms that they:
• Have read and understand this Agreement
• Agree to all terms and conditions
• Accept electronic records and signatures as legally binding

15. 3D PRINTS & ENGRAVING - NO REFUND POLICY

All 3D printed items and laser engraved products are custom-made to order based on the Client's specifications. Due to the personalized nature of these products:

• All sales are final. No refunds, returns, or exchanges will be issued for any 3D printed or engraved items.
• The Client is responsible for reviewing and approving all design specifications, text, and details before production begins.
• Minor variations in color, texture, or finish are inherent to the 3D printing and engraving processes and do not qualify for refunds.
• Orders cannot be canceled once production has begun.
• The Company is not responsible for errors resulting from incorrect information provided by the Client (e.g., misspelled names, wrong dates).

By placing an order for 3D printed or engraved items, the Client acknowledges and accepts this no refund policy.
`;

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
  const isContract = data.documentType === 'contract'
  const documentTitle = isContract ? 'Party Palace Agreement' : 'Liability Waiver'
  const agreementText = isContract ? PARTY_PALACE_AGREEMENT_TEXT : LIABILITY_WAIVER_TEXT
  const headerColor = isContract ? '#667eea' : '#059669'

  // Convert agreement text to HTML (replace newlines with <br> and format sections)
  const agreementHtml = agreementText
    .replace(/\n\n(\d+\.\s+[A-Z][A-Z\s&]+)\n/g, '<h4 style="color: #333; margin-top: 20px; margin-bottom: 10px;">$1</h4>')
    .replace(/\n•\s/g, '<br>• ')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
    .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9f9f9; }
    .section { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .label { font-weight: bold; color: #666; }
    .signature-box { font-family: 'Brush Script MT', cursive; font-size: 28px; color: #333; padding: 15px; background: #fafafa; border: 2px solid ${headerColor}; border-radius: 8px; margin-top: 10px; text-align: center; }
    .agreement-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-height: none; }
    .agreement-section h3 { color: ${headerColor}; margin-top: 0; border-bottom: 2px solid ${headerColor}; padding-bottom: 10px; }
    .agreement-section h4 { color: #333; margin-top: 20px; margin-bottom: 10px; }
    .agreement-section p { margin: 10px 0; }
    .legal-notice { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SIGNED: ${documentTitle}</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Legally Binding Electronic Document</p>
  </div>

  <div class="content">
    <div class="section">
      <h2 style="margin-top: 0; color: ${headerColor};">Signer Information</h2>
      <p><span class="label">Full Legal Name:</span> ${data.fullName}</p>
      <p><span class="label">Event Date:</span> ${data.eventDate}</p>
      <p><span class="label">Date Signed:</span> ${data.signedDate}</p>
      <p><span class="label">Timestamp:</span> ${new Date(data.timestamp).toLocaleString('en-US', { timeZone: 'America/Chicago' })} (Central Time)</p>
    </div>

    <div class="section">
      <h2 style="margin-top: 0; color: ${headerColor};">Electronic Signature</h2>
      <p style="font-size: 14px; color: #666;">The client typed their name below as their legal electronic signature:</p>
      <div class="signature-box">${data.signature}</div>
    </div>

    <div class="agreement-section">
      <h3>${documentTitle.toUpperCase()} - FULL TEXT</h3>
      <p>${agreementHtml}</p>
    </div>

    <div class="legal-notice">
      <strong>Legal Record Notice:</strong> This document has been electronically signed and constitutes a legally binding agreement.
      The signer acknowledged reading and agreeing to all terms by typing their name as an electronic signature.
      This record has been saved to your database for your records.
    </div>

    <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
      Party Palace | Griffith, IN | partypalace.in@gmail.com
    </p>
  </div>
</body>
</html>
  `

  const plainText = `
${documentTitle.toUpperCase()} - SIGNED DOCUMENT

SIGNER INFORMATION
==================
Full Legal Name: ${data.fullName}
Event Date: ${data.eventDate}
Date Signed: ${data.signedDate}
Timestamp: ${new Date(data.timestamp).toLocaleString('en-US', { timeZone: 'America/Chicago' })} (Central Time)

ELECTRONIC SIGNATURE
====================
${data.signature}

FULL AGREEMENT TEXT
===================
${agreementText}

---
This document has been electronically signed and saved to your database.
Party Palace | Griffith, IN
  `

  const client = await getSmtpClient()

  try {
    await client.send({
      from: `Party Palace <${SMTP_USER}>`,
      to: SMTP_USER!, // Send to yourself
      subject: `SIGNED: ${documentTitle} - ${data.fullName}`,
      content: plainText,
      html: emailHtml,
    })
    console.log('Business notification sent for:', data.fullName)
  } finally {
    await client.close()
  }
}
