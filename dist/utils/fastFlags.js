"use strict";
// A file containing every default-loaded fast flag
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastFlagList = void 0;
exports.fastFlagList = [
    {
        refName: 'DisablePostCreation',
        enabled: false,
        description: 'Disable members from creating posts'
    },
    {
        refName: 'DisableTicketOpening',
        enabled: false,
        description: 'Disable members from opening tickets'
    },
    {
        refName: 'DoPostExpiration',
        enabled: true,
        description: 'Should NEST periodically iterate through saved posts to check for (and delete) expired data'
    },
    {
        refName: 'DoPostTemplateExpiration',
        enabled: true,
        description: 'Should NEST periodically iterate through saved post templates to check for (and delete) expired data'
    },
    {
        refName: 'ReleaseMarketRevamp',
        enabled: false,
        description: 'Whether or not the market revamp is released'
    },
    {
        refName: 'ReleaseCentralizationBranch',
        enabled: false,
        description: 'Whether or not the centralization branch is released'
    },
    {
        refName: 'ReleaseMarketTagSearch',
        enabled: false,
        description: 'Whether or not users can search via tags'
    },
    {
        refName: "DoAutoApprovalForPostCreationBacklog",
        enabled: false,
        description: "Should NEST periodically iterate through saved posts to approve posts after 80+ templates have been backlogged"
    }
];
