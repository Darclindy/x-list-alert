# X List Alert

一个用于监控 Twitter 列表并发送加密货币相关推文通知的工具。

## 功能特点

- 实时监控指定的 Twitter 列表
- 自动识别推文中的加密货币地址（支持 EVM 和 SOL）
- 通过 Telegram 发送格式化的通知消息
- 自动保存已处理的推文 ID，避免重复推送
- 支持 Markdown 格式的消息排版
- 提供便捷的区块链浏览器链接

## 技术栈

- TypeScript
- Node.js
- Twitter API (通过 RapidAPI)
- Telegram Bot API
- Axios

## 项目结构

```
src/
├── app.ts                 # 应用主入口和核心逻辑
├── config/               
│   └── config.ts         # 配置管理
├── modules/
│   ├── network/          # 网络请求相关
│   │   ├── twitterList.ts
│   │   └── types/       # Twitter API 类型定义
│   └── webhook/          # 消息发送相关
│       ├── telegramSender.ts
│       └── types.ts
└── data/
    └── processed_tweets.json  # 已处理推文记录
```

## 配置说明

在 `.env` 文件中配置以下环境变量：

```env
RAPID_API_KEY=           # Twitter API 密钥
TELEGRAM_BOT_TOKEN=      # Telegram 机器人 Token
TELEGRAM_CHAT_ID=        # Telegram 目标聊天 ID
TWITTER_LIST_ID=         # 要监控的 Twitter 列表 ID
```

## 消息格式

推送的消息包含以下元素：
- 作者信息（带认证标记）
- 加密货币地址（EVM/SOL）
- 原始推文内容
- 发布时间
- 快捷操作按钮（原文链接和区块链浏览器）

## 运行方式

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件填入相应配置
```

3. 启动服务：
```bash
npm start
```

## 开发说明

- 使用 `npm run dev` 启动开发模式
- 使用 `npm run lint` 检查代码风格
- 使用 `npm run build` 构建生产版本

## 注意事项

- 确保 Twitter API 密钥有效且有足够的请求配额
- Telegram Bot 需要具有发送消息的权限
- 建议使用 PM2 等工具进行进程管理

## License

MIT
