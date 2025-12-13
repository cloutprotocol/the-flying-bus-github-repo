# Convex Auth Migration Plan (Supabase Integration)

This document outlines the revised plan to integrate Authentication with Convex using the **existing Supabase Auth** as the Identity Provider. This allows Convex to securely recognize users (`ctx.auth`) without adding Clerk or migrating user credentials.

## 1. Concept: Supabase as OIDC Provider

Convex can validate JWTs (JSON Web Tokens) issued by Supabase.
- **Frontend**: `ConvexProviderWithAuth` sends the Supabase JWT to Convex.
- **Backend**: Convex verifies the JWT using Supabase's issuer URL and keys.
- **Result**: `ctx.auth.getUserIdentity()` works in Convex functions, returning the Supabase User ID.

## 2. Configuration Steps

### 2.1. Backend Configuration (`convex/auth.config.ts`)
Create this file to tell Convex how to validate tokens.

```typescript
export default {
  providers: [
    {
      domain: process.env.SUPABASE_URL!, // e.g. "https://<project-id>.supabase.co"
      applicationID: "the-flying-bus", // Arbitrary string for this case, or specific audience
    },
  ],
};
```

*Note: Supabase JWTs typically don't have a standard `.well-known/openid-configuration` exposed easily for all keys without some setup, but usually `domain` + `applicationID` works if the AUD matches.*

### 2.2. Frontend Integration (`src/main.tsx`)
Updated to bridge Supabase Session -> Convex.

```tsx
import { ConvexProviderWithAuth } from "convex/react";
import { supabase } from "@/integrations/supabase/client";

// Custom hook to sync Supabase auth state to Convex
function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, []);

  return { isLoading, isAuthenticated, fetchAccessToken };
}

// Usage in render:
<ConvexProviderWithAuth client={convex} useAuth={useAuth}>
  {/* App components */}
</ConvexProviderWithAuth>
```

## 3. Service Layer Updates

### 3.1. `authService.ts`
Can remain effectively as-is for *login/logout* actions (still handled by Supabase client).

### 3.2. Data Services
Update services like `commentConvexService` to stop manually checking Supabase sessions.
The `ConvexHttpClient` or `useQuery` hooks will naturally carry the auth token if using the React provider.
*Note: For server-side/service-file calls outside React components, we might still need to manually pass the token if not using the React Context.*

## 4. Security Updates (Convex)
Update `profiles.ts` and other secured files:

```typescript
// convex/profiles.ts
export const getMyProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null; // Unauthenticated

    // Identity.subject is the Supabase User UUID
    const userId = identity.subject;
    
    // ... fetch profile by userId
  }
});
```

## 5. Summary
- **No new 3rd party** (Clerk is removed).
- **No user migration** (Users stay in Supabase).
- **Convex becomes "Auth Aware"** (Secure `ctx.auth` usage).
