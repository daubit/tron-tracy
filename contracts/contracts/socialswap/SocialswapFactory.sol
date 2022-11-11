/*! socialswap.router.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

import "./interface/ISocialswapFactory.sol";
import "./SocialswapPair.sol";

contract SocialswapFactory is ISocialswapFactory {
    address public override feeTo;
    address public override feeToSetter;

    mapping(address => mapping(address => address)) public pairs;
    address[] public override allPairs;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
        feeTo = _feeToSetter;
    }

    function createPair(address tokenA, address tokenB)
        external
        override
        returns (address pair)
    {
        require(tokenA != tokenB, "Factory: IDENTICAL_ADDRESSES");

        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);

        require(token0 != address(0), "Factory: ZERO_ADDRESS");
        require(pairs[token0][token1] == address(0), "Factory: PAIR_EXISTS");

        pair = address(new SocialswapPair());

        ISocialswapPair(pair).initialize(token0, token1);

        pairs[token0][token1] = pair;
        pairs[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, "Factory: FORBIDDEN");

        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, "Factory: FORBIDDEN");

        feeToSetter = _feeToSetter;
    }

    function getPair(address tokenA, address tokenB)
        external
        view
        override
        returns (address pair)
    {
        pair = tokenA < tokenB ? pairs[tokenA][tokenB] : pairs[tokenB][tokenA];
    }

    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }
}
