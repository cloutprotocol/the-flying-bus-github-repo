import React from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { client } from "./client";

const activeChain = "polygon"; // Use "mumbai" for testnet if needed

export function ThirdwebWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider
      client={client}
      activeChain={activeChain}
    >
      {children}
    </ThirdwebProvider>
  );
} 