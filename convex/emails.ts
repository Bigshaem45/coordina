import { action } from './_generated/server';
import { v } from 'convex/values';

export const sendEmailAction = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (_ctx, args) => {
    const env = ((globalThis as any).process?.env ?? {}) as Record<
      string,
      string | undefined
    >;
    const apiKey = env.SENDGRID_API_KEY || '';
    const fromEmail = env.SENDGRID_FROM_EMAIL || 'apvdirect1@gmail.com';
    const fromName = env.SENDGRID_FROM_NAME || 'COORDINA';

    if (!apiKey) {
      return { success: false, error: 'SENDGRID_API_KEY is not configured in Convex environment' };
    }

    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: args.to }] }],
          from: { email: fromEmail, name: fromName },
          subject: args.subject,
          content: [{ type: 'text/html', value: args.html }],
        }),
      });

      if (res.status === 202 || res.ok) {
        return { success: true };
      }

      const detail = await res.text();
      return { success: false, error: detail || `SendGrid status ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error sending email via SendGrid' };
    }
  },
});
