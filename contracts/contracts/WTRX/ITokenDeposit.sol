/*! ITokenDeposit.sol | SPDX-License-Identifier: MIT License */
pragma solidity 0.8.6;

interface ITokenDeposit {
    function deposit() external payable;
    function withdraw(uint) external;
}
