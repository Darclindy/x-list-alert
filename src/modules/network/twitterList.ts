import axios from "axios";
import { TwitterListResponse, Tweet } from "./types/twitter";
import { config } from "../../config/config";

export class TwitterListService {
  private readonly apiKey: string;
  private readonly apiHost: string;

  constructor() {
    this.apiKey = config.rapidApiKey;
    this.apiHost = config.rapidApiHost;
  }

  async getLatestTweets(listId: string): Promise<Tweet[]> {
    const tweets = (await this.getListTweets(listId)).tweets.filter(
      (it) => it.content.itemContent?.tweet_results.result.legacy
    );

    // 按时间顺序处理推文
    return tweets.sort((a, b) => {
      const aTime = new Date(
        a.content.itemContent?.tweet_results.result.legacy.created_at || ""
      ).getTime();
      const bTime = new Date(
        b.content.itemContent?.tweet_results.result.legacy.created_at || ""
      ).getTime();
      return aTime - bTime;
    });
  }

  private async getListTweets(listId: string): Promise<TwitterListResponse> {
    const options = {
      method: "GET",
      url: `https://${this.apiHost}/v2/list/tweets`,
      params: {
        listId: listId,
      },
      headers: {
        "X-RapidAPI-Key": this.apiKey,
        "X-RapidAPI-Host": this.apiHost,
      },
    };

    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      console.error("Error fetching tweets:", error);
      throw error;
    }
  }
}

// const service = new TwitterListService();

// service.getListTweets("1882232616474263755").then((res) => {
//   console.log(`Processed ${res.tweets.length} new tweets`);
// });
