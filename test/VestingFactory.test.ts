import { deployVestingFactory } from "./fixtures";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { IVesting } from "../typechain-types/contracts/Vesting";
import { e18 } from "./helpers/scale";

describe("VestingFactory", () => {
    it("should deploy the VestingFactory contract", async () => {
        const { factory, deployer, impl } =
            await loadFixture(deployVestingFactory);

        expect(await factory.getAddress()).to.be.properAddress;
        expect(await factory.owner()).to.be.equal(deployer.address);
        expect(await factory.vestingImplementation()).to.be.equal(
            await impl.getAddress(),
        );
    });

    describe("setImplementation", () => {
        it("reverts if not called by owner", async () => {
            const { factory, u1, impl } =
                await loadFixture(deployVestingFactory);

            await expect(
                factory.connect(u1).setImplementation(await impl.getAddress()),
            ).to.be.revertedWithCustomError(
                factory,
                "OwnableUnauthorizedAccount",
            );
        });

        it("reverts if new implementation doesn't respect the interface", async () => {
            const { factory, deployer } =
                await loadFixture(deployVestingFactory);

            await expect(
                factory.connect(deployer).setImplementation(ethers.ZeroAddress),
            ).to.be.revertedWithCustomError(
                factory,
                "VestingFactory_InvalidImplementation",
            );

            await expect(
                factory.connect(deployer).setImplementation(deployer.address),
            ).to.be.reverted;

            await expect(
                factory
                    .connect(deployer)
                    .setImplementation(await factory.getAddress()),
            ).to.be.revertedWithCustomError(
                factory,
                "VestingFactory_InvalidImplementation",
            );

            const newImpl = await ethers.deployContract("Vesting");
            await newImpl.waitForDeployment();

            await expect(
                factory
                    .connect(deployer)
                    .setImplementation(await newImpl.getAddress()),
            ).to.not.be.reverted;
        });
    });

    describe("deploy", () => {
        it("reverts if called by non-owner", async () => {
            const { factory, u1 } = await loadFixture(deployVestingFactory);

            const token = await ethers.deployContract("ERC20Mock", [18]);

            const ts = await time.latest();

            await expect(
                factory.connect(u1).deploy(<IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u1.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(1000),
                }),
            ).to.be.revertedWithCustomError(
                factory,
                "OwnableUnauthorizedAccount",
            );
        });

        it("works", async () => {
            const { factory, deployer, u1, impl } =
                await loadFixture(deployVestingFactory);

            const token = await ethers.deployContract("ERC20Mock", [18]);

            const ts = await time.latest();

            await expect(
                factory.connect(deployer).deploy(<IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u1.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(1000),
                }),
            ).to.not.be.reverted;

            const vestingContracts = await factory.getVestingOfClaimer(
                u1.address,
            );
            expect(vestingContracts.length).to.be.equal(1);

            const vesting = await ethers.getContractAt(
                "Vesting",
                vestingContracts[0],
            );
            expect((await vesting.config()).claimant).to.be.equal(u1.address);
        });
    });
});
