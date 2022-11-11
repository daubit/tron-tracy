import tronWeb from "./lib/tronWeb";
import { logError } from "./lib/utils";
import Tracy from "../build/contracts/TracyRouter.json";
import ITracyRouter from "../build/contracts/ITracyRouter.json";

export async function approveRouter(
  adapterAddress: string,
  tokenAddress: string
) {
  const tracyAddress = Tracy.networks[9].address;
  const tracy = tronWeb.contract(Tracy.abi, tracyAddress);
  try {
    await tracy
      .approveRouter(adapterAddress, tokenAddress)
      .send({ shouldPollResponse: true });
  } catch (e: any) {
    logError(e);
    throw new Error(`approveRouter: ${e}`);
  }
}

export async function approve(tokenAddress: string) {
  const tracyAddress = Tracy.networks[9].address;
  const tracy = tronWeb.contract(Tracy.abi, tracyAddress);
  try {
    await tracy.approve(tokenAddress).send({ shouldPollResponse: true });
  } catch (e: any) {
    logError(e);
    throw new Error(`approve: ${e}`);
  }
}

export async function swapExactTokensForTokens(
  adapterAddress: string,
  amount: string,
  path: string[]
) {
  const adapter = tronWeb.contract(ITracyRouter.abi, adapterAddress);
  const { amounts } = await adapter.getAmountsOut(amount, path).call();
  const deadline = Date.now() + 1000 * 60 * 60;

  const tracyAddress = Tracy.networks[9].address;
  const tracy = tronWeb.contract(Tracy.abi, tracyAddress);
  const balanceA = await tracy.balanceIn(path[0]).call();
  console.log({
    adapterAddress,
    amount,
    path,
    tracyAddress,
    amounts: amounts.map((v) => v.toString()),
  });
  try {
    await tracy
      .swapExactTokensForTokens(
        adapterAddress,
        amount,
        amounts[amounts.length - 1],
        path,
        deadline
      )
      .send({ shouldPollResponse: true });
  } catch (e: any) {
    await logError(e);
    // throw new Error(`swapExactTokensForTokens: ${e.error}`);
  }
  const balanceAAfter = await tracy.balanceIn(path[0]).call();
  console.log(
    `Before: ${balanceA.toString()} TA\nAfter: ${balanceAAfter.toString()} TA`
  );
}
