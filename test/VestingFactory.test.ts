import { deployVestingFactory } from "./fixtures";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { IVesting } from "../typechain-types/contracts/Vesting";
import { e18 } from "./helpers/scale";

describe("VestingFactory", () => {
    it("cannot deploy with empty token", async () => {
        const impl = await ethers.deployContract("Vesting");
        await impl.waitForDeployment();

        const [deployer] = await ethers.getSigners();

        await expect(
            ethers.deployContract("VestingFactory", [
                await impl.getAddress(),
                deployer.address,
                ethers.ZeroAddress,
            ]),
        ).to.be.revertedWithCustomError(
            await ethers.getContractFactory("VestingFactory"),
            "VestingFactory_InvalidToken",
        );
    });

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

        it("emits event", async () => {
            const { factory, deployer, impl } =
                await loadFixture(deployVestingFactory);

            const newImpl = await ethers.deployContract("Vesting");
            await newImpl.waitForDeployment();

            await expect(
                factory
                    .connect(deployer)
                    .setImplementation(await newImpl.getAddress()),
            )
                .to.emit(factory, "ImplementationSet")
                .withArgs(await newImpl.getAddress());
        });
    });

    describe("deploy", () => {
        it("reverts if called by non-owner", async () => {
            const { factory, token, u1 } =
                await loadFixture(deployVestingFactory);

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
                    initialOwner: ethers.ZeroAddress,
                }),
            ).to.be.revertedWithCustomError(
                factory,
                "OwnableUnauthorizedAccount",
            );
        });

        it("works", async () => {
            const { factory, token, deployer, u1, impl } =
                await loadFixture(deployVestingFactory);

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
                    initialOwner: ethers.ZeroAddress,
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

        it("returns deployed address", async () => {
            const { factory, token, deployer, u1, impl } =
                await loadFixture(deployVestingFactory);

            const ts = await time.latest();

            const addr = await factory.connect(deployer).deploy.staticCall(<
                IVesting.VestingConfigStruct
            >{
                token: await token.getAddress(),
                claimant: u1.address,
                cliffDuration: 0,
                vestingDuration: time.duration.days(100),
                tgeTime: ts + time.duration.days(7),
                tgePercentage: 0n,
                totalAmount: e18(1000),
                initialOwner: ethers.ZeroAddress,
            });

            expect(addr).to.be.properAddress;
            expect(addr).to.not.equal(ethers.ZeroAddress);
        });

        it("emits event", async () => {
            const { factory, token, deployer, u1, impl } =
                await loadFixture(deployVestingFactory);

            const ts = await time.latest();

            const addr = await factory.connect(deployer).deploy.staticCall(<
                IVesting.VestingConfigStruct
            >{
                token: await token.getAddress(),
                claimant: u1.address,
                cliffDuration: 0,
                vestingDuration: time.duration.days(100),
                tgeTime: ts + time.duration.days(7),
                tgePercentage: 0n,
                totalAmount: e18(1000),
                initialOwner: ethers.ZeroAddress,
            });

            await expect(
                factory.connect(deployer).deploy(<IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u1.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(1000),
                    initialOwner: ethers.ZeroAddress,
                }),
            )
                .to.emit(factory, "VestingDeployed")
                .withArgs(u1.address, addr, e18(1000));
        });

        it("works with batches", async () => {
            const { factory, token, u1, u2, u3 } =
                await loadFixture(deployVestingFactory);

            const ts = await time.latest();

            const vestingConfig1 = [
                <IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u1.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(300),
                    initialOwner: ethers.ZeroAddress,
                },
            ];

            const vestingConfig2 = [
                <IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u2.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(1000),
                    initialOwner: ethers.ZeroAddress,
                },
                <IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u3.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(500),
                    initialOwner: ethers.ZeroAddress,
                },
            ];

            expect(
                await factory.getVestingOfClaimer(u1.address),
            ).to.have.lengthOf(0);

            const tx1 = await factory.deployBatch(vestingConfig1);
            const gasUsed1 = (await tx1.wait())!.gasUsed;

            const tx2 = await factory.deployBatch(vestingConfig2);
            const gasUsed2 = (await tx2.wait())!.gasUsed;

            expect(
                await factory.getVestingOfClaimer(u1.address),
            ).to.have.lengthOf(1);
            expect(
                await factory.getVestingOfClaimer(u2.address),
            ).to.have.lengthOf(1);
            expect(
                await factory.getVestingOfClaimer(u3.address),
            ).to.have.lengthOf(1);

            console.log("Gas used for batch of 1: ", gasUsed1);
            console.log("Gas used for batch of 2: ", gasUsed2);
            console.log(`Diff: ${gasUsed2 - gasUsed1}`);
        });

        it("can batch setup deployed vesting contracts", async () => {
            const { factory, deployer, token, u1, u2, u3 } =
                await loadFixture(deployVestingFactory);

            const ts = await time.latest();

            const vestingConfigs = [
                <IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u1.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(300),
                    initialOwner: ethers.ZeroAddress,
                },
                <IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u2.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(1000),
                    initialOwner: ethers.ZeroAddress,
                },
                <IVesting.VestingConfigStruct>{
                    token: await token.getAddress(),
                    claimant: u3.address,
                    cliffDuration: 0,
                    vestingDuration: time.duration.days(100),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0n,
                    totalAmount: e18(500),
                    initialOwner: ethers.ZeroAddress,
                },
            ];

            await token.mint(deployer, e18(1800));
            await token.connect(deployer).approve(factory, e18(1800));

            const tx = await factory
                .connect(deployer)
                .deployBatch(vestingConfigs);

            const gasUsed = (await tx.wait())!.gasUsed;

            console.log("Gas used for batch deploy: ", gasUsed);

            const vestingContracts = await factory.getAllDeployments();
            expect(vestingContracts.length).to.be.equal(3);

            const tx2 = await factory.connect(deployer).setupNextBatch(2);
            const gasUsed2 = (await tx2.wait())!.gasUsed;

            expect(
                await token.balanceOf(vestingContracts[0].vesting),
            ).to.be.equal(vestingConfigs[0].totalAmount);

            expect((await factory.deployments(0)).isSetupDone).to.be.true;

            expect(
                await token.balanceOf(vestingContracts[1].vesting),
            ).to.be.equal(vestingConfigs[1].totalAmount);

            expect((await factory.deployments(1)).isSetupDone).to.be.true;

            expect(
                await token.balanceOf(vestingContracts[2].vesting),
            ).to.be.equal(0);

            expect((await factory.deployments(2)).isSetupDone).to.be.false;

            console.log("Gas used for batch setup (first 2): ", gasUsed2);

            const tx3 = await factory.connect(deployer).setupNextBatch(2);
            const gasUsed3 = (await tx3.wait())!.gasUsed;

            console.log("Gas used for batch setup (last 1): ", gasUsed3);

            expect(
                await token.balanceOf(vestingContracts[2].vesting),
            ).to.be.equal(vestingConfigs[2].totalAmount);

            expect((await factory.deployments(2)).isSetupDone).to.be.true;

            await expect(
                factory.setupNextBatch(10),
            ).to.be.revertedWithCustomError(
                factory,
                "VestingFactory_NothingToSetup",
            );
        });
    });
});
