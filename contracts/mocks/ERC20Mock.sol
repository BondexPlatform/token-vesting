// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20("ERC20Mock", "MCK") {
    uint256 public numCalls_transfer;
    uint256 public numCalls_transferFrom;

    struct TransferInput {
        address caller;
        address from;
        address to;
        uint256 value;
    }

    TransferInput[] public inputs_transfer;
    TransferInput[] public inputs_transferFrom;

    uint8 private dec;

    constructor(uint8 _decimals) {
        dec = _decimals;
    }

    function decimals() public view override returns (uint8) {
        return dec;
    }

    function mint(address user, uint256 amount) public {
        _mint(user, amount);
    }

    function burnFrom(address user, uint256 amount) public {
        _burn(user, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        numCalls_transferFrom++;
        inputs_transferFrom.push(
            TransferInput(msg.sender, sender, recipient, amount)
        );

        return super.transferFrom(sender, recipient, amount);
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        numCalls_transfer++;
        inputs_transfer.push(
            TransferInput(msg.sender, msg.sender, recipient, amount)
        );

        return super.transfer(recipient, amount);
    }
}
