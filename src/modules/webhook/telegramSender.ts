import axios from "axios";
import { WebhookSender, WebhookConfig } from "./types";
import { config } from "../../config/config";
import { Tweet } from "../network/types/twitter";

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode: "HTML" | "Markdown" | "MarkdownV2";
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard: Array<
      Array<{
        text: string;
        url: string;
      }>
    >;
  };
}

export class TelegramSender implements WebhookSender {
  private webhookUrl: string;
  private maxRetries: number;
  private retryDelay: number;
  private baseApiUrl: string;

  constructor({
    webhookUrl,
    maxRetries = 3,
    retryDelay = 1000,
  }: WebhookConfig) {
    this.webhookUrl = webhookUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.baseApiUrl = `https://api.telegram.org/bot${config.webhook.telegram.botToken}`;
  }

  async sendNewTweetsNotification(tweets: Tweet[]) {
    for (const tweet of tweets) {
      try {
        const tweetData = tweet.content.itemContent?.tweet_results.result;
        if (!tweetData?.legacy || !tweetData.core?.user_results.result.legacy)
          continue;

        const { legacy: tweetLegacy } = tweetData;
        const { legacy: userLegacy } = tweetData.core.user_results.result;

        const authorInfo = `${userLegacy.name} (@${userLegacy.screen_name})${
          userLegacy.verified ? " ✓" : ""
        }`;
        const tweetUrl = `https://twitter.com/${userLegacy.screen_name}/status/${tweetLegacy.id_str}`;

        await this.sendTweetNotification(
          tweetLegacy.full_text,
          tweetUrl,
          authorInfo,
          new Date(tweetLegacy.created_at).toLocaleString()
        );
      } catch (error) {
        console.error(`Failed to send notification for tweet:`, error);
      }
    }
  }

  async sendMessage(
    text: string,
    options: {
      parseMode?: "HTML" | "Markdown" | "MarkdownV2";
      disablePreview?: boolean;
      buttons?: Array<{ text: string; url: string }>;
    } = {}
  ) {
    const message: TelegramMessage = {
      chat_id: config.webhook.telegram.chatId,
      text: options.parseMode === "HTML" ? this.escapeHtml(text) : text,
      parse_mode: options.parseMode || "HTML",
      disable_web_page_preview: options.disablePreview,
    };

    if (options.buttons?.length) {
      message.reply_markup = {
        inline_keyboard: [
          options.buttons.map((btn) => ({ text: btn.text, url: btn.url })),
        ],
      };
    }

    await this.sendTelegramMessage(message);
  }

  async sendTweetNotification(
    text: string,
    tweetUrl: string,
    authorInfo?: string,
    timestamp?: string
  ) {
    const messageParts = [];

    // 作者信息
    if (authorInfo) {
      messageParts.push(`👤 *${this.escapeMarkdownV2(authorInfo)}*`);
    }

    // 分隔线
    messageParts.push(this.escapeMarkdownV2("━".repeat(20)));

    // 文本内容（已包含 MarkdownV2 格式）
    messageParts.push(text);

    // 时间戳
    if (timestamp) {
      messageParts.push(`🕒 _${this.escapeMarkdownV2(timestamp)}_`);
    }

    // 构建按钮
    const buttons = [{ text: "🔗 查看原文", url: tweetUrl }];

    // 如果文本中包含 EVM 地址，添加 GMGN 按钮
    const evmAddress = this.extractFirstEVMAddress(text);
    if (evmAddress) {
      buttons.push({
        text: "🔍 GMGN",
        url: `https://gmgn.ai/base/token/axrrJNMf_${evmAddress}`,
      });
    }

    // 如果文本中包含 SOL 地址，添加 GMGN 按钮
    const solAddress = this.extractFirstSOLAddress(text);
    if (solAddress) {
      buttons.push({
        text: "🔍 GMGN",
        url: `https://gmgn.ai/sol/token/axrrJNMf_${solAddress}`,
      });
    }

    await this.sendMessage(messageParts.join("\n\n"), {
      parseMode: "MarkdownV2",
      disablePreview: true,
      buttons,
    });
  }

  private escapeMarkdownV2(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
  }

  private extractFirstEVMAddress(text: string): string {
    const match = text.match(/`(0x[a-fA-F0-9]{40})`/);
    return match ? match[1] : "";
  }

  private extractFirstSOLAddress(text: string): string {
    const match = text.match(/`([1-9A-HJ-NP-Za-km-z]{32,44})`/);
    return match ? match[1] : "";
  }

  private async sendTelegramMessage(message: TelegramMessage): Promise<void> {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const response = await axios.post(
          `${this.baseApiUrl}/sendMessage`,
          message
        );
        console.log("Message sent successfully:", response.data);
        return;
      } catch (error: any) {
        console.error("Telegram API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: message,
        });
        retries++;
        if (retries === this.maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  private escapeHtml(text: string): string {
    return text.replace(/[<>&]/g, (match) => {
      switch (match) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        default:
          return match;
      }
    });
  }
}
