import { logError } from "./lib/utils";
import tronWeb from "./lib/tronWeb";
import TracyRouter from "../build/contracts/TracyRouter.json";
import SunswapV2Adapter from "../build/contracts/SunswapV2Adapter.json";
import SocialswapAdapter from "../build/contracts/SocialswapAdapter.json";
import { utils } from "ethers";

function getRevertReason(result: string) {
  const isError = result.substring(0, 8) === "08c379a0";
  if (isError) {
    return utils.toUtf8String(`0x${result.substring(8 + 64 + 64)}`);
  }
  return "";
}

export async function addAdapters() {
  const socialAddress = SocialswapAdapter.networks[9].address;
  const sunAddress = SunswapV2Adapter.networks[9].address;
  const tracy = tronWeb.contract(
    TracyRouter.abi,
    TracyRouter.networks[9].address
  );
  try {
    console.log(`add sun adapter from ${sunAddress}`);
    const result2 = await tracy
      .addRouter(sunAddress)
      .send({ shouldPollResponse: true });

    console.log(`add social adapter from ${socialAddress}`);
    const result = await tracy
      .addRouter(socialAddress)
      .send({ shouldPollResponse: true });
  } catch (e: any) {
    console.log(e);
    logError(e);
  }
}
