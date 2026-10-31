import { action } from './_generated/server';
import { v } from 'convex/values';

export const sendEmailAction = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey =
      process.env.RESEND_API_KEY ||
      process.env.VITE_RESEND_API_KEY ||
      '';
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      process.env.VITE_RESEND_FROM_EMAIL ||
      'COORDINA <onboarding@resend.dev>';

    if (!apiKey) {
      return { success: false, error: 'Resend API key missing from environment' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [args.to],
          subject: args.subject,
          html: args.html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data };
      }
      return { success: true, id: data.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error sending email' };
    }
  },
});

