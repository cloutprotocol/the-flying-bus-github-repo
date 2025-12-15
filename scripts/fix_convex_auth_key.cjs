const { execSync } = require('child_process');

// Read private key from environment variable
const privateKey = process.env.CONVEX_AUTH_PRIVATE_KEY || process.env.JWKS_PRIVATE_KEY;

if (!privateKey) {
    console.error('❌ Error: CONVEX_AUTH_PRIVATE_KEY environment variable must be set');
    console.error('');
    console.error('Usage:');
    console.error('  export CONVEX_AUTH_PRIVATE_KEY="$(cat path/to/private-key.pem)"');
    console.error('  node scripts/fix_convex_auth_key.cjs');
    console.error('');
    console.error('Or generate a new key:');
    console.error('  openssl genrsa -out private-key.pem 2048');
    console.error('  export CONVEX_AUTH_PRIVATE_KEY="$(cat private-key.pem)"');
    process.exit(1);
}

async function main() {
    try {
        console.log('Setting CONVEX_AUTH_PRIVATE_KEY env var...');

        // Use single quotes for the env value to avoid shell expansion of special chars
        // Double escapement for single quotes
        const safeKey = privateKey.trim().replace(/'/g, "'\"'\"'");

        execSync(`npx convex env set CONVEX_AUTH_PRIVATE_KEY='${safeKey}'`, { stdio: 'inherit', encoding: 'utf8' });

        console.log('✅ CONVEX_AUTH_PRIVATE_KEY set successfully.');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

main();
