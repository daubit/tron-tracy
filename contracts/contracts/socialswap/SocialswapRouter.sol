/*! Router.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

import "../lib/SafeMath.sol";
import "./lib/SwapLibrary.sol";
import "./lib/TransferHelper.sol";
import "./interface/ISocialswapPair.sol";
import "./interface/IWTRX.sol";
import "./interface/ITRC20.sol";
import "./interface/ISocialswapFactory.sol";

contract SocialswapRouter {
    using SafeMath for uint256;

    address public factory;
    address public wtrx;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "Router: EXPIRED");
        _;
    }

    constructor(address _factory, address _wtrx) {
        factory = _factory;
        wtrx = _wtrx;
    }

    fallback() external payable {
        assert(msg.sender == wtrx);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        if (ISocialswapFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            ISocialswapFactory(factory).createPair(tokenA, tokenB);
        }

        (uint256 reserveA, uint256 reserveB) = SwapLibrary.getReserves(
            factory,
            tokenA,
            tokenB
        );

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = SwapLibrary.quote(
                amountADesired,
                reserveA,
                reserveB
            );

            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    "Router: INSUFFICIENT_B_AMOUNT"
                );

                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = SwapLibrary.quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );

                assert(amountAOptimal <= amountADesired);
                require(
                    amountAOptimal >= amountAMin,
                    "Router: INSUFFICIENT_A_AMOUNT"
                );

                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function _swap(
        uint256[] memory amounts,
        address[] memory path,
        address _to
    ) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = SwapLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2
                ? SwapLibrary.pairFor(factory, output, path[i + 2])
                : _to;

            ISocialswapPair(SwapLibrary.pairFor(factory, input, output)).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        address pair = SwapLibrary.pairFor(factory, tokenA, tokenB);

        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);

        liquidity = ISocialswapPair(pair).mint(to);
    }

    function addLiquidityTRX(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountTRXMin,
        address to,
        uint256 deadline
    )
        external
        payable
        ensure(deadline)
        returns (
            uint256 amountToken,
            uint256 amountTRX,
            uint256 liquidity
        )
    {
        (amountToken, amountTRX) = _addLiquidity(
            token,
            wtrx,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountTRXMin
        );

        address pair = SwapLibrary.pairFor(factory, token, wtrx);

        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
        IWTRX(wtrx).deposit{value: amountTRX}();
        assert(ITRC20(wtrx).transfer(pair, amountTRX));
        liquidity = ISocialswapPair(pair).mint(to);
        if (msg.value > amountTRX) {
            TransferHelper.safeTransferTRX(msg.sender, msg.value - amountTRX);
        }
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = SwapLibrary.pairFor(factory, tokenA, tokenB);

        ITRC20(pair).transferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = ISocialswapPair(pair).burn(to);

        (address token0, ) = SwapLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);

        require(amountA >= amountAMin, "Router: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "Router: INSUFFICIENT_B_AMOUNT");
    }

    function removeLiquidityTRX(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountTRXMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountToken, uint256 amountTRX) {
        (amountToken, amountTRX) = removeLiquidity(
            token,
            wtrx,
            liquidity,
            amountTokenMin,
            amountTRXMin,
            address(this),
            deadline
        );

        TransferHelper.safeTransfer(token, to, amountToken);
        IWTRX(wtrx).withdraw(amountTRX);
        TransferHelper.safeTransferTRX(to, amountTRX);
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = SwapLibrary.getAmountsOut(factory, amountIn, path);

        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "Router: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            SwapLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = SwapLibrary.getAmountsIn(factory, amountOut, path);

        require(amounts[0] <= amountInMax, "Router: EXCESSIVE_INPUT_AMOUNT");

        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            SwapLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );

        _swap(amounts, path, to);
    }

    function swapExactTRXForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == wtrx, "Router: INVALID_PATH");

        amounts = SwapLibrary.getAmountsOut(factory, msg.value, path);

        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "Router: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        IWTRX(wtrx).deposit{value: amounts[0]}();
        assert(
            ITRC20(wtrx).transfer(
                SwapLibrary.pairFor(factory, path[0], path[1]),
                amounts[0]
            )
        );

        _swap(amounts, path, to);
    }

    function swapTRXForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == wtrx, "Router: INVALID_PATH");

        amounts = SwapLibrary.getAmountsIn(factory, amountOut, path);

        require(amounts[0] <= msg.value, "Router: EXCESSIVE_INPUT_AMOUNT");

        IWTRX(wtrx).deposit{value: amounts[0]}();
        assert(
            ITRC20(wtrx).transfer(
                SwapLibrary.pairFor(factory, path[0], path[1]),
                amounts[0]
            )
        );

        _swap(amounts, path, to);

        if (msg.value > amounts[0])
            TransferHelper.safeTransferTRX(msg.sender, msg.value - amounts[0]);
    }

    function swapExactTokensForTRX(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == wtrx, "Router: INVALID_PATH");

        amounts = SwapLibrary.getAmountsOut(factory, amountIn, path);
        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "Router: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            SwapLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );

        _swap(amounts, path, address(this));

        IWTRX(wtrx).withdraw(amounts[amounts.length - 1]);

        TransferHelper.safeTransferTRX(to, amounts[amounts.length - 1]);
    }

    function swapTokensForExactTRX(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == wtrx, "Router: INVALID_PATH");

        amounts = SwapLibrary.getAmountsIn(factory, amountOut, path);

        require(amounts[0] <= amountInMax, "Router: EXCESSIVE_INPUT_AMOUNT");

        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            SwapLibrary.pairFor(factory, path[0], path[1]),
            amounts[0]
        );

        _swap(amounts, path, address(this));

        IWTRX(wtrx).withdraw(amounts[amounts.length - 1]);

        TransferHelper.safeTransferTRX(to, amounts[amounts.length - 1]);
    }

    function getAmountsIn(uint256 amountOut, address[] memory path)
        public
        view
        returns (uint256[] memory amounts)
    {
        return SwapLibrary.getAmountsIn(factory, amountOut, path);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path)
        public
        view
        returns (uint256[] memory amounts)
    {
        return SwapLibrary.getAmountsOut(factory, amountIn, path);
    }

    function calcPairLiquidity(
        uint256 amountA,
        address tokenA,
        address tokenB,
        bool reverse
    ) external view returns (uint256 amountB, uint256 share) {
        (uint256 reserveA, uint256 reserveB) = SwapLibrary.getReserves(
            factory,
            tokenA,
            tokenB
        );

        amountB = reverse
            ? SwapLibrary.quote(amountA, reserveB, reserveA)
            : SwapLibrary.quote(amountA, reserveA, reserveB);
        share = reverse
            ? amountA.mul(100) / reserveB.add(amountA)
            : amountA.mul(100) / reserveA.add(amountA);
    }

    function calcPairSwap(
        uint256 amountA,
        address tokenA,
        address tokenB,
        bool reverse
    ) external view returns (uint256 amountB, uint256 priceImpact) {
        (uint256 reserveA, uint256 reserveB) = SwapLibrary.getReserves(
            factory,
            tokenA,
            tokenB
        );

        amountB = reverse
            ? SwapLibrary.getAmountIn(amountA, reserveA, reserveB)
            : SwapLibrary.getAmountOut(amountA, reserveA, reserveB);
        priceImpact = reverse
            ? reserveA.sub(reserveA.sub(amountB)).mul(10000) / reserveA
            : reserveB.sub(reserveB.sub(amountB)).mul(10000) / reserveB;
    }

    function getPair(
        address owner,
        address tokenA,
        address tokenB
    )
        external
        view
        returns (
            address pair,
            uint256 totalSupply,
            uint256 supply,
            uint256 reserveA,
            uint256 reserveB
        )
    {
        pair = SwapLibrary.pairFor(factory, tokenA, tokenB);
        totalSupply = ITRC20(pair).totalSupply();
        supply = ITRC20(pair).balanceOf(owner);

        (address token0, ) = SwapLibrary.sortTokens(tokenA, tokenB);

        if (token0 != tokenA)
            (reserveB, reserveA) = SwapLibrary.getReserves(
                factory,
                tokenA,
                tokenB
            );
        else
            (reserveA, reserveB) = SwapLibrary.getReserves(
                factory,
                tokenA,
                tokenB
            );
    }

    function getPairs(
        address owner,
        uint256 start,
        uint256 limit
    )
        external
        view
        returns (
            uint256 count,
            address[] memory from,
            address[] memory to,
            uint256[] memory supply
        )
    {
        count = ISocialswapFactory(factory).allPairsLength();

        from = new address[](limit);
        to = new address[](limit);
        supply = new uint256[](limit);

        uint256 matches = 0;

        for (uint256 i = start; i < start + limit && i < count; i++) {
            address pair = ISocialswapFactory(factory).allPairs(i);

            from[matches] = ISocialswapPair(pair).token0();
            to[matches] = ISocialswapPair(pair).token1();
            supply[matches++] = ITRC20(pair).balanceOf(owner);
        }
    }
}
