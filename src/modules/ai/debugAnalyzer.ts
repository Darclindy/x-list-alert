import { OpenAIAnalyzer } from "./openaiAnalyzer";
import { TweetAnalysis } from "./types";

export class DebugAnalyzer {
  private analyzer: OpenAIAnalyzer;

  constructor() {
    this.analyzer = new OpenAIAnalyzer();
  }

  async testAnalysis(tweets: string[]): Promise<void> {
    console.log("Starting OpenAI Token Launch Analyzer Debug Test...\n");

    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      console.log(`\n[Test ${i + 1}] Analyzing tweet:`);
      console.log("━".repeat(50));
      console.log(tweet);
      console.log("━".repeat(50));

      try {
        console.time("Analysis Time");
        const analysis: TweetAnalysis = await this.analyzer.analyzeTweet(tweet);
        console.timeEnd("Analysis Time");

        console.log("\nAnalysis Result:");
        if (analysis.isTokenLaunch) {
          console.log("Token Launch: Yes");
          console.log("Token Ticker:", analysis.tokenTicker || "Not specified");
          console.log("Contract:", analysis.contract || "Not specified");
          console.log("Launch Hint:", analysis.launchHint);
          console.log("Confidence:", analysis.confidence);
        } else {
          console.log("Token Launch: No");
        }
      } catch (error) {
        console.error("\nAnalysis Failed:", error);
      }

      console.log("\n" + "=".repeat(80) + "\n");
    }
  }
}

// 使用示例
async function main(): Promise<void> {
  const analyzerDebugger = new DebugAnalyzer();

  const testTweets = [
    // 明确的代币发布
    "🚀 Excited to announce our new token $XYZ! Contract: 0x1234567890abcdef1234567890abcdef12345678 Join our community now!",
    "Just deployed $ABC token on Ethereum! Early supporters get 2x rewards. CA: 0xabcdef1234567890abcdef1234567890abcdef12",

    // 预售和即将发布
    "🔥 $MOON presale starting in 24 hours! Whitelist spots available. Contract will be revealed at launch.",
    "Preparing for $ROCKET token launch next week! Contract audit in progress. Join TG for details.",

    // 含多个代币的消息
    "Launching $NEW on the success of $OLD and $BTC! Contract: 0x9876543210abcdef9876543210abcdef98765432",
    "Bridge your $ETH and $BNB to get $LAUNCH tokens! CA: 0xdef1234567890abcdef1234567890abcdef12345",

    // 模糊的预告
    "We're launching something special next week... Stay tuned! #crypto #DeFi",
    "Big news coming! The future of DeFi is about to change. 👀",

    // 一般的加密货币讨论
    "Check out this amazing DeFi project! $ETH $BTC to the moon! 🌙",
    "Market analysis: $BTC showing strong support at 40k, $ETH following the trend.",

    // 可能的诈骗/山寨币
    "⚠️ ATTENTION! $SCAM 1000x potential! Contract: 0x1111111111111111111111111111111111111111 Buy now!",
    "🔥 $DOGE killer launched! Better than $SHIB! Contract in bio!",

    // 代币相关新闻
    "Breaking: Major exchange listing $NEW tomorrow! Contract verified: 0xaaaa222244446666888899990000cccceeee1111",
    "Security Alert: Vulnerability found in $HACK token contract 0xdddd5555666677778888999900001111aaaa2222",

    // 含有合约但不是发布
    "Interacting with $UNI contract 0x1234567890123456789012345678901234567890 for better yields",
    "Found a potential exploit in 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd - stay away!",
  ];

  await analyzerDebugger.testAnalysis(testTweets);
}

// 仅在直接运行此文件时执行测试
if (require.main === module) {
  main().catch((error) => {
    console.error("Error running debug test:", error);
    process.exit(1);
  });
}
