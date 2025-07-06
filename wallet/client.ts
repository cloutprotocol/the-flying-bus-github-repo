import { createThirdwebClient } from "thirdweb";

// Replace this with your client ID string
// refer to https://portal.thirdweb.com/typescript/v5/client on how to get a client ID
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "your_client_id_here";

if (clientId === "your_client_id_here") {
  console.warn(
    "⚠️  Please set your client ID in the .env file. Get one from https://thirdweb.com/dashboard"
  );
}

export const client = createThirdwebClient({
  clientId: clientId,
});
