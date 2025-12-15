import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useConvexAuth, useConvex } from "convex/react";

const TokenInspector = () => {
    const [tokenData, setTokenData] = useState<any>(null);
    const { isAuthenticated, isLoading } = useConvexAuth();
    const convex = useConvex();

    const forceAuth = async () => {
        if (tokenData && tokenData.raw) {
            console.log("Forcing Auth with token:", tokenData.raw);
            convex.setAuth(async () => tokenData.raw);
        }
    };

    useEffect(() => {
        const checkToken = () => {
            if (typeof window === 'undefined') return;

            // Find convex token
            const key = Object.keys(localStorage).find(k => k.startsWith('__convexAuthJWT'));
            if (!key) {
                setTokenData({ error: 'No Token Found', allKeys: Object.keys(localStorage) });
                return;
            }

            const token = localStorage.getItem(key);
            if (!token) return;

            try {
                const parts = token.split('.');
                if (parts.length !== 3) {
                    setTokenData({ error: 'Invalid JWT format', allKeys: Object.keys(localStorage) });
                    return;
                }

                const header = JSON.parse(atob(parts[0]));
                const payload = JSON.parse(atob(parts[1]));

                // Check expiration
                const expDate = new Date(payload.exp * 1000);
                const isExpired = expDate < new Date();

                setTokenData({
                    key,
                    header,
                    payload,
                    exp: expDate.toLocaleString(),
                    isExpired,
                    raw: token, // Keep full token for forcing
                    rawPreview: token.slice(0, 15) + '...',
                    allKeys: Object.keys(localStorage)
                });
            } catch (e) {
                setTokenData({ error: 'Decode Failed: ' + e, allKeys: Object.keys(localStorage) });
            }
        };

        checkToken();
        const interval = setInterval(checkToken, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!tokenData) return null;

    return (
        <Card className="fixed bottom-4 left-4 p-4 z-50 bg-black/90 text-green-400 font-mono text-xs max-w-sm overflow-hidden border border-green-800 shadow-xl">
            <h3 className="font-bold border-b border-green-600 mb-2 flex justify-between items-center">
                <span>Token Inspector</span>
                <span className="text-[10px] text-gray-400">{import.meta.env.VITE_CONVEX_URL?.slice(8, 28)}...</span>
            </h3>

            {tokenData.error ? (
                <div className="text-red-400">{tokenData.error}</div>
            ) : (
                <div className="space-y-2">
                    <div className="border-b border-gray-700 pb-2">
                        <div className="text-white font-bold flex justify-between">
                            Hook State:
                            <button
                                onClick={forceAuth}
                                className="bg-red-900 px-2 rounded hover:bg-red-700 transition"
                            >
                                FORCE AUTH
                            </button>
                        </div>
                        <div>isAuthed: <span className={isAuthenticated ? "text-green-400" : "text-red-400"}>{String(isAuthenticated)}</span></div>
                        <div>Loading: {String(isLoading)}</div>
                    </div>

                    <div>
                        <span className="text-gray-400">Claims:</span>
                        <div className="pl-2 border-l border-gray-700">
                            <div>iss: {tokenData.payload.iss?.slice(8, 28)}...</div>
                            <div>aud: {tokenData.payload.aud}</div>
                            <div className={tokenData.isExpired ? "text-red-500 font-bold" : "text-green-300"}>
                                Exp: {tokenData.exp} {tokenData.isExpired ? "(EXPIRED)" : ""}
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="text-gray-400">Keys:</span>
                        <div className="text-[10px] text-gray-500 break-all max-h-20 overflow-y-auto">
                            {tokenData.allKeys.filter((k: any) => k.includes('convex')).map((k: string) => (
                                <div key={k}>{k.slice(0, 30)}...</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default TokenInspector;
