const jose = require('jose');
const { execSync } = require('child_process');

// Read private key from environment variable
const privateKeyPem = process.env.JWKS_PRIVATE_KEY || process.env.CONVEX_AUTH_PRIVATE_KEY;

if (!privateKeyPem) {
    console.error('❌ Error: JWKS_PRIVATE_KEY or CONVEX_AUTH_PRIVATE_KEY environment variable must be set');
    console.error('');
    console.error('Usage:');
    console.error('  export JWKS_PRIVATE_KEY="$(cat path/to/private-key.pem)"');
    console.error('  node scripts/deploy_jwks.cjs');
    console.error('');
    console.error('Or generate a new key:');
    console.error('  openssl genrsa -out private-key.pem 2048');
    console.error('  export JWKS_PRIVATE_KEY="$(cat private-key.pem)"');
    process.exit(1);
}

async function main() {
    try {
        const PrivateKey = await jose.importPKCS8(privateKeyPem.trim(), 'RS256');
        const publicJwk = await jose.exportJWK(PrivateKey);
        const thumbprint = await jose.calculateJwkThumbprint(publicJwk);

        const jwks = {
            keys: [
                {
                    ...publicJwk,
                    use: 'sig',
                    alg: 'RS256',
                    kid: thumbprint,
                }
            ]
        };

        const jwksString = JSON.stringify(jwks);
        console.log('Generated JWKS:', jwksString);
        console.log('Setting JWKS env var...');

        // Use single quotes for the env value to avoid shell expansion of special chars
        const safeJwks = jwksString.replace(/'/g, "'\"'\"'");
        execSync(`npx convex env set JWKS='${safeJwks}'`, { stdio: 'inherit', encoding: 'utf8' });

        console.log('✅ JWKS set successfully.');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

main();
