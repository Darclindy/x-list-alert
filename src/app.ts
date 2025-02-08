import { config } from "./config/config";
import { Tweet } from "./modules/network/types/twitter";
import { TwitterListService } from "./modules/network/twitterList";
import { TelegramSender } from "./modules/webhook/telegramSender";
import fs from "fs";
import path from "path";

export class App {
  private twitterService: TwitterListService;
  private telegramSender: TelegramSender;
  private listId: string;
  private processedTweetIds: Set<string>;
  private isProcessing: boolean;
  private readonly processedIdsFile: string;
  private readonly evmAddressRegex = /\b0x[a-fA-F0-9]{40}\b/;
  private readonly solAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

  constructor(listId: string) {
    this.twitterService = new TwitterListService();
    this.telegramSender = new TelegramSender({
      webhookUrl: config.webhook.telegram.botToken,
    });
    this.listId = listId;
    this.processedIdsFile = path.join(
      __dirname,
      "../data/processed_tweets.json"
    );
    this.processedTweetIds = this.loadProcessedIds();
    this.isProcessing = false;
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
        await this.processTweet(tweet);
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

  private async processTweet(tweet: Tweet): Promise<void> {
    try {
      const tweetData = tweet.content.itemContent?.tweet_results.result;
      if (!tweetData?.legacy || !tweetData.core?.user_results.result.legacy)
        return;

      const { legacy: tweetLegacy } = tweetData;
      const { legacy: userLegacy } = tweetData.core.user_results.result;

      // 记录已处理的推文
      this.processedTweetIds.add(tweetLegacy.id_str);
      this.saveProcessedIds();

      // 提取地址
      const addresses = this.extractAddresses(tweetLegacy.full_text);
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
    } catch (error: unknown) {
      console.error("Error processing tweet:", error);
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

    // 组合最终消息
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
