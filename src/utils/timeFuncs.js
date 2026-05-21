"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timetostring = timetostring;
function timetostring(ms) {
    let seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 60 / 60 / 24);
    seconds = seconds - days * 60 * 60 * 24;
    const hours = Math.floor(seconds / 60 / 60);
    seconds = seconds - hours * 60 * 60;
    const minutes = Math.floor(seconds / 60);
    seconds = seconds - minutes * 60;
    return (days > 0 ? days + " Days, " : "") + (hours > 0 ? hours + " Hours, " : "") + (minutes > 0 ? minutes + " Minutes, " : "") + seconds + " Seconds";
}
