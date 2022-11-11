import tronWeb from "./tronWeb";
import { Block, Resource } from "../types";
import { decodeParams } from "./abi";
import axios from "axios";

export async function logError(e: any) {
    if (!e.output || !e.output.contractResult) return;
    try {
        const response = await decodeParams(["string"], e.output.contractResult[0], true)
        console.log(`LOG: ${response}`)
        return;
    } catch (e) {
        console.log("Not a string")
    }
    try {
        console.log(e.output.contractResult)
        const response = await decodeParams(["uint256"], e.output.contractResult[0], true)
        console.log(`LOG: ${response}`)
        return
    } catch (e) {
        console.log("Not a uint256")
    }
}

export async function getBlock() {
    return await tronWeb.fullNode.request("/wallet/getnowblock");
}

export async function getBlockNumber() {
    const block: Block = await getBlock();
    return block.block_header.raw_data.number;
}

export async function getResource(address: string) {
    if (address === "default" || !address) {
        address = tronWeb.defaultAddress.hex;
    } else if (!tronWeb.utils.isHex(address)) {
        address = tronWeb.address.toHex(address);
    }
    const res = await axios.post("http://127.0.0.1:9090/wallet/getaccountresource", { address });
    console.log(res.data)
}

export async function freezeBalance(address: string, amount: string, resource: Resource) {
    if (address === "default" || !address) {
        address = tronWeb.defaultAddress.hex;
    } else if (!tronWeb.utils.isHex(address)) {
        address = tronWeb.address.toHex(address);
    }

    const balance = parseInt(tronWeb.toSun(amount));
    console.log({ balance })
    const res = await axios.post("http://127.0.0.1:9090/wallet/freezebalance",
        {
            owner_address: address,
            frozen_balance: balance,
            frozen_duration: 3,
            resource: resource
        });
    console.log(res.data.raw_data)
}