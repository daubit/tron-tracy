/*! TestToken.sol | SPDX-License-Identifier: MIT License */

pragma solidity 0.8.6;

import "./TRC20/TRC20.sol";

contract TestToken is TRC20 {
    address public owner;
    bool public stopmint;

    modifier onlyOwner() {
        require(msg.sender == owner, "TT: ACCESS_DENIED");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint amount
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        _mint(msg.sender, amount);
    }

    function mint(address to, uint256 value) external onlyOwner {
        require(!stopmint, "TT: MINT_ALREADY_STOPPED");

        _mint(to, value);
    }

    function changeOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function renounceOwner() external onlyOwner {
        owner = address(0);
    }

    function burn(uint256 value) external onlyOwner {
        require(balanceOf(msg.sender) >= value, "TT: INSUFFICIENT_FUNDS");

        _burn(msg.sender, value);
    }

    function stopMint() external onlyOwner {
        require(!stopmint, "TT: MINT_ALREADY_STOPED");

        stopmint = true;
    }
}
