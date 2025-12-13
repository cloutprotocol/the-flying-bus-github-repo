import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

// Normalize emails across all flows to avoid case-sensitivity issues
const PasswordWithNormalizedEmail = Password({
  profile: (params) => {
    const normalizedEmail = String(params.email ?? "").trim().toLowerCase();
    console.log('[Convex Auth] Normalized email:', normalizedEmail);
    const profile: { email: string; name?: string } = {
      email: normalizedEmail,
    };
    if (params.name !== undefined) {
      profile.name = String(params.name);
    }
    return profile;
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    PasswordWithNormalizedEmail,
    Google,
  ],
});

export default auth;

import { query } from "./_generated/server";

export const debugAuth = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    const isAuthed = userId !== null;
    const identity = await ctx.auth.getUserIdentity();
    const key = process.env.CONVEX_AUTH_PRIVATE_KEY || '';
    const keySnippet = key.length > 50 ? key.slice(0, 40) + '...' : key;
    // Check for literal backslash-n
    const hasLiteralBackslashN = key.includes('\\n');

    return {
      isAuthed,
      userId,
      identity,
      keySnippet,
      hasLiteralBackslashN
    };
  },
});
