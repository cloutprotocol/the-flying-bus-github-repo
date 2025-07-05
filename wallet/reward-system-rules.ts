// Types for reward events
export type RewardEvent =
  | "TASK_COMPLETION"
  | "FIRST_LOGIN_BONUS"
  | "REFERRAL_BONUS"
  | "ARTICLE_READ"
  | "QUIZ_COMPLETION";

export const REWARD_EVENTS: Record<RewardEvent, RewardEvent> = {
  TASK_COMPLETION: "TASK_COMPLETION",
  FIRST_LOGIN_BONUS: "FIRST_LOGIN_BONUS",
  REFERRAL_BONUS: "REFERRAL_BONUS",
  ARTICLE_READ: "ARTICLE_READ",
  QUIZ_COMPLETION: "QUIZ_COMPLETION",
};

export function getRewardAmount(eventType: RewardEvent): string {
  switch (eventType) {
    case REWARD_EVENTS.TASK_COMPLETION:
      return "0.01"; // 0.01 tokens
    case REWARD_EVENTS.FIRST_LOGIN_BONUS:
      return "0.1"; // 0.1 tokens
    case REWARD_EVENTS.REFERRAL_BONUS:
      return "0.05"; // 0.05 tokens
    case REWARD_EVENTS.ARTICLE_READ:
      return "0.02"; // 0.02 tokens
    case REWARD_EVENTS.QUIZ_COMPLETION:
      return "0.03"; // 0.03 tokens
    default:
      return "0";
  }
}

// Replace this with your actual token contract address after deployment
export const TOKEN_CONTRACT_ADDRESS = "0x1F48F3471f7534E8b8dbd4fCecE30CAFED03DC02"; 