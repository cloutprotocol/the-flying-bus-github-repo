import express from 'express';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Provider Setup ---
const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);

// --- Thirdweb SDK ---
const sdk = new ThirdwebSDK(wallet, {
  secretKey: process.env.THIRDWEB_SECRET_KEY,
});

// --- Token Contract ---
const TOKEN_CONTRACT_ADDRESS = "0x1401FCDe7ed44b5BE2E448bab2254Ab0709258b8"; // Your POL token address

// --- Reward Amounts (imported or hardcoded) ---
const REWARD_AMOUNTS = {
  TASK_COMPLETION: "0.01",
  FIRST_LOGIN_BONUS: "0.1",
  REFERRAL_BONUS: "0.05",
  ARTICLE_READ: "0.005",
  QUIZ_COMPLETION: "0.02",
};

// --- Reward API Endpoint ---
app.post('/api/reward-user', async (req, res) => {
  const { userWalletAddress, eventType } = req.body;
  if (!userWalletAddress || !eventType) {
    return res.status(400).json({ error: "Missing userWalletAddress or eventType" });
  }

  const amount = REWARD_AMOUNTS[eventType] || "0";
  if (amount === "0") {
    return res.status(400).json({ error: "Invalid eventType or reward amount" });
  }

  try {
    const token = await sdk.getToken(TOKEN_CONTRACT_ADDRESS);
    const tx = await token.transfer(userWalletAddress, amount);
    return res.json({ success: true, txHash: tx.receipt.transactionHash });
  } catch (err) {
    console.error("Reward error:", err);
    if (err.message && err.message.toLowerCase().includes("insufficient funds")) {
      return res.status(400).json({ error: "Reward wallet has insufficient POL. Please contact support." });
    }
    return res.status(500).json({ error: err.message || "Failed to send reward" });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Reward API running on http://localhost:${PORT}`);
});
