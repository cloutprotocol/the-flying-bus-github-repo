# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a037c97b-f27c-4e3a-acf8-7eede6e9912a

## Features

- Interactive news platform for kids
- Web3 integration with Thirdweb
- Crypto wallet support
- Token rewards system
- Enhanced authentication flows with auto-login
- Social authentication (Email, Google, Apple)
- Invitation-based author registration

## Web3 Integration

This project includes Thirdweb wallet integration with the following features:

- Embedded wallet support
- Social login options (Email, Google, Apple)
- Token rewards system for user engagement
- Polygon Mumbai Testnet integration

### Wallet Setup

1. The project is already configured with Thirdweb credentials
2. The `.env` file contains the necessary Thirdweb client ID and secret key
3. No additional setup is required for wallet functionality

### Reward System

The project includes a token reward system for various user actions:
- Task completion: 0.01 tokens
- First login bonus: 0.1 tokens
- Referral bonus: 0.05 tokens
- Article read: 0.02 tokens
- Quiz completion: 0.03 tokens

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a037c97b-f27c-4e3a-acf8-7eede6e9912a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables
# The .env file is already configured with Thirdweb credentials
# No additional setup needed

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Thirdweb SDK
- Ethers.js
- Polygon Mumbai Testnet

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a037c97b-f27c-4e3a-acf8-7eede6e9912a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Web3 Development Notes

### Token Contract
- The project uses an ERC-20 token for rewards
- Token contract address should be updated in `wallet/reward-system-rules.js`
- Deploy your token contract on Polygon Mumbai Testnet

### Wallet Integration
- Uses Thirdweb's embedded wallet
- Supports social login methods
- Wallet state is managed through `useWalletHook`
- Token rewards are distributed through the reward system

### Security Considerations
- Never expose private keys or secret keys in frontend code
- Use environment variables for sensitive data
- Implement proper authentication before wallet operations
- Test thoroughly on testnet before mainnet deployment

## Authentication System

This project features an enhanced authentication system with improved user onboarding flows:

### Key Features
- **Auto-login after registration**: Users are automatically logged in after successful sign-up
- **No email confirmation required**: Immediate platform access upon registration
- **Invitation-based author registration**: Secure author onboarding with proper RLS policy handling
- **Comprehensive error handling**: User-friendly error messages and recovery mechanisms

### Documentation

For detailed information about the authentication system:

- **[Authentication Flow Improvements](./docs/AUTH_FLOW_IMPROVEMENTS.md)** - Overview of new registration flows and auto-login features
- **[RLS Policy Management](./docs/RLS_POLICY_MANAGEMENT.md)** - Developer guide for Row-Level Security policy management
- **[Authentication Troubleshooting](./docs/AUTH_TROUBLESHOOTING_GUIDE.md)** - Comprehensive troubleshooting guide for authentication issues
- **[Error Handling & Recovery](./docs/AUTH_ERROR_HANDLING_RECOVERY.md)** - Error handling strategies and recovery procedures

### Quick Start

The authentication system works out of the box with the following flows:

1. **Standard Registration**: Users sign up and are automatically logged in
2. **Invitation Registration**: Authors register via invitation links with proper permissions
3. **Error Recovery**: Automatic retry mechanisms and user-friendly error handling

For developers working on authentication features, see the [RLS Policy Management Guide](./docs/RLS_POLICY_MANAGEMENT.md) for implementation details.
// trigger rebuild
