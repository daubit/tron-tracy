import { getAccounts } from "./accounts";
import tronWeb from "./lib/tronWeb";
import { balanceOf, getTokens } from "./tokens";
import { Account, Pair, Router, Token } from "./types";

import TestToken from "../build/contracts/TestToken.json";

import TracyRouter from "../build/contracts/TracyRouter.json";
import SunswapV2Router from "../build/contracts/SunswapV2Router02.json";
import SunswapV2Pair from "../build/contracts/SunswapV2Pair.json";
import SunswapV2Factory from "../build/contracts/SunswapV2Factory.json";
import { getPairs as getSunPairs } from "./sunswap/pairs";

import SocialswapRouter from "../build/contracts/SocialswapRouter.json";
import SocialswapPair from "../build/contracts/SocialswapPair.json";
import SocialswapFactory from "../build/contracts/SocialswapFactory.json";
import { getPairs as getSocialPairs } from "./socialswap/pairs";
import { BigNumber, utils } from "ethers";
import SunswapV2Adapter from "../build/contracts/SunswapV2Adapter.json";
import SocialswapAdapter from "../build/contracts/SocialswapAdapter.json";

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

function getRevertReason(result: string) {
  const isError = result.substring(0, 8) === "08c379a0";
  if (isError) {
    return utils.toUtf8String(`0x${result.substring(8 + 64 + 64)}`);
  }
  return "";
}

export async function tradeTracy() {
  console.log(
    getRevertReason(
      "08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000195472616379526f757465723a20554e5245474953544552454400000000000000"
    )
  );
  const accounts = await getAccounts(1);
  const allTokens = await getTokens();
  const wtrx = allTokens.filter((token) => token.symbol === "WTRX")[0];
  const trc20Tokens = allTokens.filter((token) => token.symbol !== "WTRX");
  const tracyRouter = tronWeb.contract(
    TracyRouter.abi,
    TracyRouter.networks[9].address
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
  await token.mint(TracyRouter.networks[9].address, amount).send({
    feeLimit: 1e9,
    shouldPollResponse: true,
  });
  console.log("Minted for TokenB");
  console.log(
    SunswapV2Adapter.networks[9].address,
    amount,
    0,
    [tokenPair?.tokenB.address, tokenPair?.tokenA.address],
    deadline
  );
  try {
    const result1 = await tracyRouter
      .approveRouter(
        SunswapV2Adapter.networks[9].address,
        tokenPair?.tokenB.address
      )
      .send({ shouldPollResponse: true });
    console.log(result1);
    console.log("Approved Router");
    const result2 = await tracyRouter
      .swapExactTokensForTokens(
        SunswapV2Adapter.networks[9].address,
        amount,
        0,
        [tokenPair?.tokenB.address, tokenPair?.tokenA.address],
        deadline
      )
      .send({ shouldPollResponse: true });
    console.log(result2);
  } catch (e: any) {
    console.log(e);
    console.log(getRevertReason(e.output.contractResult[0]));
  }
}
