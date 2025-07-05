import React from "react";
import { ConnectButton } from "thirdweb/react";
import { client } from "./client";

export function WalletConnectButton() {
  return (
    <ConnectButton
      client={client}
      appMetadata={{
        name: "Kids News Express Hub",
        url: "https://kids-news-express-hub.com",
      }}
    />
  );
} 