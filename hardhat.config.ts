// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config({ path: "./.env" });

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "@openzeppelin/hardhat-upgrades";

import "./tasks/index";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 2,
            },
        },
    },

    networks: {
        localhost: {
            accounts: {
                mnemonic:
                    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
            },
            url: "http://127.0.0.1:8545/",
        },
        hardhat: {
            accounts: {
                mnemonic:
                    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
            },
        },
        sepolia: {
            chainId: 11155111,
            url: `${
                process.env.RPC_URL ||
                `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
            }`,
            ...(process.env.TESTNET_PRIVATE_KEY
                ? { accounts: [process.env.TESTNET_PRIVATE_KEY] }
                : {}),
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 1.2,
        },
        goerli: {
            chainId: 5,
            url: `${
                process.env.RPC_URL ||
                `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`
            }`,
            ...(process.env.TESTNET_PRIVATE_KEY
                ? { accounts: [process.env.TESTNET_PRIVATE_KEY] }
                : {}),
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 1.2,
        },
        mainnet: {
            chainId: 1,
            url: `${
                process.env.RPC_URL ||
                `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
            }`,
            ...(process.env.MAINNET_PRIVATE_KEY
                ? { accounts: [process.env.MAINNET_PRIVATE_KEY] }
                : {}),
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 1.2,
        },
    },

    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },

    contractSizer: {
        alphaSort: true,
        runOnCompile: false,
        disambiguatePaths: false,
    },

    gasReporter: {
        currency: "USD",
        gasPrice: 51,
        enabled: process.env.REPORT_GAS === "true",
        coinmarketcap: process.env.CMC_API_KEY,
    },

    abiExporter: {
        runOnCompile: true,
        only: ["contracts"],
        except: [
            "contracts/mocks",
            "@openzeppelin",
            "contracts/interfaces/external",
        ],
        clear: true,
        flat: true,
        spacing: 4,
    },
};

export default config;
