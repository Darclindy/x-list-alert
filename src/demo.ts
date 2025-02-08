import { config } from "./config/config";
import { TelegramSender } from "./modules/webhook/telegramSender";
import axios from "axios";

async function testConfig() {
  console.log("Current config:", {
    botToken: config.webhook.telegram.botToken,
    chatId: config.webhook.telegram.chatId,
  });

  const telegramSender = new TelegramSender({
    webhookUrl: config.webhook.telegram.botToken,
  });

  try {
    console.log("\n1. Testing simple text message...");
    await telegramSender.sendMessage("Hello! This is a simple test message");
    console.log("✅ Simple message sent successfully!");

    console.log("\n2. Testing Markdown formatting...");
    await telegramSender.sendMessage(
      [
        "*Bold text*",
        "_Italic text_",
        "`Monospace text`",
        "```",
        "Pre-formatted fixed-width code block",
        "```",
        "[Inline URL](https://example.com)",
      ].join("\n"),
      { parseMode: "MarkdownV2" }
    );
    console.log("✅ Markdown message sent successfully!");

    console.log("\n3. Testing message with buttons...");
    await telegramSender.sendMessage("*Message with buttons:*", {
      parseMode: "MarkdownV2",
      buttons: [
        { text: "🌐 Visit Website", url: "https://example.com" },
        { text: "📖 Documentation", url: "https://example.com/docs" },
      ],
    });
    console.log("✅ Message with buttons sent successfully!");

    console.log("\n4. Testing tweet notification...");
    await telegramSender.sendTweetNotification(
      "This is a simulated tweet content with some interesting information about #crypto and #blockchain",
      "https://twitter.com/example/status/123456789",
      "Test User (@testuser) ✓",
      new Date().toLocaleString()
    );
    console.log("✅ Tweet notification sent successfully!");

    console.log("\n5. Testing message with Chinese characters...");
    await telegramSender.sendMessage(
      ["*测试中文消息*", "_支持多行文本_", "`代码格式文本`"].join("\n"),
      { parseMode: "MarkdownV2" }
    );
    console.log("✅ Chinese message sent successfully!");

    console.log("\n✨ All tests completed successfully!");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "❌ Failed to send test message:",
        error.response?.data || error.message
      );
      if (error.response) {
        console.error("Error details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }
    } else {
      console.error("❌ Failed to send test message:", error);
    }
    process.exit(1);
  }
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

testConfig().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
