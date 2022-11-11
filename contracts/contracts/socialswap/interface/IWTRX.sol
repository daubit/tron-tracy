/*! socialswap.router.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

interface IWTRX {
    function deposit() external payable;

    function withdraw(uint256) external;
}