import { scope } from "hardhat/config";
import { Settings } from "deploy-settings-manager";
import * as fs from "fs";

const readScope = scope("read");

type Deployment = {
    claimant: string;
    amount: string;
    vesting: string;
    isSetupDone: boolean;
    cliffDuration?: string;
    vestingDuration?: string;
    tgePercentage?: string;
};

readScope
    .task("allDeployments", "Read total claimed amount")
    .setAction(async (taskArgs, hre) => {
        const factoryAddress = Settings.file("addresses").mustGet("factory");
        const factory = await hre.ethers.getContractAt(
            "VestingFactory",
            factoryAddress,
        );

        const allDeployments = await factory.getAllDeployments();

        // Query claimant from each vesting contract's config
        let deployments: Deployment[] = [];
        for (const deployment of allDeployments) {
            console.log(
                `Querying deployment: ${deployment.vesting} for claimant and config`,
            );

            const vestingContract = await hre.ethers.getContractAt(
                "Vesting",
                deployment.vesting,
            );
            const config = await vestingContract.config();
            deployments.push({
                claimant: config.claimant,
                amount: hre.ethers.formatEther(deployment.amount),
                vesting: deployment.vesting,
                isSetupDone: deployment.isSetupDone,
                cliffDuration: Number(config.cliffDuration) / 86400 / 30  + " months",
                vestingDuration: Number(config.vestingDuration) / 86400 / 30 + " months",
                tgePercentage: hre.ethers.formatUnits(config.tgePercentage, 4) + "%",
            });
        }

        console.log(`Total deployments: ${deployments.length}`);

        const deploymentsFile = `./settings/${hre.network.name}/deployments.json`;

        // write allDeployments to file
        fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
    });

readScope
    .task("totalClaimed", "Read total claimed amount")
    .setAction(async (taskArgs, hre) => {
        // read deployments.json from corresponding network file
        const deploymentsFile = `./settings/${hre.network.name}/deployments.json`;

        if (!fs.existsSync(deploymentsFile)) {
            console.error(`Deployments file not found: ${deploymentsFile}`);
            return;
        }

        const deploymentsData = fs.readFileSync(deploymentsFile, "utf8");

        const deployments: Deployment[] = JSON.parse(deploymentsData);

        // for each contract in deployments, initialize the vesting contract and read claimed amount
        let totalClaimed = 0n;

        for (const deployment of deployments) {
            const vestingContract = await hre.ethers.getContractAt(
                "Vesting",
                deployment.vesting,
            );

            const claimedAmount = await vestingContract.amountClaimed();
            totalClaimed += claimedAmount;

            console.log(
                `Claimant: ${deployment.claimant}, Amount Claimed: ${hre.ethers.formatEther(claimedAmount)} tokens, Vesting: ${deployment.vesting}`,
            );
        }

        console.log(
            `Total claimed amount: ${hre.ethers.formatEther(totalClaimed)} tokens`,
        );
    });
