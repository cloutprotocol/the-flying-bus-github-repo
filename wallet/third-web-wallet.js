import { ThirdwebProvider, localWallet, embeddedWallet } from "@thirdweb-dev/react";

// Using Polygon Mumbai Testnet for development
const activeChain = "mumbai";

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
    console.error("Thirdweb Client ID is not set. Please set VITE_THIRDWEB_CLIENT_ID in your .env file.");
}

export function ThirdwebWalletProvider({ children }) {
  return (
    <ThirdwebProvider
      activeChain={activeChain}
      clientId={clientId}
      supportedWallets={[
        embeddedWallet({
          auth: {
            options: [
              "email",
              "google",
              "apple",
            ],
          },
        }),
      ]}
    >
      {children}
    </ThirdwebProvider>
  );
}
