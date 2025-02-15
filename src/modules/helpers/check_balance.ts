import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import bs58 from "bs58";
import { config } from "../../config/config";

export const wallet = Keypair.fromSecretKey(
  bs58.decode(config.solana.private_key)
); 

const connection = new Connection(config.solana.main_endpoint, "confirmed");

/**
 * Retrieves the balance of an SPL token associated with a given token account.
 * @param {Connection} connection - The connection object for interacting with the Solana network.
 * @param {PublicKey} tokenAccount - The public key of the token account.
 * @param {PublicKey} payerPubKey - The public key of the payer account.
 * @returns {Promise<number>} The balance of the SPL token.
 * @throws {Error} If no balance is found.
 */
export async function getSPLTokenBalance(tokenAccount:PublicKey) {
  const address = getAssociatedTokenAddressSync(tokenAccount, wallet.publicKey);
  const info = await connection.getTokenAccountBalance(address);
  if (info.value.uiAmount == null) throw new Error("No balance found");
  return info.value.uiAmount;
}