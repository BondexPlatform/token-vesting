// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

contract CloneCreator {
    function createClone(address target) external returns (address result) {
        return Clones.clone(target);
    }
}
