import tronWeb from "../lib/tronWeb";
import TestToken from "../../build/contracts/TestToken.json";
import SocialswapPair from "../../build/contracts/SocialswapPair.json";
import SocialswapRouter from "../../build/contracts/SocialswapRouter.json";
import SocialswapFactory from "../../build/contracts/SocialswapFactory.json";
import { logError } from "../lib/utils";
import { Pair, Token } from "../types";
import { getToken, getTokens } from "../tokens";

/**
 * getPairs() returns every address deployed with the TokenFactory contract
 *
 * @returns Promise<string[]> : Array of tron addresses in base58 format
 */
export async function getPairs(): Promise<Pair[]> {
  const address = SocialswapFactory.networks[3].address;
  const instance = await tronWeb.contract().at(address);
  const allPairsLength = await instance.allPairsLength().call();
  console.log(`Fetching from ${allPairsLength} Pairs`);
  const pairs: Pair[] = [];
  for (let i = 0; i < allPairsLength; i++) {
    const pairAddress = await instance.allPairs(i).call();
    const pair = tronWeb.contract(SocialswapPair.abi, pairAddress);
    const token0Address = await pair.token0().call();
    const token1Address = await pair.token1().call();
    const token0 = tronWeb.contract(TestToken.abi, token0Address);
    const token1 = tronWeb.contract(TestToken.abi, token1Address);
    const token0Name = await token0.name().call();
    const token0Symbol = await token0.symbol().call();
    const token0Decimals = await token0.decimals().call();
    const token1Name = await token1.name().call();
    const token1Symbol = await token1.symbol().call();
    const token1Decimals = await token1.decimals().call();
    const tokenA: Token = {
      address: token0Address,
      name: token0Name,
      decimals: token0Decimals,
      symbol: token0Symbol,
    };
    const tokenB: Token = {
      address: token1Address,
      name: token1Name,
      decimals: token1Decimals,
      symbol: token1Symbol,
    };
    const reserves = await pair.getReserves().call();
    const tokenAReserve = reserves[0].toString();
    const tokenBReserve = reserves[1].toString();
    pairs.push({
      address: pairAddress,
      tokenA,
      tokenB,
      tokenAReserve,
      tokenBReserve,
    });
  }
  return pairs;
}

export async function createPairs() {
  const address = SocialswapFactory.networks[3].address;
  let factory;
  try {
    factory = await tronWeb.contract().at(address);
  } catch (e: any) {
    console.error("No factory found!");
    throw new Error(e);
  }
  const tokens: Token[] = await getTokens();
  if (tokens.length < 2) {
    throw new Error("Need at least two tokens");
  }
  for (let i = 0; i < tokens.length; i++) {
    const { address: tokenAAddress, symbol: symbolA } = tokens[i];
    const { address: tokenBAddress, symbol: symbolB } =
      tokens[(i + 1) % tokens.length];
    console.log(`Creating pair ${symbolA}/${symbolB}`);
    try {
      await factory.createPair(tokenAAddress, tokenBAddress).send({
        feeLimit: 1e9,
        shouldPollResponse: true,
      });
    } catch (e) {
      logError(e);
    }
  }
  const allPairsLength = await factory.allPairsLength().call();
  console.log(`Created ${allPairsLength} Pairs`);
}

export async function fillPairs() {
  const pairs = await getPairs();
  for (const pair of pairs) {
    const { tokenA, tokenB } = pair;
    const amount = Math.floor(Math.random() * 100) * 1e9;
    if (!tokenA.address || !tokenB.address) {
      throw new Error("No address found!");
    }
    if (tokenA.symbol === "WTRX" || tokenB.symbol === "WTRX") {
      await addLiquidityTRX(tokenA.symbol === "WTRX" ? tokenB : tokenA, amount);
    } else {
      await addLiquidity(tokenA, tokenB, amount);
    }
  }
}

async function addLiquidity(tokenA: Token, tokenB: Token, amount: number) {
  const routerAddress = SocialswapRouter.networks[3].address;
  const defaultAddress = tronWeb.defaultAddress.hex;

  try {
    const token = tronWeb.contract(TestToken.abi, tokenA.address);
    await token.mint(defaultAddress, amount).send({
      feeLimit: 1e9,
      shouldPollResponse: true,
    });
    console.log("Minted for TokenA");
    await token.approve(routerAddress, amount).send({
      feeLimit: 1e9,
      shouldPollResponse: true,
    });
    console.log("Approved for Router");
  } catch (e: any) {
    throw new Error(`mint tokenA: ${e.error}`);
  }
  try {
    const token = tronWeb.contract(TestToken.abi, tokenB.address);
    await token.mint(defaultAddress, amount).send({
      feeLimit: 1e9,
      shouldPollResponse: true,
    });
    console.log("Minted for TokenB");
    await token.approve(routerAddress, amount).send({
      feeLimit: 1e9,
      shouldPollResponse: true,
    });
    console.log("Approved for Router");
  } catch (e: any) {
    throw new Error(`mint tokenB: ${e.error}`);
  }
  const deadline = Date.now() + 1000 * 60 * 60;
  const router = tronWeb.contract(SocialswapRouter.abi, routerAddress);
  console.log(`Filling up ${amount} till ${new Date(deadline)}`);
  try {
    await router
      .addLiquidity(
        tokenA.address,
        tokenB.address,
        amount, // desired amount
        amount, // desired amount
        amount, // min amount
        amount, // min amount
        defaultAddress,
        deadline
      )
      .send({
        feeLimit: 1e9,
        shouldPollResponse: true,
      });
    console.log(`Filled Pair ${tokenA.symbol}/${tokenB.symbol}\n`);
  } catch (e: any) {
    logError(e);
    throw new Error(`addLiquidity: ${e.error}`);
  }
}

async function addLiquidityTRX(token: Token, amount: number) {
  const routerAddress = SocialswapRouter.networks[3].address;
  const defaultAddress = tronWeb.defaultAddress.hex;

  try {
    const tokenContract = tronWeb.contract(TestToken.abi, token.address);
    await tokenContract.mint(defaultAddress, amount).send({
      feeLimit: 1e9,
      shouldPollResponse: true,
    });
    console.log("Minted for Token");
    await tokenContract.approve(routerAddress, amount).send({
      feeLimit: 1e9,
      shouldPollResponse: true,
    });
    console.log("Approved for Router");
  } catch (e: any) {
    throw new Error(`mint token: ${e.error}`);
  }
  const deadline = Date.now() + 1000 * 60 * 60;
  const router = tronWeb.contract(SocialswapRouter.abi, routerAddress);
  console.log(`Filling up ${amount} till ${new Date(deadline)}`);
  try {
    await router
      .addLiquidityTRX(
        token.address,
        amount, // desired amount token
        amount, // min amount token
        amount, // min amount trx
        defaultAddress,
        deadline
      )
      .send({
        shouldPollResponse: true,
        from: defaultAddress,
        callValue: amount,
      });
    console.log(`Filled Pair WTRX/${token.symbol}\n`);
  } catch (e: any) {
    logError(e);
    throw new Error(`addLiquidity: ${e.error}`);
  }
}

export async function getAmountsOut(amount: string, tokenPath: string[]) {
  const tokenAmount = tokenPath.length;
  const routerAddress = SocialswapRouter.networks[3].address;
  const router = tronWeb.contract(SocialswapRouter.abi, routerAddress);
  const tokens = await Promise.all(tokenPath.map((token) => getToken(token)));
  const res = await router.getAmountsOut(amount, tokenPath).call();
  const out = res.amounts[tokenAmount - 1].toString();
  console.log(
    `Swapping for ${amount} ${tokens[0].symbol}\nReceiving ${out} ${
      tokens[tokenAmount - 1].symbol
    }`
  );
}

export async function getAmountsIn(amount: string, tokenPath: string[]) {
  const tokenAmount = tokenPath.length;
  const routerAddress = SocialswapRouter.networks[3].address;
  const router = tronWeb.contract(SocialswapRouter.abi, routerAddress);
  const tokens = await Promise.all(tokenPath.map((token) => getToken(token)));
  const res = await router.getAmountsIn(amount, tokenPath).call();
  const out = res.amounts[0].toString();
  console.log(
    `Swapping for ${amount} ${
      tokens[tokenAmount - 1].symbol
    }\nReceiving ${out} ${tokens[0].symbol}`
  );
}
