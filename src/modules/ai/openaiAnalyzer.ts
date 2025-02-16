import { Configuration, OpenAIApi } from "openai";
import { AIAnalyzer, TweetAnalysis } from "./types";
import { config } from "../../config/config";
import { AIPromptManager } from "./prompts";

export class OpenAIAnalyzer implements AIAnalyzer {
  private openai: OpenAIApi;

  constructor() {
    if (!config.ai.openaiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    const configuration = new Configuration({
      apiKey: config.ai.openaiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async analyzeTweet(text: string): Promise<TweetAnalysis> {
    try {
      console.log("\n🔍 Analyzing Tweet:");
      console.log("━".repeat(50));
      console.log(text);
      console.log("━".repeat(50));

      const response = await this.openai.createChatCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: AIPromptManager.SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: AIPromptManager.USER_PROMPT_TEMPLATE(text),
          },
        ],
        temperature: 0.3,
      });

      const content = response.data.choices[0]?.message?.content || "";
      const analysis = this.parseResponse(content);

      console.log("\n📊 Analysis Result:");
      if (analysis.isTokenLaunch) {
        console.log("✅ Token Launch Detected");
        console.log(`🪙 Token: ${analysis.tokenTicker || "Not specified"}`);
        console.log(`📝 Contract: ${analysis.contract || "Not provided"}`);
        console.log(`💡 Hint: ${analysis.launchHint || "No details"}`);
        console.log(`🎯 Confidence: ${analysis.confidence || "MEDIUM"}`);
      } else {
        console.log("❌ Not a Token Launch");
      }
      console.log("━".repeat(50), "\n");

      return analysis;
    } catch (error) {
      console.error("\n❌ OpenAI analysis failed:", error);
      console.log("━".repeat(50), "\n");
      return { isTokenLaunch: false };
    }
  }

  private parseResponse(response: string): TweetAnalysis {
    const patterns = AIPromptManager.RESPONSE_PATTERNS;

    // 检查是否是代币发行相关
    const isLaunchMatch = response.match(patterns.IS_TOKEN_LAUNCH);
    const isTokenLaunch = isLaunchMatch
      ? isLaunchMatch[1].toLowerCase() === "true"
      : false;

    if (!isTokenLaunch) {
      return { isTokenLaunch: false };
    }

    // 提取其他信息
    const tokenTicker = response.match(patterns.TOKEN_TICKER)?.[1]?.trim();
    const contract = response.match(patterns.CONTRACT)?.[1]?.trim();
    const launchHint = response.match(patterns.LAUNCH_HINT)?.[1]?.trim();
    const confidence = response.match(patterns.CONFIDENCE)?.[1] as
      | "HIGH"
      | "MEDIUM"
      | "LOW";

    return {
      isTokenLaunch,
      tokenTicker,
      contract,
      launchHint,
      confidence,
    };
  }
}
