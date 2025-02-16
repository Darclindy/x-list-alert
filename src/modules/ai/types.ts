export interface AIAnalyzer {
  analyzeTweet(text: string): Promise<TweetAnalysis>;
}

export interface TweetAnalysis {
  isTokenLaunch: boolean;
  tokenTicker?: string;
  contract?: string;
  launchHint?: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
}
