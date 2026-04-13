// api/upload-image.js — Vercel serverless function
// Uploads product images to Supabase Storage using the service role key,
// bypassing client-side RLS restrictions.

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fileName, fileData, contentType } = req.body;

    if (!fileName || !fileData || !contentType) {
        return res.status(400).json({ error: 'Missing fileName, fileData, or contentType' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
        return res.status(500).json({ error: 'Server misconfigured — missing env vars' });
    }

    try {
        const fileBuffer = Buffer.from(fileData, 'base64');
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/product-images/${fileName}`;

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + SERVICE_KEY,
                'apikey': SERVICE_KEY,
                'Content-Type': contentType,
                'x-upsert': 'true'
            },
            body: fileBuffer
        });

        if (!response.ok) {
            const errBody = await response.text();
            return res.status(500).json({ error: `Supabase error (${response.status}): ${errBody}` });
        }

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
        return res.status(200).json({ url: publicUrl });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
