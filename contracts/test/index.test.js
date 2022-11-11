const { BigNumber } = require("ethers");
const TronWeb = require("tronweb");

const TracyRouter = artifacts.require("./TracyRouter.sol");
const TestToken = artifacts.require("./TestToken.sol")
const WTRX = artifacts.require("./WTRX.sol")

const SocialswapFactory = artifacts.require("./SocialswapFactory.sol")
const SocialswapRouter = artifacts.require("./SocialswapRouter.sol")
const SocialswapAdapter = artifacts.require("./SocialswapAdapter.sol");

const SunswapV2Factory = artifacts.require("./SunswapV2Factory.sol")
const SunswapV2Router = artifacts.require("./SunswapV2Router02.sol")
const SunswapV2Pair = artifacts.require("./SunswapV2Pair.sol")
const SunswapV2Adapter = artifacts.require("./SunswapV2Adapter.sol");

const logError = require("./lib/utils.js");

const DECIMALS = 6;

const UINT256_MAX = BigNumber.from(2).pow(256).sub(1);

const getTokenAmount = (amount, decimals) => BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals))

const tronWeb = new TronWeb(
    "http://127.0.0.1:9090",
    "http://127.0.0.1:9090",
    "http://127.0.0.1:9090",
    'da146374a75310b9666e834ee4ad0866d6f4035967bfc76217c5a495fff9f0d0',
)

contract('TracyRouter', (accounts) => {
    let tracy;
    let sun;
    let social;

    let sunFactory;
    let sunRouter;
    let socialFactory;
    let socialRouter;

    let tokenA;
    let tokenB;
    let wtrx;
    const admin = tronWeb.defaultAddress.hex;
    before(async () => {

        // Adapter
        sun = await SunswapV2Adapter.deployed();
        social = await SocialswapAdapter.deployed();

        // Dex
        sunFactory = await SunswapV2Factory.deployed();
        sunRouter = await SunswapV2Router.deployed();
        socialFactory = await SocialswapFactory.deployed();
        socialRouter = await SocialswapRouter.deployed();

        // Tracy
        tracy = await TracyRouter.deployed();
        await tracy.addRouter(SocialswapAdapter.address, { from: tronWeb.defaultAddress.hex });
        await tracy.addRouter(SunswapV2Adapter.address, { from: tronWeb.defaultAddress.hex });

        // Tokens
        tokenA = await tronWeb.contract().new({
            abi: TestToken.abi,
            bytecode: TestToken.bytecode,
            from: tronWeb.defaultAddress.hex,
            parameters: ["TokenA", "TA", DECIMALS, 0]
        })
        tokenB = await tronWeb.contract().new({
            abi: TestToken.abi,
            bytecode: TestToken.bytecode,
            from: tronWeb.defaultAddress.hex,
            parameters: ["TokenB", "TB", DECIMALS, 0]
        })
        await tokenA.mint(tracy.address, getTokenAmount(10000, DECIMALS)).send();
        await tokenB.mint(tracy.address, getTokenAmount(10000, DECIMALS)).send();
        wtrx = await tronWeb.contract(WTRX.abi, (await WTRX.deployed()).address);
    })
    describe("Setup", async () => {
        it("should have registered socialswap", async () => {
            const isRegistered = await tracy.registered(SocialswapAdapter.address);
            assert.isTrue(isRegistered);

        });
        it("should have registered sunswap", async () => {
            const isRegistered = await tracy.registered(SunswapV2Adapter.address);
            assert.isTrue(isRegistered);
        });
        it("should create a pair TA/TB for socialswap", async () => {
            await socialFactory.createPair(tokenA.address, tokenB.address);
            const res = await socialFactory.getPair(tokenA.address, tokenB.address);
            assert.isTrue(tronWeb.isAddress(res.pair))
        })
        it("should create a pair WTRX/TB for socialswap", async () => {
            await socialFactory.createPair(wtrx.address, tokenB.address);
            const res = await socialFactory.getPair(wtrx.address, tokenB.address);
            assert.isTrue(tronWeb.isAddress(res.pair))
        })
        it("should create a pair TA/TB for sunswap", async () => {
            await sunFactory.createPair(tokenA.address, tokenB.address);
            const pair = await sunFactory.getPair(tokenA.address, tokenB.address);
            assert.isTrue(tronWeb.isAddress(pair))
        })
        it("should create a pair WTRX/TB for sunswap", async () => {
            await sunFactory.createPair(wtrx.address, tokenB.address);
            const pair = await sunFactory.getPair(wtrx.address, tokenB.address);
            assert.isTrue(tronWeb.isAddress(pair))
        })
        it("should have filled pair TA/TB for socialswap", async () => {
            const amount = getTokenAmount(100000, DECIMALS);
            await tokenA.mint(admin, amount).send();
            await tokenA.approve(socialRouter.address, amount).send();
            await tokenB.mint(admin, amount).send();
            await tokenB.approve(socialRouter.address, amount).send();
            const deadline = Date.now() + 1000 * 60 * 60;
            await socialRouter
                .addLiquidity(
                    tokenA.address,
                    tokenB.address,
                    amount, // desired amount A
                    amount, // desired amount B
                    amount, // min amount A 
                    amount, // min amount B
                    admin,
                    deadline,
                    { from: admin }
                );
            const pair = await socialRouter.getPair(admin, tokenA.address, tokenB.address);
            const res = await socialFactory.getPair(tokenA.address, tokenB.address);
            assert.equal(pair.reserveA.toString(), amount.toString());
            assert.equal(pair.reserveB.toString(), amount.toString());
            assert.equal(res.pair, pair.pair);

        })
        it("should have filled pair WTRX/TB for socialswap", async () => {
            const amount = getTokenAmount(10, DECIMALS);
            await tokenB.mint(admin, amount).send();
            const socialRouterWrapper = tronWeb.contract(SocialswapRouter.abi, socialRouter.address);
            await tokenB.approve(socialRouter.address, amount).send();
            const deadline = Date.now() + 1000 * 60 * 60;
            try {

                await socialRouterWrapper
                    .addLiquidityTRX(
                        tokenB.address,
                        amount, // desired amount B
                        amount, // min amount B
                        amount, // min wtrx
                        admin,
                        deadline,
                    ).send({
                        shouldPollResponse: true,
                        from: admin,
                        callValue: amount,
                        feeLimit: 1e9,
                    });
            } catch (e) {
                await logError(e);
            }
            const pair = await socialRouter.getPair(admin, wtrx.address, tokenB.address);
            const res = await socialFactory.getPair(wtrx.address, tokenB.address);
            assert.equal(res.pair, pair.pair);
            assert.equal(pair.reserveA.toString(), amount.toString());
            assert.equal(pair.reserveB.toString(), amount.toString());
        })
        it("should have filled pair TA/TB for sunswap", async () => {
            const amount = getTokenAmount(100000, DECIMALS);
            await tokenA.mint(admin, amount).send();
            await tokenA.approve(sunRouter.address, amount).send();
            await tokenB.mint(admin, amount).send();
            await tokenB.approve(sunRouter.address, amount).send();
            const deadline = Date.now() + 1000 * 60 * 60;
            await sunRouter
                .addLiquidity(
                    tokenA.address,
                    tokenB.address,
                    amount, // desired amount A
                    amount, // desired amount B
                    amount, // min amount A 
                    amount, // min amount B
                    admin,
                    deadline,
                    { from: admin }
                );
            const pairAddress = await sunFactory.allPairs(0);
            const sunPair = tronWeb.contract(SunswapV2Pair.abi, pairAddress);
            const pair = await sunPair.getReserves().call();
            assert.equal(pair._reserve0.toString(), amount.toString());
            assert.equal(pair._reserve1.toString(), amount.toString());

        })
        it("should have filled pair WTRX/TB for sunswap", async () => {
            const amount = getTokenAmount(10, DECIMALS);
            await tokenB.mint(admin, amount).send();
            const sunRouterWrapper = tronWeb.contract(SunswapV2Router.abi, sunRouter.address);
            await tokenB.approve(sunRouter.address, amount).send();
            const deadline = Date.now() + 1000 * 60 * 60;
            try {

                await sunRouterWrapper
                    .addLiquidityETH(
                        tokenB.address,
                        amount, // desired amount B
                        amount, // min amount B
                        amount, // min wtrx
                        admin,
                        deadline,
                    ).send({
                        shouldPollResponse: true,
                        from: admin,
                        callValue: amount,
                        feeLimit: 1e9,
                    });
            } catch (e) {
                await logError(e);
            }
            const pairAddress = await sunFactory.getPair(wtrx.address, tokenB.address)
            const sunPair = tronWeb.contract(SunswapV2Pair.abi, pairAddress);
            const pair = await sunPair.getReserves().call();
            assert.equal(pair._reserve0.toString(), amount.toString());
            assert.equal(pair._reserve1.toString(), amount.toString());
        })
        it("should have accounts with tokens", async () => {
            const balanceATracy = await tracy.balanceIn(tokenA.address);
            const balanceBTracy = await tracy.balanceIn(tokenB.address);
            assert.equal(balanceATracy.toString(), getTokenAmount(10000, DECIMALS).toString());
            assert.equal(balanceBTracy.toString(), getTokenAmount(10000, DECIMALS).toString());
        });
        it("should have filled tracy with trx", async () => {
            const amount = getTokenAmount(100, DECIMALS);
            await tronWeb.trx.sendTransaction(tracy.address, amount.toString(), tronWeb.defaultPrivateKey);
            let balanceTracy;
            // Waiting for confirmation
            let retry = 0;
            while ((balanceTracy = (await tronWeb.trx.getBalance(tracy.address))) === 0 && retry++ < 10) {
                await new Promise((e) => setTimeout(e, 1000))
            }
            if (retry === 10) console.log("Reached maximum retries!");
            assert.equal(balanceTracy.toString(), amount.toString());
        })
    })
    describe("Swap", async () => {
        describe("Approval", async () => {
            it("should have tokenA approval for admin", async () => {
                await tracy.approve(tokenA.address, { from: admin });
                const allowance = await tokenA.allowance(tracy.address, admin).call();
                assert.equal(allowance.toString(), UINT256_MAX.toString())
            });
            it("should have tokenB approval for admin", async () => {
                await tracy.approve(tokenB.address, { from: admin });
                const allowance = await tokenB.allowance(tracy.address, admin).call();
                assert.equal(allowance.toString(), UINT256_MAX.toString())
            });
            it("should have router approval for socialswap router", async () => {
                await tracy.approveRouter(social.address, tokenA.address, { from: admin });
                const allowance = await tokenA.allowance(social.address, socialRouter.address).call();
                assert.equal(allowance.toString(), UINT256_MAX.toString())
            });
            it("should have router approval for socialswap router", async () => {
                await tracy.approveRouter(social.address, tokenB.address, { from: admin });
                const allowance = await tokenB.allowance(social.address, socialRouter.address).call();
                assert.equal(allowance.toString(), UINT256_MAX.toString())
            });
            it("should have router approval for sunswap router", async () => {
                await tracy.approveRouter(sun.address, tokenA.address, { from: admin });
                const allowance = await tokenA.allowance(sun.address, sunRouter.address).call();
                assert.equal(allowance.toString(), UINT256_MAX.toString())
            });
            it("should have router approval for sunswap router", async () => {
                await tracy.approveRouter(sun.address, tokenB.address, { from: admin });
                const allowance = await tokenB.allowance(sun.address, sunRouter.address).call();
                assert.equal(allowance.toString(), UINT256_MAX.toString())
            });
        })
        describe("swapExactTokensForTokens", async () => {
            it("should swap for social adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenA.address, tokenB.address];
                const { amounts } = await socialRouter.getAmountsOut(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceABefore = await tracy.balanceIn(tokenA.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                await tracy.swapExactTokensForTokens(
                    social.address,
                    amount,
                    amounts[amounts.length - 1],
                    path,
                    deadline,
                    { from: admin, shouldPollResponse: true }
                );
                const balanceAAfter = await tracy.balanceIn(tokenA.address);
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                assert.isTrue(
                    balanceABefore.gt(balanceAAfter) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceABefore.toString()} TA <= After: ${balanceAAfter.toString()} TA\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            });
            it("should swap for sun adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenA.address, tokenB.address];
                const { amounts } = await sunRouter.getAmountsOut(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceABefore = await tracy.balanceIn(tokenA.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                await tracy.swapExactTokensForTokens(
                    sun.address,
                    amount,
                    amounts[amounts.length - 1],
                    path,
                    deadline,
                    { from: admin, shouldPollResponse: true }
                );
                const balanceAAfter = await tracy.balanceIn(tokenA.address);
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                assert.isTrue(
                    balanceABefore.gt(balanceAAfter) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceABefore.toString()} TA <= After: ${balanceAAfter.toString()} TA\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            });
        })
        describe("swapTokensForExactTokens", async () => {
            it("should swap for social adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenA.address, tokenB.address];
                const { amounts } = await socialRouter.getAmountsIn(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceABefore = await tracy.balanceIn(tokenA.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                try {
                    await tracy.swapTokensForExactTokens(
                        social.address,
                        amount,
                        amounts[0],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    logError(e)
                }
                const balanceAAfter = await tracy.balanceIn(tokenA.address);
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                assert.isTrue(
                    balanceABefore.gt(balanceAAfter) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceABefore.toString()} TA <= After: ${balanceAAfter.toString()} TA\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            });
            it("should swap for sun adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenA.address, tokenB.address];
                const { amounts } = await sunRouter.getAmountsIn(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceABefore = await tracy.balanceIn(tokenA.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                try {
                    await tracy.swapTokensForExactTokens(
                        sun.address,
                        amount,
                        amounts[0],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e)
                }
                const balanceAAfter = await tracy.balanceIn(tokenA.address);
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                assert.isTrue(
                    balanceABefore.gt(balanceAAfter) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceABefore.toString()} TA <= After: ${balanceAAfter.toString()} TA\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            });
        })
        describe("swapExactNativeForTokens", async () => {
            it("should swap for social adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [wtrx.address, tokenB.address];
                const { amounts } = await socialRouter.getAmountsOut(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                const balanceTRX = await tronWeb.trx.getBalance(tracy.address);
                try {
                    await tracy.swapExactNativeForTokens(
                        social.address,
                        amount,
                        amounts[amounts.length - 1],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceWTRX = await tracy.balanceIn(wtrx.address);
                assert.isTrue(
                    balanceWTRX.lt(balanceTRX) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceTRX.toString()} WTRX <= After: ${balanceWTRX.toString()} WTRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
            it("should swap for sun adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [wtrx.address, tokenB.address];
                const { amounts } = await sunRouter.getAmountsOut(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                const balanceTRX = await tronWeb.trx.getBalance(tracy.address);
                try {
                    await tracy.swapExactNativeForTokens(
                        sun.address,
                        amount,
                        amounts[amounts.length - 1],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceWTRX = await tracy.balanceIn(wtrx.address);
                assert.isTrue(
                    balanceWTRX.lt(balanceTRX) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceTRX.toString()} WTRX <= After: ${balanceWTRX.toString()} WTRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
        })
        describe("swapNativeForExactTokens", async () => {
            it("should swap for social adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [wtrx.address, tokenB.address];
                const { amounts } = await socialRouter.getAmountsIn(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                const balanceTRX = await tronWeb.trx.getBalance(tracy.address);
                try {
                    await tracy.swapNativeForExactTokens(
                        social.address,
                        amount,
                        amounts[0],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceWTRX = await tracy.balanceIn(wtrx.address);
                assert.isTrue(
                    balanceWTRX.lt(balanceTRX) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceTRX.toString()} WTRX <= After: ${balanceWTRX.toString()} WTRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
            it("should swap for sun adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [wtrx.address, tokenB.address];
                const { amounts } = await sunRouter.getAmountsIn(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                const balanceTRX = await tronWeb.trx.getBalance(tracy.address);
                try {
                    await tracy.swapNativeForExactTokens(
                        sun.address,
                        amount,
                        amounts[0],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceWTRX = await tracy.balanceIn(wtrx.address);
                assert.isTrue(
                    balanceWTRX.lt(balanceTRX) && balanceBBefore.lt(balanceBAfter),
                    `Before: ${balanceTRX.toString()} WTRX <= After: ${balanceWTRX.toString()} WTRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
        })
        describe("swapExactTokensForNative", async () => {
            it("should swap for social adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenB.address, wtrx.address];
                const { amounts } = await socialRouter.getAmountsOut(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceTRXBefore = await tronWeb.trx.getBalance(tracy.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                try {
                    await tracy.swapExactTokensForNative(
                        social.address,
                        amount,
                        amounts[amounts.length - 1],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceTRXAfter = await tronWeb.trx.getBalance(tracy.address);
                assert.isTrue(
                    balanceTRXBefore < balanceTRXAfter && balanceBBefore.gt(balanceBAfter),
                    `Before: ${balanceTRXBefore} TRX <= After: ${balanceTRXAfter} TRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
            it("should swap for sun adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenB.address, wtrx.address];
                const { amounts } = await sunRouter.getAmountsOut(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceTRXBefore = await tronWeb.trx.getBalance(tracy.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                try {
                    await tracy.swapExactTokensForNative(
                        sun.address,
                        amount,
                        amounts[amounts.length - 1],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceTRXAfter = await tronWeb.trx.getBalance(tracy.address);
                assert.isTrue(
                    balanceTRXBefore < balanceTRXAfter && balanceBBefore.gt(balanceBAfter),
                    `Before: ${balanceTRXBefore} TRX <= After: ${balanceTRXAfter} TRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
        })
        describe("swapTokensForExactNative", async () => {
            it("should swap for social adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenB.address, wtrx.address];
                const { amounts } = await socialRouter.getAmountsIn(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceTRXBefore = await tronWeb.trx.getBalance(tracy.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                try {
                    await tracy.swapTokensForExactNative(
                        social.address,
                        amount,
                        amounts[0],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceTRXAfter = await tronWeb.trx.getBalance(tracy.address);
                assert.isTrue(
                    balanceTRXBefore < balanceTRXAfter && balanceBBefore.gt(balanceBAfter),
                    `Before: ${balanceTRXBefore} TRX <= After: ${balanceTRXAfter} TRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
            it("should swap for sun adapter", async () => {
                const amount = getTokenAmount(1, DECIMALS);
                const path = [tokenB.address, wtrx.address];
                const { amounts } = await sunRouter.getAmountsIn(amount, path);
                const deadline = Date.now() + 1000 * 60 * 60;
                const balanceTRXBefore = await tronWeb.trx.getBalance(tracy.address);
                const balanceBBefore = await tracy.balanceIn(tokenB.address);
                try {
                    await tracy.swapTokensForExactNative(
                        sun.address,
                        amount,
                        amounts[0],
                        path,
                        deadline,
                        { from: admin, shouldPollResponse: true }
                    );
                } catch (e) {
                    await logError(e);
                }
                const balanceBAfter = await tracy.balanceIn(tokenB.address);
                const balanceTRXAfter = await tronWeb.trx.getBalance(tracy.address);
                assert.isTrue(
                    balanceTRXBefore < balanceTRXAfter && balanceBBefore.gt(balanceBAfter),
                    `Before: ${balanceTRXBefore} TRX <= After: ${balanceTRXAfter} TRX\n\tBefore: ${balanceBBefore.toString()} TB >= After: ${balanceBAfter.toString()} TB`
                );
            })
        })
    })
})