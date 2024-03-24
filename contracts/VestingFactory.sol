// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IVesting} from "./interfaces/IVesting.sol";

/// @title VestingFactory
/// @notice Factory contract to deploy new vesting contracts using Clones for gas efficiency
/// For more information about clones, see https://docs.openzeppelin.com/contracts/5.x/api/proxy#minimal_clones
/// @dev The factory contract is Ownable and the owner can set the implementation of the vesting contract
/// @dev The implementation must support the IVesting interface
/// @dev Only the owner can deploy new vesting contracts
/// @dev The factory contract keeps track of the deployed vesting contracts for each claimant
contract VestingFactory is Ownable, ERC165 {
    address public vestingImplementation;

    mapping(address => address[]) public deployments;

    error VestingFactory_InvalidImplementation();

    event ImplementationSet(address indexed implementation);
    event VestingDeployed(address indexed claimant, address indexed vesting);

    constructor(address impl, address initialOwner) Ownable(initialOwner) {
        _setImplementation(impl);
    }

    /// @notice Set the implementation of the vesting contract
    /// @param impl The address of the new implementation
    /// @dev The new implementation must support the IVesting interface
    /// @dev Only the owner can call this function
    function setImplementation(address impl) external onlyOwner {
        _setImplementation(impl);
    }

    /// @notice Deploy a new vesting contract
    /// @param config The configuration of the vesting contract
    /// @return The address of the deployed vesting contract
    /// @dev Only the owner can call this function
    function deploy(
        IVesting.VestingConfig memory config
    ) external onlyOwner returns (address) {
        address vesting = Clones.clone(vestingImplementation);
        IVesting(vesting).initialize(config);

        deployments[config.claimant].push(vesting);

        emit VestingDeployed(config.claimant, vesting);

        return vesting;
    }

    /// @notice Get the vesting contracts deployed for a claimer
    /// @param claimer The address of the claimer
    /// @return The addresses of the deployed vesting contracts
    function getVestingOfClaimer(
        address claimer
    ) external view returns (address[] memory) {
        return deployments[claimer];
    }

    function _setImplementation(address impl) internal {
        if (impl == address(0)) {
            revert VestingFactory_InvalidImplementation();
        }

        if (!IERC165(impl).supportsInterface(type(IVesting).interfaceId)) {
            revert VestingFactory_InvalidImplementation();
        }

        vestingImplementation = impl;

        emit ImplementationSet(impl);
    }
}
