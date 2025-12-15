#!/usr/bin/env node
/**
 * Generate a JWKS (JSON Web Key Set) from an RSA private key (PEM).
 *
 * Usage:
 *   node scripts/generate_jwks_from_private_key.js /path/to/private_key.pem
 * or
 *   JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..." node scripts/generate_jwks_from_private_key.js
 *
 * Output: a JWKS JSON string you can paste into the Convex env var `JWKS`.
 */

const fs = require('fs');
const { importPKCS8, exportJWK, calculateJwkThumbprint } = require('jose');

async function main() {
  let pem = process.env.JWT_PRIVATE_KEY;
  const fileArg = process.argv[2];
  if (!pem && fileArg) {
    pem = fs.readFileSync(fileArg, 'utf8');
  }
  if (!pem) {
    console.error('Error: Provide a PEM private key via JWT_PRIVATE_KEY env or a file path argument.');
    process.exit(1);
  }

  // Normalize escaped newlines if present (e.g. from .env files)
  pem = pem.replace(/\\n/g, '\n');

  const key = await importPKCS8(pem, 'RS256');
  const jwk = await exportJWK(key);
  jwk.kty = 'RSA';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  // Compute a stable kid based on RFC 7638 thumbprint
  jwk.kid = await calculateJwkThumbprint(jwk);

  const jwks = { keys: [jwk] };
  console.log(JSON.stringify(jwks, null, 2));
}

main().catch((err) => {
  console.error('Failed to generate JWKS:', err);
  process.exit(1);
});

