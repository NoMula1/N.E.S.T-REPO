"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scope = exports.Scope = void 0;
exports.setScope = setScope;
exports.fromString = fromString;
exports.toString = toString;
// GlobalScope is kept for backwards compatibility but the dual-scope system
// has been removed. All commands run in the single Default scope.
var Scope;
(function (Scope) {
    Scope[Scope["Default"] = 0] = "Default";
    Scope[Scope["Admin"] = 1] = "Admin";
})(Scope || (exports.Scope = Scope = {}));
exports.scope = Scope.Default;
function setScope(_) { }
function fromString(_) { return Scope.Default; }
function toString(_) { return 'Default'; }
