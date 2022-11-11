import dotenv from "dotenv";
dotenv.config();

import { tronWeb } from "./tronWeb";
import SunswapV2Adapter from "./contracts/SunswapV2Adapter.json";
import SocialSwapAdapter from "./contracts/SocialSwapAdapter.json";
import SunswapV2Router from "./contracts/SunswapV2Router02.json";
import SocialswapRouter from "./contracts/SocialswapRouter.json";
import TestToken from "./contracts/TestToken.json";
import TracyRouter from "./contracts/TracyRouter.json";
import { Block, Pair, Router, SyncEvent } from "./types";
import axios from "axios";
import { Mutex } from "async-mutex";
import { BigNumber, utils } from "ethers";
import { uniq } from "lodash";
import {
  decodeSwapTxData,
  filterTxToSmartContract,
  getSocialSwapPairs,
  getSunPairs,
  parseSwapLog,
  parseSyncLog,
  sleep,
} from "./utils";

const Pairs: Pair[] = [];
const PairsMutex = new Mutex();

async function updatePair(
  syncLog: SyncEvent,
  tx_params: {
    amountIn: any;
    amountOutMin: any;
    to: string;
    deadline: any;
    path: string[];
  },
  contract_address: string
) {
  const release = await PairsMutex.acquire();
  try {
    // address can only be from sunswap or socialswap
    const router =
      contract_address === SunswapV2Router.networks[9].address
        ? Router.Sun
        : Router.Social;

    const index = Pairs.findIndex(
      (x) =>
        (x.tokenA!.symbol === "T0" && x.tokenB!.symbol === "T1") ||
        (x.tokenA!.symbol === "T1" && x.tokenB!.symbol === "T0")
    );
    if (index! - 1) {
      Pairs[index].tokenAReserve = syncLog.reserve0.toString();
      Pairs[index].tokenBReserve = syncLog.reserve1.toString();
    }
    return Pairs[index];
  } finally {
    release();
  }
}

async function processBlock(block: Block) {
  //console.log(`Processing Block ${block.block_header.raw_data.number}`);
  if (block.transactions) {
    const swapTxs = filterTxToSmartContract(block.transactions, [
      SunswapV2Router.networks[9].address,
      SocialswapRouter.networks[9].address,
    ]);

    const updates: Pair[] = [];
    for (const tx of swapTxs) {
      try {
        //await sleep(500);
        console.log(`tx: ${tx.txID}`);
        // i have no idea why but this call doesnt work with tronweb for some reason
        const raw_info = await axios.post(
          "http://127.0.0.1:9090/wallet/gettransactioninfobyid",
          { value: tx.txID }
        );
        const info = raw_info.data;
        const tx_params = decodeSwapTxData(
          //@ts-ignore
          tx.raw_data.contract[0].parameter.value.data
        );
        const swapLog_raw = info.log.find(
          (x) =>
            x.topics[0] ===
            "d78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"
        );
        const syncLog_raw = info.log.find(
          (x) =>
            x.topics[0] ===
            "1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
        );
        const swapLog = parseSwapLog(swapLog_raw);
        const syncLog = parseSyncLog(syncLog_raw);

        //console.log(`swapLog: ${JSON.stringify(swapLog)}`);
        //console.log(`syncLog: ${JSON.stringify(syncLog)}`);
        //console.log(`tx_params: ${JSON.stringify(tx_params)}`);

        if (syncLog) {
          const pair = await updatePair(
            syncLog,
            tx_params,
            //@ts-ignore
            tx.raw_data.contract[0].parameter.value.contract_address
          );
          if (pair) {
            updates.push(pair);
          } else {
            console.log(
              `No pair found for ${JSON.stringify(syncLog)} ${JSON.stringify(
                tx_params
                //@ts-ignore
              )} ${tx.raw_data.contract[0].parameter.value.contract_address}`
            );
          }
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (swapTxs.length > 0) {
      await lookForTradingOpportunity(updates);
    }
  }
}

async function lookForTradingOpportunity(updatedPairs: Pair[]) {
  console.log(`lookForTradingOpportunity in ${updatedPairs.length} tx`);
  for (const pair of updatedPairs) {
    const release = await PairsMutex.acquire();
    try {
      const otherRouter =
        pair.router === Router.Social ? Router.Sun : Router.Social;
      const correspondingPair = Pairs.find(
        (x) =>
          x.router === otherRouter &&
          ((x.tokenA!.symbol === pair.tokenA!.symbol &&
            x.tokenB!.symbol === pair.tokenB!.symbol) ||
            (x.tokenA!.symbol === pair.tokenB!.symbol &&
              x.tokenB!.symbol === pair.tokenA!.symbol))
      );
      if (correspondingPair) {
        const price = BigNumber.from(pair?.tokenAReserve)
          .pow(BigNumber.from(10).mul(pair.tokenA?.decimals ?? 0))
          .div(
            BigNumber.from(pair?.tokenBReserve).pow(
              BigNumber.from(10).mul(pair.tokenA?.decimals ?? 0)
            )
          );
        const otherPrice = BigNumber.from(correspondingPair?.tokenAReserve)
          .pow(BigNumber.from(10).mul(correspondingPair.tokenA?.decimals ?? 6))
          .div(
            BigNumber.from(correspondingPair?.tokenBReserve).pow(
              BigNumber.from(10).mul(correspondingPair.tokenB?.decimals ?? 6)
            )
          );
        // we want to trade from lower price to higher price
        const lowerPriceInOther = otherPrice.lt(price);
        console.log(
          `price ${price.toString()} otherPrice ${otherPrice.toString()}`
        );
        // do trade A -> B -> A
        await doTrade(
          lowerPriceInOther ? correspondingPair : pair,
          lowerPriceInOther ? pair : correspondingPair
        );
      } else {
        console.log(`No corresponding Pair for Pair ${JSON.stringify(pair)}`);
      }
    } catch (e) {
      console.log(e);
    } finally {
      release();
    }
  }
}

function getAmountOut(
  reserveOut: BigNumber,
  reserveIn: BigNumber,
  amountIn: BigNumber
) {
  const amountInWithFee = amountIn.mul(997);
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = reserveIn.mul(1000).add(amountInWithFee);
  return numerator.div(denominator);
}

function min(a: BigNumber, b: BigNumber) {
  if (a.lt(b)) {
    return a;
  }
  return b;
}

async function doTrade(inPair: Pair, outPair: Pair) {
  const amount = min(
    BigNumber.from(inPair.tokenAReserve),
    BigNumber.from(outPair.tokenAReserve)
  ).div(BigNumber.from(100));

  const trade1Out = getAmountOut(
    BigNumber.from(inPair.tokenBReserve),
    BigNumber.from(inPair.tokenAReserve),
    amount
  );
  const trade2Out = getAmountOut(
    BigNumber.from(outPair.tokenAReserve),
    BigNumber.from(outPair.tokenBReserve),
    trade1Out
  );
  console.log(
    `(amountIn ${amount.toString()} trade1Out ${trade1Out.toString()}) (trade2In ${trade1Out.toString()} trade2Out ${trade2Out.toString()})`
  );
  if (trade2Out.gt(amount)) {
    console.log(`Projected Profit: ${trade2Out.sub(amount).toString()}`);
    const returnToken = await executeTrades(
      amount,
      inPair,
      outPair,
      BigNumber.from(0),
      inPair.tokenA?.address ?? "",
      inPair.tokenB?.address ?? ""
    );
    console.log(`Real Profit ${returnToken.sub(amount).toString()}`);
  } else {
    console.log(
      `No profit in trade amountIn ${amount.toString()} ${trade2Out.toString()}`
    );
  }
}

async function executeTrades(
  amountIn: BigNumber,
  pairIn: Pair,
  pairOut: Pair,
  t1OutMin: BigNumber,
  tokenA: string,
  tokenB: string
) {
  const deadline = Date.now() + 1000 * 60 * 60;
  const tracyRouter = tronWeb.contract(
    TracyRouter.abi,
    TracyRouter.networks[9].address
  );

  /*console.log(
    routerFor(pairIn),
    amountIn.toString(),
    t1OutMin.toString(),
    [tokenA, tokenB],
    deadline
  );*/
  const result = await tracyRouter
    .swapExactTokensForTokens(
      routerFor(pairIn),
      amountIn,
      t1OutMin,
      [tokenA, tokenB],
      deadline
    )
    .send({ shouldPollResponse: true });
  //console.log(result);
  const t1OutReal = result.amounts[result.amounts.length - 1];
  const deadline2 = Date.now() + 1000 * 60 * 60;
  //console.log(routerFor(pairOut), t1OutReal, 0, [tokenB, tokenA], deadline2);
  const result2 = await tracyRouter
    .swapExactTokensForTokens(
      routerFor(pairOut),
      t1OutReal,
      BigNumber.from(0),
      [tokenB, tokenA],
      deadline2
    )
    .send({ shouldPollResponse: true });
  //console.log(result2);
  return result2.amounts[result2.amounts.length - 1];
}

function routerFor(pair: Pair) {
  if (pair.router === Router.Social) {
    return SocialSwapAdapter.networks[9].address;
  }
  return SunswapV2Adapter.networks[9].address;
}

function getRevertReason(result: string) {
  const isError = result.substring(0, 8) === "08c379a0";
  if (isError) {
    return utils.toUtf8String(`0x${result.substring(8 + 64 + 64)}`);
  }
  return "";
}

async function approveAll() {
  const tracyRouter = tronWeb.contract(
    TracyRouter.abi,
    TracyRouter.networks[9].address
  );
  const release = await PairsMutex.acquire();

  try {
    const sunTokens = uniq(
      Pairs.filter((x) => x.router === Router.Sun)
        .map((x) => [x.tokenA?.address, x.tokenB?.address])
        .flat()
    );
    const socialTokens = uniq(
      Pairs.filter((x) => x.router === Router.Social)
        .map((x) => [x.tokenA?.address, x.tokenB?.address])
        .flat()
    );
    for (const token of sunTokens) {
      //console.log(
      //  `Approving ${token} for SunSwap on ${SunswapV2Adapter.networks[9].address}`
      //);
      await tracyRouter
        .approveRouter(SunswapV2Adapter.networks[9].address, token)
        .send({ shouldPollResponse: true });
    }
    for (const token of socialTokens) {
      //console.log(
      //  `Approving ${token} for SocialSwap on ${SocialSwapAdapter.networks[9].address}`
      //);
      await tracyRouter
        .approveRouter(SocialSwapAdapter.networks[9].address, token)
        .send({ shouldPollResponse: true });
    }
  } catch (e: any) {
    console.log(e);
    console.log(getRevertReason(e.output.contractResult[0]));
  } finally {
    release();
  }
}

async function main() {
  const tokenA = tronWeb.contract(
    TestToken.abi,
    "41a8de7bc62ca126cbc2160472368b53a1f840990b"
  );
  const tokenB = tronWeb.contract(
    TestToken.abi,
    "41531d9b3428095df8e225677d89fedfcbd7b6b993"
  );
  try {
    await tokenA
      .mint(TracyRouter.networks[9].address, BigNumber.from(55000000000))
      .send({
        feeLimit: 1e9,
        shouldPollResponse: true,
      });
    await tokenB
      .mint(TracyRouter.networks[9].address, BigNumber.from(55000000000))
      .send({
        feeLimit: 1e9,
        shouldPollResponse: true,
      });
  } catch (e: any) {
    console.log(e);
    getRevertReason(e);
  }

  const sunPairs: Pair[] = (await getSunPairs()).map((pair) => ({
    ...pair,
    router: Router.Sun,
  }));
  const socialPairs: Pair[] = (await getSocialSwapPairs()).map((pair) => ({
    ...pair,
    router: Router.Social,
  }));
  const release = await PairsMutex.acquire();
  try {
    Pairs.push(...sunPairs);
    Pairs.push(...socialPairs);
  } finally {
    release();
  }

  await approveAll();

  let last_block = 0;
  while (true) {
    const block: Block = await tronWeb.trx.getCurrentBlock();
    if (last_block < block.block_header.raw_data.number) {
      last_block = block.block_header.raw_data.number;
      processBlock(block);
    }
    await sleep(1500);
  }
}

main()
  .then(() => process.exit())
  .catch((e) => {
    console.log(e);
    process.exit();
  });
