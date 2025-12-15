import type { AuthConfig } from "convex/server";

// Configure Convex to trust JWTs issued by @convex-dev/auth.
// The @convex-dev/auth server exposes a standard OIDC well-known config and JWKS
// at `${CONVEX_SITE_URL}/.well-known/jwks.json`. We reference that here via a
// customJwt provider so ctx.auth works with sessions created by auth:store.
// FORCE_RELOAD_CACHE: 1 (Clearing stale JWKS)

const config: AuthConfig = {
  providers: [
    {
      type: "customJwt",
      issuer: "https://aromatic-pelican-422.convex.site",
      jwks: "https://aromatic-pelican-422.convex.site/.well-known/jwks.json",
      algorithm: "RS256",
      // Tokens issued by @convex-dev/auth set aud to "convex".
      // Match that here so Convex accepts those tokens.
      applicationID: "convex",
    },
  ],
};

export default config;
