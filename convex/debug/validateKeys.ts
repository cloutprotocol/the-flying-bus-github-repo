import { action } from "../_generated/server";
import { importPKCS8, importJWK, SignJWT, jwtVerify, createLocalJWKSet } from "jose";

export const check = action({
    args: {},
    handler: async (ctx) => {
        try {
            const privateKeyPem = process.env.JWT_PRIVATE_KEY;
            const jwksString = process.env.JWKS;

            if (!privateKeyPem || !jwksString) {
                return { success: false, error: "Missing Env Vars" };
            }

            console.log("Checking keys...");

            // 1. Import Private Key
            const privateKey = await importPKCS8(privateKeyPem, "RS256");

            // 2. Sign a test token
            const token = await new SignJWT({ sub: "test" })
                .setProtectedHeader({ alg: "RS256" })
                .setIssuedAt()
                .setExpirationTime("2h")
                .sign(privateKey);

            console.log("Signed token successfully.");

            // 3. Import JWKS and Verify
            const jwks = JSON.parse(jwksString);
            const JWKS = await createLocalJWKSet(jwks);

            const { payload } = await jwtVerify(token, JWKS);

            return {
                success: true,
                message: "Keys are valid and matching!",
                payload
            };

        } catch (e: any) {
            console.error("Key Validation Failed:", e);
            return {
                success: false,
                error: e.message,
                stack: e.stack
            };
        }
    },
});
