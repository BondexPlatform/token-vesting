import "./deploy";
import "./upgrade";
import "./dev";
import "./interact";

// @ts-ignore
BigInt.prototype.toJSON = function () {
    return this.toString();
};
