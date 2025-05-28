// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVesting {
    struct VestingConfig {
        IERC20 token;
        // address of the owner of the vesting contract
        address initialOwner;
        // address that will be able to claim the vested tokens
        address claimant;
        // duration of the cliff, in seconds, during which no tokens will be vested
        // can be set to 0 if no cliff is needed
        uint256 cliffDuration;
        // duration of the vesting schedule, in seconds
        uint256 vestingDuration;
        // start time of the vesting; defaults to the timestamp of the block where the contract is initialized
        uint256 tgeTime;
        // percentage of the total amount that will be vested and immediately available for claiming at the TGE
        uint256 tgePercentage;
        uint256 totalAmount;
    }

    error Vesting_InvalidConfig(string value);
    error Vesting_ClaimantOnly();
    error Vesting_NothingToClaim();

    event Claimed(uint256 amount);
    event ClaimantChanged(
        address indexed previousClaimant,
        address indexed newClaimant
    );

    function initialize(VestingConfig memory config) external;

    function claim() external;

    function getClaimableAmount() external view returns (uint256);

    function config() external view returns (VestingConfig memory);

    function amountClaimed() external view returns (uint256);

    function version() external pure returns (string memory);
}
