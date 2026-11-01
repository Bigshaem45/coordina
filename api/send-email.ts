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

  // 1. SendGrid Configuration (Primary)
  const sendgridKey = (
    process.env.SENDGRID_API_KEY ||
    process.env.VITE_SENDGRID_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  const sendgridFrom = (
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.VITE_SENDGRID_FROM_EMAIL ||
    'apvdirect1@gmail.com'
  ).trim().replace(/^["']|["']$/g, '');

  // 2. Resend Configuration (Secondary Fallback)
  const resendKey = (
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  const resendFrom = (
    process.env.RESEND_FROM_EMAIL ||
    process.env.VITE_RESEND_FROM_EMAIL ||
    'COORDINA <onboarding@resend.dev>'
  ).trim().replace(/^["']|["']$/g, '');

  // If SendGrid key is provided, dispatch via SendGrid v3 Mail Send API
  if (sendgridKey) {
    try {
      const fromEmail = sendgridFrom.includes('<')
        ? sendgridFrom.replace(/.*<([^>]+)>.*/, '$1').trim()
        : sendgridFrom;
      const fromName = sendgridFrom.includes('<')
        ? sendgridFrom.replace(/<.*>/, '').trim() || 'COORDINA'
        : 'COORDINA';

      const recipients = Array.isArray(to) ? to : [to];

      const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: recipients.map((r: string) => ({ email: r.trim() })),
            },
          ],
          from: {
            email: fromEmail,
            name: fromName,
          },
          subject,
          content: [
            {
              type: 'text/html',
              value: html,
            },
          ],
        }),
      });

      if (sgResponse.status === 202 || sgResponse.ok) {
        const msgId = sgResponse.headers.get('x-message-id') || `sg_${Date.now()}`;
        return res.status(200).json({ success: true, id: msgId, provider: 'sendgrid' });
      }

      const sgData = await sgResponse.json().catch(() => ({}));
      console.warn('[Vercel send-email] SendGrid error status', sgResponse.status, sgData);
      return res.status(200).json({
        success: false,
        error: sgData?.errors?.[0]?.message || 'SendGrid failed to dispatch email',
        statusCode: sgResponse.status,
      });
    } catch (err: any) {
      console.warn('[Vercel send-email] SendGrid exception:', err);
      return res.status(200).json({
        success: false,
        error: err.message || 'Internal SendGrid dispatch error',
      });
    }
  }

  // Secondary Fallback: Resend API
  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
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

      return res.status(200).json({ success: true, id: data.id, provider: 'resend' });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        error: err.message || 'Internal error dispatching email',
      });
    }
  }

  // Guard against missing API keys
  console.warn('[Vercel send-email] Neither SENDGRID_API_KEY nor RESEND_API_KEY is configured in Vercel environment variables.');
  return res.status(200).json({
    success: false,
    deferred: true,
    message: 'SENDGRID_API_KEY is not configured in Vercel Environment Variables. Please add SENDGRID_API_KEY to your Vercel Project Settings.',
  });
}
