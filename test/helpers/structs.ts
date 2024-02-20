import { ethers } from "hardhat";
import { IVesting } from "../../typechain-types/contracts/Vesting";

export function _config(
    cfg: Partial<IVesting.VestingConfigStruct> = {},
): IVesting.VestingConfigStruct {
    return {
        token: ethers.ZeroAddress,
        claimant: ethers.ZeroAddress,
        cliffDuration: 0,
        vestingDuration: 0,
        tgeTime: 0,
        tgePercentage: 0n,
        totalAmount: 0n,
        ...cfg,
    };
}
