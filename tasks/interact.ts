import { scope } from "hardhat/config";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import {
    IVesting,
    VestingFactory,
} from "../typechain-types/contracts/VestingFactory";
import { Settings } from "deploy-settings-manager";
import { e18, eX } from "../test/helpers/scale";
import { Vesting } from "../typechain-types";

const interactScope = scope("interact");

interactScope
    .task("factory:deployBatch", "Deploy a batch of vesting contracts")
    .addParam("input", "Path to the CSV file with vesting data")
    .addFlag("dry", "Run the task in dry mode (no transactions will be sent)")
    .setAction(async (taskArgs: { input: string; dry: boolean }, hre) => {
        const fileContent = fs.readFileSync(taskArgs.input, "utf-8");

        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        const settings = new Settings();
        const tokenAddress = settings
            .mustGetReader("factory")
            .mustGetAddress("token");

        const tgeTimeRaw = settings.mustGetReader("vesting").mustGet("tgeTime");
        const tgeTime = Number(tgeTimeRaw);
        if (isNaN(tgeTime) || tgeTime <= 0) {
            throw new Error(`Invalid tgeTime: ${tgeTimeRaw}`);
        }

        let vestingConfigs: IVesting.VestingConfigStruct[] = [];

        let totalAmount = 0;
        const secondsInMonth = 30 * 24 * 60 * 60; // 30 days per month

        const claimantCount: Record<string, number> = {};

        for (const record of records) {
            const amount = Number(record.totalAmount.replace(/,/g, ""));

            totalAmount += amount;

            const tgePercentage = Number(record.tgePercentage.replace("%", ""));
            const cliffDurationMonths = Number(record.cliffDuration);
            const vestingDurationMonths = Number(record.vestingDuration);

            const cliffDurationSeconds = cliffDurationMonths * secondsInMonth;
            const vestingDurationSeconds =
                vestingDurationMonths * secondsInMonth;

            // validate addresses
            if (!hre.ethers.isAddress(record.initialOwner)) {
                throw new Error(
                    `Invalid initialOwner address: ${record.initialOwner}`,
                );
            }
            if (!hre.ethers.isAddress(record.claimant)) {
                throw new Error(`Invalid claimant address: ${record.claimant}`);
            }

            const cfg = {
                token: tokenAddress,
                initialOwner: record.initialOwner,
                claimant: record.claimant,
                cliffDuration: cliffDurationSeconds,
                vestingDuration: vestingDurationSeconds,
                tgeTime: tgeTime,
                tgePercentage: eX(tgePercentage, 4),
                totalAmount: e18(amount.toString()),
            };

            if (claimantCount[cfg.claimant]) {
                claimantCount[cfg.claimant]++;
            } else {
                claimantCount[cfg.claimant] = 1;
            }

            vestingConfigs.push(cfg);
        }

        for (const [claimant, count] of Object.entries(claimantCount)) {
            if (count > 1) {
                console.warn(
                    `Claimant ${claimant} appears ${count} times in the input file.`,
                );
            }
        }

        // pretty print the vesting configs
        console.log("Vesting configs to deploy:");
        vestingConfigs.forEach((cfg, index) => {
            console.log(
                `Config ${index + 1}:`,
                `Claimant: ${cfg.claimant}, Amount: ${hre.ethers.formatEther(cfg.totalAmount)} tokens, TGE: ${hre.ethers.formatUnits(cfg.tgePercentage, 4)}%, Cliff: ${cfg.cliffDuration} seconds (${BigInt(cfg.cliffDuration) / BigInt(secondsInMonth)} months), Vesting: ${cfg.vestingDuration} seconds (${BigInt(cfg.vestingDuration) / BigInt(secondsInMonth)} months)`,
            );
        });

        console.log(
            `Total vesting configs to deploy: ${vestingConfigs.length}`,
        );
        console.log(`Total amount to vest: ${totalAmount} tokens`);

        const factoryAddress = settings.file("addresses").mustGet("factory");
        const factory = await hre.ethers.getContractAt(
            "VestingFactory",
            factoryAddress,
        );

        // split vestingConfigs into chunks of 100
        const chunkSize = 20;
        const chunkedVestingConfigs: IVesting.VestingConfigStruct[][] = [];
        for (let i = 0; i < vestingConfigs.length; i += chunkSize) {
            chunkedVestingConfigs.push(vestingConfigs.slice(i, i + chunkSize));
        }

        let totalAddresses = 0;
        let totalAmountReprocessed = 0n;
        for (const chunk of chunkedVestingConfigs) {
            totalAddresses += chunk.length;
            for (const cfg of chunk) {
                totalAmountReprocessed += BigInt(cfg.totalAmount);
            }

            if (!taskArgs.dry) {
                const tx = await factory.deployBatch(chunk);
                console.log(`Transaction sent: ${tx.hash}`);
                const receipt = await tx.wait();
                console.log(
                    `Transaction confirmed: ${tx.hash}. Gas used: ${receipt?.gasUsed.toString()}`,
                );
            }
        }

        console.log(
            `Deployed ${totalAddresses} vesting contracts with total amount of ${hre.ethers.formatEther(
                totalAmountReprocessed,
            )} tokens.`,
        );
    });

interactScope
    .task("factory:setupNextBatch", "Setup the next batch of vesting contracts")
    .addFlag("dry", "Run the task in dry mode (no transactions will be sent)")
    .addParam("iterations", "Number of iterations to setup")
    .setAction(async (taskArgs: { iterations: number; dry: boolean }, hre) => {
        const factoryAddress = Settings.file("addresses").mustGet("factory");

        const factory = await hre.ethers.getContractAt(
            "VestingFactory",
            factoryAddress,
        );

        const iterations = Number(taskArgs.iterations);
        if (isNaN(iterations) || iterations <= 0) {
            throw new Error(`Invalid iterations: ${taskArgs.iterations}`);
        }

        console.log(`Setting up ${iterations} iterations...`);

        const nextBatchIndex = await factory.nextBatchIndex();
        console.log(`Next batch index: ${nextBatchIndex}`);

        const nextBatch = await factory.getNextBatchDeployments(iterations);
        if (nextBatch.length === 0) {
            console.log("No deployments found for the next batch.");
            return;
        }

        console.log(
            `Found ${nextBatch.length} deployments for the next batch.`,
        );

        let tokensNeeded: bigint = 0n;
        for (let i = 0; i < nextBatch.length; i++) {
            tokensNeeded += nextBatch[i].amount;
        }

        console.log(
            `Tokens needed for next ${iterations} batches: ${tokensNeeded}`,
        );

        if (taskArgs.dry) {
            console.log("Dry run mode: No transactions will be sent.");
            return;
        }

        const [deployer] = await hre.ethers.getSigners();

        const tokenAddress = new Settings()
            .mustGetReader("factory")
            .mustGetAddress("token");

        const token = await hre.ethers.getContractAt("IERC20", tokenAddress);
        const balance = await token.balanceOf(deployer);

        console.log(
            `Deployer balance: ${hre.ethers.formatEther(balance)} tokens`,
        );

        if (balance < tokensNeeded) {
            throw new Error(
                `Deployer balance is less than needed: ${hre.ethers.formatEther(
                    balance,
                )} < ${hre.ethers.formatEther(tokensNeeded)}`,
            );
        }

        const approveTx = await token.approve(factoryAddress, tokensNeeded);

        console.log(`Approve transaction sent: ${approveTx.hash}`);
        const approveReceipt = await approveTx.wait();
        console.log(
            `Approve transaction confirmed: ${approveTx.hash}. Gas used: ${approveReceipt?.gasUsed.toString()}`,
        );

        const setupTx = await factory.setupNextBatch(iterations);
        console.log(`Setup transaction sent: ${setupTx.hash}`);
        const setupReceipt = await setupTx.wait();
        console.log(
            `Setup transaction confirmed: ${setupTx.hash}. Gas used: ${setupReceipt?.gasUsed.toString()}`,
        );
    });

interactScope
    .task("factory:readAll", "Read all deployments from the factory")
    .setAction(async (taskArgs: {}, hre) => {
        const factoryAddress = Settings.file("addresses").mustGet("factory");

        const factory = (await hre.ethers.getContractAt(
            "VestingFactory",
            factoryAddress,
        )) as VestingFactory;

        const totalDeployments = await factory.getNumberOfDeployments();

        console.log(`Total deployments: ${totalDeployments}`);

        for (let i = 0; i < totalDeployments; i++) {
            const deployment = await factory.deployments(i);
            console.log(
                `Deployment ${i}: Claimant: ${deployment.claimant}, Amount: ${hre.ethers.formatEther(deployment.amount)} tokens, Vesting: ${deployment.vesting}`,
            );

            const vestingContract = (await hre.ethers.getContractAt(
                "Vesting",
                deployment.vesting,
            )) as Vesting;

            const cfg = await vestingContract.config();
            console.log(
                `  Config: Initial Owner: ${cfg.initialOwner}, Token: ${cfg.token}, TGE Time: ${cfg.tgeTime}, TGE Percentage: ${hre.ethers.formatUnits(cfg.tgePercentage, 4)}%, Cliff Duration: ${cfg.cliffDuration} seconds, Vesting Duration: ${cfg.vestingDuration} seconds, Total Amount: ${hre.ethers.formatEther(cfg.totalAmount)} tokens`,
            );
        }
    });
