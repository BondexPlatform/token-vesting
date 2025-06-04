import { scope } from "hardhat/config";
import { e18, eX } from "../test/helpers/scale";
import { Settings } from "deploy-settings-manager";
import { ethers } from "ethers";

const deployScope = scope("deploy", "Deploy contracts");

deployScope
    .task("implementations", "Deploy implementations")
    .addVariadicPositionalParam(
        "contracts",
        "Name of contracts to deploy implementation for",
        [],
    )
    .addFlag("dry", "Do not deploy")
    .addFlag("quiet", "Do not print anything")
    .setAction(
        async (
            taskArgs: { contracts: string[]; dry: boolean; quiet: boolean },
            hre,
        ) => {
            await hre.run("compile", { quiet: true });

            if (taskArgs.dry) {
                taskArgs.quiet ||
                    console.log(
                        `Want to deploy ${taskArgs.contracts.join(
                            ", ",
                        )} but "dry" is enabled`,
                    );
                return;
            }

            const implementations = new Settings("implementations");

            for (const contract of taskArgs.contracts) {
                taskArgs.quiet ||
                    console.log(
                        `Deploying implementation for contract: ${contract}`,
                    );

                const ctrFactory =
                    await hre.ethers.getContractFactory(contract);
                const tx = (await hre.upgrades.deployImplementation(
                    ctrFactory,
                    {
                        getTxResponse: true,
                    },
                )) as ethers.TransactionResponse;

                const receipt = await tx.wait();
                if (receipt != null) {
                    taskArgs.quiet ||
                        console.log(
                            `implementation:${contract} deployed to: ${receipt.contractAddress}.Gas used: ${receipt.gasUsed}`,
                        );
                    implementations.set(contract, receipt.contractAddress!);
                } else {
                    taskArgs.quiet || console.log("Could not get receipt");
                }
            }
        },
    );

deployScope
    .task("factory", "Deploy VestingFactory")
    .addFlag("dry", "Do not deploy")
    .setAction(async (taskArgs: { dry: boolean }, hre) => {
        await hre.run(
            {
                scope: "deploy",
                task: "implementations",
            },
            {
                contracts: ["Vesting"],
                dry: taskArgs.dry,
                quiet: true,
            },
        );

        const impl = new Settings("implementations").mustGet("Vesting");
        const settings = new Settings().mustGetReader("factory");
        const initialOwner = settings.mustGet("initialOwner");
        const tokenAddr = settings.mustGetAddress("token");

        const factory = await hre.ethers.deployContract("VestingFactory", [
            impl,
            initialOwner,
            tokenAddr,
        ]);
        await factory.waitForDeployment();

        Settings.file("addresses").set("factory", await factory.getAddress());

        console.log(
            `VestingFactory deployed to: ${await factory.getAddress()}`,
        );
    });
