import {
  convertToInteger,
  getQuote,
  getSwapTransaction,
  getCreateLimitOrderTransaction,
  finalizeTransaction,
} from "./swap-helper";
import bs58 from "bs58";
import {config} from "../../config/config";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getDecimals } from "../helpers/util";

const wsol = "So11111111111111111111111111111111111111112";

export const wallet = Keypair.fromSecretKey(
  bs58.decode(config.solana.private_key)
); // your wallet

/**
 * Sells a specified amount of a token on the DEX.
 * @param {string} tokenToSell - The address of the token to sell.
 * @param {number} amountOfTokenToSell - The amount of the token to sell.
 * @param {number} slippage - The slippage tolerance percentage.
 * @returns {Promise<void>} - A promise that resolves when the sell operation is completed.
 */
export async function sell(
  tokenToSell: string,
  amountOfTokenToSell: number,
  slippage: any
) {
  try {
    const decimals = await getDecimals(new PublicKey(tokenToSell));
    console.log(decimals);
    const convertedAmountOfTokenOut = await convertToInteger(
      amountOfTokenToSell,
      decimals
    );
    console.log(convertedAmountOfTokenOut);
    const quoteResponse = await getQuote(
      tokenToSell,
      wsol,
      convertedAmountOfTokenOut,
      slippage
    );
    const wallet_PubKey = wallet.publicKey.toBase58();
    const swapTransaction = await getSwapTransaction(
      quoteResponse,
      wallet_PubKey
    );
    const { confirmed, signature } = await finalizeTransaction(swapTransaction);
    if (confirmed) {
      console.log("http://solscan.io/tx/" + signature);
    } else {
      console.log("Transaction failed");
      console.log("retrying transaction...");
      await sell(tokenToSell, amountOfTokenToSell, slippage);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Creates a sell limit order for a token.
 *
 * @param {string} tokenToSell - The token to be sold.
 * @param {number} amountTokenIn - The amount of token to sell.
 * @param {number} limitPrice - The limit price for the order.
 * @returns {Promise<boolean>} - A promise that resolves to true if the limit order is created, false otherwise.
 * @throws {Error} - If an error occurs during limit order creation.
 */
export async function createSellLimitOrder(tokenToSell: string, amountTokenIn: number, limitPrice: number): Promise<boolean> {
  try {
    const decimals = await getDecimals(new PublicKey(tokenToSell));
    const convertedAmountOfTokenIn = await convertToInteger(
      amountTokenIn,
      decimals
    );
    const convertedAmountOfTokenOut = await convertToInteger(
      amountTokenIn * limitPrice,
      9 // WSOL decimals
    );
    const wallet_PubKey = wallet.publicKey.toBase58();
    const createOrderResponse = await getCreateLimitOrderTransaction(
      tokenToSell,
      wsol,
      wallet_PubKey,
      convertedAmountOfTokenIn,
      convertedAmountOfTokenOut
    );
    console.log(createOrderResponse);

    const { confirmed, signature } = await finalizeTransaction(createOrderResponse.tx);
    if (confirmed) {
      console.log("Sell limit order created successfully");
      console.log("http://solscan.io/tx/" + signature);
      return true;
    } else {
      console.log("Failed to create sell limit order");
      let retryCount = 0;
      const maxRetries = 5;
      while (retryCount < maxRetries) {
        console.log(`Retrying transaction... (Attempt ${retryCount + 1}/${maxRetries})`);
        const result = await createSellLimitOrder(tokenToSell, amountTokenIn, limitPrice);
        if (result) break;
        retryCount++;
      }
      if (retryCount === maxRetries) {
        console.log("Max retry attempts reached. Failed to create sell limit order.");
      }
      return false;
    }
  } catch (error) {
    console.error("Error creating sell limit order:", error);
    return false;
  }
}

async function main() {
  const tokenAddress = "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh";
  const amountOfTokenToSell = 0.000025;
  const slippage = 1;
  await sell(tokenAddress, amountOfTokenToSell, slippage);
}

// main();