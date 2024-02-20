import "./deploy";
import "./upgrade";
import "./dev";

// @ts-ignore
BigInt.prototype.toJSON = function () {
    return this.toString();
};
