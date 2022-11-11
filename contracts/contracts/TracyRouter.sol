/*! TracyRouter.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

import "./interfaces/ITracyRouter.sol";
import "./TRC20/ITRC20.sol";

contract TracyRouter {
    address private owner;
    mapping(address => bool) public registered;

    modifier onlyOwner() {
        require(msg.sender == owner, "ITracyRouter: Not allowed");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    fallback() external payable {
        // assert(msg.sender == wtrx);
    }

    function addRouter(address router) external onlyOwner {
        require(msg.sender == owner, "TracyRouter: Not allowed");
        require(!registered[router], "TracyRouter: Already registered");
        registered[router] = true;
    }

    function approveRouter(address router, address token) external onlyOwner {
        require(msg.sender == owner, "TracyRouter: Not allowed");
        require(registered[router], "TracyRouter: UNREGISTERED");
        ITracyRouter(router).approve(token);
    }

    function approve(address token) external onlyOwner {
        ITRC20(token).approve(msg.sender, type(uint256).max);
    }

    function balanceIn(address token) external view returns (uint256) {
        return ITRC20(token).balanceOf(address(this));
    }

    function swapExactTokensForTokens(
        address router,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external onlyOwner returns (uint256[] memory amounts) {
        require(path.length >= 2, "TracyRouter: PATH_SHORT");
        require(registered[router], "TracyRouter: UNREGISTERED");
        bool success = ITRC20(path[0]).transfer(router, amountIn);
        require(success, "TracyRouter: TRANSFER_FAILED");
        amounts = ITracyRouter(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );
    }

    function swapTokensForExactTokens(
        address router,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external onlyOwner {
        require(path.length >= 2, "TracyRouter: PATH_SHORT");
        require(registered[router], "TracyRouter: UNREGISTERED");
        bool success = ITRC20(path[0]).transfer(router, amountInMax);
        require(success, "TracyRouter: TRANSFER_FAILED");
        ITracyRouter(router).swapTokensForExactTokens(
            amountOut,
            amountInMax,
            path,
            address(this),
            deadline
        );
    }

    function swapExactNativeForTokens(
        address router,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external onlyOwner {
        require(path.length >= 2, "TracyRouter: PATH_SHORT");
        require(registered[router], "TracyRouter: UNREGISTERED");
        address self = address(this);
        require(self.balance >= amountIn, "TracyRouter: INSUFFICIENT_BALANCE");
        ITracyRouter(router).swapExactNativeForTokens{value: amountIn}(
            amountOutMin,
            path,
            address(this),
            deadline
        );
    }

    function swapNativeForExactTokens(
        address router,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external onlyOwner {
        require(path.length >= 2, "TracyRouter: PATH_SHORT");
        require(registered[router], "TracyRouter: UNREGISTERED");
        address self = address(this);
        require(
            self.balance >= amountInMax,
            "TracyRouter: INSUFFICIENT_BALANCE"
        );
        ITracyRouter(router).swapNativeForExactTokens{value: amountInMax}(
            amountOut,
            path,
            address(this),
            deadline
        );
    }

    function swapExactTokensForNative(
        address router,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external onlyOwner {
        require(path.length >= 2, "TracyRouter: PATH_SHORT");
        require(registered[router], "TracyRouter: UNREGISTERED");
        bool success = ITRC20(path[0]).transfer(router, amountIn);
        require(success, "TracyRouter: TRANSFER_FAILED");
        ITracyRouter(router).swapExactTokensForNative(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );
    }

    function swapTokensForExactNative(
        address router,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external onlyOwner {
        require(path.length >= 2, "TracyRouter: PATH_SHORT");
        require(registered[router], "TracyRouter: UNREGISTERED");
        bool success = ITRC20(path[0]).transfer(router, amountInMax);
        require(success, "TracyRouter: TRANSFER_FAILED");
        ITracyRouter(router).swapTokensForExactNative(
            amountOut,
            amountInMax,
            path,
            address(this),
            deadline
        );
    }
}
