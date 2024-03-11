import { deployVesting, deployVestingInitialized } from "./fixtures";
import {
    loadFixture,
    mine,
    time,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { _config } from "./helpers/structs";
import { e18, eX } from "./helpers/scale";
import { ethers } from "hardhat";
import { IVesting } from "../typechain-types/contracts/Vesting";

describe("Vesting", () => {
    it("can be deployed", async () => {
        const { vesting } = await loadFixture(deployVesting);

        expect(await vesting.getAddress()).to.be.properAddress;
        expect(await vesting.version()).to.equal("1.0.0");
    });

    it("supportsInterface returns true for IVesting", async () => {
        const { vesting } = await loadFixture(deployVesting);

        expect(await vesting.supportsInterface("0xc51041d1")).to.be.true;
    });

    describe("initialize", () => {
        it("can be initialized", async () => {
            const { vesting, deployer, token } =
                await loadFixture(deployVesting);

            const ts = await time.latest();

            const cfg = _config({
                token: await token.getAddress(),
                claimant: deployer.address,
                cliffDuration: time.duration.days(30),
                vestingDuration: time.duration.days(365),
                tgeTime: ts + time.duration.days(7),
                tgePercentage: 10n * (await vesting.PERCENTAGE_SCALE_FACTOR()),
                totalAmount: e18(1000),
            });

            await vesting.initialize(cfg);

            const actualConfig = await vesting.config();
            expect(actualConfig.claimant).to.equal(cfg.claimant);
            expect(actualConfig.cliffDuration).to.equal(cfg.cliffDuration);
            expect(actualConfig.vestingDuration).to.equal(cfg.vestingDuration);
            expect(actualConfig.tgeTime).to.equal(cfg.tgeTime);
            expect(actualConfig.tgePercentage).to.equal(cfg.tgePercentage);
            expect(actualConfig.totalAmount).to.equal(cfg.totalAmount);
        });

        it("does sanity check on the provided config", async () => {
            const { vesting, deployer, token } =
                await loadFixture(deployVesting);

            const ts = await time.latest();

            const cfg = _config({
                token: await token.getAddress(),
                claimant: deployer.address,
                cliffDuration: time.duration.days(30),
                vestingDuration: time.duration.days(365),
                tgeTime: ts + time.duration.days(7),
                tgePercentage: 10n * (await vesting.PERCENTAGE_SCALE_FACTOR()),
                totalAmount: e18(1000),
            });

            await expect(
                vesting.initialize({ ...cfg, token: ethers.ZeroAddress }),
            )
                .to.be.revertedWithCustomError(vesting, "Vesting_InvalidConfig")
                .withArgs("token");

            await expect(
                vesting.initialize({ ...cfg, claimant: ethers.ZeroAddress }),
            )
                .to.be.revertedWithCustomError(vesting, "Vesting_InvalidConfig")
                .withArgs("claimant");

            await expect(vesting.initialize({ ...cfg, vestingDuration: 0 }))
                .to.be.revertedWithCustomError(vesting, "Vesting_InvalidConfig")
                .withArgs("vestingDuration");

            await expect(
                vesting.initialize({
                    ...cfg,
                    tgeTime: ts - time.duration.years(7),
                }),
            )
                .to.be.revertedWithCustomError(vesting, "Vesting_InvalidConfig")
                .withArgs("vesting over");

            await expect(
                vesting.initialize({
                    ...cfg,
                    tgePercentage:
                        200n * (await vesting.PERCENTAGE_SCALE_FACTOR()),
                }),
            )
                .to.be.revertedWithCustomError(vesting, "Vesting_InvalidConfig")
                .withArgs("tgePercentage");

            await expect(vesting.initialize({ ...cfg, totalAmount: 0 }))
                .to.be.revertedWithCustomError(vesting, "Vesting_InvalidConfig")
                .withArgs("totalAmount");
        });

        it("reverts if already initialized", async () => {
            const { vesting, deployer, token, u1 } =
                await loadFixture(deployVesting);

            const ts = await time.latest();

            const cfg = _config({
                token: await token.getAddress(),
                claimant: deployer.address,
                cliffDuration: time.duration.days(30),
                vestingDuration: time.duration.days(365),
                tgeTime: ts + time.duration.days(7),
                tgePercentage: 10n * (await vesting.PERCENTAGE_SCALE_FACTOR()),
                totalAmount: e18(1000),
            });

            await vesting.initialize(cfg);

            await expect(
                vesting.initialize({
                    ...cfg,
                    claimant: u1.address,
                }),
            ).to.be.revertedWithCustomError(vesting, "InvalidInitialization");
        });

        it("defaults tgeTime to current block timestamp if not provided", async () => {
            const { vesting, deployer, token } =
                await loadFixture(deployVesting);

            const cfg = _config({
                token: await token.getAddress(),
                claimant: deployer.address,
                cliffDuration: time.duration.days(30),
                vestingDuration: time.duration.days(365),
                tgePercentage: 10n * (await vesting.PERCENTAGE_SCALE_FACTOR()),
                totalAmount: e18(1000),
            });

            await vesting.initialize(cfg);

            const actualConfig = await vesting.config();
            expect(actualConfig.tgeTime).to.be.equal(await time.latest());
        });
    });

    describe("getClaimableAmount", () => {
        it("returns 0 if before tgeTime", async () => {
            const { vesting, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            const ts = await time.latest();

            expect(ts).to.be.lt(startTime);
            expect(await vesting.getClaimableAmount()).to.equal(0);
        });

        it("returns 0 if tgePercentage is 0 and after tgeTime", async () => {
            const ctr = await loadFixture(deployVesting);

            const ts = await time.latest();

            await ctr.vesting.initialize(
                _config({
                    token: await ctr.token.getAddress(),
                    claimant: ctr.u1.address,
                    cliffDuration: time.duration.days(30),
                    vestingDuration: time.duration.days(365),
                    tgeTime: ts + time.duration.days(7),
                    tgePercentage: 0,
                    totalAmount: e18(1000),
                }),
            );

            await time.increase(time.duration.days(10));

            const currentTS = await time.latest();
            expect(currentTS).to.be.greaterThan(
                (await ctr.vesting.config()).tgeTime,
            );

            expect(await ctr.vesting.getClaimableAmount()).to.equal(0);
        });

        it("returns amount computed using tgePercentage if after tgeTime", async () => {
            const { vesting, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            await time.increase(time.duration.days(10));

            const currentTS = await time.latest();
            expect(currentTS).to.be.greaterThan(startTime);

            const expectedAmount = (await vesting.config()).totalAmount / 10n;
            expect(await vesting.getClaimableAmount()).to.equal(expectedAmount);
        });

        it("returns TGE amount + vested amount if after vesting start", async () => {
            const { vesting, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            // 7 days after cliff
            await time.setNextBlockTimestamp(
                startTime + time.duration.days(30) + time.duration.days(7),
            );
            await mine();

            const totalAmount = (await vesting.config()).totalAmount;
            const tgeAmount = totalAmount / 10n;
            const remainingAmount = totalAmount - tgeAmount;

            // 7 days passed out of 365 days = 7 * 900 / 365 = ~17.26
            const vestedAmount = (remainingAmount * 7n) / 365n;
            expect(vestedAmount).to.be.closeTo(e18(17.26), e18(0.001));

            expect(await vesting.getClaimableAmount()).to.closeTo(
                e18(117.26),
                e18(0.001),
            );
        });

        it("returns the full amount after vesting end", async () => {
            const { vesting, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            // 366 days after cliff
            await time.setNextBlockTimestamp(
                startTime + time.duration.days(30) + time.duration.days(366),
            );
            await mine();

            expect(await vesting.getClaimableAmount()).to.equal(
                (await vesting.config()).totalAmount,
            );
        });
    });

    describe("claim", () => {
        it("reverts if not called by claimant", async () => {
            const { vesting, u2, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            await time.setNextBlockTimestamp(
                startTime + time.duration.days(30) + time.duration.days(7),
            );
            await mine();

            await expect(
                vesting.connect(u2).claim(),
            ).to.be.revertedWithCustomError(vesting, "Vesting_ClaimantOnly");
        });

        it("reverts if nothing to claim", async () => {
            const { vesting, u1, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            expect(await time.latest()).to.be.lt(startTime);

            await expect(
                vesting.connect(u1).claim(),
            ).to.be.revertedWithCustomError(vesting, "Vesting_NothingToClaim");
        });

        it("works if there is something to claim", async () => {
            const { vesting, token, u1, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            await time.setNextBlockTimestamp(
                startTime + time.duration.days(30) + time.duration.days(7),
            );

            await expect(vesting.connect(u1).claim()).to.not.be.reverted;

            expect(await vesting.getClaimableAmount()).to.equal(0);

            expect(await token.balanceOf(u1.address)).to.be.closeTo(
                e18(117.26),
                e18(0.001),
            );
            expect(await vesting.amountClaimed()).to.equal(
                await token.balanceOf(u1.address),
            );
        });

        it("multiple claims only transfer the amount accumulated since last claim", async () => {
            const { vesting, token, u1, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            await time.setNextBlockTimestamp(
                startTime + time.duration.days(30) + time.duration.days(7),
            );
            await expect(vesting.connect(u1).claim()).to.not.be.reverted;
            expect(await token.balanceOf(u1.address)).to.be.closeTo(
                e18(117.26),
                e18(0.001),
            );

            await time.setNextBlockTimestamp(
                startTime + time.duration.days(30) + time.duration.days(14),
            );
            await expect(vesting.connect(u1).claim()).to.not.be.reverted;

            // previous balance ~= 117.26
            // 7 days worth of tokens = 7 * 900 / 365 = ~17.26
            // => new balance ~= 117.26 + 17.26 = 134.52
            expect(await token.balanceOf(u1.address)).to.be.closeTo(
                e18(134.52),
                e18(0.001),
            );
        });

        it("emits event", async () => {
            const { vesting, u1, startTime } = await loadFixture(
                deployVestingInitialized,
            );

            await time.setNextBlockTimestamp(
                startTime + time.duration.days(30) + time.duration.days(7),
            );

            await expect(vesting.connect(u1).claim())
                .to.emit(vesting, "Claimed")
                .withArgs("117260273972602739726");
        });
    });
});
