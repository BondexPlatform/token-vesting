// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IVesting} from "./interfaces/IVesting.sol";

/// @title VestingFactory
/// @notice Factory contract to deploy new vesting contracts using Clones for gas efficiency
/// For more information about clones, see https://docs.openzeppelin.com/contracts/5.x/api/proxy#minimal_clones
/// @dev The factory contract is Ownable and the owner can set the implementation of the vesting contract
/// @dev The implementation must support the IVesting interface
/// @dev Only the owner can deploy new vesting contracts
/// @dev The factory contract keeps track of the deployed vesting contracts for each claimant
/// @dev The factory contract can deploy multiple vesting contracts in a single transaction
/// @dev All vesting contracts deployed with this factory must award the same token
contract VestingFactory is Ownable, ERC165 {
    using SafeERC20 for IERC20;

    struct Deployment {
        bool isSetupDone;
        address claimant;
        address vesting;
        uint256 amount;
    }

    IERC20 public token;
    address public vestingImplementation;
    Deployment[] public deployments;
    uint256 public nextBatchIndex;

    error VestingFactory_InvalidToken();
    error VestingFactory_InvalidImplementation();
    error VestingFactory_NothingToSetup();

    event ImplementationSet(address indexed implementation);
    event VestingDeployed(
        address indexed claimant,
        address indexed vesting,
        uint256 amount
    );

    constructor(
        address impl,
        address initialOwner,
        IERC20 token_
    ) Ownable(initialOwner) {
        _setImplementation(impl);

        if (address(token_) == address(0)) {
            revert VestingFactory_InvalidToken();
        }

        token = token_;
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
    ) public onlyOwner returns (address) {
        address vesting = Clones.clone(vestingImplementation);
        IVesting(vesting).initialize(config);

        deployments.push(
            Deployment({
                isSetupDone: false,
                claimant: config.claimant,
                vesting: vesting,
                amount: config.totalAmount
            })
        );

        emit VestingDeployed(config.claimant, vesting, config.totalAmount);

        return vesting;
    }

    /// @notice Deploy multiple vesting contracts in a single transaction
    /// @param configs The configurations of the vesting contracts
    /// @dev Only the owner can call this function
    function deployBatch(
        IVesting.VestingConfig[] memory configs
    ) public onlyOwner {
        for (uint256 i = 0; i < configs.length; i++) {
            deploy(configs[i]);
        }
    }

    /// @notice Setup the next batch of vesting contracts by transferring the necessary tokens from msg.sender to the
    /// deployed vesting contract
    /// @param iterations The number of vesting contracts to setup
    /// @dev Only the owner can call this function
    /// @dev The function will revert if there are no more vesting contracts to setup
    /// @dev Make sure allowance was provided for the factory contract to transfer the tokens
    function setupNextBatch(uint256 iterations) public onlyOwner {
        if (nextBatchIndex == deployments.length) {
            revert VestingFactory_NothingToSetup();
        }

        uint256 end = nextBatchIndex + iterations;

        if (end > deployments.length) {
            end = deployments.length;
        }

        for (uint256 i = nextBatchIndex; i < end; i++) {
            Deployment storage deployment = deployments[i];

            if (!deployment.isSetupDone) {
                token.safeTransferFrom(
                    _msgSender(),
                    deployment.vesting,
                    deployment.amount
                );

                deployment.isSetupDone = true;
            }
        }

        nextBatchIndex = end;
    }

    /// @notice Get the vesting contracts deployed for a claimer
    /// @param claimer The address of the claimer
    /// @return The addresses of the deployed vesting contracts
    function getVestingOfClaimer(
        address claimer
    ) external view returns (address[] memory) {
        address[] memory result = new address[](deployments.length);
        uint256 pos = 0;

        for (uint256 i = 0; i < deployments.length; i++) {
            if (deployments[i].claimant == claimer) {
                result[pos] = deployments[i].vesting;
                pos++;
            }
        }

        if (pos == 0) {
            return new address[](0);
        }

        address[] memory filtered = new address[](pos);

        for (uint256 i = 0; i < pos; i++) {
            filtered[i] = result[i];
        }

        return filtered;
    }

    function getAllDeployments() external view returns (Deployment[] memory) {
        return deployments;
    }

    function getNumberOfDeployments() external view returns (uint256) {
        return deployments.length;
    }

    function getNextBatchDeployments(
        uint256 iterations
    ) external view returns (Deployment[] memory) {
        if (nextBatchIndex == deployments.length) {
            return new Deployment[](0);
        }

        uint256 end = nextBatchIndex + iterations;

        if (end > deployments.length) {
            end = deployments.length;
        }

        Deployment[] memory result = new Deployment[](end - nextBatchIndex);

        for (uint256 i = nextBatchIndex; i < end; i++) {
            result[i - nextBatchIndex] = deployments[i];
        }

        return result;
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
