# ERC20 token

This repo is home to a vesting contract and a vesting factory.

The Vesting contract cannot be deployed standalone. It is designed to be primarily used via Clones, which make the deployment of multiple vesting contracts way cheaper (since the actual contract is only deployed once and then used as implementation for the minimal proxy clones). 

If standalone version is desired, it can be achieved by either deploying an upgradeable version, by deploying a TransparentProxy from openzeppelin, or by pointing any other kind of proxy to the Vesting implementation. 

Vesting Features:
- holds an amount of ERC20 tokens and releases them to a claimant according to the configuration
- the contract can be configured as follows:
  - tgeTime - start time of the vesting
    - if tgePercentage is specified, it automatically unlocks the specified percentage of the tokens at the tgeTime and they become claimable immediately
    - if tgeTime is set to 0, it defaults to the block timestamp at which it is initialized
  - cliffDuration - duration of the cliff period
    - during this period, no token is awarded or claimable
    - if cliffDuration is higher than 0, the effective start time of the linear vesting is `tgeTime + cliffDuration`
  - vestingDuration
    - starts after `tgeTime + cliffDuration`
    - during this period, the remaining tokens (`= totalAmount - tgePercentage * totalAmount`) are being unlocked linearly

Vesting Factory:
- deploys vesting contracts using clones and keeps track of all the contracts deployed for a specific claimant
- it requires an implementation contract to be set

> Note: The setup is not complete until the total amount of tokens is transferred to the vesting contract. The factory contract does not handle the transfer of tokens to the vesting contract.

## Running tests

After cloning this repo, run the following commands to install dependencies and run tests:

```bash
npm install
npm run test
```

## Deploying

Deployment can be done using the available hardhat tasks. The tasks use the `settings` specified in `./settings/[network]/settings.json` to generate the contract configuration.

See [./settings/sepolia/settings.json](./settings/sepolia/settings.json) for an example of the settings file.

To deploy to another network, a new directory matching the name of the network (e.g. "mainnet" for Ethereum Mainnet; the network name must be the same as the one in hardhat.config.ts) must be created inside the `settings` directory and a `settings.json` file must be created inside it. 

Once the settings file exists, you can run the following command to deploy a standalone upgradeable version of the Vesting contract:
```bash
npx hardhat deploy vesting-upgradeable --network mainnet
```

Deploying the factory contract can be done using the following command:
```bash
npx hardhat deploy factory --network mainnet
```

Once the script execution is complete, the resulting contract address will be saved to a file named `addresses.json` inside the network directory in settings.
