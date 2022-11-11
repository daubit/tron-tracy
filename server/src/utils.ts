import { tronWeb } from "./tronWeb";
import {
  Log,
  Pair,
  SwapEvent,
  SyncEvent,
  Token,
  Transaction,
  TxRawDataSmartContractParameterSmartContract,
} from "./types";

export function toBase58(address: string): string {
  if (tronWeb.utils.isHex(address)) {
    return tronWeb.address.fromHex(address);
  } else {
    return address;
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function filterTxToSmartContract(
  txs: Transaction[],
  contract_addresses: string[]
) {
  return txs
    .filter((x) => x.raw_data.contract[0].type === "TriggerSmartContract")
    .filter((x) =>
      contract_addresses.includes(
        (
          x.raw_data.contract[0].parameter
            .value as TxRawDataSmartContractParameterSmartContract
        ).contract_address
      )
    );
}

export function parseSwapLog(log: Log): SwapEvent | undefined {
  if (
    log.topics[0] !==
    "d78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"
  ) {
    return;
  }

  return {
    sender: `41${log.topics[1].slice(-40)}`,
    to: `41${log.topics[2].slice(-40)}`,
    amount0In: tronWeb.BigNumber(`0x${log.data.slice(0, 64)}`),
    amount1In: tronWeb.BigNumber(`0x${log.data.slice(64, 128)}`),
    amount0Out: tronWeb.BigNumber(`0x${log.data.slice(128, 192)}`),
    amount1Out: tronWeb.BigNumber(`0x${log.data.slice(192)}`),
  };
}

export function parseSyncLog(log: Log): SyncEvent | undefined {
  if (
    log.topics[0] !==
    "1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
  ) {
    return;
  }

  return {
    reserve0: tronWeb.BigNumber(`0x${log.data.slice(0, 64)}`),
    reserve1: tronWeb.BigNumber(`0x${log.data.slice(64, 128)}`),
  };
}

export function decodeSwapTxData(data: string) {
  const without_hash = data.substring(8);
  const words: string[] = [];
  const alignedLength = Math.ceil(without_hash.length / 64) * 64;
  for (let i = 0; i < alignedLength; i += 64) {
    words.push(without_hash.substring(i, i + 64));
  }
  return {
    amountIn: tronWeb.BigNumber(`0x${words[0]}`),
    amountOutMin: tronWeb.BigNumber(`0x${words[1]}`),
    to: words[3].slice(24),
    deadline: tronWeb.BigNumber(`0x${words[4]}`),
    path: words.slice(6).map((x) => x.slice(24)),
  };
}

import SunswapV2Factory from "./contracts/SunswapV2Factory.json";
import SocialswapFactory from "./contracts/SocialswapFactory.json";
import TestToken from "./contracts/TestToken.json";
import SunswapV2Pair from "./contracts/SunswapV2Pair.json";
import SocialswapPair from "./contracts/SocialswapPair.json";

export async function getSunPairs(): Promise<Pair[]> {
  const address = SunswapV2Factory.networks[9].address;
  const instance = await tronWeb.contract().at(address);
  const allPairsLength = await instance.allPairsLength().call();
  //console.log(`Fetching from ${allPairsLength} Pairs`);
  const pairs: Pair[] = [];
  for (let i = 0; i < allPairsLength; i++) {
    const pairAddress = await instance.allPairs(i).call();
    const pair = tronWeb.contract(SunswapV2Pair.abi, pairAddress);
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

export async function getSocialSwapPairs(): Promise<Pair[]> {
  const address = SocialswapFactory.networks[9].address;
  const instance = await tronWeb.contract().at(address);
  const allPairsLength = await instance.allPairsLength().call();
  //console.log(`Fetching from ${allPairsLength} Pairs`);
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
