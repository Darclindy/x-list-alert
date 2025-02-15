import { PublicKey, Connection } from "@solana/web3.js";
import {
  config
} from "../../config/config";

const connection = new Connection(config.solana.main_endpoint, "confirmed");

export async function getDecimals(mintAddress: PublicKey): Promise<number> {
  const info: any = await connection.getParsedAccountInfo(mintAddress);
  const result = (info.value?.data).parsed.info.decimals || 0;
  return result;
}