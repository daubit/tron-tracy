import { PairSchema } from "./schema";
import { tronWeb } from "./tronWeb";
import { Block, Pair, Router, SyncEvent } from "./types";
import {
  decodeSwapTxData,
  filterTxToSmartContract,
  getSocialSwapPairs,
  getSunPairs,
  parseSwapLog,
  parseSyncLog,
  sleep,
} from "./utils";
import mongoose from "mongoose";
import axios from "axios";
import SocialswapRouter from "./contracts/SocialswapRouter.json";
import SunswapV2Router from "./contracts/SunswapV2Router02.json";
import SunswapV2Factory from "./contracts/SunswapV2Factory.json";
import SocialswapFactory from "./contracts/SocialswapFactory.json";

const conn = mongoose.createConnection("mongodb://localhost:27017");
const PairModel = conn.model("Pair", PairSchema);

function factoryFor(router: Router) {
  if (router === Router.Sun) {
    return tronWeb.contract(
      SunswapV2Factory.abi,
      SunswapV2Factory.networks[9].address
    );
  } else {
    return tronWeb.contract(
      SocialswapFactory.abi,
      SocialswapFactory.networks[9].address
    );
  }
}

function routerFrom(contract: string) {
  if (contract === SunswapV2Factory.networks[9].address) {
    return Router.Sun;
  } else {
    return Router.Social;
  }
}

async function updatePair(
  syncLog: SyncEvent,
  tx_params: {
    amountIn: any;
    amountOutMin: any;
    to: string;
    deadline: any;
    path: string[];
  },
  contract_address: string,
  block: Block
) {
  try {
    const sortedTokens = tx_params.path.sort();
    const factory = factoryFor(routerFrom(contract_address));
    const pair = await factory.getPair(sortedTokens[0], sortedTokens[1]).call();
    const q = await PairModel.findOne({
      address: pair.pair,
    });
    if (!q) {
      const model = new PairModel({
        lastUpdateAt: block.block_header.raw_data.number,
        address: pair.pair,
        tokenAReserve: syncLog.reserve0.toString(),
        tokenBReserve: syncLog.reserve1.toString(),
        tokenA: sortedTokens[0],
        tokenB: sortedTokens[1],
        router: routerFrom(contract_address),
        history: [],
      });
      await model.save();
    } else {
      q.history.push({
        updateAt: q.lastUpdateAt,
        tokenAReserve: q.tokenAReserve,
        tokenBReserve: q.tokenBReserve,
      });
      q.lastUpdateAt = block.block_header.raw_data.number;
      q.tokenAReserve = syncLog.reserve0.toString();
      q.tokenBReserve = syncLog.reserve1.toString();
      await q.save();
    }
  } catch (e) {
    console.log(e);
    return false;
  }
  return true;
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

        if (syncLog) {
          const success = await updatePair(
            syncLog,
            tx_params,
            //@ts-ignore
            tx.raw_data.contract[0].parameter.value.contract_address,
            block
          );
          if (!success) {
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
  }
}

async function initPairs() {
  const sunPairs: Pair[] = (await getSunPairs()).map((pair) => ({
    ...pair,
    router: Router.Sun,
  }));
  const socialPairs: Pair[] = (await getSocialSwapPairs()).map((pair) => ({
    ...pair,
    router: Router.Social,
  }));
  const pairs: Pair[] = [];
  pairs.push(...sunPairs);
  pairs.push(...socialPairs);
  const block: Block = await tronWeb.trx.getCurrentBlock();

  for (const pair of pairs) {
    const q = await PairModel.findOne({
      address: pair.address,
    }).countDocuments();
    if (q === 0) {
      const model = new PairModel({
        lastUpdateAt: block.block_header.raw_data.number,
        address: pair.address,
        tokenAReserve: pair.tokenAReserve,
        tokenBReserve: pair.tokenBReserve,
        tokenA: pair.tokenA?.address,
        tokenB: pair.tokenB?.address,
        router: pair.router,
        history: [],
      });
      await model.save();
    }
  }
}

async function main() {
  await initPairs();

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
