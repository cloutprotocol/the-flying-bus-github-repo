# Wallet Integration Guide

This guide explains how to set up and use the Thirdweb wallet integration in the Kids News Express Hub project.

## Overview

The wallet integration uses Thirdweb's v5 SDK to provide:
- In-app wallet creation and management
- Social login integration (Google, Apple, Email)
- Token rewards system
- Secure wallet connections

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the root directory of your project:

```bash
# Thirdweb Client ID - Get this from https://portal.thirdweb.com/typescript/v5/client
VITE_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here
```

### 2. Get Your Thirdweb Client ID

1. Go to [Thirdweb Portal](https://portal.thirdweb.com/typescript/v5/client)
2. Create a new project or select an existing one
3. Copy your Client ID
4. Replace `your_thirdweb_client_id_here` in your `.env` file

### 3. Dependencies

The project already includes the necessary dependencies:
- `thirdweb` (v5) - Main SDK
- `@thirdweb-dev/react` (v4) - Legacy support (will be removed)

## File Structure

```
wallet/
├── client.ts              # Thirdweb client configuration
├── third-web-wallet.tsx   # Wallet provider component
├── useWalletHook.ts       # Custom hook for wallet management
├── ConnectButton.tsx      # Connect button component
├── reward-api.js          # Reward system API
├── reward-system-rules.ts # Reward rules and logic
└── instructions.txt       # Detailed implementation guide
```

## Usage

### Basic Wallet Connection

```tsx
import { WalletConnectButton } from '../../wallet/ConnectButton';
import { useWalletHook } from '../../wallet/useWalletHook';

function MyComponent() {
  const { walletAddress, isConnected, isProviderReady } = useWalletHook();

  return (
    <div>
      <WalletConnectButton />
      {isConnected && <p>Connected: {walletAddress}</p>}
    </div>
  );
}
```

### Advanced Wallet Management

```tsx
import { useWalletHook } from '../../wallet/useWalletHook';

function MyComponent() {
  const { 
    createAndConnectWallet, 
    disconnectWallet, 
    walletAddress, 
    isConnected, 
    isProviderReady 
  } = useWalletHook();

  const handleConnect = async () => {
    try {
      const address = await createAndConnectWallet("email", "user@example.com");
      console.log("Connected:", address);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      console.log("Disconnected");
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect Wallet</button>
      ) : (
        <button onClick={handleDisconnect}>Disconnect</button>
      )}
    </div>
  );
}
```

## Testing

Visit `/wallet-test` in your application to test the wallet functionality. This page provides:
- Wallet connection status
- Connect button
- Address display
- Demo reward functionality

## Features

### Supported Login Methods
- Email verification
- Google OAuth
- Apple OAuth

### Wallet Types
- In-app wallet (embedded)
- Smart wallet support (configurable)

### Networks
- Polygon (mainnet)
- Mumbai (testnet) - for development

## Troubleshooting

### Common Issues

1. **"Client ID is missing" error**
   - Ensure your `.env` file exists in the root directory
   - Verify `VITE_THIRDWEB_CLIENT_ID` is set correctly
   - Restart your development server

2. **"Wallet provider failed to initialize"**
   - Check your internet connection
   - Verify your Client ID is valid
   - Check browser console for detailed errors

3. **Connection issues**
   - Ensure you're using a supported browser
   - Check if popup blockers are enabled
   - Verify your Thirdweb project settings

### Debug Mode

Enable debug logging by checking the browser console for detailed wallet connection information.

## Migration from v4

If you're migrating from Thirdweb v4:

1. Update imports from `@thirdweb-dev/react` to `thirdweb/react`
2. Replace `embeddedWallet` with `inAppWallet`
3. Update provider configuration to use `client` prop instead of `clientId`
4. Use `useActiveWallet` instead of `useWallet`

## Security Notes

- Never expose your Thirdweb Secret Key in frontend code
- Use environment variables for sensitive configuration
- Implement proper error handling for wallet operations
- Validate wallet addresses before processing transactions

## Support

For issues with the wallet integration:
1. Check the [Thirdweb Documentation](https://portal.thirdweb.com/typescript/v5)
2. Review the browser console for error messages
3. Verify your environment configuration
4. Test with the `/wallet-test` page 