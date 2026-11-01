import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const ensureAdminRole = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existingAdmins = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'admin'))
      .collect();

    const realAdmins = existingAdmins.filter((a) => Boolean(a.passwordHash));
    if (realAdmins.length > 0) {
      throw new Error('An active admin account is already configured.');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email.trim().toLowerCase()))
      .first();

    if (!user) throw new Error('Account not found.');
    if (!user.emailVerified) throw new Error('Verify your email first.');

    await ctx.db.patch(user._id, { role: 'admin' });
    return { promoted: true, userId: user._id };
  },
});
