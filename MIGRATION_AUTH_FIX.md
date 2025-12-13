# Authentication Fix After Convex Migration

## Issue Identified
After migrating from Supabase to Convex, users cannot authenticate into the application. The HAR file analysis revealed the following discrepancies:

### Supabase Authentication Flow (Previous):
- Session tokens stored in localStorage with `sb-*-auth-token` keys
- Automatic session refresh with refresh tokens
- Immediate session establishment on page load
- Direct RLS policy enforcement at database level

### Convex Authentication Flow (Current - FIXED):
- Uses `@convex-dev/auth` with different storage mechanism
- Session stored with Convex-specific keys
- Auth state managed through React hooks and queries
- Profile linking required separate from auth session

## Problems Found

1. **Removed Redundant Auth Check**: Removed `serverIsAuthed` query that was racing with `isAuthenticated`
2. **Fixed Profile Creation Race Condition**: Profile ensure/link only triggers when auth is fully loaded (`!authLoading`)
3. **Increased Delay**: Changed initial delay from 1500ms to 2000ms to allow auth handshake to complete
4. **Simplified Loading States**: Removed conflicting loading/initialization logic that depended on `serverIsAuthed`
5. **CRITICAL: Auth State Propagation Delay**: Added 500ms wait after `signIn()` completes to allow `useConvexAuth()` hook to update `isAuthenticated` state. Without this, the UI shows "Sign In / Join Us" even after successful login.

## Changes Made

### AuthProvider.tsx
- ✅ Removed `serverIsAuthed` query (line 24)
- ✅ Simplified profile ensure trigger condition (line 93)
- ✅ Increased profile creation delay to 2000ms
- ✅ Updated loading/initialization logic to use only `isAuthenticated` and `authLoading`
- ✅ Removed `serverIsAuthed` from dependency arrays and debug logging
- ✅ **CRITICAL FIX**: Added 500ms delay after `signIn()` to wait for auth state propagation (line 116)
- ✅ Enhanced debug logging with timestamps to track auth state changes

## Testing Instructions

1. **Clear Browser Storage**:
   ```javascript
   // In browser console:
   window.clearConvexAuth()
   ```

2. **Test New User Registration**:
   - Go to signup page
   - Create new account
   - Verify profile is created after ~2 seconds
   - Check browser console for auth state logs

3. **Test Existing User Login**:
   - Go to login page
   - Enter credentials
   - Verify session is established
   - Check that profile loads correctly

4. **Monitor Console Logs**:
   Look for these logs:
   ```
   [AuthProvider] State: { isAuthenticated: true, authLoading: false, ... }
   [getMyProfile] Found profile by userId: YES
   [Profiles] ensureProfile called for userId: ...
   ```

## Common Issues & Solutions

### Issue: "Not authenticated" error in profile queries
**Solution**: Ensure CONVEX_AUTH_PRIVATE_KEY is set correctly in Convex deployment
```bash
npx convex env get CONVEX_AUTH_PRIVATE_KEY
```

### Issue: Profile not loading after login
**Solution**: Check browser console for profile linking logs. May need to run:
```bash
npx convex run linkProfileToAuthUser:linkAllProfilesByEmail
```

### Issue: Stale Supabase session causing conflicts
**Solution**: Clear all auth-related localStorage keys:
```javascript
window.clearConvexAuth()
```

## Verification Checklist

- [ ] CONVEX_AUTH_PRIVATE_KEY is set on deployment
- [ ] `aromatic-pelican-422` deployment is running
- [ ] Browser localStorage is cleared of old Supabase tokens
- [ ] Users can sign up and profile is created automatically
- [ ] Users can log in and session persists across page reloads
- [ ] Profile queries return correct user data after login

## Next Steps

If authentication still fails after these fixes:

1. Check Convex deployment logs for errors
2. Verify email normalization in `convex/auth.ts`
3. Ensure profiles table has `by_userId` index
4. Check that auth users table exists in Convex
5. Verify ConvexAuthProvider is wrapping the app in main.tsx
