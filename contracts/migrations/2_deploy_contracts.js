const TronWeb = require("tronweb");
const SocialswapFactory = artifacts.require("./SocialswapFactory.sol");
const SunswapV2Factory = artifacts.require("./SunswapV2Factory.sol");
const TracyRouter = artifacts.require("./TracyRouter.sol");
const WTRX = artifacts.require("./WTRX.sol");

const tronWeb = new TronWeb(
  //"http://127.0.0.1:9090",
  //"http://127.0.0.1:9090",
  //"http://127.0.0.1:9090",
  //'da146374a75310b9666e834ee4ad0866d6f4035967bfc76217c5a495fff9f0d0',
  "https://api.nileex.io",
  "https://api.nileex.io",
  "https://api.nileex.io",
  "b05c3cc468b6e1683eae7f8609a01f9f3dcf43781da619da64a2d1e99febab9c"
);

module.exports = function (deployer) {
  deployer.deploy(SocialswapFactory, "TBNHtabNhJL1LRDQE4j8Ss72ikyNQWQuYu");
  deployer.deploy(SunswapV2Factory, "TBNHtabNhJL1LRDQE4j8Ss72ikyNQWQuYu");
  deployer.deploy(TracyRouter, "TBNHtabNhJL1LRDQE4j8Ss72ikyNQWQuYu");
  deployer.deploy(WTRX);
};
