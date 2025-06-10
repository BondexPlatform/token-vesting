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
        "[BscScan.com 05/06/2025 16:18:48] I, hereby verify that I am the owner/creator of the address [0x1036b2379F506761f237FBa7463857924Ef21Ce3]";
    const signature = await signer.signMessage(message);

    console.log(`Message: ${message}`);
    console.log(`Signature: ${signature}`);
});
