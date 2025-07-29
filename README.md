# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a037c97b-f27c-4e3a-acf8-7eede6e9912a

## Features

- Interactive news platform for kids
- Web3 integration with Thirdweb
- Crypto wallet support
- Token rewards system
- Social authentication (Email, Google, Apple)
- Parent invitation approval workflow system
- Comprehensive admin management portal

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

## Database Setup

This project uses Supabase as the database backend. The invitation approval workflow system requires specific database migrations to be applied.

### Required Migrations

1. **User Profiles Table**: Run the migration in `supabase/migrations/20250118_create_profiles_table.sql`
   - Creates the foundational `profiles` table for user management
   - Implements role-based access control ('reader', 'author', 'moderator', 'admin')
   - Includes Web3 wallet address support for token rewards
   - Automatic profile creation on user signup via database triggers
   - Row Level Security (RLS) policies for secure profile access

2. **Invitation Requests Table**: Run the migration in `supabase/migrations/20250119_create_invitation_requests_table.sql`
   - Creates the core `invitation_requests` table for parent invitation requests
   - Implements Row Level Security (RLS) policies for data protection
   - Adds performance indexes for efficient querying
   - Establishes proper foreign key relationships with the profiles table

### Database Configuration

1. Set up your Supabase project and obtain the project URL and API keys
2. Update the `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Apply the database migrations in order using the Supabase CLI or SQL Editor:
   - First: `20250118_create_profiles_table.sql` (user profiles and authentication)
   - Second: `20250119_create_invitation_requests_table.sql` (invitation system)
4. Verify the setup using the verification script in `scripts/verify-invitation-system.sql`

### Invitation System

The platform includes a comprehensive invitation approval workflow:
- Parents can request invitations for their children to become authors
- Admins review and approve/deny requests through the admin portal
- Automated email notifications for approval/denial decisions
- Secure token-based invitation claiming system
- Account creation and upgrade functionality for approved invitations

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
- Supabase (PostgreSQL database)
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
#this is neels demo text 2nd