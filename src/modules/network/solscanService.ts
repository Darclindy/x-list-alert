import axios from "axios";

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  holder: number;
  decimals: number;
  icon?: string;
  reputation?: string;
}

interface SolscanResponse {
  success: boolean;
  data: Array<{
    type: string;
    result: TokenInfo[];
  }>;
  metadata: Record<string, unknown>;
}

export class SolscanService {
  private readonly baseUrl = "https://api-v2.solscan.io/v2";
  private readonly headers = {
    accept: "application/json",
    origin: "https://solscan.io",
    referer: "https://solscan.io/",
    "sec-fetch-site": "same-site",
  };

  async searchToken(keyword: string): Promise<TokenInfo | null> {
    try {
      console.log(`\n🔍 Searching Solscan for token: ${keyword}`);

      const response = await axios.get<SolscanResponse>(
        `${this.baseUrl}/search`,
        {
          params: { keyword },
          headers: this.headers,
        }
      );

      if (!response.data.success) {
        console.log("❌ Solscan search failed: No success response");
        return null;
      }

      const tokens = response.data.data.find(
        (d) => d.type === "tokens"
      )?.result;
      if (!tokens || tokens.length === 0) {
        console.log("❌ No token found");
        return null;
      }

      // 获取第一个匹配的代币
      const token = tokens[0];
      console.log(`✅ Found token:
Name: ${token.name}
Symbol: ${token.symbol}
Address: ${token.address}
Holders: ${token.holder}
Reputation: ${token.reputation || "unknown"}
`);

      return token;
    } catch (error) {
      console.error("❌ Solscan search error:", error);
      return null;
    }
  }

  // 根据地址获取代币信息
  async getTokenByAddress(address: string): Promise<TokenInfo | null> {
    try {
      const response = await axios.get<SolscanResponse>(
        `${this.baseUrl}/search`,
        {
          params: { keyword: address },
          headers: this.headers,
        }
      );

      if (!response.data.success) return null;

      const tokens = response.data.data.find(
        (d) => d.type === "tokens"
      )?.result;
      return tokens?.[0] || null;
    } catch (error) {
      console.error("Error getting token by address:", error);
      return null;
    }
  }
}
