/*! WTRX.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

import "./ITokenDeposit.sol";
import "../TRC20/ITRC20.sol";

contract WTRX is ITokenDeposit, ITRC20 {
    event Deposit(address indexed dst, uint sad);
    event Withdrawal(address indexed src, uint sad);

    uint256 private totalSupply_;
    mapping(address => uint) private balanceOf_;
    mapping(address => mapping(address => uint)) private allowance_;

    string public override name = "Wrapped TRX";
    string public override symbol = "WTRX";
    uint8 public override decimals = 6;

    // receive() external payable {
    //     deposit();
    // }

    function deposit() public payable override {
        balanceOf_[msg.sender] += msg.value;
        totalSupply_ += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint sad) public override {
        require(balanceOf_[msg.sender] >= sad, "not enough balance");
        require(totalSupply_ >= sad, "not enough totalSupply");
        balanceOf_[msg.sender] -= sad;
        require(payable(msg.sender).send(sad), "WTRX: TRANSFER_FAILED");
        totalSupply_ -= sad;
        emit Withdrawal(msg.sender, sad);
    }

    function totalSupply() public view override returns (uint) {
        return totalSupply_;
    }

    function balanceOf(address guy) public view override returns (uint) {
        return balanceOf_[guy];
    }

    function allowance(address src, address guy)
        public
        view
        override
        returns (uint)
    {
        return allowance_[src][guy];
    }

    function approve(address guy, uint sad) public override returns (bool) {
        allowance_[msg.sender][guy] = sad;
        emit Approval(msg.sender, guy, sad);
        return true;
    }

    function approve(address guy) public returns (bool) {
        return approve(guy, type(uint).max);
    }

    function transfer(address dst, uint sad) public override returns (bool) {
        return transferFrom(msg.sender, dst, sad);
    }

    function transferFrom(
        address src,
        address dst,
        uint sad
    ) public override returns (bool) {
        require(balanceOf_[src] >= sad, "src balance not enough");

        if (
            src != msg.sender && allowance_[src][msg.sender] != type(uint).max
        ) {
            require(
                allowance_[src][msg.sender] >= sad,
                "src allowance is not enough"
            );
            allowance_[src][msg.sender] -= sad;
        }

        balanceOf_[src] -= sad;
        balanceOf_[dst] += sad;

        emit Transfer(src, dst, sad);

        return true;
    }
}
