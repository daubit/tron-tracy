import { getAccounts } from "./accounts";
import tronWeb from "./lib/tronWeb";
import { balanceOf, getTokens } from "./tokens";
import { Account, Pair, Router, Token } from "./types";

import TestToken from "../build/contracts/TestToken.json";

import SunswapV2Router from "../build/contracts/SunswapV2Router02.json";
import SunswapV2Pair from "../build/contracts/SunswapV2Pair.json";
import SunswapV2Factory from "../build/contracts/SunswapV2Factory.json";
import { getPairs as getSunPairs } from "./sunswap/pairs";

import SocialswapRouter from "../build/contracts/SocialswapRouter.json";
import SocialswapPair from "../build/contracts/SocialswapPair.json";
import SocialswapFactory from "../build/contracts/SocialswapFactory.json";
import { getPairs as getSocialPairs } from "./socialswap/pairs";
import { BigNumber } from "ethers";

/**
 *
 * await tronWeb.trx.getBalance(tracy.address);
 *
 */

function getRandomElementFromArray<T>(array: T[]): T {
  const randIndex = Math.floor(Math.random() * 1000 + 1) % array.length;
  return array[randIndex];
}

async function getBalanceOf(token: Token, address: string): Promise<BigNumber> {
  if (token.symbol === "WTRX") {
    return await tronWeb.trx.getBalance(address);
  } else {
    return await balanceOf(token.address!, address);
  }
}

async function swapTRX(pair: Pair, address: string) {
  if (pair.router === Router.Sun) {
  }
}

async function swap(
  pair: Pair,
  tokenIn: Token,
  account: Account,
  deadLine: number,
  minOut: BigNumber
) {
  console.log(pair);
  if (pair.router === Router.Sun) {
    console.log("sun router");
    const contract = tronWeb.contract(
      SunswapV2Router.abi,
      SunswapV2Router.networks[9].address
    );
    console.log(
      tokenIn.amount,
      0,
      [
        tokenIn.address,
        pair.tokenA.address === tokenIn.address
          ? pair.tokenB.address
          : pair.tokenA.address,
      ],
      account.address,
      deadLine
    );
    const result = await contract
      .swapExactTokensForTokens(
        tokenIn.amount,
        0,
        [
          tokenIn.address,
          pair.tokenA.address === tokenIn.address
            ? pair.tokenB.address
            : pair.tokenA.address,
        ],
        account.address,
        deadLine /* compares to block.timestamp */
      )
      .send({ shouldPollResponse: true });
    console.log(result);
  }
}

export async function trade() {
  const accounts = await getAccounts(1);
  const allTokens = await getTokens();
  const wtrx = allTokens.filter((token) => token.symbol === "WTRX")[0];
  const trc20Tokens = allTokens.filter((token) => token.symbol !== "WTRX");
  const sunRouter = tronWeb.contract(
    SunswapV2Router.abi,
    SunswapV2Router.networks[9].address
  );
  const sunPairs: Pair[] = (await getSunPairs()).map((pair) => ({
    ...pair,
    router: Router.Sun,
  }));
  const deadline = Date.now() + 1000 * 60 * 60;
  const tokenPair = sunPairs.find(
    (x) =>
      (x.tokenA.symbol === "T0" && x.tokenB.symbol === "T1") ||
      (x.tokenA.symbol === "T1" && x.tokenB.symbol === "T0")
  );
  const defaultAddress = tronWeb.defaultAddress.hex;
  const token = tronWeb.contract(TestToken.abi, tokenPair?.tokenB.address);
  const amount = BigNumber.from(tokenPair?.tokenBReserve).div(
    BigNumber.from("100")
  );
  await token.mint(defaultAddress, amount).send({
    feeLimit: 1e9,
    shouldPollResponse: true,
  });
  console.log("Minted for TokenB");
  await token.approve(SunswapV2Router.networks[9].address, amount).send({
    feeLimit: 1e9,
    shouldPollResponse: true,
  });
  console.log("Approved for Router");
  console.log(
    amount.toString(),
    0,
    [tokenPair?.tokenB.address, tokenPair?.tokenA.address],
    defaultAddress,
    deadline
  );
  const result = await sunRouter
    .swapExactTokensForTokens(
      amount,
      0,
      [tokenPair?.tokenB.address, tokenPair?.tokenA.address],
      defaultAddress,
      deadline
    )
    .send({ shouldPollResponse: true });
  console.log(result);

  /*await swap(
    sunPairs[0],
    {
      ...sunPairs[0].tokenA,
      amount: 1,
    },
    accounts[0],
    Date.now() + 1000 * 60 * 60,
    BigNumber.from("0")
  );*/
  /*const socialRouter = tronWeb.contract(SocialswapRouter.abi, SocialswapRouter.networks[9].address);
    const socialPairs = (await getSocialPairs()).map(pair => ({ ...pair, router: Router.Sun }));
    const allPairs: Pair[] = [...sunPairs, ...socialPairs];
    // Trading
    while (true) {
        const account = getRandomElementFromArray<Account>(accounts);

        let targetPair: Pair;;
        // Look for Swap Pair
        const pair = getRandomElementFromArray<Pair>(allPairs);
        const balanceTokenA = await getBalanceOf(pair.tokenA, account.address);
        const balanceTokenB = await getBalanceOf(pair.tokenB, account.address);
        // Lets look for a WTRX pair;
        if (balanceTokenA.isZero() && balanceTokenB.isZero()) {
            const wtrxPairs = allPairs.filter((pair) => pair.tokenA.symbol === "WTRX" || pair.tokenB.symbol === "WTRX");
            const wtrxPair = getRandomElementFromArray<Pair>(wtrxPairs);
            targetPair = wtrxPair;
        } else {
            targetPair = pair;
        }
        if (pair.tokenA.symbol === "WTRX" || pair.tokenB.symbol === "WTRX") {
            await swapTRX(pair, account.address)
        } else {
            await swap(pair, account.address)
        }
    }*/
}
