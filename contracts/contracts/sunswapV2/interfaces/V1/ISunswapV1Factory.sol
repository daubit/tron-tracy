/*! Router.sol | SPDX-License-Identifier: MIT License */
pragma solidity 0.8.6;

interface ISunswapV1Factory {
    function getExchange(address) external view returns (address);
}
