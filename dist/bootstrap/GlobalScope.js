"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scope = exports.Scope = void 0;
exports.setScope = setScope;
exports.fromString = fromString;
exports.toString = toString;
var Scope;
(function (Scope) {
    /** Central bot with most features. */
    Scope[Scope["Default"] = 0] = "Default";
    /** A bot running wioth Administrator permission. */
    Scope[Scope["Admin"] = 1] = "Admin";
})(Scope || (exports.Scope = Scope = {}));
/** The bot scope. */
exports.scope = Scope.Default;
/**
 * Should be called in the Core to set the global scope.
 * @param newScope The scope to use.
 */
function setScope(newScope) {
    exports.scope = newScope;
}
/**
 * Returns the scope for a user supplied string.
 * @param scope The case-insensitivescope string.
 * @returns The scope.
 */
function fromString(scope) {
    switch (scope.toLowerCase()) {
        case 'admin':
            return Scope.Admin;
        default:
            return Scope.Default;
    }
}
/**
 * Returns a display friendly string for the scope.
 * @param scope The scope.
 * @returns The display friendly string.
 */
function toString(scope) {
    switch (scope) {
        case Scope.Admin:
            return 'Admin';
        default:
            return 'Default';
    }
}
