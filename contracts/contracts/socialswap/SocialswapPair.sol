/*! Pair.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

import "../TRC20/TRC20.sol";
import "./lib/UQ112x112.sol";
import "./lib/Math.sol";
import "./interface/ISocialswapPair.sol";
import "./interface/ICallee.sol";
import "./interface/ISocialswapFactory.sol";
import "../lib/SafeMath.sol";

contract SocialswapPair is TRC20, ISocialswapPair {
    using SafeMath for uint256;
    using UQ112x112 for uint224;

    uint256 public constant override MINIMUM_LIQUIDITY = 1000;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 private unlocked = 1;

    address public override factory;
    address public override token0;
    address public override token1;

    uint256 public override price0CumulativeLast;
    uint256 public override price1CumulativeLast;

    uint256 public override kLast;

    modifier lock() {
        require(unlocked == 1, "Lock: LOCKED");

        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor() {
        factory = msg.sender;
    }

    function _safeTransfer(
        address token,
        address to,
        uint256 value
    ) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "Pair: TRANSFER_FAILED"
        );
    }

    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        require(
            balance0 <= type(uint112).max && balance1 <= type(uint112).max,
            "Pair: OVERFLOW"
        );

        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;

        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast +=
                uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) *
                timeElapsed;
            price1CumulativeLast +=
                uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) *
                timeElapsed;
        }

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;

        emit Sync(reserve0, reserve1);
    }

    function _mintFee(uint112 _reserve0, uint112 _reserve1)
        private
        returns (bool feeOn)
    {
        address feeTo = ISocialswapFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast;

        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = Math.sqrt(uint256(_reserve0).mul(_reserve1));
                uint256 rootKLast = Math.sqrt(_kLast);

                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply().mul(rootK.sub(rootKLast));
                    uint256 denominator = rootK.mul(5).add(rootKLast);
                    uint256 liquidity = numerator / denominator;

                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) kLast = 0;
    }

    function initialize(address _token0, address _token1) external override {
        require(msg.sender == factory, "Pair: FORBIDDEN");

        token0 = _token0;
        token1 = _token1;
    }

    function mint(address to)
        external
        override
        lock
        returns (uint256 liquidity)
    {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();

        uint256 balance0 = ITRC20(token0).balanceOf(address(this));
        uint256 balance1 = ITRC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0.sub(_reserve0);
        uint256 amount1 = balance1.sub(_reserve1);

        bool feeOn = _mintFee(_reserve0, _reserve1);

        if (totalSupply() == 0) {
            liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else
            liquidity = Math.min(
                amount0.mul(totalSupply()) / _reserve0,
                amount1.mul(totalSupply()) / _reserve1
            );

        require(liquidity > 0, "Pair: INSUFFICIENT_LIQUIDITY_MINTED");

        _mint(to, liquidity);
        _update(balance0, balance1, _reserve0, _reserve1);

        if (feeOn) kLast = uint256(reserve0).mul(reserve1);

        emit Mint(msg.sender, amount0, amount1);
        liquidity = 0;
    }

    function burn(address to)
        external
        override
        lock
        returns (uint256 amount0, uint256 amount1)
    {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();

        uint256 balance0 = ITRC20(token0).balanceOf(address(this));
        uint256 balance1 = ITRC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));
        bool feeOn = _mintFee(_reserve0, _reserve1);

        amount0 = liquidity.mul(balance0) / totalSupply();
        amount1 = liquidity.mul(balance1) / totalSupply();

        require(
            amount0 > 0 && amount1 > 0,
            "Pair: INSUFFICIENT_LIQUIDITY_BURNED"
        );

        _burn(address(this), liquidity);
        _safeTransfer(token0, to, amount0);
        _safeTransfer(token1, to, amount1);

        balance0 = ITRC20(token0).balanceOf(address(this));
        balance1 = ITRC20(token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);

        if (feeOn) kLast = uint256(reserve0).mul(reserve1);

        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external override lock {
        require(
            amount0Out > 0 || amount1Out > 0,
            "Pair: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        require(
            amount0Out < _reserve0 && amount1Out < _reserve1,
            "Pair: INSUFFICIENT_LIQUIDITY"
        );

        require(to != token0 && to != token1, "Pair: INVALID_TO");

        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);
        if (data.length > 0)
            ICallee(to).call(msg.sender, amount0Out, amount1Out, data);

        uint256 balance0 = ITRC20(token0).balanceOf(address(this));
        uint256 balance1 = ITRC20(token1).balanceOf(address(this));

        uint256 amount0In = balance0 > _reserve0 - amount0Out
            ? balance0 - (_reserve0 - amount0Out)
            : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out
            ? balance1 - (_reserve1 - amount1Out)
            : 0;

        require(
            amount0In > 0 || amount1In > 0,
            "Pair: INSUFFICIENT_INPUT_AMOUNT"
        );

        {
            uint256 balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
            uint256 balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));

            require(
                balance0Adjusted.mul(balance1Adjusted) >=
                    uint256(_reserve0).mul(_reserve1).mul(1000**2),
                "Pair: Bad swap"
            );
        }

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function skim(address to) external override lock {
        _safeTransfer(
            token0,
            to,
            ITRC20(token0).balanceOf(address(this)).sub(reserve0)
        );
        _safeTransfer(
            token1,
            to,
            ITRC20(token1).balanceOf(address(this)).sub(reserve1)
        );
    }

    function sync() external override lock {
        _update(
            ITRC20(token0).balanceOf(address(this)),
            ITRC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }

    function getReserves()
        public
        view
        override
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        )
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
}
