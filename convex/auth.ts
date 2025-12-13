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
    Google(),
  ],
});

export default auth;

// Removed insecure debugAuth endpoint. If a diagnostic endpoint is needed,
// implement server-side admin checks and restrict to development only.
