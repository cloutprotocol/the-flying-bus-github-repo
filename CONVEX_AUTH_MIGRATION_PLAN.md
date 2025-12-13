# Convex Auth Migration Plan

This document outlines the steps required to migrate authentication from Supabase Auth to Convex, utilizing **Clerk** as the identity provider (the recommended standard for Convex applications) and **Convex Auth** integration.

## 1. Dependencies and Configuration

### 1.1. Install Dependencies
```bash
npm install @clerk/clerk-react convex-helpers
```

### 1.2. Environment Variables
Add the following to `.env.local` and `.env`:
```
VITE_CONVEX_URL=...
VITE_CLERK_PUBLISHABLE_KEY=...
```

## 2. Frontend Architecture Changes

### 2.1. Update `src/main.tsx` (or `App.tsx`)
Replace the existing `AuthProvider` (Supabase-based) with a `ConvexClientProvider` that integrates Clerk.

**New Structure:**
```tsx
<ClerkProvider publishableKey={clerkPubKey}>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithClerk>
</ClerkProvider>
```

### 2.2. Replace `AuthProvider.tsx` context
The existing `AuthContext` provides `currentUser` (ReaderProfile), `login`, `logout`, etc.
We should create a compatibility layer or update consumers to use `useConvexAuth()` and `useQuery(api.users.current)`.

**Key Hook Replacements:**
- `isLoggedIn` -> `isAuthenticated` from `useConvexAuth()`
- `session` -> `token` (automatically handled by `ConvexProviderWithClerk`)
- `currentUser` -> `useQuery(api.profiles.getCurrentUser)`

## 3. Service Layer Updates

### 3.1. `src/services/auth/authService.ts`
This file currently calls `supabase.auth.signInWithPassword`.
It needs to be rewritten or deprecated in favor of using Clerk's `useSignIn` and `useSignUp` hooks directly in the React components, as Clerk allows headless UI or prebuilt components.

**Deprecations:**
- `loginWithEmailPassword` -> Use Clerk's `<SignIn />` or `useSignIn()`
- `logoutUser` -> Use `useClerk().signOut()`
- `registerUser` -> Use Clerk's `<SignUp />` or `useSignUp()`

### 3.2. `src/providers/AuthProvider.tsx`
This provider is tightly coupled to Supabase sessions. It logic for "background profile loading" can be simplified.
In Convex + Clerk:
- Profile loading is a reactive query: `const user = useQuery(api.profiles.me)`.
- No need for complex `useEffect` to sync session state; `ConvexProvider` handles token refresh.

## 4. Backend (Convex) Updates

### 4.1. Secure Profile Identification
Update `convex/profiles.ts` to identify users via `ctx.auth` rather than passed arguments.

**Example Change:**
```typescript
export const getMyProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db.query("profiles")
      .withIndex("by_auth_id", q => q.eq("auth_id", identity.subject))
      .first();
  }
});
```

### 4.2. Update Mutations
All mutations that modify user data (e.g., `updateUserProfile`) must verify `ctx.auth.getUserIdentity()` matches the target profile or is an admin.

## 5. Data Migration Strategy

### 5.1. User Migration
1.  Export users from Supabase Auth.
2.  Import users into Clerk (CSV import supported).
3.  Ensure `profiles` table in Convex has a field mapping Clerk IDs (Identity Subject) to the profile.
    *   *Note*: If keeping existing `profiles` table, we may need to update the `id` or add an `external_auth_id` field to link Clerk users to existing Convex profiles.

### 5.2. Profile Creation
Implement a webhook (using `convex-helpers` `httpAction`) to listen for `user.created` events from Clerk and automatically create the corresponding `profile` document in Convex.

## 6. Execution Steps (Immediate)

1.  **Stop using Supabase Auth in Services**:
    *   Refactor `commentService.ts` and others to stop calling `supabase.auth.getSession`.
    *   Instead, assume the Convex client is already authenticated.
2.  **Update `AuthProvider`**:
    *   Switch implementation to wrap Clerk.

## 7. Review of Current "Hybrid" State
Currently, we are in a hybrid state where:
- `userService.ts` fetches data from Convex.
- `authService.ts` authenticates with Supabase.
- `AuthProvider.tsx` manages Supabase sessions.

**To trigger full migration:**
The user has requested to "Review Changes". This plan serves as that review.
