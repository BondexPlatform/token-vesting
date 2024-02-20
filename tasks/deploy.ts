import { scope } from "hardhat/config";
import { e18, eX } from "../test/helpers/scale";
import { Settings } from "deploy-settings-manager";
import { ethers } from "ethers";
import { IVesting } from "../typechain-types/contracts/Vesting";

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
        const initialOwner = new Settings()
            .mustGetReader("factory")
            .mustGet("initialOwner");

        const factory = await hre.ethers.deployContract("VestingFactory", [
            impl,
            initialOwner,
        ]);
        await factory.waitForDeployment();

        Settings.file("addresses").set("factory", await factory.getAddress());

        console.log(
            `VestingFactory deployed to: ${await factory.getAddress()}`,
        );
    });

deployScope
    .task("vesting-upgradeable", "Deploy single vesting contract")
    .addParam("id", "ID of the vesting contract (must match value in settings)")
    .addFlag("dry", "Do not deploy")
    .addFlag("force", "Force deployment even if already deployed")
    .setAction(
        async (taskArgs: { id: string; dry: boolean; force: boolean }, hre) => {
            if (
                Settings.file("addresses").get(taskArgs.id) &&
                !taskArgs.force
            ) {
                console.log(
                    `Vesting contract with ID: ${taskArgs.id} already deployed. Use --force to override`,
                );
                return;
            }

            const settings = new Settings()
                .mustGetReader("vesting")
                .mustGetReader(taskArgs.id);

            const tokenAddr = settings.mustGetAddress("token");
            const token = await hre.ethers.getContractAt(
                "IERC20Metadata",
                tokenAddr,
            );

            const config = <IVesting.VestingConfigStruct>{
                token: tokenAddr,
                claimant: settings.mustGetAddress("claimant"),
                cliffDuration: settings.mustGet("cliffDurationSeconds"),
                vestingDuration: settings.mustGet("vestingDurationSeconds"),
                tgeTime: settings.mustGet("tgeTime"),
                tgePercentage: eX(settings.mustGet("tgePercentageUnscaled"), 4),
                totalAmount: eX(
                    settings.mustGet("totalAmountUnscaled"),
                    await token.decimals(),
                ),
            };

            console.log(
                "Deploying vesting contract with config:\n",
                JSON.stringify(config, null, 4),
            );

            console.log(
                "\n\tNote: values in settings should be unscaled. Values displayed above will be scaled automatically!\n",
            );

            if (taskArgs.dry) {
                console.log("Dry run, not deploying");
                return;
            }

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

            const Factory = await hre.ethers.getContractFactory("Vesting");
            const vesting = await hre.upgrades.deployProxy(Factory, [config]);
            await vesting.waitForDeployment();

            console.log(
                `Vesting contract deployed to: ${await vesting.getAddress()}`,
            );

            Settings.file("addresses").set(
                taskArgs.id,
                await vesting.getAddress(),
            );
        },
    );
