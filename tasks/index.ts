import "./deploy";
import "./upgrade";
import "./dev";
import "./interact";
import "./read";

// @ts-ignore
BigInt.prototype.toJSON = function () {
    return this.toString();
};
