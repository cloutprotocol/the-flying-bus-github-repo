import React from "react";
import { WalletConnectButton } from "./ConnectButton";
import { useWalletHook, useKanaCoinBalance } from "./useWalletHook";

export function WalletDashboardPage() {
  const { walletAddress } = useWalletHook();
  const { balance, isLoading, error } = useKanaCoinBalance(walletAddress);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f6]">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-900">Wallet Dashboard</h1>
        {!walletAddress ? (
          <>
            <div className="mb-8 text-gray-600 text-center">No wallet connected</div>
            <div className="flex justify-center"><WalletConnectButton /></div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <span className="font-semibold text-lg">Wallet Address:</span>
              <span className="ml-2 font-mono text-base break-all">{walletAddress}</span>
            </div>
            <div className="mb-8 flex items-center gap-4 justify-center">
              <span className="text-lg font-semibold">Total Kana Coins:</span>
              {isLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : error ? (
                <span className="text-red-500">Could not fetch balance</span>
              ) : (
                <span className="text-2xl font-bold text-green-700">
                  {balance !== null && balance !== undefined ? Number(balance).toFixed(2) : "0.00"}
                </span>
              )}
            </div>
            <div className="flex justify-center">
              <WalletConnectButton />
            </div>
          </>
        )}
      </div>
    </div>
  );
} 