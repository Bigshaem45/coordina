import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Generate secure Convex storage upload URL
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Resolve public storage URL from storageId
export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Save metadata record for uploaded verification/event document
export const saveDocumentRecord = mutation({
  args: {
    storageId: v.string(),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    category: v.union(
      v.literal('cac_certificate'),
      v.literal('director_id'),
      v.literal('venue_booking_receipt'),
      v.literal('event_flyer'),
      v.literal('programme_doc'),
      v.literal('general_upload')
    ),
    uploaderUserId: v.optional(v.id('users')),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert('documents', {
      ...args,
      createdAt: Date.now(),
    });
    return docId;
  },
});

