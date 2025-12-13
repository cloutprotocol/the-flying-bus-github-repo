import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

/**
 * Generate a short-lived URL for uploading a file to Convex Storage.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        // Optional: Authenticate user before allowing upload
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Save metadata for an uploaded file and register it in media_assets.
 */
export const saveMediaAsset = mutation({
    args: {
        storageId: v.id("_storage"),
        filename: v.string(),
        mimeType: v.string(),
        size: v.number(),
        fileType: v.string(), // 'image' | 'video' | 'document'
        altText: v.optional(v.string()),
        dimensions: v.optional(v.object({
            width: v.number(),
            height: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const userProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!userProfile) throw new Error("Profile not found");

        const url = await ctx.storage.getUrl(args.storageId);
        if (!url) throw new Error("Failed to generate URL for storage ID");

        const assetId = await ctx.db.insert("media_assets", {
            filename: args.filename,
            file_path: url, // Storing the public URL as file_path for compatibility
            storageId: args.storageId,
            file_type: args.fileType,
            mime_type: args.mimeType,
            file_size: args.size,
            uploader_id: userProfile._id,
            alt_text: args.altText || "",
            created_at: new Date().toISOString(),
        });

        return {
            _id: assetId,
            url,
            storageId: args.storageId,
        };
    },
});

/**
 * Get media assets for the current user or everything for admins?
 * For now, just listing recent uploads.
 */
export const getRecentMedia = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        const assets = await ctx.db.query("media_assets")
            .order("desc")
            .take(limit);

        return assets;
    },
});
