/*! Router.sol | SPDX-License-Identifier: MIT License */
pragma solidity 0.8.6;

interface ISunswapV2Callee {
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}
