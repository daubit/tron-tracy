import { Token } from "./types";
import { logError } from "./lib/utils";
import { readFileSync, writeFileSync } from "fs";
import tronWeb from "./lib/tronWeb";
import WTRX from "../build/contracts/WTRX.json";
import TestToken from "../build/contracts/TestToken.json";

export async function getTokens(): Promise<Token[]> {
  try {
    const tokens: Token[] = JSON.parse(
      readFileSync("logs/tokens.json", "utf8")
    );
    for (const token of tokens) {
      const { address } = token;
      const Token = tronWeb.contract(TestToken.abi, address);
      const owner = await Token.owner().call();
      token.owner = owner;
    }
    const wtrxAddress = WTRX.networks[9].address;
    const wtrx = tronWeb.contract(WTRX.abi, wtrxAddress);
    const wtrxName = await wtrx.name().call();
    const wtrxSymbol = await wtrx.symbol().call();
    const wtrxDecimals = await wtrx.decimals().call();
    tokens.push({
      address: wtrxAddress,
      name: wtrxName,
      decimals: wtrxDecimals,
      symbol: wtrxSymbol,
    });
    return tokens.map((token) => ({
      ...token,
      address: tronWeb.address.fromHex(token.address),
      owner: tronWeb.address.fromHex(token.owner),
    }));
  } catch (e) {
    console.log(e);
    return new Promise((r) => []);
  }
}

export async function getToken(tokenAddress: string) {
  const token = await tronWeb.contract(TestToken.abi, tokenAddress);
  const name = await token.name().call();
  const symbol = await token.symbol().call();
  const decimals = await token.decimals().call();
  return { name, symbol, decimals };
}

function generateTokens(amount: number = 2) {
  const tokens: Token[] = [];
  for (let i = 0; i < amount; i++) {
    const name = `Token${i}`;
    const symbol = `T${i}`;
    const decimals = 6;
    const amount = Math.floor(Math.random() * 100 + 1) * 1e9;
    tokens.push({ name, symbol, decimals, amount });
  }
  return tokens;
}

export async function createTokens(amount: number) {
  const tokens = generateTokens(amount);
  for (const token of tokens) {
    const { name, symbol, decimals, amount } = token;
    try {
      const contract = await tronWeb.contract().new({
        abi: TestToken.abi,
        bytecode: TestToken.bytecode,
        feeLimit: 1e9, // Set fee limit
        userFeePercentage: 50,
        originEnergyLimit: 1e7,
        from: tronWeb.defaultAddress.hex,
        parameters: [name, symbol, decimals, amount],
      });
      token.address = contract.address;
    } catch (e: any) {
      throw new Error(e);
    }
  }
  writeFileSync(`logs/tokens.json`, JSON.stringify(tokens, null, 2), "utf-8");
  console.log(`Deployed Tokens!\n${JSON.stringify(tokens, null, 2)}`);
}

export async function mint(tokenAddress: string, to: string, amount: string) {
  const token = tronWeb.contract(TestToken.abi, tokenAddress);
  try {
    await token.mint(to, amount).send({ shouldPollResponse: true });
  } catch (e: any) {
    logError(e);
    throw new Error("TestToken: MINT_ERROR");
  }
}

export async function balanceOf(tokenAddress: string, address: string) {
  const token = tronWeb.contract(TestToken.abi, tokenAddress);
  try {
    return await token.balanceOf(address).call();
  } catch (e: any) {
    logError(e);
    throw new Error("TestToken: BALANCE_OFF_ERROR");
  }
}

export async function allowance(
  tokenAddress: string,
  owner: string,
  spender: string
) {
  const token = tronWeb.contract(TestToken.abi, tokenAddress);
  const allowance = await token.allowance(owner, spender).call();
  return allowance;
}
