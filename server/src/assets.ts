import { readFileSync, writeFileSync } from "fs";
import { Token } from "./types";

type Assets = { [address: string]: Token };

export function saveAsset(token: Token) {
  const assets = JSON.parse(
    readFileSync("cache/assets.json", "utf-8")
  ) as Assets;
  assets[token.address ?? "token"] = token;
  writeFileSync("cache/assets.json", JSON.stringify(assets, null, 2));
}

export function getAsset(address: string) {
  console.log(`Get ${address} from cache...`);
  const assets = JSON.parse(
    readFileSync("cache/assets.json", "utf-8")
  ) as Assets;
  return assets[address];
}

export function hasAsset(address: string) {
  const assets = JSON.parse(
    readFileSync("cache/assets.json", "utf-8")
  ) as Assets;
  return assets[address] !== undefined;
}
