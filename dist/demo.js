"use strict";
/**
 * AlphaVault Demo Script
 *
 * Demonstrates the full challenge flow:
 * 1. List challenges
 * 2. Enter a challenge
 * 3. Monitor performance
 * 4. Wait for pass/fail
 * 5. Apply for funded account
 */
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
async function api(method, path, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body)
        opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    return res.json();
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
async function main() {
    console.log('🏦 AlphaVault Demo — Full Challenge Flow\n');
    console.log('='.repeat(50));
    // 1. Health check
    console.log('\n📡 Health check...');
    const health = await api('GET', '/health');
    console.log(`   Service: ${health.service} v${health.version} (${health.network})`);
    // 2. List challenges
    console.log('\n📋 Available Challenges:');
    const { data: challenges } = await api('GET', '/challenges');
    for (const c of challenges) {
        console.log(`   • ${c.name} — $${c.startingCapital.toLocaleString()} | ${c.durationHours}h | Target: ${c.profitTarget}% | Max DD: ${c.maxDrawdown}%`);
    }
    const targetChallenge = challenges[0]; // Starter Challenge
    console.log(`\n🎯 Entering: ${targetChallenge.name}`);
    // 3. Enter challenge with 3 agents
    const agents = [
        { agentId: 'agent-alpha-001', agentName: 'AlphaBot' },
        { agentId: 'agent-sigma-002', agentName: 'SigmaTrader' },
        { agentId: 'agent-omega-003', agentName: 'OmegaQuant' },
    ];
    for (const agent of agents) {
        const { data } = await api('POST', `/challenges/${targetChallenge.id}/enter`, agent);
        console.log(`   🤖 ${agent.agentName} entered — SubAccount #${data.entry.subAccountId} | Authority: ${data.entry.authority.slice(0, 8)}...`);
    }
    // 4. Monitor performance over several cycles
    console.log('\n📊 Monitoring performance (waiting 30 seconds)...\n');
    for (let i = 0; i < 6; i++) {
        await sleep(5000);
        // Check each agent's status
        for (const agent of agents) {
            const { data: entry } = await api('GET', `/challenges/${targetChallenge.id}/status/${agent.agentId}`);
            const m = entry.metrics;
            const statusIcon = entry.status === 'active' ? '🟢' :
                entry.status === 'passed' ? '✅' :
                    entry.status === 'failed' ? '❌' : '⏰';
            console.log(`   ${statusIcon} ${agent.agentName.padEnd(14)} | ` +
                `PnL: ${m.currentPnlPercent >= 0 ? '+' : ''}${m.currentPnlPercent.toFixed(2)}% | ` +
                `DD: ${m.maxDrawdownPercent.toFixed(2)}% | ` +
                `Sharpe: ${m.sharpeRatio.toFixed(2)} | ` +
                `Trades: ${m.totalTrades} | ` +
                `Status: ${entry.status}`);
        }
        console.log('   ---');
    }
    // 5. Check leaderboard
    console.log('\n🏆 Leaderboard:');
    const { data: lb } = await api('GET', `/challenges/${targetChallenge.id}/leaderboard`);
    for (const entry of lb.leaderboard) {
        console.log(`   #${entry.rank} ${entry.agentName.padEnd(14)} | ` +
            `PnL: ${entry.pnlPercent >= 0 ? '+' : ''}${entry.pnlPercent.toFixed(2)}% | ` +
            `DD: ${entry.maxDrawdown.toFixed(2)}% | ` +
            `Sharpe: ${entry.sharpeRatio.toFixed(2)} | ` +
            `${entry.status}`);
    }
    // 6. Try to apply for funding (may or may not have passed yet)
    console.log('\n💰 Applying for funded accounts...');
    for (const agent of agents) {
        const result = await api('POST', '/funded/apply', agent);
        if (result.success) {
            console.log(`   ✅ ${agent.agentName} — Funded $${result.data.allocation.toLocaleString()} (${result.data.status})`);
        }
        else {
            console.log(`   ⏳ ${agent.agentName} — ${result.error}`);
        }
    }
    // 7. Check funded status
    console.log('\n📈 Funded Account Status:');
    for (const agent of agents) {
        const result = await api('GET', `/funded/${agent.agentId}/status`);
        if (result.success) {
            const fa = result.data;
            console.log(`   ${agent.agentName} — $${fa.allocation.toLocaleString()} | Status: ${fa.status} | Proof: ${fa.proofTx || 'pending'}`);
        }
        else {
            console.log(`   ${agent.agentName} — Not funded yet`);
        }
    }
    console.log('\n' + '='.repeat(50));
    console.log('🏦 AlphaVault Demo Complete!\n');
}
main().catch(console.error);
//# sourceMappingURL=demo.js.map