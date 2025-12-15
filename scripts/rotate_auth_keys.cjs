const { execSync } = require('child_process');
const crypto = require('crypto');
const jose = require('jose');

async function main() {
    try {
        console.log('🔄 Rotating Auth Keys (WITH KID Support)...');

        // 1. Generate new Key Pair (as KeyObjects)
        console.log('🔑 Generating fresh RSA-2048 key pair...');
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });

        // 2. Prepare Private Key for Env
        // Use PEM format which is standard and expected by importPKCS8
        // This ensures the library can load the key.
        const privatePem = privateKey.export({
            type: 'pkcs8',
            format: 'pem',
        });

        // Export Public Key as JWK
        const publicJwk = publicKey.export({
            format: 'jwk',
        });

        // Add alg and use.
        // STRATEGY: Add 'kid' to JWKS to help validator, even if Token (PEM) doesn't have it.
        publicJwk.alg = 'RS256';
        publicJwk.use = 'sig';
        publicJwk.kid = '1';

        const jwks = {
            keys: [publicJwk]
        };

        console.log('🌐 Generating JWKS from public key (With KID)...');

        // 4. Set Environment Variables
        console.log('🚀 Setting environment variables on Convex...');

        // Function to set env var safely
        const setEnv = async (name, value) => {
            // value is a string. If it contains single quotes, escape them.
            // Replace ' with '"'"' (close sq, quote sq, open sq)
            const safeShellValue = value.replace(/'/g, "'\"'\"'");

            try {
                // Use explicit single quotes around the value
                execSync(`npx convex env set ${name}='${safeShellValue}'`, { stdio: 'inherit', encoding: 'utf8' });
            } catch (e) {
                console.error(`Failed to set ${name}`);
                throw e;
            }
        };

        await setEnv('CONVEX_AUTH_PRIVATE_KEY', privatePem);

        // Use PEM for JWT_PRIVATE_KEY. This fixes the "pkcs8" error.
        await setEnv('JWT_PRIVATE_KEY', privatePem);

        await setEnv('JWKS', JSON.stringify(jwks));

        console.log('✅ All keys rotated and synchronized successfully!');
        console.log('🚨 NOTE: Existing sessions WILL be invalidated. YOU MUST RESET CLIENT AUTH.');

    } catch (err) {
        console.error('❌ Error rotating keys:', err);
        process.exit(1);
    }
}

main();
