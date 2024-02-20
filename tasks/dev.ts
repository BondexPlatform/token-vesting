import { scope } from "hardhat/config";

const devScope = scope("dev");

devScope
    .task("deploy:erc20mock", "Deploy ERC20Mock")
    .setAction(async (taskArgs, hre) => {
        const erc20Mock = await hre.ethers.deployContract("ERC20Mock", [18]);
        await erc20Mock.waitForDeployment();

        console.log(`ERC20Mock deployed to: ${await erc20Mock.getAddress()}`);
    });
