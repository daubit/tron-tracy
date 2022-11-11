const SunswapV2Adapter = artifacts.require("./SunswapV2Adapter.sol");
const SocialswapAdapter = artifacts.require("./SocialSwapAdapter.sol");
const SunswapV2Router02 = artifacts.require("./SunswapV2Router02.sol");
const SocialswapRouter = artifacts.require("./SocialswapRouter.sol")
const WTRX = artifacts.require("./WTRX.sol")

module.exports = async function (deployer) {
    deployer.deploy(SocialswapAdapter, SocialswapRouter.address, WTRX.address);
    deployer.deploy(SunswapV2Adapter, SunswapV2Router02.address, WTRX.address);
    
};