const SocialswapRouter = artifacts.require("./SocialswapRouter.sol")
const SocialswapFactory = artifacts.require("./SocialswapFactory.sol")
const SunswapV2Router02 = artifacts.require("./SunswapV2Router02.sol")
const SunswapV2Factory = artifacts.require("./SunswapV2Factory.sol")
const WTRX = artifacts.require("./WTRX.sol")

module.exports = function (deployer) {
    deployer.deploy(SocialswapRouter, SocialswapFactory.address, WTRX.address);
    deployer.deploy(SunswapV2Router02, SunswapV2Factory.address, WTRX.address)
};