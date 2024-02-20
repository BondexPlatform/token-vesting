import { parseUnits } from "ethers";

export function eX(x: number | string | bigint, scale: number | bigint) {
    return parseUnits(x.toString(), scale);
}

export function e18(x: number | string | bigint) {
    return eX(x, 18);
}
