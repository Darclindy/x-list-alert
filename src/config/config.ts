import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  database: {
    url: string;
  };
  ai: {
    openaiKey: string;
    deepseekKey: string;
  };
  webhook: {
    feishu: string;
    slack: string;
    telegram: {
      botToken: string;
      chatId: string;
    };
  };
  rapidApiKey: string;
  rapidApiHost: string;
  twitter: {
    listId: string;
  };
}

export const config: Config = {
  port: Number(process.env.PORT || 3000),
  database: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY || "",
    deepseekKey: process.env.DEEPSEEK_API_KEY || "",
  },
  webhook: {
    feishu: process.env.FEISHU_WEBHOOK_URL || "",
    slack: process.env.SLACK_WEBHOOK_URL || "",
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || "",
      chatId: process.env.TELEGRAM_CHAT_ID || "",
    },
  },
  rapidApiKey: process.env.RAPID_API_KEY || "",
  rapidApiHost: process.env.RAPID_API_HOST || "twitter-api47.p.rapidapi.com",
  twitter: {
    listId: process.env.TWITTER_LIST_ID || "1888126164751036784",
  },
};
