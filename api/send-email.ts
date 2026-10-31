export default async function handler(req: any, res: any) {
  // Handle CORS preflight if called cross-origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required email fields (to, subject, html)' });
  }

  // Safely extract and sanitize API key from environment
  const apiKey = (
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  const fromEmail = (
    process.env.RESEND_FROM_EMAIL ||
    process.env.VITE_RESEND_FROM_EMAIL ||
    'COORDINA <onboarding@resend.dev>'
  ).trim().replace(/^["']|["']$/g, '');

  // Guard against missing API key in Vercel settings without failing with a raw 401
  if (!apiKey) {
    console.warn('[Vercel send-email] RESEND_API_KEY is not configured in Vercel environment variables.');
    return res.status(200).json({
      success: false,
      deferred: true,
      message: 'RESEND_API_KEY is not configured in Vercel Environment Variables. Please add RESEND_API_KEY to your Vercel Project Settings.',
    });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('[Vercel send-email] Resend returned status', response.status, data);
      return res.status(200).json({
        success: false,
        error: data?.message || 'Email delivery failed via Resend',
        statusCode: response.status,
      });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: err.message || 'Internal error dispatching email',
    });
  }
}
