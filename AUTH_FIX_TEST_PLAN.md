# Authentication Fix - Test Plan

## Issue Description
After migrating from Supabase to Convex, users see "Welcome back! Successfully signed in" toast message but the header still shows "Sign In / Join Us" buttons instead of showing the user as authenticated.

## Root Cause
The `signIn()` action completes successfully and stores the auth token, but the `useConvexAuth()` React hook doesn't immediately update its `isAuthenticated` state. This causes a race condition where the UI tries to render before the auth state has propagated.

## Fix Applied
Added a 500ms delay after `signIn()` completes to allow the Convex Auth state to propagate through React hooks before returning control to the UI.

## Test Scenarios

### Test 1: New User Sign Up
1. Clear browser storage: Open console and run `window.clearConvexAuth()`
2. Click "Join Us" button
3. Fill in registration form
4. Submit form
5. **Expected Results:**
   - Toast shows "Welcome! Your account has been created"
   - Wait ~500ms
   - Header changes from "Sign In / Join Us" to show user display name and UserMenu
   - Console shows: `[AuthProvider] State UPDATE: { isAuthenticated: true, ... }`

### Test 2: Existing User Login
1. Clear browser storage (if needed): `window.clearConvexAuth()`
2. Click "Sign In" button
3. Enter credentials: `c.judemc@gmail.com` / password
4. Submit form
5. **Expected Results:**
   - Toast shows "Welcome back! You've successfully signed in"
   - Wait ~500ms
   - Header changes to show authenticated state
   - Console shows auth state progression:
     ```
     [INFO] [auth]: Attempting login via Convex Auth
     [Convex Auth] Normalized email: c.judemc@gmail.com
     [INFO] [auth]: SignIn succeeded, waiting for auth state to propagate
     [AuthProvider] State UPDATE: { isAuthenticated: true, authLoading: false, ... }
     [getMyProfile] Found profile by userId: YES
     ```

### Test 3: Session Persistence
1. Log in successfully (Test 2)
2. Reload the page (F5 or Cmd+R)
3. **Expected Results:**
   - Page loads with user already authenticated
   - Header shows user display name immediately
   - No need to sign in again
   - Console shows: `[AuthProvider] State UPDATE: { isAuthenticated: true, ... }`

### Test 4: Multiple Login Attempts
1. Try to log in with incorrect password
2. See error message
3. Log in with correct password
4. **Expected Results:**
   - First attempt shows error toast
   - Second attempt succeeds and header updates correctly

## Console Log Monitoring

### Success Pattern
Look for this sequence in console:
```
1. [INFO] [auth]: Attempting login via Convex Auth {email: '...'}
2. [Convex Auth] Normalized email: ...
3. [INFO] [auth]: SignIn succeeded, waiting for auth state to propagate
4. [AuthProvider] State UPDATE: { isAuthenticated: true, authLoading: false, ... }
5. [getMyProfile] auth.getUserId(): <userId>
6. [getMyProfile] Found profile by userId: YES
7. [Profiles] ensureProfile called for userId: ... (if new user)
```

### Failure Patterns

**Pattern 1: Auth state not updating**
```
[INFO] [auth]: SignIn succeeded
[AuthProvider] State UPDATE: { isAuthenticated: false, ... }  ❌ PROBLEM
```
**Solution:** Increase delay in AuthProvider.tsx line 116 from 500ms to 1000ms

**Pattern 2: Profile not found**
```
[getMyProfile] auth.getUserId(): <userId>
[getMyProfile] Found profile by userId: NO  ❌ PROBLEM
```
**Solution:** Run profile linking script:
```bash
npx convex run linkProfileToAuthUser:linkAllProfilesByEmail
```

**Pattern 3: "Not authenticated" error**
```
[getMyProfile] auth.getUserId(): null  ❌ PROBLEM
```
**Solution:** Check CONVEX_AUTH_PRIVATE_KEY is set:
```bash
npx convex env get CONVEX_AUTH_PRIVATE_KEY
```

## Quick Debugging Commands

```bash
# Check deployment is running
curl https://aromatic-pelican-422.convex.cloud

# Verify auth key is set
npx convex env get CONVEX_AUTH_PRIVATE_KEY

# Check auth state (will show null if not logged in)
npx convex run auth:debugAuth

# Link existing profiles to auth users
npx convex run linkProfileToAuthUser:linkAllProfilesByEmail

# Create test invitation for testing
npx convex run createTestInvitation:create
```

## Browser Console Commands

```javascript
// Clear all Convex auth state
window.clearConvexAuth()

// Check localStorage for auth tokens
Object.keys(localStorage).filter(k => k.includes('convex') || k.includes('auth'))

// Manual check - look for Convex auth token
localStorage.getItem('ConvexAuthState')
```

## Success Criteria

✅ User can sign up and immediately see authenticated header
✅ User can log in and header updates within 1 second
✅ Session persists across page reloads
✅ Console logs show `isAuthenticated: true` after login
✅ Profile is created/loaded automatically after auth
✅ UserMenu appears in header with correct display name

## Rollback Plan

If the fix doesn't work, revert to previous version:
```bash
git checkout HEAD~1 -- src/providers/AuthProvider.tsx
```

Then investigate:
1. Check if ConvexAuthProvider is properly configured in main.tsx
2. Verify localStorage storage is working
3. Check if there are any CORS or network issues preventing token storage
4. Increase delay to 1000ms or 2000ms
