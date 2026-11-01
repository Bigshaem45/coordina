import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${salt}:${password}`);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSixDigitCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

function sanitizeUser(user: any, organizer: any = null) {
  if (!user) return null;
  const {
    passwordHash,
    passwordSalt,
    emailVerificationCode,
    resetCode,
    ...safeUser
  } = user;
  return {
    ...safeUser,
    emailVerified: Boolean(user.emailVerified),
    onboarded: Boolean(user.onboarded),
    organizerId: organizer?._id ?? null,
    organizer: organizer ?? null,
  };
}

export const getMe = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    let organizer = null;
    if (user.role === 'organiser' || user.role === 'admin') {
      organizer = await ctx.db
        .query('organizers')
        .withIndex('by_userId', (q) => q.eq('userId', user._id))
        .first();
    }

    return sanitizeUser(user, organizer);
  },
});

export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal('attendee'),
        v.literal('organiser'),
        v.literal('venue_manager')
      )
    ),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanName = args.name.trim();
    const cleanPhone = args.phone?.trim() || undefined;
    const role = args.role ?? 'attendee';

    if (!cleanName || cleanName.length < 2) {
      throw new Error('Please enter your full name.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!args.password || args.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Check active blacklist
    const blacklist = await ctx.db
      .query('blacklisted_identities')
      .withIndex('by_status', (q) => q.eq('status', 'active_blacklist'))
      .collect();
    const blocked = blacklist.find(
      (b) =>
        b.email.toLowerCase() === cleanEmail ||
        (cleanPhone && b.phone === cleanPhone)
    );
    if (blocked) {
      throw new Error('This identity is restricted by COORDINA Trust & Compliance.');
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', cleanEmail))
      .first();

    if (existing) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(args.password, salt);
    const verificationCode = generateSixDigitCode();

    const userId = await ctx.db.insert('users', {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role,
      city: args.city ?? 'Abuja',
      interests: [],
      vibe: 'Energetic',
      budget: 100000,
      phoneVerified: false,
      passwordHash,
      passwordSalt: salt,
      emailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationSentAt: Date.now(),
      onboarded: false,
      createdAt: Date.now(),
    });

    let organizerId = null;
    if (role === 'organiser') {
      organizerId = await ctx.db.insert('organizers', {
        userId,
        businessName: cleanName,
        contactEmail: cleanEmail,
        contactPhone: cleanPhone ?? '',
        status: 'pending',
        riskScore: 35,
        tier: 'basic',
        createdAt: Date.now(),
      });
    }

    await ctx.db.insert('audit_logs', {
      actorName: cleanName,
      actorRole: role,
      actorId: userId,
      action: 'USER_REGISTERED',
      targetEntity: 'users',
      targetId: userId,
      details: `User registered with email ${cleanEmail} as ${role}`,
      timestamp: Date.now(),
    });

    return {
      userId,
      organizerId,
      name: cleanName,
      email: cleanEmail,
      role,
      verificationCode,
    };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', cleanEmail))
      .first();

    if (!user) {
      throw new Error('No account found for this email. Please create an account first.');
    }

    if (!user.passwordHash || !user.passwordSalt) {
      throw new Error(
        'Password not yet configured for this account. Click "Forgot password?" to verify via email and set your password.'
      );
    }

    const candidateHash = await hashPassword(args.password, user.passwordSalt);
    if (candidateHash !== user.passwordHash) {
      throw new Error('Incorrect email or password.');
    }

    let organizer = null;
    if (user.role === 'organiser') {
      organizer = await ctx.db
        .query('organizers')
        .withIndex('by_userId', (q) => q.eq('userId', user._id))
        .first();
      if (!organizer) {
        const orgId = await ctx.db.insert('organizers', {
          userId: user._id,
          businessName: user.name,
          contactEmail: user.email,
          contactPhone: user.phone ?? '',
          status: 'pending',
          riskScore: 35,
          tier: 'basic',
          createdAt: Date.now(),
        });
        organizer = await ctx.db.get(orgId);
      }
    }

    return {
      userId: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
      onboarded: Boolean(user.onboarded),
      organizerId: organizer?._id ?? null,
    };
  },
});

export const requestEmailVerification = mutation({
  args: {
    userId: v.optional(v.id('users')),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = args.userId ? await ctx.db.get(args.userId) : null;
    if (!user && args.email) {
      const cleanEmail = args.email.trim().toLowerCase();
      user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', cleanEmail))
        .first();
    }
    if (!user) {
      throw new Error('Account not found.');
    }

    const code = generateSixDigitCode();
    await ctx.db.patch(user._id, {
      emailVerificationCode: code,
      emailVerificationSentAt: Date.now(),
    });

    return {
      email: user.email,
      name: user.name,
      code,
    };
  },
});

export const verifyEmail = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', cleanEmail))
      .first();

    if (!user) {
      throw new Error('Account not found.');
    }

    if (!user.emailVerificationCode || user.emailVerificationCode !== cleanCode) {
      throw new Error('Invalid or expired verification code. Please check your inbox and try again.');
    }

    if (
      user.emailVerificationSentAt &&
      Date.now() - user.emailVerificationSentAt > 24 * 60 * 60 * 1000
    ) {
      throw new Error('This verification code has expired. Please request a fresh code.');
    }

    await ctx.db.patch(user._id, {
      emailVerified: true,
      emailVerificationCode: undefined,
      emailVerificationSentAt: undefined,
    });

    await ctx.db.insert('audit_logs', {
      actorName: user.name,
      actorRole: user.role,
      actorId: user._id,
      action: 'EMAIL_VERIFIED',
      targetEntity: 'users',
      targetId: user._id,
      details: `Verified email ownership for ${user.email}`,
      timestamp: Date.now(),
    });

    return {
      verified: true,
      userId: user._id,
      role: user.role,
      onboarded: Boolean(user.onboarded),
    };
  },
});

export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', cleanEmail))
      .first();

    if (!user) {
      throw new Error('No account found with that email address.');
    }

    const code = generateSixDigitCode();
    await ctx.db.patch(user._id, {
      resetCode: code,
      resetCodeSentAt: Date.now(),
    });

    return {
      email: user.email,
      name: user.name,
      code,
    };
  },
});

export const resetPassword = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim();

    if (!args.newPassword || args.newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', cleanEmail))
      .first();

    if (!user) {
      throw new Error('Account not found.');
    }

    if (!user.resetCode || user.resetCode !== cleanCode) {
      throw new Error('Invalid or expired password reset code.');
    }

    if (user.resetCodeSentAt && Date.now() - user.resetCodeSentAt > 60 * 60 * 1000) {
      throw new Error('Reset code has expired. Please request a new code.');
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(args.newPassword, salt);

    await ctx.db.patch(user._id, {
      passwordHash,
      passwordSalt: salt,
      resetCode: undefined,
      resetCodeSentAt: undefined,
      emailVerified: true,
    });

    await ctx.db.insert('audit_logs', {
      actorName: user.name,
      actorRole: user.role,
      actorId: user._id,
      action: 'PASSWORD_RESET',
      targetEntity: 'users',
      targetId: user._id,
      details: `Password reset completed via verified email OTP for ${user.email}`,
      timestamp: Date.now(),
    });

    return { success: true, userId: user._id, role: user.role };
  },
});

export const finishOnboarding = mutation({
  args: {
    userId: v.id('users'),
    city: v.string(),
    interests: v.array(v.string()),
    budget: v.number(),
    vibe: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found.');

    await ctx.db.patch(args.userId, {
      city: args.city,
      interests: args.interests,
      budget: args.budget,
      vibe: args.vibe,
      onboarded: true,
    });

    return { success: true };
  },
});

export const updateProfile = mutation({
  args: {
    id: v.id('users'),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    phone: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    vibe: v.optional(v.string()),
    budget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('User not found.');
    await ctx.db.patch(id, updates);
    const updated = await ctx.db.get(id);
    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', id))
      .first();
    return sanitizeUser(updated, organizer);
  },
});

export const upgradeToOrganiser = mutation({
  args: {
    userId: v.id('users'),
    businessName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found.');
    if (!user.emailVerified) {
      throw new Error('Please verify your email address before activating an Event Planner studio.');
    }

    await ctx.db.patch(args.userId, { role: 'organiser' });

    let organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    if (!organizer) {
      const orgId = await ctx.db.insert('organizers', {
        userId: args.userId,
        businessName: args.businessName?.trim() || user.name,
        contactEmail: user.email,
        contactPhone: user.phone ?? '',
        status: 'pending',
        riskScore: 35,
        tier: 'basic',
        createdAt: Date.now(),
      });
      organizer = await ctx.db.get(orgId);
    }

    await ctx.db.insert('audit_logs', {
      actorName: user.name,
      actorRole: 'organiser',
      actorId: user._id,
      action: 'UPGRADED_TO_ORGANISER',
      targetEntity: 'users',
      targetId: user._id,
      details: `${user.email} upgraded account role to organiser`,
      timestamp: Date.now(),
    });

    return { organizerId: organizer?._id };
  },
});

export const requestPhoneOtp = mutation({
  args: {
    userId: v.id('users'),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found.');
    const cleanPhone = args.phone.trim();
    if (cleanPhone.length < 8) {
      throw new Error('Please enter a valid Nigerian or international phone number.');
    }

    const code = generateSixDigitCode();
    const existing = await ctx.db
      .query('phone_otps')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.insert('phone_otps', {
      userId: args.userId,
      phone: cleanPhone,
      code,
      verified: false,
      createdAt: Date.now(),
    });

    return {
      phone: cleanPhone,
      email: user.email,
      name: user.name,
      code,
    };
  },
});

export const verifyPhoneOtp = mutation({
  args: {
    userId: v.id('users'),
    phone: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found.');
    const cleanCode = args.code.trim();
    const cleanPhone = args.phone.trim();

    const rows = await ctx.db
      .query('phone_otps')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();
    const latest = rows.sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!latest || latest.code !== cleanCode || latest.phone !== cleanPhone) {
      throw new Error('Invalid OTP code. Please check the verification code sent to you.');
    }

    if (Date.now() - latest.createdAt > 30 * 60 * 1000) {
      throw new Error('OTP code has expired. Please request a new code.');
    }

    await ctx.db.patch(latest._id, { verified: true });
    await ctx.db.patch(args.userId, { phone: cleanPhone, phoneVerified: true });

    const organizer = await ctx.db
      .query('organizers')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
    if (organizer) {
      await ctx.db.patch(organizer._id, { contactPhone: cleanPhone });
    }

    return { verified: true };
  },
});
