const { ethers } = require('ethers');
const axios = require('axios');

// For prototype purposes, we take the private key as an argument
const PRIVATE_KEY = process.argv[2];
if (!PRIVATE_KEY) {
    console.error("Usage: node client.js <PRIVATE_KEY>");
    process.exit(1);
}

const wallet = new ethers.Wallet(PRIVATE_KEY);
console.log(`🚀 Starting CensorScope Node Client`);
console.log(`📡 Wallet Address: ${wallet.address}`);

const COORDINATOR_URL = 'http://localhost:5000/api';

async function performLocalCheck(domain, country) {
    // In a real production environment, this node would use proxies/VPNs or run locally in 'country'
    // For this prototype, we simulate a check result.
    console.log(`[Verify] Testing connectivity to ${domain} from simulated location: ${country}...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    // Add some random noise to simulate different ISPs reacting differently
    const isBlocked = Math.random() > 0.6; 
    let blockType = 'None';
    
    if (isBlocked) {
        const types = ['DNS Tampering', 'TCP Reset', 'IP Null Routing'];
        blockType = types[Math.floor(Math.random() * types.length)];
    }
    
    return { isBlocked, blockType };
}

async function signAndSubmit(domain, country, isBlocked, blockType) {
    const payload = { domain, country, isBlocked, blockType };
    const payloadString = JSON.stringify(payload);
    
    // Cryptographically sign the payload to prove this node performed the check
    const signature = await wallet.signMessage(payloadString);
    
    try {
        await axios.post(`${COORDINATOR_URL}/submit_vote`, {
            domain,
            country,
            isBlocked,
            blockType,
            signature,
            nodeAddress: wallet.address
        });
        console.log(`✅ Successfully submitted signed vote for ${domain} (${country})`);
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            console.log(`⚠️ Submission rejected: ${error.response.data.error}`);
        } else {
            console.error(`❌ Failed to submit vote: ${error.message}`);
        }
    }
}

async function pollJobs() {
    try {
        const res = await axios.get(`${COORDINATOR_URL}/jobs`);
        const jobs = res.data.jobs || [];
        
        if (jobs.length > 0) {
            console.log(`[Coordinator] Found ${jobs.length} active verification requests.`);
            for (const job of jobs) {
                // If we haven't already voted on this job
                const hasVoted = job.votes.some(v => v.nodeAddress.toLowerCase() === wallet.address.toLowerCase());
                if (!hasVoted) {
                    const result = await performLocalCheck(job.domain, job.country);
                    await signAndSubmit(job.domain, job.country, result.isBlocked, result.blockType);
                }
            }
        }
    } catch (error) {
        console.log(`[Coordinator] Unreachable... retrying in 5s (${error.message})`);
    }
}

// Poll every 5 seconds
setInterval(pollJobs, 5000);
console.log(`Listening for incoming verification requests...`);
