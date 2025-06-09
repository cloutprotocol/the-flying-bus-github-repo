import React from 'react';
import { ThirdwebProvider, localWallet, embeddedWallet } from "@thirdweb-dev/react";

// Using Polygon Mumbai Testnet for development
const activeChain = "mumbai";

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
    console.error("Thirdweb Client ID is not set. Please set VITE_THIRDWEB_CLIENT_ID in your .env file.");
}

interface ThirdwebWalletProviderProps {
  children: React.ReactNode;
}

export function ThirdwebWalletProvider({ children }: ThirdwebWalletProviderProps) {
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