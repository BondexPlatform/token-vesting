// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IVesting} from "../interfaces/IVesting.sol";

abstract contract StorageVesting is IVesting {
    /// @custom:storage-location erc7201:VestingStorage
    struct VestingStorage {
        IVesting.VestingConfig config;
        uint256 amountClaimed;
    }

    // keccak256(abi.encode(uint256(keccak256("VestingStorage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant VestingStorageLocation =
        0x3e144cdaad6ce3b60ac5770679be3a84cd39611d725e98731259df3f2adca400;

    function _getVestingStorage()
        internal
        pure
        returns (VestingStorage storage $)
    {
        assembly {
            $.slot := VestingStorageLocation
        }
    }

    function config() public view returns (IVesting.VestingConfig memory) {
        return _getVestingStorage().config;
    }

    function amountClaimed() public view returns (uint256) {
        return _getVestingStorage().amountClaimed;
    }
}
