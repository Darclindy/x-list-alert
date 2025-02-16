import { SolscanService } from "./solscanService";

export class SolscanDebugger {
  private solscanService: SolscanService;

  constructor() {
    this.solscanService = new SolscanService();
  }

  async testSearchBySymbol(symbols: string[]): Promise<void> {
    console.log("🔍 Testing Solscan Token Search by Symbol...\n");

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      console.log(`\n[Test ${i + 1}] Searching for token symbol: ${symbol}`);
      console.log("━".repeat(50));

      try {
        console.time("Search Time");
        const result = await this.solscanService.searchToken(symbol);
        console.timeEnd("Search Time");

        if (result) {
          console.log("\n✅ Token Found:");
          console.log(`Name: ${result.name}`);
          console.log(`Symbol: ${result.symbol}`);
          console.log(`Address: ${result.address}`);
          console.log(`Holders: ${result.holder}`);
          console.log(`Decimals: ${result.decimals}`);
          console.log(`Reputation: ${result.reputation || "Unknown"}`);
          if (result.icon) {
            console.log(`Icon URL: ${result.icon}`);
          }
        } else {
          console.log("\n❌ No token found");
        }
      } catch (error) {
        console.error("\n❌ Search failed:", error);
      }

      console.log("\n" + "=".repeat(80));
    }
  }

  async testSearchByAddress(addresses: string[]): Promise<void> {
    console.log("🔍 Testing Solscan Token Search by Address...\n");

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      console.log(`\n[Test ${i + 1}] Searching for token address: ${address}`);
      console.log("━".repeat(50));

      try {
        console.time("Search Time");
        const result = await this.solscanService.getTokenByAddress(address);
        console.timeEnd("Search Time");

        if (result) {
          console.log("\n✅ Token Found:");
          console.log(`Name: ${result.name}`);
          console.log(`Symbol: ${result.symbol}`);
          console.log(`Address: ${result.address}`);
          console.log(`Holders: ${result.holder}`);
          console.log(`Decimals: ${result.decimals}`);
          console.log(`Reputation: ${result.reputation || "Unknown"}`);
          if (result.icon) {
            console.log(`Icon URL: ${result.icon}`);
          }
        } else {
          console.log("\n❌ No token found");
        }
      } catch (error) {
        console.error("\n❌ Search failed:", error);
      }

      console.log("\n" + "=".repeat(80));
    }
  }
}

// 运行测试
async function main(): Promise<void> {
  const tester = new SolscanDebugger();

  // 测试符号搜索
  const testSymbols = ["BONK", "WIF", "JTO", "PYTH", "NonExistentToken123"];

  // 测试地址搜索
  const testAddresses = [
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
    "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65QAg3", // WIF
    "7oBYdEhV4GkXC19ZfgAvXpJWp2Rn9pm1Bx2cVNxFpump", // CAR
    "InvalidSolanaAddress123",
  ];

  console.log("=".repeat(80));
  await tester.testSearchBySymbol(testSymbols);

  console.log("\n" + "=".repeat(80));
  console.log("\n");

  await tester.testSearchByAddress(testAddresses);
}

// 仅在直接运行此文件时执行测试
if (require.main === module) {
  main().catch((error) => {
    console.error("Error running Solscan debug tests:", error);
    process.exit(1);
  });
}
