
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(process.cwd(), '.env.local');

// Read keys from environment variables
const KEY_1 = process.env.CONVEX_AUTH_PRIVATE_KEY;
const KEY_2 = process.env.JWT_PRIVATE_KEY || process.env.JWKS_PRIVATE_KEY;

if (!KEY_1) {
    console.error('❌ Error: CONVEX_AUTH_PRIVATE_KEY environment variable must be set');
    console.error('');
    console.error('Usage:');
    console.error('  export CONVEX_AUTH_PRIVATE_KEY="$(cat path/to/private-key-1.pem)"');
    console.error('  export JWT_PRIVATE_KEY="$(cat path/to/private-key-2.pem)"');
    console.error('  node scripts/fix_auth_keys.cjs');
    console.error('');
    console.error('Or generate new keys:');
    console.error('  openssl genrsa -out private-key-1.pem 2048');
    console.error('  openssl genrsa -out private-key-2.pem 2048');
    console.error('  export CONVEX_AUTH_PRIVATE_KEY="$(cat private-key-1.pem)"');
    console.error('  export JWT_PRIVATE_KEY="$(cat private-key-2.pem)"');
    process.exit(1);
}

if (!KEY_2) {
    console.error('❌ Error: JWT_PRIVATE_KEY or JWKS_PRIVATE_KEY environment variable must be set');
    process.exit(1);
}

// 1. UPDATE .ENV.LOCAL
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.log('.env.local not found, creating new one');
}

const lines = envContent.split('\n').filter(line =>
    !line.startsWith('CONVEX_AUTH_PRIVATE_KEY=') &&
    !line.startsWith('JWT_PRIVATE_KEY=') &&
    !line.startsWith('JWKS=')
);

const keyForLocalEnv = `"${KEY_1.replace(/\n/g, '\\n')}"`;
const key2ForLocalEnv = `"${KEY_2.replace(/\n/g, '\\n')}"`;

lines.push(`CONVEX_AUTH_PRIVATE_KEY=${keyForLocalEnv}`);
lines.push(`JWT_PRIVATE_KEY=${key2ForLocalEnv}`);

fs.writeFileSync(envPath, lines.join('\n') + '\n');
console.log('✅ Updated .env.local (keys using literal \\n)');

// 2. UPDATE REMOTE ENV
console.log('Attempting to set Convex env vars...');

try {
    const setEnv = (name, value) => {
        const safeValue = value.replace(/"/g, '\\"');
        const command = `npx convex env set ${name}="${safeValue}"`;

        console.log(`Setting ${name}...`);
        execSync(command, {
            stdio: 'inherit',
            encoding: 'utf8',
            shell: '/bin/bash'
        });
    };

    setEnv('CONVEX_AUTH_PRIVATE_KEY', KEY_1);
    setEnv('JWT_PRIVATE_KEY', KEY_2);
    setEnv('JWKS', KEY_2);

    console.log('✅ Keys updated successfully on remote with actual newlines.');
} catch (e) {
    console.error('❌ Failed to set keys:', e.message);
}
