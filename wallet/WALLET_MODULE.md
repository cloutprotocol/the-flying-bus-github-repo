# Wallet Module Documentation

## Overview

The `wallet` module provides seamless Web3 wallet integration for the Kids News Express Hub, leveraging [Thirdweb](https://thirdweb.com/) SDK v5. It enables in-app wallet creation, social login, token rewards, and secure wallet management for users, with both frontend and backend support.

---

## Architecture & Key Features

- **Thirdweb SDK v5**: Used for wallet management and blockchain interactions.
- **In-app Wallets**: Users can create and connect wallets using email or social logins (Google, Apple).
- **Token Rewards**: Automated reward distribution for user actions (reading articles, completing quizzes, etc.).
- **Backend API**: Secure token transfer logic for rewarding users.
- **Demo/Test Page**: `/wallet-test` route for testing wallet features.

---

## File-by-File Breakdown

### 1. `client.ts`
- **Purpose**: Configures and exports the Thirdweb client using the client ID from environment variables.
- **Key Export**: `client` (Thirdweb client instance)
- **Setup**: Requires `VITE_THIRDWEB_CLIENT_ID` in your `.env` file.

### 2. `ConnectButton.tsx`
- **Purpose**: Exports the `WalletConnectButton` React component, which renders a Thirdweb-powered wallet connect button.
- **Usage**: Place `<WalletConnectButton />` in your UI to allow users to connect their wallet.

### 3. `useWalletHook.ts`
- **Purpose**: Custom React hook for wallet state and actions.
- **Exports**: `useWalletHook()`
- **API**:
  - `createAndConnectWallet(loginMethod, emailOrSocialToken)`: Initiates wallet connection (actual connection handled by the ConnectButton).
  - `disconnectWallet()`: Disconnects the wallet (handled by wallet provider).
  - `walletAddress`: Current wallet address (if connected).
  - `isConnected`: Boolean, wallet connection status.
  - `isProviderReady`: Boolean, provider readiness.

### 4. `WalletTestPage.tsx`
- **Purpose**: Demo/test page for wallet features.
- **Features**: Shows wallet status, connect button, and displays address if connected.
- **Usage**: Visit `/wallet-test` in your app to test wallet integration.

### 5. `reward-system-rules.ts`
- **Purpose**: Defines reward event types and logic for determining reward amounts.
- **Exports**:
  - `REWARD_EVENTS`: Enum of supported reward events (e.g., `TASK_COMPLETION`, `ARTICLE_READ`).
  - `getRewardAmount(eventType)`: Returns the token amount for a given event.
  - `TOKEN_CONTRACT_ADDRESS`: The deployed token contract address (update as needed).

### 6. `reward-api.js`
- **Purpose**: Express.js backend API for distributing token rewards to user wallets.
- **Features**:
  - POST `/api/reward-user` endpoint: Accepts `userWalletAddress` and `eventType`, sends tokens accordingly.
  - Uses Thirdweb SDK and ethers.js for blockchain operations.
  - Reads sensitive keys from environment variables (never expose secrets on frontend!).
- **Setup**:
  - Requires `POLYGON_RPC_URL`, `WALLET_PRIVATE_KEY`, and `THIRDWEB_SECRET_KEY` in your environment.
  - Update `TOKEN_CONTRACT_ADDRESS` as needed.

### 7. `instructions.txt`
- **Purpose**: Step-by-step integration and implementation guide for developers.
- **Contents**: Covers setup, environment, wallet creation, backend reward logic, and best practices.

### 8. `README.md`
- **Purpose**: Quickstart and integration guide for the wallet module.
- **Contents**: Setup, usage, troubleshooting, migration notes, and support links.

---

## Usage & Integration

### 1. Environment Setup
- Add to your `.env`:
  ```env
  VITE_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here
  # For backend reward API:
  POLYGON_RPC_URL=your_rpc_url
  WALLET_PRIVATE_KEY=your_private_key
  THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
  ```

### 2. Frontend Integration
- Import and use the wallet connect button:
  ```tsx
  import { WalletConnectButton } from "../../wallet/ConnectButton";
  <WalletConnectButton />
  ```
- Use the wallet hook for wallet state:
  ```tsx
  import { useWalletHook } from "../../wallet/useWalletHook";
  const { walletAddress, isConnected } = useWalletHook();
  ```

### 3. Backend Reward API
- Run `reward-api.js` as an Express server.
- POST to `/api/reward-user` with `{ userWalletAddress, eventType }` to send tokens.
- Ensure backend secrets are never exposed to the frontend.

### 4. Testing
- Visit `/wallet-test` in your app to verify wallet connection and address display.

---

## Supported Reward Events
- `TASK_COMPLETION`: 0.01 tokens
- `FIRST_LOGIN_BONUS`: 0.1 tokens
- `REFERRAL_BONUS`: 0.05 tokens
- `ARTICLE_READ`: 0.02 tokens
- `QUIZ_COMPLETION`: 0.03 tokens

(Amounts configurable in `reward-system-rules.ts` and `reward-api.js`)

---

## Security & Best Practices
- **Never expose private keys or secrets in frontend code.**
- Use environment variables for all sensitive data.
- Always validate wallet addresses before sending tokens.
- Handle errors gracefully and log for debugging.

---

## Extension Points
- Add new reward events in `reward-system-rules.ts` and update backend logic.
- Support additional wallet providers by updating the Thirdweb client/provider config.
- Customize the UI/UX of the connect button and wallet status display.

---

## References & Support
- [Thirdweb Documentation](https://portal.thirdweb.com/typescript/v5)
- [Kids News Express Hub](https://kids-news-express-hub.com)
- For issues, check browser console, backend logs, and ensure all environment variables are set. 