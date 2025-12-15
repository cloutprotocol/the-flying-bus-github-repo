const jose = require('jose');
const { execSync } = require('child_process');

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC20GZNl6uaiDj1
sW06xcqQdjgYwOVuUTSJBikxQyCeG2A6xJAncUkSJg/z4kpW2PULaM87vFMe7kz3
3KLyPZV90dgOuHOPeVLTgbrdYHBu+eUxsKirOEiLSVieQiBZwmJw/msh+YyOFQlW
4a5DQBtturXdW6L/5aGXG5Xm7c1cG5UOWFEPTZb38/vXTg0JdmKS36kJN6zhLQcN
GLGZetZoqqngOKSArxXuKqoNPMojoqb7r5uNDm3LQdy8IMK6O7iTtzZ/S0dWOiYC
9W8OC4qlMH+FxIwcsiE2Eooxzio28oTr1DftOxyMv6ICF+slxDB1pNaLIxVwfw4O
bjV1Qpx7AgMBAAECggEABSIxrT4ewIEmGv13fsNXyS9jVeFHeriRtsNTMXdGxDR/
7ZvgHGtu94aAGNjNk5trY32hoXYhXhNSWqd5ypRLeAlbfYD/0GiXbdRicJ2o/+9z
2IMIdCkUHcKFLYnX1LgZAZPzYt8va5H6/X3q4dKRXUcf8kOvfmtur9/uGVpWKPRF
GA2KoSgrEjDBKAgCYXp6Piia5oLzrHdPMFYFzM72TrGrhWm9WH2/px7ik8m3LMUf
whww1JfaWBqoOXorEpqAH0MGFKFFdvrcxs8mNUjuTS0ynBl3MTF8aRhHSv2vv4Or
hN1OWjGNjOLgCGeExGaVUuBetr/2bp8fy42zjQlAOQKBgQDzigYxGpChzwIUozKp
cupu5Cx5WcoLUZDRRNOIzxkDrsc48mDaRtqPwhRtqPQogbyS0tGiA2dOhOLGXCUR
nBHxWQX2gMqluErQEErFi0aE1ikWjWzRK4PZ7qLWWgJzKXMZuHbuaFfpsY7uYhrk
m4Ew+PNUff3YXJ+S/zE50pmtlwKBgQDAKvkkQ4vSYU6Lm/7cirIyv2nqfMSjiwWn
S45bK46ZUtCKDJhkOspxL31a2tp3F2atd6d0KnTGWKPx9QDDI/jl0bGqgRLFeJvz
7KYpeT6ogCIaAnylMkfKMGNcZqjh3oPF0qoLCadHqTE5FKrWPESFJk4msFxkRTls
f5DxDbSsvQKBgDMj7rzs+SYhVCyFQKQ4j2YN4BDze+v4itKHA2ydIIGXeBpLO29a
pZa+iI+mhO7kn3atcnv0/wKMARrqSpZyEYp+yTPEQ8mc84jRgwIMhxhp6GLl+83I
t31SETu11wHb2GG0TLUvkBZwxLTmQQN0bCKehGpfsqh2esPhdrLPuJmtAoGARjtu
cuJ855bIrh2FN/U4y3NJsnmHJH5awpnKnWd95mtt7AZOa9NQya0hk2MJFR1oWV2x
xbL+mr8qq/NvI+KxxMyusjIaOjGqTavfzqiRTeQGkpr2EyodMrgcmFiswGAiqNol
a4NLr9UWOFZlWYcNQ9yME3fBTKRAKHc28eKgdcECgYAQkK5NYMDM7fwCfmgX7QaH
RpTfhYPJZ8Qk8aUp7ykO3TJUnmYoEbmc9Oa/8pL5wA8HR6x9fxomi7aHcQOsjBeK
p+1QJ0RpcHs3Szv4+y5vRGBkYq4+sGZqTaQkrYu+tJip8cSu5RT1ZMxEn1CaTT7j
W4FSQM6cj0NRvc6UcTgigA==
-----END PRIVATE KEY-----`.trim();

async function main() {
    try {
        const PrivateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
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
