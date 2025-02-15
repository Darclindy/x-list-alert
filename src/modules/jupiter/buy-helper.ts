import {getQuote, getSwapTransaction, convertToInteger, finalizeTransaction, getCreateLimitOrderTransaction} from "./swap-helper";
import { PublicKey, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "../../config/config";
import { getDecimals } from "../helpers/util";

const wsol = "So11111111111111111111111111111111111111112";
const wallet = Keypair.fromSecretKey(bs58.decode(config.solana.private_key));

/**
 * Buys a token using the specified parameters.
 *
 * @param {string} tokenToBuy - The token to be swapped for.
 * @param {number} amountTokenOut - The amount of token to be received.
 * @param {number} slippage - The slippage tolerance percentage.
 * @returns {Promise<boolean>} - A promise that resolves to true if the buy operation is completed successfully, false otherwise.
 * @throws {Error} - If an error occurs during the buy operation.
 */
export async function buy(tokenToBuy:string, amountTokenOut:number, slippage:any): Promise<boolean> {
  try {
    const convertedAmountOfTokenOut = await convertToInteger(
      amountTokenOut,
      9
    );
    const quoteResponse = await getQuote(
      wsol,
      tokenToBuy,
      convertedAmountOfTokenOut,
      slippage
    );
    console.log(quoteResponse);
    const wallet_PubKey = wallet.publicKey.toBase58();
    const swapTransaction = await getSwapTransaction(
      quoteResponse,
      wallet_PubKey
    );
    console.log(swapTransaction);
    const { confirmed, signature } =
      await finalizeTransaction(swapTransaction);
    if (confirmed) {
      console.log("http://solscan.io/tx/" + signature);
      return true;
    } else {
      console.log("Transaction failed");
      let retryCount = 0;
      const maxRetries = 5;
      while (retryCount < maxRetries) {
        console.log(`Retrying transaction... (Attempt ${retryCount + 1}/${maxRetries})`);
        const result = await buy(tokenToBuy, amountTokenOut, slippage);
        if (result) break;
        retryCount++;
      }
      if (retryCount === maxRetries) {
        console.log("Max retry attempts reached. Transaction failed.");
      }
      return false;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Creates a buy limit order for a token.
 *
 * @param {string} tokenToBuy - The token to be bought.
 * @param {number} amountTokenIn - The amount of SOL to spend.
 * @param {number} limitPrice - The limit price for the order.
 * @returns {Promise<boolean>} - A promise that resolves to true if the buy limit order is created successfully, false otherwise.
 * @throws {Error} - If an error occurs during limit order creation.
 */
export async function createBuyLimitOrder(tokenToBuy: string, amountTokenIn: number, limitPrice: number): Promise<boolean> {
  try {
    const decimals = await getDecimals(new PublicKey(tokenToBuy));
    const convertedAmountOfTokenIn = await convertToInteger(
      amountTokenIn,
      9 // WSOL decimals
    );
    const convertedAmountOfTokenOut = await convertToInteger(
      amountTokenIn / limitPrice,
      decimals
    );

    const wallet_PubKey = wallet.publicKey.toBase58();
    const createOrderResponse = await getCreateLimitOrderTransaction(
      wsol,
      tokenToBuy,
      wallet_PubKey,
      convertedAmountOfTokenIn,
      convertedAmountOfTokenOut
    );
    console.log(createOrderResponse);

    const { confirmed, signature } = await finalizeTransaction(createOrderResponse.tx);
    console.log(confirmed, signature);
    if (confirmed) {
      console.log("Buy limit order created successfully");
      console.log("http://solscan.io/tx/" + signature);
      return true;
    } else {
      console.log("Failed to create buy limit order");
      let retryCount = 0;
      const maxRetries = 5;
      while (retryCount < maxRetries) {
        console.log(`Retrying transaction... (Attempt ${retryCount + 1}/${maxRetries})`);
        const result = await createBuyLimitOrder(tokenToBuy, amountTokenIn, limitPrice);
        if (result) break;
        retryCount++;
      }
      if (retryCount === maxRetries) {
        console.log("Max retry attempts reached. Failed to create buy limit order.");
      }
      return false;
    }
  } catch (error) {
    console.error("Error creating buy limit order:", error);
    return false;
  }
}

async function main() {
  const tokenAddress = "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh";
  const amountOfSOLToUse = 0.015
  const slippage = 1;
  await buy(tokenAddress, amountOfSOLToUse, slippage);
}

//main();

