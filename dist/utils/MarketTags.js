"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketTags = void 0;
// Object uses bitwise operations to pack multiple tags into one int for storage purposes
// Underscores will be substitued with spaces.
//
// For example, to create a bitwise tag with Scripting, Web_Dev and In_Studio, you can do `const bitwiseTag = MarketTags.skillBased.Scripting | MarketTags.skillBased.Web_Dev | MarketTags.circumstanceBased.In_Studio`
// which equals 2561
exports.MarketTags = {
    // Skill-based tags
    skillBased: {
        Scripting: 1 << 0,
        Building: 1 << 1,
        Modeling: 1 << 2,
        Animating: 1 << 3,
        UI_UX: 1 << 4,
        Music_Composition: 1 << 5,
        SFX: 1 << 6,
        Bot_Development: 1 << 7,
        GFX: 1 << 8,
        Web_Dev: 1 << 9,
        Investement: 1 << 10,
    },
    // Circumstance-based tags
    circumstanceBased: {
        In_Studio: 1 << 11,
        Off_Studio: 1 << 12,
    }
};
