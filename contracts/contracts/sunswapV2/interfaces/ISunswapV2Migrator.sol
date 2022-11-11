/*! Router.sol | SPDX-License-Identifier: MIT License */
pragma solidity 0.8.6;

interface ISunswapV2Migrator {
    function migrate(address token, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external;
}
