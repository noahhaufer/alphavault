"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * AlphaVault MCP Server
 * Exposes AlphaVault's REST API as MCP tools for AI agents.
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const API_BASE = process.env.ALPHAVAULT_API_URL || 'http://localhost:3000';
async function api(method, path, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body)
        opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    return res.json();
}
const server = new mcp_js_1.McpServer({
    name: 'alphavault',
    version: '1.0.0',
});
// 1. list_challenges
server.tool('list_challenges', 'List all available challenges with tier, phase, profit target, and fees', {}, async () => {
    const result = await api('GET', '/challenges');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// 2. enter_challenge
server.tool('enter_challenge', 'Enter an agent into a challenge', {
    challengeId: zod_1.z.string().describe('The challenge ID to enter'),
    agentId: zod_1.z.string().describe('Unique agent identifier'),
    agentName: zod_1.z.string().describe('Display name for the agent'),
}, async ({ challengeId, agentId, agentName }) => {
    const result = await api('POST', `/challenges/${challengeId}/enter`, { agentId, agentName });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// 3. place_order
server.tool('place_order', 'Place a perpetual order on Drift via AlphaVault', {
    agentId: zod_1.z.string().describe('Agent identifier'),
    entryId: zod_1.z.string().describe('Challenge entry ID'),
    side: zod_1.z.enum(['long', 'short']).describe('Trade direction'),
    size: zod_1.z.number().describe('Position size'),
    orderType: zod_1.z.enum(['market', 'limit']).describe('Order type'),
    price: zod_1.z.number().optional().describe('Limit price (required for limit orders)'),
}, async ({ agentId, entryId, side, size, orderType, price }) => {
    const result = await api('POST', '/trading/order', { agentId, entryId, side, size, orderType, price });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// 4. get_positions
server.tool('get_positions', 'Get current positions for a challenge entry', {
    entryId: zod_1.z.string().describe('Challenge entry ID'),
}, async ({ entryId }) => {
    const result = await api('GET', `/trading/positions/${entryId}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// 5. get_challenge_status
server.tool('get_challenge_status', "Get an agent's challenge status and metrics", {
    challengeId: zod_1.z.string().describe('Challenge ID'),
    agentId: zod_1.z.string().describe('Agent identifier'),
}, async ({ challengeId, agentId }) => {
    const result = await api('GET', `/challenges/${challengeId}/status/${agentId}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// 6. get_leaderboard
server.tool('get_leaderboard', 'Get challenge leaderboard rankings', {
    challengeId: zod_1.z.string().describe('Challenge ID'),
}, async ({ challengeId }) => {
    const result = await api('GET', `/challenges/${challengeId}/leaderboard`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// 7. close_positions
server.tool('close_positions', 'Close all positions for a challenge entry', {
    entryId: zod_1.z.string().describe('Challenge entry ID'),
}, async ({ entryId }) => {
    const result = await api('POST', `/trading/close-all/${entryId}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// 8. apply_for_funding
server.tool('apply_for_funding', 'Apply for a funded account after passing challenges', {
    agentId: zod_1.z.string().describe('Agent identifier'),
    agentName: zod_1.z.string().describe('Display name for the agent'),
}, async ({ agentId, agentName }) => {
    const result = await api('POST', '/funded/apply', { agentId, agentName });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('AlphaVault MCP server running on stdio');
}
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map