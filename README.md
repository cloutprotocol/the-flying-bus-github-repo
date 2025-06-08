# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a037c97b-f27c-4e3a-acf8-7eede6e9912a

## Features

- Interactive news platform for kids
- Web3 integration with Thirdweb
- Crypto wallet support
- Token rewards system
- Social authentication (Email, Google, Apple)

## Web3 Integration

This project includes Thirdweb wallet integration with the following features:

- Embedded wallet support
- Social login options (Email, Google, Apple)
- Token rewards system for user engagement
- Polygon Mumbai Testnet integration

### Wallet Setup

1. Create a Thirdweb account at [thirdweb.com](https://thirdweb.com)
2. Get your client ID from the Thirdweb dashboard
3. Create a `.env` file in the project root with:
   ```
   VITE_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here
   ```

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
# Create a .env file with your Thirdweb client ID
echo "VITE_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here" > .env

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
