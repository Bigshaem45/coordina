/**
 * COORDINA Email Service powered by Resend
 * Handles transactional emails: Welcome, Booking Confirmation,
 * Venue Booking Requests, Password Reset, and Verification Updates.
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const SENDER_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'COORDINA <onboarding@resend.dev>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('Resend email error:', data);
      return { success: false, error: data };
    }
    return { success: true, id: data.id };
  } catch (err) {
    console.warn('Network error sending email via Resend:', err);
    return { success: false, error: err };
  }
}

/** Wrapper HTML container with COORDINA signature purple & minimalist styling */
function emailLayout(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px 12px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15,23,42,0.04); }
    .header { background: #1e1b4b; padding: 32px 28px; text-align: left; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0; color: #a5b4fc; font-size: 13px; }
    .content { padding: 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 12px; font-weight: 600; text-decoration: none; font-size: 13px; margin: 20px 0 10px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #e0e7ff; color: #4338ca; }
    .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin: 18px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; }
    .details-row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 600; color: #0f172a; text-align: right; }
    .footer { padding: 24px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em;">COORDINA</div>
      <p>Verified Events · Social Spaces · Clash-Free Lineups</p>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      COORDINA Technologies Inc. · Abuja & Lagos, Nigeria<br />
      Built for seamless nights out. Verified ticketing with zero scalping.
    </div>
  </div>
</body>
</html>
`;
}

// 1. Welcome Email
export async function sendWelcomeEmail(to: string, name: string) {
  const body = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">Welcome to COORDINA, ${name || 'Explorer'}!</h2>
    <p>Your account is ready. Discover verified social spaces, build conflict-free weekend itineraries, and access offline cryptographic ticket passes across Abuja and Lagos.</p>
    
    <div class="details-box">
      <div class="details-row"><span class="label">Account</span><span class="value">${to}</span></div>
      <div class="details-row"><span class="label">Wallet Status</span><span class="value">Active (Offline Ready)</span></div>
      <div class="details-row"><span class="label">Location</span><span class="value">Nigeria</span></div>
    </div>

    <a href="https://coordina-beta.vercel.app/home" class="btn">Explore Live Events</a>
    <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Need help or organizing an event? Head to the <a href="https://coordina-beta.vercel.app/organiser" style="color: #4f46e5;">Organiser Studio</a> to register your corporate KYC.</p>
  `;
  return await sendEmail({
    to,
    subject: 'Welcome to COORDINA — Your Passport to Curated Nigerian Experiences',
    html: emailLayout('Welcome to COORDINA', body),
  });
}

// 2. Booking / Ticket Confirmation Email
export async function sendBookingConfirmationEmail(params: {
  to: string;
  name: string;
  orderId: string;
  eventTitle: string;
  venueName: string;
  date: string;
  tierName: string;
  qty: number;
  total: number;
}) {
  const { to, name, orderId, eventTitle, venueName, date, tierName, qty, total } = params;
  const body = `
    <span class="badge">Booking Confirmed</span>
    <h2 style="margin-top: 12px; font-size: 18px; color: #0f172a;">Your pass for ${eventTitle} is ready</h2>
    <p>Hi ${name || 'there'}, your ticket order <strong>#${orderId}</strong> was processed via Paystack. Your ticket pass has been securely stored in your COORDINA offline wallet.</p>
    
    <div class="details-box">
      <div class="details-row"><span class="label">Event</span><span class="value">${eventTitle}</span></div>
      <div class="details-row"><span class="label">Venue</span><span class="value">${venueName}</span></div>
      <div class="details-row"><span class="label">Schedule</span><span class="value">${date}</span></div>
      <div class="details-row"><span class="label">Pass Tier</span><span class="value">${tierName} × ${qty}</span></div>
      <div class="details-row"><span class="label">Total Paid (Paystack)</span><span class="value">₦${total.toLocaleString('en-NG')}</span></div>
    </div>

    <p style="font-size: 13px; color: #475569;">
      <strong>Gate Entry Instructions:</strong> Open your COORDINA app or visit your wallet on mobile to show your high-contrast QR pass. Passes work 100% offline at the venue gate even with low network connectivity.
    </p>

    <a href="https://coordina-beta.vercel.app/tickets" class="btn">View Passes in Wallet</a>
  `;
  return await sendEmail({
    to,
    subject: `Confirmed: Tickets for ${eventTitle} (Order #${orderId})`,
    html: emailLayout('Booking Confirmation', body),
  });
}

// 3. Venue Confirmation Request Email (Remote Verification Portal)
export async function sendVenueConfirmationRequestEmail(params: {
  venueEmail: string;
  venueName: string;
  eventTitle: string;
  organizerName: string;
  date: string;
  token: string;
}) {
  const { venueEmail, venueName, eventTitle, organizerName, date, token } = params;
  const portalUrl = `https://coordina-beta.vercel.app/venue-portal/${token}`;
  const body = `
    <span class="badge" style="background: #fef3c7; color: #b45309;">Action Required</span>
    <h2 style="margin-top: 12px; font-size: 18px; color: #0f172a;">Venue Booking Request for ${venueName}</h2>
    <p>Dear ${venueName} Management,</p>
    <p>Organizer <strong>${organizerName}</strong> has submitted an event on COORDINA scheduled to take place at your venue:</p>

    <div class="details-box">
      <div class="details-row"><span class="label">Event Title</span><span class="value">${eventTitle}</span></div>
      <div class="details-row"><span class="label">Organizer</span><span class="value">${organizerName}</span></div>
      <div class="details-row"><span class="label">Event Date</span><span class="value">${date}</span></div>
      <div class="details-row"><span class="label">Verification Token</span><span class="value" style="font-family: monospace;">${token}</span></div>
    </div>

    <p style="font-size: 13px; color: #475569;">
      As part of our remote verification policy to prevent unconfirmed venue claims and ticket fraud, please confirm or dispute whether this booking reservation is valid.
    </p>

    <a href="${portalUrl}" class="btn">Confirm or Dispute Booking</a>
    <p style="font-size: 11px; color: #94a3b8;">Or open link manually: ${portalUrl}</p>
  `;
  return await sendEmail({
    to: venueEmail,
    subject: `Action Required: Confirm Booking for "${eventTitle}" at ${venueName}`,
    html: emailLayout('Venue Confirmation Request', body),
  });
}

// 4. Password Reset Email
export async function sendPasswordResetEmail(to: string, name: string) {
  const resetUrl = `https://coordina-beta.vercel.app/auth?mode=reset&email=${encodeURIComponent(to)}`;
  const body = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">Password Reset Request</h2>
    <p>Hi ${name || 'there'},</p>
    <p>We received a request to reset your password for your COORDINA account associated with <strong>${to}</strong>.</p>

    <a href="${resetUrl}" class="btn">Reset Password</a>

    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
      If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;
  return await sendEmail({
    to,
    subject: 'Reset your COORDINA password',
    html: emailLayout('Password Reset', body),
  });
}

// 5. Account & Organizer Verification Status Update Email
export async function sendVerificationStatusEmail(params: {
  to: string;
  organizerName: string;
  eventTitle: string;
  status: string;
  reviewerNotes?: string;
}) {
  const { to, organizerName, eventTitle, status, reviewerNotes } = params;
  const isApproved = status === 'Event Verified' || status === 'Venue Confirmed';
  const body = `
    <span class="badge" style="background: ${isApproved ? '#dcfce7; color: #15803d' : '#fee2e2; color: #b91c1c'};">${status}</span>
    <h2 style="margin-top: 12px; font-size: 18px; color: #0f172a;">Verification Update for ${eventTitle}</h2>
    <p>Dear ${organizerName},</p>
    <p>The COORDINA Compliance &amp; Verification Desk has reviewed your remote verification submission for <strong>${eventTitle}</strong>.</p>

    <div class="details-box">
      <div class="details-row"><span class="label">Event</span><span class="value">${eventTitle}</span></div>
      <div class="details-row"><span class="label">Decision Status</span><span class="value">${status}</span></div>
      ${reviewerNotes ? `<div class="details-row"><span class="label">Officer Notes</span><span class="value">${reviewerNotes}</span></div>` : ''}
    </div>

    ${
      isApproved
        ? '<p style="color: #15803d; font-weight: 500;">Your event now displays the official COORDINA Verified badge across discover feeds, itineraries, and map views.</p>'
        : '<p style="color: #b91c1c;">Please review officer notes above or update required documents in the Organiser Studio to appeal.</p>'
    }

    <a href="https://coordina-beta.vercel.app/organiser" class="btn">Go to Organiser Studio</a>
  `;
  return await sendEmail({
    to,
    subject: `Verification Status: ${eventTitle} is ${status}`,
    html: emailLayout('Verification Decision', body),
  });
}
