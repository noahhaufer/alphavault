/**
 * AlphaVault MCP Server
 * Exposes AlphaVault's REST API as MCP tools for AI agents.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.ALPHAVAULT_API_URL || 'http://localhost:3000';

async function api(method: string, path: string, body?: unknown): Promise<unknown> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  return res.json();
}

const server = new McpServer({
  name: 'alphavault',
  version: '1.0.0',
});

// 1. list_challenges
server.tool(
  'list_challenges',
  'List all available challenges with tier, phase, profit target, and fees',
  {},
  async () => {
    const result = await api('GET', '/api/challenges');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 2. enter_challenge
server.tool(
  'enter_challenge',
  'Enter an agent into a challenge',
  {
    challengeId: z.string().describe('The challenge ID to enter'),
    agentId: z.string().describe('Unique agent identifier'),
    agentName: z.string().describe('Display name for the agent'),
  },
  async ({ challengeId, agentId, agentName }) => {
    const result = await api('POST', `/api/challenges/${challengeId}/enter`, { agentId, agentName });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 3. place_order
server.tool(
  'place_order',
  'Place a perpetual order on Drift via AlphaVault',
  {
    agentId: z.string().describe('Agent identifier'),
    entryId: z.string().describe('Challenge entry ID'),
    side: z.enum(['long', 'short']).describe('Trade direction'),
    size: z.number().describe('Position size'),
    orderType: z.enum(['market', 'limit']).describe('Order type'),
    price: z.number().optional().describe('Limit price (required for limit orders)'),
  },
  async ({ agentId, entryId, side, size, orderType, price }) => {
    const result = await api('POST', '/api/trading/order', { agentId, entryId, side, size, orderType, price });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 4. get_positions
server.tool(
  'get_positions',
  'Get current positions for a challenge entry',
  {
    entryId: z.string().describe('Challenge entry ID'),
  },
  async ({ entryId }) => {
    const result = await api('GET', `/api/trading/positions/${entryId}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 5. get_challenge_status
server.tool(
  'get_challenge_status',
  "Get an agent's challenge status and metrics",
  {
    challengeId: z.string().describe('Challenge ID'),
    agentId: z.string().describe('Agent identifier'),
  },
  async ({ challengeId, agentId }) => {
    const result = await api('GET', `/api/challenges/${challengeId}/status/${agentId}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 6. get_leaderboard
server.tool(
  'get_leaderboard',
  'Get challenge leaderboard rankings',
  {
    challengeId: z.string().describe('Challenge ID'),
  },
  async ({ challengeId }) => {
    const result = await api('GET', `/api/challenges/${challengeId}/leaderboard`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 7. close_positions
server.tool(
  'close_positions',
  'Close all positions for a challenge entry',
  {
    entryId: z.string().describe('Challenge entry ID'),
  },
  async ({ entryId }) => {
    const result = await api('POST', `/api/trading/close-all/${entryId}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 8. apply_for_funding
server.tool(
  'apply_for_funding',
  'Apply for a funded account after passing challenges',
  {
    agentId: z.string().describe('Agent identifier'),
    agentName: z.string().describe('Display name for the agent'),
  },
  async ({ agentId, agentName }) => {
    const result = await api('POST', '/api/funded/apply', { agentId, agentName });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AlphaVault MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
