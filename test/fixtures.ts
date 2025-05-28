import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { _config } from "./helpers/structs";
import { e18, eX } from "./helpers/scale";

export async function deployCloneCreator() {
    const cloneCreator = await ethers.deployContract("CloneCreator");
    await cloneCreator.waitForDeployment();

    return { cloneCreator };
}

export async function deployERC20Mock() {
    const erc20Mock = await ethers.deployContract("ERC20Mock", [18]);
    await erc20Mock.waitForDeployment();

    return { erc20Mock };
}

export async function deployVesting() {
    const { cloneCreator } = await loadFixture(deployCloneCreator);

    const vestingImpl = await ethers.deployContract("Vesting");
    const implAddr = await vestingImpl.getAddress();

    // function output is not returned by call, so we do a staticCall first to find out what the address will be
    const vestingAddr = await cloneCreator.createClone.staticCall(implAddr);
    await cloneCreator.createClone(implAddr);

    const vesting = await ethers.getContractAt("Vesting", vestingAddr);

    const [deployer, u1, u2] = await ethers.getSigners();

    const { erc20Mock: token } = await deployERC20Mock();

    return { vesting, token, deployer, u1, u2 };
}

export async function deployVestingInitialized() {
    const ctr = await loadFixture(deployVesting);

    const ts = await time.latest();

    await ctr.vesting.initialize(
        _config({
            token: await ctr.token.getAddress(),
            claimant: ctr.u1.address,
            cliffDuration: time.duration.days(30),
            vestingDuration: time.duration.days(365),
            tgeTime: ts + time.duration.days(7),
            tgePercentage: 10n * (await ctr.vesting.PERCENTAGE_SCALE_FACTOR()),
            totalAmount: e18(1000),
        }),
    );

    await ctr.token.mint(await ctr.vesting.getAddress(), e18(1000));

    return { ...ctr, startTime: ts + time.duration.days(7) };
}

export async function deployVestingFactory() {
    const impl = await ethers.deployContract("Vesting");
    await impl.waitForDeployment();

    const [deployer, u1, u2, u3] = await ethers.getSigners();

    const token = await ethers.deployContract("ERC20Mock", [18]);
    await token.waitForDeployment();

    const factory = await ethers.deployContract("VestingFactory", [
        await impl.getAddress(),
        deployer.address,
        await token.getAddress(),
    ]);
    await factory.waitForDeployment();

    return { factory, deployer, u1, u2, u3, impl, token };
}
