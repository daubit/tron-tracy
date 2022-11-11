import { BigNumber } from "ethers";

export interface Pairs {
  from: string[];
  to: string[];
}

export interface ContractResponse {
  constant_result: string[];
}

export interface Pool {
  address: string;
  token0: Token;
  token1: Token;
}

export interface SocialSwap {
  router: string[];
  factory: string[];
}

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  address?: string;
  amount?: number;
  owner?: string;
}

export enum Router {
  "Social",
  "Sun",
}
export interface Pair {
  address: string;
  tokenA?: Token;
  tokenB?: Token;
  tokenAReserve?: string;
  tokenBReserve?: string;
  router?: Router;
}

export interface Account {
  mnemonic: Mnemonic;
  privateKey: string;
  publicKey: string;
  address: string;
}

export interface Mnemonic {
  phrase: string;
  path: string;
  locale: string;
}

export interface Block {
  blockID: string;
  block_header: BlockHeader;
  transactions?: Transaction[];
}

export interface BlockHeader {
  raw_data: BlockData;
  witness_signature: string;
}

export interface BlockData {
  number: number;
  txTrieRoot: string;
  witness_address: string;
  parentHash: string;
  version: number;
  timestamp: number;
}

export interface Transaction {
  ret: any[];
  signature: any[];
  txID: string;
  raw_data: TxRawData;
  raw_data_hex: string;
}

export interface TxRawData {
  contract: TxRawDataContract[];
  ref_block_bytes: string;
  ref_block_hash: string;
  expiration: number;
  fee_limit: number;
  timestamp: number;
}

export interface TxRawDataContract {
  type: string;
  parameter: TxRawDataSmartContractParameter;
}

export interface TxRawDataSmartContractParameter {
  type_url: string;
  value:
    | TxRawDataSmartContractParameterTransfer
    | TxRawDataSmartContractParameterSmartContract;
}

export interface TxRawDataSmartContractParameterSmartContract {
  data: string;
  owner_address: string;
  contract_address: string;
}

export interface TxRawDataSmartContractParameterTransfer {
  amount: number;
  owner_address: string;
  to_address: string;
}

export interface ResourceInfo {
  freeNetLimit: number;
  NetLimit: number;
  assetNetUsed: KV[];
  assetNetLimit: KV[];
  TotalNetLimit: number;
  TotalNetWeight: number;
  tronPowerLimit: number;
  EnergyLimit: number;
  TotalEnergyLimit: number;
  TotalEnergyWeight: number;
}

export interface KV {
  key: string;
  value: number;
}

export type Resource = "ENERGY" | "BANDWIDTH";

export interface Log {
  address: string;
  topics: string[];
  data: string;
}

export interface SwapEvent {
  sender: string;
  to: string;
  amount0In: BigNumber;
  amount1In: BigNumber;
  amount0Out: BigNumber;
  amount1Out: BigNumber;
}

export interface SyncEvent {
  reserve0: BigNumber;
  reserve1: BigNumber;
}
