/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as clearData from "../clearData.js";
import type * as comments from "../comments.js";
import type * as createAuthUserForProfile from "../createAuthUserForProfile.js";
import type * as createTestInvitation from "../createTestInvitation.js";
import type * as dashboard from "../dashboard.js";
import type * as debateArticles from "../debateArticles.js";
import type * as debug_validateKeys from "../debug/validateKeys.js";
import type * as http from "../http.js";
import type * as importData from "../importData.js";
import type * as invitations from "../invitations.js";
import type * as linkProfileToAuthUser from "../linkProfileToAuthUser.js";
import type * as media from "../media.js";
import type * as privacy from "../privacy.js";
import type * as profiles from "../profiles.js";
import type * as storyboard from "../storyboard.js";
import type * as tags from "../tags.js";
import type * as testQueries from "../testQueries.js";
import type * as testSignup from "../testSignup.js";
import type * as videoArticles from "../videoArticles.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  articles: typeof articles;
  auth: typeof auth;
  categories: typeof categories;
  clearData: typeof clearData;
  comments: typeof comments;
  createAuthUserForProfile: typeof createAuthUserForProfile;
  createTestInvitation: typeof createTestInvitation;
  dashboard: typeof dashboard;
  debateArticles: typeof debateArticles;
  "debug/validateKeys": typeof debug_validateKeys;
  http: typeof http;
  importData: typeof importData;
  invitations: typeof invitations;
  linkProfileToAuthUser: typeof linkProfileToAuthUser;
  media: typeof media;
  privacy: typeof privacy;
  profiles: typeof profiles;
  storyboard: typeof storyboard;
  tags: typeof tags;
  testQueries: typeof testQueries;
  testSignup: typeof testSignup;
  videoArticles: typeof videoArticles;
  votes: typeof votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
