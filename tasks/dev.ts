import { scope } from "hardhat/config";

const devScope = scope("dev");

devScope
    .task("deploy:erc20mock", "Deploy ERC20Mock")
    .setAction(async (taskArgs, hre) => {
        const erc20Mock = await hre.ethers.deployContract("ERC20Mock", [18]);
        await erc20Mock.waitForDeployment();

        console.log(`ERC20Mock deployed to: ${await erc20Mock.getAddress()}`);
    });

devScope.task("sign", "Sign a message").setAction(async (taskArgs, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const message =
        "[Etherscan.io 03/06/2025 10:57:25] I, hereby verify that I am the owner/creator of the address [0xBdBDBDd0c22888E63CB9098aD6D68439197CB091]";
    const signature = await signer.signMessage(message);

    console.log(`Message: ${message}`);
    console.log(`Signature: ${signature}`);
});
