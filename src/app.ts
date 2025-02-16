import { config } from "./config/config";
import { Tweet } from "./modules/network/types/twitter";
import { TwitterListService } from "./modules/network/twitterList";
import { TelegramSender } from "./modules/webhook/telegramSender";
import { PublicKey } from "@solana/web3.js";
import { buy, createSellLimitOrder } from "./modules/jupiter";
import { getSPLTokenBalance } from "./modules/helpers/check_balance";
import fs from "fs";
import path from "path";
import { OpenAIAnalyzer } from "./modules/ai/openaiAnalyzer";
import { SolscanService } from "./modules/network/solscanService";

export class App {
  private twitterService: TwitterListService;
  private telegramSender: TelegramSender;
  private solscanService: SolscanService;
  private listId: string;
  private processedTweetIds: Set<string>;
  private isProcessing: boolean;
  private readonly processedIdsFile: string;
  private readonly evmAddressRegex = /\b0x[a-fA-F0-9]{40}\b/;
  private readonly solAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;
  private aiAnalyzer: OpenAIAnalyzer;

  constructor(listId: string) {
    this.twitterService = new TwitterListService();
    this.telegramSender = new TelegramSender({
      webhookUrl: config.webhook.telegram.botToken,
    });
    this.solscanService = new SolscanService();
    this.listId = listId;
    this.processedIdsFile = path.join(
      __dirname,
      "../data/processed_tweets.json"
    );
    this.processedTweetIds = this.loadProcessedIds();
    this.isProcessing = false;
    this.aiAnalyzer = new OpenAIAnalyzer();
  }

  private loadProcessedIds(): Set<string> {
    try {
      if (!fs.existsSync(this.processedIdsFile)) {
        const dirPath = path.dirname(this.processedIdsFile);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(this.processedIdsFile, "[]");
        return new Set<string>();
      }

      const data = fs.readFileSync(this.processedIdsFile, "utf-8");
      const ids = JSON.parse(data) as string[];
      return new Set<string>(ids);
    } catch (error) {
      console.error("Error loading processed tweet IDs:", error);
      return new Set<string>();
    }
  }

  private saveProcessedIds(): void {
    try {
      const ids = Array.from(this.processedTweetIds);
      fs.writeFileSync(this.processedIdsFile, JSON.stringify(ids, null, 2));
    } catch (error) {
      console.error("Error saving processed tweet IDs:", error);
    }
  }

  async start(): Promise<void> {
    try {
      // 每1分钟检查一次新推文
      setInterval(() => this.checkNewTweets(), 1.5 * 60 * 1000);
      // 立即执行一次
      await this.checkNewTweets();
    } catch (error: unknown) {
      console.error("Fatal error:", error);
    }
  }

  private async checkNewTweets(): Promise<void> {
    if (this.isProcessing) {
      console.log("Skip checking as previous check is still processing");
      return;
    }

    this.isProcessing = true;
    try {
      // 获取推文列表
      const tweets = await this.twitterService.getLatestTweets(this.listId);
      console.log(`Got ${tweets.length} tweets from Twitter List`);
      if (tweets.length === 0) return;

      // 过滤未处理的推文
      const unprocessedTweets = this.filterUnprocessedTweets(tweets);
      if (unprocessedTweets.length === 0) return;

      console.log(`Found ${unprocessedTweets.length} new tweets to process`);

      // 处理并发送每条推文
      for (const tweet of unprocessedTweets) {
        await this.processTweetAndTrade(tweet);
      }

      // 保存处理过的推文ID
      this.saveProcessedIds();
    } catch (error: unknown) {
      console.error("Error checking new tweets:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private filterUnprocessedTweets(tweets: Tweet[]): Tweet[] {
    return tweets.filter((tweet) => {
      const tweetData = tweet.content.itemContent?.tweet_results.result;
      if (!tweetData?.legacy || !tweetData.core?.user_results.result.legacy)
        return false;

      return !this.processedTweetIds.has(tweetData.legacy.id_str);
    });
  }

  private async processTweet(
    tweet: Tweet
  ): Promise<Array<{ address: string; type: "EVM" | "SOL" }> | void> {
    try {
      const tweetData = tweet.content.itemContent?.tweet_results.result;
      if (!tweetData?.legacy || !tweetData.core?.user_results.result.legacy)
        return;

      const { legacy: tweetLegacy } = tweetData;
      const { legacy: userLegacy } = tweetData.core.user_results.result;

      // 1. 首先检查合约地址
      const addresses = this.extractAddresses(tweetLegacy.full_text);
      let regexFoundCA = addresses.find((addr) => addr.type === "SOL")?.address;

      // 2. 进行 AI 分析
      try {
        const analysis = await this.aiAnalyzer.analyzeTweet(
          tweetLegacy.full_text
        );

        // 如果是代币发布且有代币符号
        if (analysis.isTokenLaunch && analysis.tokenTicker) {
          console.log(
            `\n🔍 Verifying token ${analysis.tokenTicker} on Solscan...`
          );

          // 尝试从 Solscan 获取代币信息
          const tokenInfo = await this.solscanService.searchToken(
            analysis.tokenTicker.replace("$", "")
          );

          if (!tokenInfo) {
            console.log(
              `❌ Token ${analysis.tokenTicker} not found on Solscan`
            );
            return; // 如果找不到代币，不发送通知
          }

          // 比对合约地址
          if (regexFoundCA && regexFoundCA !== tokenInfo.address) {
            console.log(
              `⚠️ Address mismatch: Regex found ${regexFoundCA}, Solscan found ${tokenInfo.address}`
            );
            return; // 如果地址不匹配，不发送通知
          }

          // 使用 Solscan 找到的地址
          const verifiedCA = tokenInfo.address;

          // 构建 AI 分析消息
          const aiMessage = [
            `🔍 *AI Analysis: New Token Launch Detected*`,
            ``,
            `🪙 Token: ${this.escapeMarkdownV2(analysis.tokenTicker)}`,
            `📝 Contract: \`${this.escapeMarkdownV2(verifiedCA)}\``,
            ``,
            `📊 Token Info:`,
            `• Name: ${this.escapeMarkdownV2(tokenInfo.name)}`,
            `• Holders: ${this.escapeMarkdownV2(tokenInfo.holder.toString())}`,
            `• Reputation: ${this.escapeMarkdownV2(
              tokenInfo.reputation || "Unknown"
            )}`,
            ``,
            `💡 Details: ${this.escapeMarkdownV2(
              analysis.launchHint || "No details"
            )}`,
            `🎯 Confidence: ${analysis.confidence || "MEDIUM"}`,
            ``,
            `Original Tweet:`,
            this.escapeMarkdownV2(tweetLegacy.full_text),
          ].join("\n");

          // 发送 AI 分析结果
          await this.telegramSender.sendTweetNotification(
            aiMessage,
            `https://twitter.com/${userLegacy.screen_name}/status/${tweetLegacy.id_str}`,
            `🤖 AI Token Launch Alert - ${userLegacy.name} (@${
              userLegacy.screen_name
            })${userLegacy.verified ? " ✓" : ""}`,
            new Date(tweetLegacy.created_at).toLocaleString()
          );
        }
      } catch (error) {
        console.error("AI analysis or Solscan verification failed:", error);
      }

      // 记录已处理的推文
      this.processedTweetIds.add(tweetLegacy.id_str);
      this.saveProcessedIds();
      if (addresses.length === 0) {
        return;
      }

      // 构建消息内容
      const messageContent = this.formatTweetContent(
        tweetLegacy.full_text,
        addresses,
        userLegacy,
        tweetLegacy
      );

      // 发送通知
      await this.telegramSender.sendTweetNotification(
        messageContent,
        `https://twitter.com/${userLegacy.screen_name}/status/${tweetLegacy.id_str}`,
        `${userLegacy.name} (@${userLegacy.screen_name})${
          userLegacy.verified ? " ✓" : ""
        }`,
        new Date(tweetLegacy.created_at).toLocaleString()
      );

      return addresses;
    } catch (error: unknown) {
      console.error("Error processing tweet:", error);
    }
  }

  private async processTweetAndTrade(tweet: Tweet): Promise<void> {
    try {
      const addresses = await this.processTweet(tweet);
      if (addresses) {
        await this.trade(addresses);
      }
    } catch (error: unknown) {
      console.error(error);
    }
  }

  private async trade(
    addresses: Array<{ address: string; type: "EVM" | "SOL" }>
  ): Promise<void> {
    try {
      for (const { address, type } of addresses) {
        if (type === "SOL") {
          const escapedAddress = this.escapeMarkdownV2(address);
          console.log(
            "Buying " +
              config.solana.amount_to_buy_sol +
              " SOL" +
              " at " +
              escapedAddress
          );
          // 100% slippage
          await buy(escapedAddress, config.solana.amount_to_buy_sol, 100);
        }
      }

      for (const { address, type } of addresses) {
        if (type === "SOL") {
          const escapedAddress = this.escapeMarkdownV2(address);
          // TODO: Add retry logic for getSPLTokenBalance?
          const balance = await getSPLTokenBalance(
            new PublicKey(escapedAddress)
          );
          console.log("Balance of " + escapedAddress + " is " + balance);

          if (balance > 0) {
            // Calcuate buying price based on the amount of SOL spent and token balance
            const price = config.solana.amount_to_buy_sol / balance;
            // Place limit sell order at 2x buying price
            console.log(
              "Creating sell order for " + escapedAddress + " at " + price * 2
            );
            await createSellLimitOrder(escapedAddress, balance / 2, price * 2);
          }
        }
      }
    } catch (error: unknown) {
      console.error("Error submitting transcations:", error);
    }
  }

  private extractAddresses(
    text: string
  ): Array<{ address: string; type: "EVM" | "SOL" }> {
    const addresses: Array<{ address: string; type: "EVM" | "SOL" }> = [];

    // 查找 EVM 地址
    const evmMatches = text.match(this.evmAddressRegex);
    if (evmMatches) {
      evmMatches.forEach((address) => {
        addresses.push({ address, type: "EVM" });
      });
    }

    // 查找 SOL 地址
    const solMatches = text.match(this.solAddressRegex);
    if (solMatches) {
      solMatches.forEach((address) => {
        if (!address.startsWith("0x")) {
          // 避免与 EVM 地址重复
          addresses.push({ address, type: "SOL" });
        }
      });
    }

    return addresses;
  }

  private formatTweetContent(
    text: string,
    addresses: Array<{ address: string; type: "EVM" | "SOL" }>,
    user: any,
    tweet: any
  ): string {
    // 构建地址部分
    const addressSection = addresses
      .map(({ address, type }) => {
        const escapedAddress = this.escapeMarkdownV2(address);
        return `${type === "EVM" ? "⬡" : "◎"} *${type}*: \`${escapedAddress}\``;
      })
      .join("\n");

    // 高亮文本中的地址和链接
    let highlightedText = text;

    // 处理 URLs (在处理其他格式之前)
    highlightedText = highlightedText.replace(/(https?:\/\/[^\s]+)/g, (url) =>
      url.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "")
    );

    // 处理地址
    addresses.forEach(({ address }) => {
      const escapedAddress = this.escapeMarkdownV2(address);
      highlightedText = highlightedText.replace(
        new RegExp(this.escapeRegExp(address), "g"),
        `\`${escapedAddress}\``
      );
    });

    // 处理 hashtags 和 cashtags
    highlightedText = highlightedText
      .replace(/(\$\w+)/g, (match) => `*${this.escapeMarkdownV2(match)}*`)
      .replace(/(\#\w+)/g, (match) => `_${this.escapeMarkdownV2(match)}_`);

    // 转义剩余的特殊字符
    highlightedText = this.escapeMarkdownV2(highlightedText);

    return [
      addressSection,
      this.escapeMarkdownV2("━".repeat(20)),
      highlightedText,
    ].join("\n\n");
  }

  private escapeMarkdownV2(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

// 使用配置中的 LIST_ID
const appInstance = new App(config.twitter.listId);
appInstance.start().catch((error: unknown) => {
  console.error("Failed to start app:", error);
  process.exit(1);
});

// 优雅退出
process.on("SIGINT", () => {
  console.log("Received SIGINT. Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Shutting down...");
  process.exit(0);
});
