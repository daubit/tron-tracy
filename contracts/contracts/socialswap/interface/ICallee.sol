/*! socialswap.router.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

interface ICallee {
    function call(address sender, uint256 amount0, uint256 amount1, bytes calldata data) external;
}