/**
 * Activity and Audit Log Queries and Mutations for Convex
 * Replaces Supabase activities and audit_logs operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * ACTIVITY QUERIES
 */

// Get activities by user
export const getByUser = query({
  args: {
    userId: v.id("profiles"),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    // Sort by created_at descending
    activities.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = activities.length;
    const paginatedActivities = activities.slice(skip, skip + limit);

    return {
      activities: paginatedActivities,
      count: totalCount,
    };
  },
});

// Get activities by type
export const getByType = query({
  args: {
    activityType: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_type", (q) => q.eq("activity_type", args.activityType))
      .collect();

    // Sort by created_at descending
    activities.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = activities.length;
    const paginatedActivities = activities.slice(skip, skip + limit);

    return {
      activities: paginatedActivities,
      count: totalCount,
    };
  },
});

/**
 * ACTIVITY MUTATIONS
 */

// Create activity log
export const logActivity = mutation({
  args: {
    user_id: v.id("profiles"),
    activity_type: v.string(),
    entity_type: v.optional(v.string()),
    entity_id: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const activityId = await ctx.db.insert("activities", {
      user_id: args.user_id,
      activity_type: args.activity_type,
      entity_type: args.entity_type,
      entity_id: args.entity_id,
      metadata: args.metadata,
      created_at: now,
    });

    return activityId;
  },
});

/**
 * AUDIT LOG QUERIES
 */

// Get audit logs by user
export const getAuditLogsByUser = query({
  args: {
    userId: v.id("profiles"),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    const auditLogs = await ctx.db
      .query("audit_logs")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    // Sort by created_at descending
    auditLogs.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = auditLogs.length;
    const paginatedLogs = auditLogs.slice(skip, skip + limit);

    return {
      logs: paginatedLogs,
      count: totalCount,
    };
  },
});

// Get audit logs by action
export const getAuditLogsByAction = query({
  args: {
    action: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    const auditLogs = await ctx.db
      .query("audit_logs")
      .withIndex("by_action", (q) => q.eq("action", args.action))
      .collect();

    // Sort by created_at descending
    auditLogs.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = auditLogs.length;
    const paginatedLogs = auditLogs.slice(skip, skip + limit);

    return {
      logs: paginatedLogs,
      count: totalCount,
    };
  },
});

/**
 * AUDIT LOG MUTATIONS
 */

// Create audit log
export const createAuditLog = mutation({
  args: {
    user_id: v.optional(v.id("profiles")),
    action: v.string(),
    entity_type: v.optional(v.string()),
    entity_id: v.optional(v.string()),
    changes: v.optional(v.any()),
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const auditLogId = await ctx.db.insert("audit_logs", {
      user_id: args.user_id,
      action: args.action,
      entity_type: args.entity_type,
      entity_id: args.entity_id,
      changes: args.changes,
      ip_address: args.ip_address,
      user_agent: args.user_agent,
      created_at: now,
    });

    return auditLogId;
  },
});

// List audit logs with optional filters
export const listAuditLogs = query({
  args: {
    userId: v.optional(v.string()),
    action: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;
    let logs = await ctx.db.query('audit_logs').collect();

    if (args.userId) logs = logs.filter((l) => (l.user_id ?? '') === args.userId);
    if (args.action) logs = logs.filter((l) => l.action === args.action);
    if (args.resourceType) logs = logs.filter((l) => (l.entity_type ?? '') === args.resourceType || (l as any).resource_type === args.resourceType);
    if (args.startDate) logs = logs.filter((l) => new Date(l.created_at).getTime() >= new Date(args.startDate!).getTime());
    if (args.endDate) logs = logs.filter((l) => new Date(l.created_at).getTime() <= new Date(args.endDate!).getTime());

    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return logs.slice(offset, offset + limit).map(l => ({
      id: (l as any)._id,
      action: l.action,
      resource_type: (l as any).entity_type ?? '',
      resource_id: (l as any).entity_id ?? '',
      user_email: undefined,
      user_id: l.user_id ?? undefined,
      success: true,
      error_message: undefined,
      metadata: l.changes ?? {},
      created_at: l.created_at,
      ip_address: (l as any).ip_address,
      user_agent: (l as any).user_agent,
    }));
  },
});
