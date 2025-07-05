import React from "react";
import { WalletConnectButton } from "./ConnectButton";
import { useWalletHook } from "./useWalletHook";

export function WalletTestPage() {
  const { walletAddress, isConnected, isProviderReady } = useWalletHook();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Wallet Test Page</h1>
      
      <div className="space-y-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Wallet Status</h2>
          <div className="space-y-2">
            <p><strong>Provider Ready:</strong> {isProviderReady ? "Yes" : "No"}</p>
            <p><strong>Connected:</strong> {isConnected ? "Yes" : "No"}</p>
            <p><strong>Address:</strong> {walletAddress || "Not connected"}</p>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
          <WalletConnectButton />
        </div>

        {isConnected && (
          <div className="p-6 border rounded-lg bg-green-50">
            <h2 className="text-xl font-semibold mb-4 text-green-800">Connected Successfully!</h2>
            <p className="text-green-700">Your wallet address: {walletAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
} 