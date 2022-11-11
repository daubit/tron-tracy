/*! SunswapV2Adapter.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

import "../TRC20/ITRC20.sol";
import "../interfaces/ITracyRouter.sol";
import "../interfaces/ISunswapV2Router.sol";

contract SunswapV2Adapter is ITracyRouter {
    address public immutable router;
    address public immutable wtrx;

    constructor(address _router, address _wtrx) {
        router = _router;
        wtrx = _wtrx;
    }

    function approve(address token, uint256 amount) external override {
        ITRC20(token).approve(router, amount);
    }

    function approve(address token) external override {
        ITRC20(token).approve(router, type(uint256).max);
    }

    function getAmountsIn(uint256 amountOut, address[] memory path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        return ISunswapV2Router(router).getAmountsIn(amountOut, path);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        return ISunswapV2Router(router).getAmountsOut(amountIn, path);
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override returns (uint256[] memory amounts) {
        amounts = ISunswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override {
        ISunswapV2Router(router).swapTokensForExactTokens(
            amountOut,
            amountInMax,
            path,
            to,
            deadline
        );
    }

    function swapExactNativeForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable override {
        ISunswapV2Router(router).swapExactETHForTokens{value: msg.value}(
            amountOutMin,
            path,
            to,
            deadline
        );
    }

    function swapNativeForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable override {
        ISunswapV2Router(router).swapETHForExactTokens{value: msg.value}(
            amountOut,
            path,
            to,
            deadline
        );
    }

    function swapExactTokensForNative(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override {
        ISunswapV2Router(router).swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
    }

    function swapTokensForExactNative(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override {
        ISunswapV2Router(router).swapTokensForExactETH(
            amountOut,
            amountInMax,
            path,
            to,
            deadline
        );
    }
}
