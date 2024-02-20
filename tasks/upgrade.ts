import { scope, task } from "hardhat/config";
import { Settings } from "deploy-settings-manager";

const upgradeScope = scope("upgrade", "Upgrade contracts");

upgradeScope
    .task("contract", "Upgrade contract to new implementation")
    .addParam("name", "Contract name (e.g. 'token')")
    .addParam("factory", "Contract factory name (e.g. 'BaseERC20')")
    .addOptionalParam("tag", "Deployment tag, if available")
    .setAction(
        async (
            taskArgs: {
                name: string;
                factory: string;
                tag: string;
            },
            hre,
        ) => {
            let addresses = Settings.file("addresses");
            if (taskArgs.tag) {
                addresses = addresses.tag(taskArgs.tag);
            }

            let ctrAddr = addresses.mustGet(taskArgs.name);

            await hre.run("deploy-implementations", {
                contracts: [taskArgs.factory],
            });

            const Factory = await hre.ethers.getContractFactory(
                taskArgs.factory,
            );

            const ctr = await hre.upgrades.upgradeProxy(ctrAddr, Factory);
            await ctr.waitForDeployment();

            const receipt = await ctr.deploymentTransaction()?.wait();
            console.log(
                `Upgraded ${taskArgs.name}. Gas used: ${receipt?.gasUsed}`,
            );
        },
    );

upgradeScope
    .task(
        "validate",
        "Validate upgrade of contract (only works if implementation was imported into openzeppelin upgrades plugin)",
    )
    .addParam("name", "Contract name (e.g. 'token')")
    .addParam("factory", "Contract factory name (e.g. 'BaseErc20')")
    .addOptionalParam("tag", "Deployment tag, if available")
    .setAction(
        async (
            taskArgs: {
                name: string;
                factory: string;
                tag: string;
            },
            hre,
        ) => {
            let addresses = Settings.file("addresses");
            if (taskArgs.tag) {
                addresses = addresses.tag(taskArgs.tag);
            }

            const ctrAddr = addresses.mustGet(taskArgs.name);

            await hre.run("compile", { quiet: true });

            await hre.upgrades.validateUpgrade(
                ctrAddr,
                await hre.ethers.getContractFactory(taskArgs.factory),
            );
        },
    );
