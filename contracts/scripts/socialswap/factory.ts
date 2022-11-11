import tronWeb from "../lib/tronWeb";
import SocialswapFactory from "../../build/contracts/SocialswapFactory.json";

export async function getFactory() {
  const token = await tronWeb.contract(
    SocialswapFactory.abi,
    SocialswapFactory.networks[3].address
  );
  const feeTo = await token.feeTo().call();
  const balance = await token.allPairsLength().call();
  console.log(`${tronWeb.address.fromHex(feeTo)} receives fees!`);
  console.log(`Factory holds ${balance} Pairs`);
}
