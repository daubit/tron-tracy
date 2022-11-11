import { readFileSync, writeFileSync } from "fs";
import { Pool } from "./types";

export function savePool(pool: Pool) {
    const pools = JSON.parse(readFileSync("cache/pools.json", "utf-8")) as Pool[];
    pools.push(pool);
    writeFileSync("cache/pools.json", JSON.stringify(pools, null, 2));
}

export function addPools(pool: Pool[]) {
    const pools = JSON.parse(readFileSync("cache/pools.json", "utf-8")) as Pool[];
    pools.push(...pool);
    writeFileSync("cache/pools.json", JSON.stringify(pools, null, 2));
}

export function savePools(pools: Pool[]) {
    writeFileSync("cache/pools.json", JSON.stringify(pools, null, 2));
}

export function getPool(address: string) {
    console.log(`Get ${address} from cache...`)
    const pools = JSON.parse(readFileSync("cache/pools.json", "utf-8")) as Pool[];
    return pools.find(pool => pool.address === address);
}

export function getPools() {
    console.log(`Get pools from cache...`)
    const pools = JSON.parse(readFileSync("cache/pools.json", "utf-8")) as Pool[];
    return pools
}

export function hasPool(address: string) {
    const pools = JSON.parse(readFileSync("cache/pools.json", "utf-8")) as Pool[];
    return pools.find(pool => pool.address === address) !== undefined
}