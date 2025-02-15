import { VersionedTransaction, PublicKey, Keypair, Connection } from "@solana/web3.js";
import fetch from "cross-fetch";
import bs58 from "bs58";
import {config} from "../../config/config";
import { getDecimals } from "../helpers/util";

const connection = new Connection(config.solana.main_endpoint, "confirmed");
const wallet = Keypair.fromSecretKey(bs58.decode(config.solana.private_key));
/**
 * Retrieves a quote for swapping tokens.
 *
 * @param {string} tokenToSell - The output token's mint address.
 * @param {string} tokenToBuy - The input token's mint address.
 * @param {number} convertedAmountOfTokenOut - The amount of output token to be converted.
 * @param {number} slippage - The allowed slippage in basis points.
 * @returns {Promise<object>} - The quote object containing swap details.
 */
export async function getQuote(
  tokenToSell: string,
  tokenToBuy: string,
  convertedAmountOfTokenOut: number,
  slippage: any
) {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenToSell}&outputMint=${tokenToBuy}&amount=${convertedAmountOfTokenOut}&slippageBps=${slippage}`;
  const response = await fetch(url);
  const quote = await response.json();
  return quote;
}

/**
 * Retrieves the swap transaction from the quote API.
 * @param {Object} quoteResponse - The quote response object.
 * @param {string} wallet_pubKey - The public key of the user's wallet.
 * @returns {Promise<string>} - The swap transaction.
 * @throws {Error} - If an error occurs during the process.
 */
export async function getSwapTransaction(
  quoteResponse: any,
  wallet_pubKey: string
) {
  try {
    let body = null;
    body = {
      quoteResponse,
      userPublicKey: wallet_pubKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true, // allow dynamic compute limit instead of max 1,400,000
      prioritizationFeeLamports: 4211970, // prioritization fee
    };
    const resp = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const swapResponse = await resp.json();
    return swapResponse.swapTransaction;
  } catch (error: any) {
    throw new Error(error);
  }
}
/**
 * Creates a limit order transaction using Jupiter's API.
 * @param {string} tokenToSell - The mint address of the token to sell.
 * @param {string} tokenToBuy - The mint address of the token to buy.
 * @param {string} wallet_pubKey - The public key of the wallet creating the order.
 * @param {number} convertedAmountOfTokenIn - The amount of input token to sell.
 * @param {number} convertedLimitPrice - The limit price for the order.
 * @returns {Promise<any>} The limit order transaction response from Jupiter API.
 * @throws {Error} If there is an error creating the limit order transaction.
 */
export async function getCreateLimitOrderTransaction(
  tokenToSell: string,
  tokenToBuy: string,
  wallet_pubKey: string,
  convertedAmountOfTokenIn: number,
  convertedAmountOfTokenOut: number,
) {
  try {
    const inputMintPubKey = new PublicKey(tokenToSell);
    const outputMintPubKey = new PublicKey(tokenToBuy);

    const inputMintTokenProgram = (await connection.getAccountInfo(inputMintPubKey))?.owner.toString();
    const outputMintTokenProgram = (await connection.getAccountInfo(outputMintPubKey))?.owner.toString();

    const resp = await fetch('https://api.jup.ag/limit/v2/createOrder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputMint: tokenToSell,
        outputMint: tokenToBuy,
        maker: wallet_pubKey,
        payer: wallet_pubKey,
        params: {
          makingAmount: convertedAmountOfTokenIn.toString(),
          takingAmount: convertedAmountOfTokenOut.toString()
        },
        computeUnitPrice: "auto",
        inputMintTokenProgram,
        outputMintTokenProgram,
      })
    });

    const createOrderResponse = await resp.json();
    return createOrderResponse;

  } catch (error: any) {
    throw new Error(`Error creating limit order transaction: ${error.message}`);
  }
}

/**
 * Converts the given amount to an integer by multiplying it with 10 raised to the power of decimals.
 * @param {number} amount - The amount to be converted.
 * @param {number} decimals - The number of decimal places.
 * @returns {Promise<number>} The converted integer value.
 */
export async function convertToInteger(amount: number, decimals: number) {
  return Math.floor(amount * 10 ** decimals);
}

/**
 * Finalizes a swap transaction by deserializing, signing, and executing the transaction.
 * @param {string} swapTransaction - The base64 encoded swap transaction.
 * @returns {Promise<{ confirmed: boolean, signature: string }>} - A promise that resolves to an object containing the confirmation status and transaction signature.
 * @throws {Error} - If an error occurs during the transaction finalization process.
 */
export async function finalizeTransaction(swapTransaction: any) {
  try {
    let confirmed = null;
    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    let transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    // sign the transaction
    transaction.sign([wallet]);

    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
    });
    
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    
    confirmed = !confirmation.value.err;
    return { confirmed, signature };
  } catch (error: any) {
    throw new Error(error);
  }
  return { confirmed: false, signature: null };
}
/**
 * Performs a token swap transaction.
 *
 * @param {string} tokenToSell - The token to sell.
 * @param {string} tokenToBuy - The token to buy.
 * @param {number} amountTokenOut - The amount of token to receive.
 * @param {number} slippage - The allowed slippage percentage.
 * @returns {Promise<void>} - A promise that resolves when the swap transaction is completed.
 */
export async function swap(
  tokenToSell: string,
  tokenToBuy: string,
  amountTokenOut: number,
  slippage: any
) {
  try {
    const decimals = await getDecimals(new PublicKey(tokenToSell));
    const convertedAmountOfTokenOut = await convertToInteger(
      amountTokenOut,
      decimals
    );
    const quoteResponse = await getQuote(
      tokenToSell,
      tokenToBuy,
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
      await swap(tokenToSell, tokenToBuy, amountTokenOut, slippage);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Creates a limit order for token swap.
 *
 * @param {string} tokenToSell - The token to sell.
 * @param {string} tokenToBuy - The token to buy.
 * @param {number} amountTokenIn - The amount of input token to sell.
 * @param {number} limitPrice - The limit price for the order.
 * @returns {Promise<void>} - A promise that resolves when the limit order is created.
 */
export async function createLimitOrder(
  tokenToSell: string,
  tokenToBuy: string,
  amountTokenIn: number,
  limitPrice: number
) {
  try {
    const decimals = await getDecimals(new PublicKey(tokenToSell));
    const convertedAmountOfTokenIn = await convertToInteger(
      amountTokenIn,
      decimals
    );
    const convertedLimitPrice = await convertToInteger(
      limitPrice,
      decimals
    );

    const wallet_PubKey = wallet.publicKey.toBase58();
    const createOrderResponse = await getCreateLimitOrderTransaction(
      tokenToSell,
      tokenToBuy,
      wallet_PubKey,
      convertedAmountOfTokenIn,
      convertedLimitPrice
    );

    const { confirmed, signature } = await finalizeTransaction(createOrderResponse.tx);
    if (confirmed) {
      console.log("Limit order created successfully");
      console.log("http://solscan.io/tx/" + signature);
    } else {
      console.log("Failed to create limit order");
      console.log("retrying transaction...");
      await createLimitOrder(tokenToSell, tokenToBuy, amountTokenIn, limitPrice);
    }
  } catch (error) {
    console.error("Error creating limit order:", error);
  }
}