import { convexAuth } from "@convex-dev/auth/server";
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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});

import { mutation } from "./_generated/server";

export const verifyAuth = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    return {
      isAuthenticated: !!userId,
      userId,
      identity: identity ? {
        subject: identity.subject,
        issuer: identity.issuer,
        email: identity.email,
        tokenIdentifier: identity.tokenIdentifier,
      } : null,
    };
  },
});

// Temporary debug function to check env var integrity
// Temporary debug function to check env var integrity
export const debugEnv = mutation({
  args: {},
  handler: async () => {
    try {
      const privateKeyPem = process.env.JWT_PRIVATE_KEY;
      const jwksString = process.env.JWKS;

      if (!privateKeyPem || !jwksString) {
        return { success: false, error: "Missing Env Vars" };
      }

      // 1. Load Private Key
      const privateKey = await importPKCS8(privateKeyPem, "RS256");

      // 2. Sign Test Token
      const token = await new SignJWT({ sub: "test" })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(privateKey);

      // 3. Load JWKS
      const jwks = JSON.parse(jwksString);
      const JWKS = await createLocalJWKSet(jwks);

      // 4. Verify
      const { payload } = await jwtVerify(token, JWKS);

      return {
        success: true,
        message: "VERIFICATION SUCCESS: Keys match and are valid.",
        payload
      };
    } catch (e: any) {
      console.error("Verification Failed:", e);
      return {
        success: false,
        error: e.message,
        stack: e.stack
      };
    }
  },
});

export default auth;
