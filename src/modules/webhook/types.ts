// Feishu webhook message types
export interface FeishuTextMessage {
  msg_type: "text";
  content: {
    text: string;
  };
}

export interface FeishuRichTextContent {
  title: string;
  content: Array<
    Array<{
      tag: "text" | "a" | "at";
      text?: string;
      href?: string;
      user_id?: string;
    }>
  >;
}

export interface FeishuPostMessage {
  msg_type: "post";
  content: {
    post: {
      zh_cn: FeishuRichTextContent;
    };
  };
}

export interface FeishuImageMessage {
  msg_type: "image";
  content: {
    image_key: string;
  };
}

// 卡片消息类型定义
export interface FeishuCardConfig {
  update_multi?: boolean;
  style?: {
    text_size?: {
      normal_v2?: {
        default?: string;
        pc?: string;
        mobile?: string;
      };
    };
  };
}

export interface FeishuCardElement {
  tag: string;
  text?: {
    tag: string;
    content: string;
  };
  content?: string;
  text_align?: string;
  text_size?: string;
  margin?: string;
  type?: string;
  width?: string;
  size?: string;
  behaviors?: Array<{
    type: string;
    default_url?: string;
    pc_url?: string;
    ios_url?: string;
    android_url?: string;
  }>;
}

export interface FeishuCardHeader {
  title: {
    tag: "plain_text";
    content: string;
  };
  subtitle?: {
    tag: "plain_text";
    content: string;
  };
  template?: string;
  padding?: string;
}

export interface FeishuCard {
  schema: "2.0";
  config?: FeishuCardConfig;
  header?: FeishuCardHeader;
  body?: {
    direction?: string;
    padding?: string;
    elements: FeishuCardElement[];
  };
}

export interface FeishuCardMessage {
  msg_type: "interactive";
  card: FeishuCard;
}

// Union type for all supported message types
export type FeishuMessage =
  | FeishuTextMessage
  | FeishuPostMessage
  | FeishuImageMessage
  | FeishuCardMessage;

import { ProcessedTweet } from "../network/types/twitter";

export interface WebhookSender {
  sendNewTweetsNotification(tweets: ProcessedTweet[]): Promise<void>;
}

export interface WebhookConfig {
  webhookUrl: string;
  maxRetries?: number;
  retryDelay?: number;
}

