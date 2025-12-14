import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Convex Schema for The Flying Bus
 * Migrated from Supabase PostgreSQL
 */

export default defineSchema({
  // Auth Tables
  ...authTables,

  // User profiles
  profiles: defineTable({
    // Core fields
    username: v.optional(v.string()),
    display_name: v.optional(v.string()),
    email: v.string(),
    role: v.string(), // 'user', 'author', 'admin', 'moderator'
    userId: v.optional(v.id("users")), // Link to standard Auth user

    // Profile info
    bio: v.optional(v.string()),
    public_bio: v.optional(v.string()),
    avatar_url: v.optional(v.string()),

    // Web3
    crypto_wallet_address: v.optional(v.string()),

    // Preferences
    badge_display_preferences: v.optional(v.any()),
    favorite_categories: v.optional(v.union(v.array(v.string()), v.null())),

    // Timestamps
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_role", ["role"])
    .index("by_userId", ["userId"]),

  // Categories
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    parent_id: v.optional(v.id("categories")),
    display_order: v.optional(v.number()),
    is_active: v.boolean(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_slug", ["slug"]) 
    .index("by_parent", ["parent_id"]) 
    .index("by_active", ["is_active"]),

  // Articles (main content)
  articles: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),

    // Content type
    article_type: v.string(), // 'standard', 'debate', 'video', 'storyboard'

    // Relations
    author_id: v.string(), // Reference to profiles
    category_id: v.optional(v.string()), // Reference to categories

    // Media
    featured_image_url: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),

    // Metadata
    reading_time: v.optional(v.number()),
    difficulty_level: v.optional(v.string()),
    age_range: v.optional(v.string()),

    // Status & Publishing
    status: v.string(), // 'draft', 'pending_review', 'published', 'archived'
    featured: v.optional(v.boolean()),
    published_at: v.optional(v.string()),
    scheduled_for: v.optional(v.string()),
    submitted_for_review_at: v.optional(v.string()),

    // Engagement
    view_count: v.optional(v.number()),
    like_count: v.optional(v.number()),
    comment_count: v.optional(v.number()),

    // SEO
    meta_title: v.optional(v.string()),
    meta_description: v.optional(v.string()),
    meta_keywords: v.optional(v.array(v.string())),

    // Timestamps
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_author", ["author_id"])
    .index("by_category", ["category_id"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_published", ["published_at"]),

  // Debate Articles
  debate_articles: defineTable({
    article_id: v.string(), // Reference to articles
    pro_content: v.string(),
    con_content: v.string(),
    pro_author_id: v.optional(v.id("profiles")),
    con_author_id: v.optional(v.id("profiles")),
    created_at: v.string(),
    updated_at: v.string(),
  }).index("by_article", ["article_id"]),

  // Video Articles
  video_articles: defineTable({
    article_id: v.string(), // Reference to articles
    video_url: v.string(),
    video_duration: v.optional(v.number()),
    video_platform: v.optional(v.string()), // 'youtube', 'vimeo', etc.
    transcript: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  }).index("by_article", ["article_id"]),

  // Storyboard Series
  storyboard_series: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    author_id: v.string(),
    thumbnail_url: v.optional(v.string()),
    episode_count: v.number(),
    status: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  }).index("by_author", ["author_id"]),

  // Storyboard Episodes
  storyboard_episodes: defineTable({
    series_id: v.string(), // Reference to storyboard_series
    article_id: v.optional(v.string()), // Reference to articles
    episode_number: v.number(),
    title: v.string(),
    content: v.string(),
    image_url: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_series", ["series_id"])
    .index("by_article", ["article_id"]),

  // Comments
  comments: defineTable({
    article_id: v.string(), // Reference to articles
    user_id: v.string(), // Reference to profiles
    content: v.string(),
    parent_comment_id: v.optional(v.string()), // For nested comments
    status: v.string(), // 'pending', 'approved', 'rejected', 'flagged'
    like_count: v.number(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_article", ["article_id"])
    .index("by_user", ["user_id"])
    .index("by_parent", ["parent_comment_id"]),

  // Comment Likes
  comment_likes: defineTable({
    comment_id: v.string(),
    user_id: v.string(),
    created_at: v.string(),
  })
    .index("by_comment", ["comment_id"])
    .index("by_user", ["user_id"]),

  // Tags
  tags: defineTable({
    name: v.string(),
    slug: v.string(),
    created_at: v.string(),
  }).index("by_slug", ["slug"]),

  // Article Tags (join table)
  article_tags: defineTable({
    article_id: v.string(),
    tag_id: v.string(),
    created_at: v.string(),
  })
    .index("by_article", ["article_id"])
    .index("by_tag", ["tag_id"]),

  // Article Views
  article_views: defineTable({
    article_id: v.string(),
    user_id: v.optional(v.string()),
    session_id: v.optional(v.string()),
    viewed_at: v.string(),
  })
    .index("by_article", ["article_id"])
    .index("by_user", ["user_id"]),

  // Article Votes
  article_votes: defineTable({
    article_id: v.string(),
    user_id: v.string(),
    vote_type: v.string(), // 'up', 'down'
    created_at: v.string(),
  })
    .index("by_article", ["article_id"])
    .index("by_user", ["user_id"]),

  // Article Reviews
  article_reviews: defineTable({
    article_id: v.string(),
    reviewer_id: v.string(), // Reference to profiles (admin/moderator)
    status: v.string(), // 'pending', 'approved', 'rejected', 'needs_changes'
    feedback: v.optional(v.string()),
    reviewed_at: v.string(),
    created_at: v.string(),
  })
    .index("by_article", ["article_id"])
    .index("by_reviewer", ["reviewer_id"]),

  // Media Assets
  media_assets: defineTable({
    filename: v.string(),
    file_path: v.string(),
    storageId: v.optional(v.id("_storage")),
    file_type: v.string(), // 'image', 'video', 'document'
    mime_type: v.string(),
    file_size: v.number(),
    uploader_id: v.string(), // Reference to profiles
    alt_text: v.optional(v.string()),
    caption: v.optional(v.string()),
    created_at: v.string(),
  })
    .index("by_uploader", ["uploader_id"])
    .index("by_type", ["file_type"]),

  // Activities (user activity log)
  activities: defineTable({
    user_id: v.string(),
    activity_type: v.string(), // 'article_read', 'comment_posted', 'vote_cast', etc.
    entity_type: v.optional(v.string()), // 'article', 'comment', etc.
    entity_id: v.optional(v.string()),
    metadata: v.optional(v.any()),
    created_at: v.string(),
  })
    .index("by_user", ["user_id"])
    .index("by_type", ["activity_type"]),

  // Audit Logs
  audit_logs: defineTable({
    user_id: v.optional(v.string()),
    action: v.string(),
    entity_type: v.optional(v.string()),
    entity_id: v.optional(v.string()),
    changes: v.optional(v.any()),
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
    created_at: v.string(),
  })
    .index("by_user", ["user_id"])
    .index("by_action", ["action"]),

  // Invitation Tokens
  invitation_tokens: defineTable({
    token: v.string(),
    email: v.string(),
    role: v.string(), // 'author', 'admin', etc.
    invited_by: v.string(), // Reference to profiles
    status: v.string(), // 'pending', 'accepted', 'expired', 'revoked'
    expires_at: v.string(),
    used_at: v.optional(v.string()),
    used_by: v.optional(v.string()),
    created_at: v.string(),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  // Invitation Requests
  invitation_requests: defineTable({
    email: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    bio: v.optional(v.string()),
    portfolio_url: v.optional(v.string()),
    status: v.string(), // 'pending', 'approved', 'rejected'
    reviewed_by: v.optional(v.string()),
    reviewed_at: v.optional(v.string()),
    created_at: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // System Configuration
  system_configuration: defineTable({
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    updated_at: v.string(),
  }).index("by_key", ["key"]),

  // Privacy Settings
  privacy_settings: defineTable({
    user_id: v.string(),
    profile_visibility: v.string(), // 'public', 'private', 'friends'
    show_reading_history: v.boolean(),
    allow_comments: v.boolean(),
    email_notifications: v.boolean(),
    updated_at: v.string(),
  }).index("by_user", ["user_id"]),
});
