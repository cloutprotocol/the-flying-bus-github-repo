// Types for reward events
export type RewardEvent =
  | "TASK_COMPLETION"
  | "FIRST_LOGIN_BONUS"
  | "REFERRAL_BONUS"
  | "ARTICLE_READ"
  | "QUIZ_COMPLETION"
  | "COMMENT_APPROVED"
  | "WRITE_ARTICLE"
  | "VIDEO_ARTICLE"
  | "ART_ARTICLE"
  | "SHARE_ARTICLE";

export const REWARD_EVENTS: Record<RewardEvent, RewardEvent> = {
  TASK_COMPLETION: "TASK_COMPLETION",
  FIRST_LOGIN_BONUS: "FIRST_LOGIN_BONUS",
  REFERRAL_BONUS: "REFERRAL_BONUS",
  ARTICLE_READ: "ARTICLE_READ",
  QUIZ_COMPLETION: "QUIZ_COMPLETION",
  COMMENT_APPROVED: "COMMENT_APPROVED",
  WRITE_ARTICLE: "WRITE_ARTICLE",
  VIDEO_ARTICLE: "VIDEO_ARTICLE",
  ART_ARTICLE: "ART_ARTICLE",
  SHARE_ARTICLE: "SHARE_ARTICLE",
};

export function getRewardAmount(eventType: RewardEvent): string {
  switch (eventType) {
    case REWARD_EVENTS.COMMENT_APPROVED:
      return "1"; // Read an article and leave a comment that gets approved
    case REWARD_EVENTS.WRITE_ARTICLE:
      return "3"; // Write an article
    case REWARD_EVENTS.VIDEO_ARTICLE:
      return "4"; // Video
    case REWARD_EVENTS.ART_ARTICLE:
      return "2"; // Art
    case REWARD_EVENTS.SHARE_ARTICLE:
      return "0.5"; // Sharing an article
    case REWARD_EVENTS.TASK_COMPLETION:
      return "0.01";
    case REWARD_EVENTS.FIRST_LOGIN_BONUS:
      return "0.1";
    case REWARD_EVENTS.REFERRAL_BONUS:
      return "0.05";
    case REWARD_EVENTS.ARTICLE_READ:
      return "0.02";
    case REWARD_EVENTS.QUIZ_COMPLETION:
      return "0.03";
    default:
      return "0";
  }
}

// Replace this with your actual token contract address after deployment
export const TOKEN_CONTRACT_ADDRESS = "0x1401FCDe7ed44b5BE2E448bab2254Ab0709258b8"; 