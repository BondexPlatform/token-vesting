// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {StorageVesting} from "./storage/StorageVesting.sol";
import {IVesting} from "./interfaces/IVesting.sol";

/// @title Vesting
/// @notice Contract that holds and releases tokens over time
/// @dev The tokens are held by this contract and are released to the claimant over time based on the configuration
/// @dev Contract is intended to be used with Clones to save gas when deploying multiple vesting contracts
/// Alternatively, it can be made upgradeable by using it with a Transparent Proxy
/// @dev The contract assumes the tokens to distribute are held in its own balance
contract Vesting is IVesting, StorageVesting, Initializable, ERC165 {
    using SafeERC20 for IERC20;

    uint256 public constant PERCENTAGE_SCALE_FACTOR = 1e4;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        VestingConfig memory config
    ) public virtual initializer {
        __Vesting_init(config);
    }

    function __Vesting_init(
        VestingConfig memory config
    ) internal onlyInitializing {
        __Vesting_init_unchained(config);
    }

    /// @notice Initializes the contract with the given config
    /// Reverts if:
    ///     - the token is the zero address
    ///     - the claimant is the zero address
    ///     - the vesting duration is 0
    ///     - the vesting would already be over
    ///     - the tge percentage is greater than 100%
    ///     - the total amount is 0
    /// @dev if tgeTime is 0, it will be set to the current block timestamp
    /// @dev the contract allows setting the vesting tgeTime in the past to allow the flexibility of deploying
    /// the vesting contracts after the TGE
    function __Vesting_init_unchained(
        VestingConfig memory config
    ) internal onlyInitializing {
        VestingStorage storage $ = _getVestingStorage();

        if (address(config.token) == address(0)) {
            revert Vesting_InvalidConfig("token");
        }

        if (config.claimant == address(0)) {
            revert Vesting_InvalidConfig("claimant");
        }

        if (config.vestingDuration == 0) {
            revert Vesting_InvalidConfig("vestingDuration");
        }

        if (config.tgeTime == 0) {
            config.tgeTime = block.timestamp;
        }

        // if the vesting would already be over, it doesn't make sense to exist
        if (
            config.tgeTime + config.cliffDuration + config.vestingDuration <
            block.timestamp
        ) {
            revert Vesting_InvalidConfig("vesting over");
        }

        if (config.tgePercentage > 100 * PERCENTAGE_SCALE_FACTOR) {
            revert Vesting_InvalidConfig("tgePercentage");
        }

        if (config.totalAmount == 0) {
            revert Vesting_InvalidConfig("totalAmount");
        }

        $.config = config;
    }

    /// @notice Claims the tokens that are currently claimable
    /// @dev Only the claimant can call this function
    /// @dev It assumes the tokens are held by this contract and are sufficient to execute the transfer
    function claim() public {
        VestingStorage storage $ = _getVestingStorage();

        if (msg.sender != $.config.claimant) {
            revert Vesting_ClaimantOnly();
        }

        uint256 amount = getClaimableAmount();

        if (amount == 0) {
            revert Vesting_NothingToClaim();
        }

        $.amountClaimed += amount;

        $.config.token.safeTransfer($.config.claimant, amount);

        emit Claimed(amount);
    }

    /// @notice Returns the amount of tokens that can be claimed by the claimant
    /// @return The amount of tokens that can be claimed
    /// @dev Releases config.tgePercentage at any time after config.tgeTime
    ///     Does not release any tokens during config.cliffDuration
    ///     Releases the rest of the tokens linearly over config.vestingDuration
    function getClaimableAmount() public view returns (uint256) {
        VestingStorage storage $ = _getVestingStorage();

        if (block.timestamp < $.config.tgeTime) {
            return 0;
        }

        uint256 amountClaimed = $.amountClaimed;

        uint256 totalClaimable = 0;
        uint256 amountExcludingTGE = $.config.totalAmount;

        if ($.config.tgePercentage != 0) {
            uint256 tgeAmount = ($.config.totalAmount *
                $.config.tgePercentage) /
                100 /
                PERCENTAGE_SCALE_FACTOR;

            totalClaimable += tgeAmount;
            amountExcludingTGE -= tgeAmount;
        }

        if ($.config.tgeTime + $.config.cliffDuration < block.timestamp) {
            uint256 timePassed = block.timestamp -
                $.config.tgeTime -
                $.config.cliffDuration;

            if (timePassed >= $.config.vestingDuration) {
                totalClaimable = $.config.totalAmount;
            } else {
                uint256 vestedAmount = (amountExcludingTGE * timePassed) /
                    $.config.vestingDuration;

                totalClaimable += vestedAmount;
            }
        }

        return totalClaimable - amountClaimed;
    }

    function version() public pure returns (string memory) {
        return "1.0.0";
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165) returns (bool) {
        return
            interfaceId == type(IVesting).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
