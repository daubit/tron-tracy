import tronWeb from "../lib/tronWeb";
import SunswapV2Factory from "../../build/contracts/SunswapV2Factory.json";

export async function getFactory() {
  const token = await tronWeb.contract(
    SunswapV2Factory.abi,
    SunswapV2Factory.networks[9].address
  );
  const feeTo = await token.feeTo().call();
  const balance = await token.allPairsLength().call();
  console.log(`${tronWeb.address.fromHex(feeTo)} receives fees!`);
  console.log(`Factory holds ${balance} Pairs`);
}
