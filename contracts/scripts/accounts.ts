import { Account } from "./types";
import dotenv from "dotenv";
import tronWeb from "./lib/tronWeb";
dotenv.config();

export async function getAccounts(n: number = 10) {
  const { mnemonic, hdPath } = await tronWeb.fullNode.request(
    "/admin/accounts-json"
  );
  console.log(await tronWeb.fullNode.request("/admin/accounts-json"));
  const accounts: Account[] = [];
  for (let i = 0; i < n; i++) {
    const path = `${hdPath}${i}`;
    console.log(path);
    console.log(mnemonic);
    const account = tronWeb.fromMnemonic(mnemonic, path);
    accounts.push(account);
  }
  return accounts;
}
