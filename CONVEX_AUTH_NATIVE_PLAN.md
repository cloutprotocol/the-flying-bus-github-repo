# Convex Auth (Auth.js) Migration Plan

This plan outlines migrating to **Convex Auth** (formerly known as Auth.js / NextAuth integration for Convex) to completely replace Supabase Auth. This provides a self-hosted authentication solution strictly within the Convex ecosystem.

## 1. Dependencies and Setup
**Installed**: `@convex-dev/auth`

### 1.1. Backend Config (`convex/auth.ts`)
Create the authentication logic file.
```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password"; // For email/pass
// Add other providers (Google, GitHub) as needed

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
});
```

### 1.2. HTTP Actions (`convex/http.ts`)
Map the auth endpoints.
```typescript
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
```

### 1.3. Schema (`convex/schema.ts`)
Add the necessary auth tables: `users`, `sessions`, `accounts`, `verification_tokens`. Or map them to existing custom tables if preferred (though standard schema is recommended for the library).

## 2. Frontend Integration

### 2.1. Provider (`src/main.tsx`)
```tsx
import { ConvexAuthProvider } from "@convex-dev/auth/react";

<ConvexAuthProvider client={convex}>
  <App />
</ConvexAuthProvider>
```

### 2.2. Auth Hook (`useAuthActions`)
Use the hook provided by the library to perform actions:
```tsx
const { signIn, signOut } = useAuthActions();
// signIn("password", { email, password, flow: "signUp" })
```

## 3. Data Migration (Crucial and Difficult)

Since we are dropping Supabase completely:
1.  **User Data**: We must migrate existing user credentials (email/password hashes) from Supabase.
    *   *Challenge*: Supabase uses specific bcrypt hashing. We need to ensure `Password` provider can verify these, or reset all passwords.
    *   *Alternative*: Force all users to reset password on next login.

## 4. Execution Steps

1.  **Setup Backend**: Configure `convex/auth.ts` and `convex/http.ts`.
2.  **Update Schema**: Add Auth tables to schema.
3.  **Frontend Replacement**: Replace `AuthProvider.tsx` context with `ConvexAuthProvider`.
4.  **UI Updates**: Update Login/Register forms to call `signIn` from `@convex-dev/auth/react`.
