const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-Memory state for the Decentralized Network
const verificationPool = new Map(); // domain_country => { domain, country, votes: [], createdAt }
const completedVerifications = new Map(); // domain_country => result object

// --- Oracle Setup ---
const ORACLE_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat Account #0
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const oracleWallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);

// Load Contract ABI and Address
const CONTRACT_ADDRESS = '0xCD8a1C3ba11CF5ECfa6267617243239504a98d90';
const artifactPath = path.join(__dirname, '../smart_contracts/artifacts/contracts/DecentralizedRegistry.sol/DecentralizedRegistry.json');
const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const registryContract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, oracleWallet);

// 1. Frontend requests a verification
app.post('/api/request', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const domain = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    const countries = ['India', 'China', 'Russia', 'UAE', 'Iran', 'Turkey']; // We simulate requests for these countries
    
    countries.forEach(country => {
        const jobId = `${domain}_${country}`;
        if (!verificationPool.has(jobId) && !completedVerifications.has(jobId)) {
            verificationPool.set(jobId, {
                domain,
                country,
                votes: [],
                createdAt: Date.now(),
                status: 'pending'
            });
        }
    });

    res.json({ message: "Verification requested and added to the network pool", domain });
});

// 2. Node Clients request jobs to process
app.get('/api/jobs', (req, res) => {
    const jobs = Array.from(verificationPool.values()).filter(j => j.status === 'pending');
    res.json({ jobs });
});

// 3. Frontend checks status
app.get('/api/status/:domain', (req, res) => {
    const domain = req.params.domain;
    const countries = ['India', 'China', 'Russia', 'UAE', 'Iran', 'Turkey'];
    
    const results = countries.map(country => {
        const jobId = `${domain}_${country}`;
        if (completedVerifications.has(jobId)) {
            return completedVerifications.get(jobId);
        } else if (verificationPool.has(jobId)) {
            const poolJob = verificationPool.get(jobId);
            return {
                country,
                status: 'pending',
                votesReceived: poolJob.votes.length
            };
        } else {
            return { country, status: 'unknown' };
        }
    });

    res.json({ domain, results });
});

// Predictive Analysis Endpoint
app.get('/api/predict', async (req, res) => {
    const { domain, country } = req.query;
    if (!domain || !country) {
        return res.status(400).json({ error: "Missing domain or country" });
    }

    try {
        // Fetch historical logs from blockchain
        const filter = registryContract.filters.ConsensusLogged();
        const logs = await registryContract.queryFilter(filter);
        
        let countryBlocks = 0;
        let globalDomainBlocks = 0;
        let countryTotalEvents = 0;
        
        logs.forEach(log => {
            const lDomain = log.args[0];
            const lCountry = log.args[1];
            const lBlocked = log.args[2];
            
            if (lCountry === country) {
                countryTotalEvents++;
                if (lBlocked) countryBlocks++;
            }
            if (lDomain === domain && lBlocked) {
                globalDomainBlocks++;
            }
        });

        // Heuristics Scoring
        let score = 10; // Baseline
        
        // Category Risk
        const lowerDomain = domain.toLowerCase();
        let category = "General";
        if (lowerDomain.includes('twitter') || lowerDomain.includes('facebook') || lowerDomain.includes('instagram')) {
            score += 30;
            category = "Social Media";
        } else if (lowerDomain.includes('bbc') || lowerDomain.includes('nytimes') || lowerDomain.includes('news')) {
            score += 25;
            category = "News/Journalism";
        } else if (lowerDomain.includes('pornhub') || lowerDomain.includes('xvideos')) {
            score += 40;
            category = "Adult Content";
        }

        // Country Strictness
        if (countryTotalEvents > 0) {
            const strictnessRatio = countryBlocks / countryTotalEvents;
            score += (strictnessRatio * 40);
        } else {
            // Default heuristics for known strict countries if no data
            if (['China', 'Iran', 'Russia'].includes(country)) score += 30;
            if (['Turkey', 'UAE'].includes(country)) score += 20;
        }

        // Global Domain Risk
        if (globalDomainBlocks > 0) {
            score += Math.min(globalDomainBlocks * 10, 20); 
        }

        // Normalize 0-100
        const probability = Math.min(Math.max(Math.round(score), 5), 99);
        
        let riskLevel = "LOW";
        if (probability >= 70) riskLevel = "HIGH";
        else if (probability >= 40) riskLevel = "MEDIUM";

        // Generate Explanation
        let explanation = `This domain has a ${riskLevel.toLowerCase()} probability (${probability}%) of being blocked in ${country}. `;
        if (category !== "General") {
            explanation += `This is influenced by its category (${category}) which faces strict regulations. `;
        }
        if (countryBlocks > 0) {
            explanation += `Historically, ${country} has blocked ${countryBlocks} out of ${countryTotalEvents} recorded domains in our network.`;
        } else if (probability > 50) {
            explanation += `Network policies in this region indicate a heightened risk for this type of content.`;
        } else {
            explanation += `There is no significant historical evidence of censorship for this platform in this region.`;
        }

        res.json({
            domain,
            country,
            category,
            riskLevel,
            probability,
            explanation
        });

    } catch (err) {
        console.error("Prediction Error:", err);
        res.status(500).json({ error: "Failed to generate prediction" });
    }
});
// Analytics Endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        // Fetch all registered nodes
        const nodes = await registryContract.getRegisteredNodes();
        const nodeStats = await Promise.all(nodes.map(async (addr) => {
            const score = await registryContract.getNodeTrustScore(addr);
            return { address: addr, trustScore: Number(score) };
        }));

        // Fetch ConsensusLogged events
        const filter = registryContract.filters.ConsensusLogged();
        const logs = await registryContract.queryFilter(filter);
        
        const events = await Promise.all(logs.map(async (log) => {
            // In a real production app, we'd fetch the block to get the timestamp.
            // For performance locally, we'll map it to in-memory completed Verifications if available.
            const jobId = `${log.args[0]}_${log.args[1]}`;
            const inMemory = completedVerifications.get(jobId) || {};
            
            return {
                domain: log.args[0],
                country: log.args[1],
                isBlocked: log.args[2],
                ipfsCid: log.args[3],
                txHash: log.transactionHash,
                blockType: inMemory.blockType || 'Unknown',
                confidence: inMemory.confidence || 100,
                totalVotes: inMemory.totalVotes || 3,
                timestamp: Date.now() - Math.floor(Math.random() * 86400000) // Spread out over 24h for the charts
            };
        }));

        res.json({
            nodes: nodeStats,
            events: events
        });

    } catch(err) {
        console.error("Analytics Error", err);
        res.status(500).json({error: "Failed to fetch analytics from blockchain"});
    }
});


// 4. Node Clients submit their signed votes
app.post('/api/submit_vote', async (req, res) => {
    const { domain, country, isBlocked, blockType, signature, nodeAddress } = req.body;
    const jobId = `${domain}_${country}`;

    if (!verificationPool.has(jobId)) {
        return res.status(400).json({ error: "Job does not exist or is already completed." });
    }

    const job = verificationPool.get(jobId);
    
    // Validate Signature
    const payloadString = JSON.stringify({ domain, country, isBlocked, blockType });
    const recoveredAddress = ethers.verifyMessage(payloadString, signature);
    
    if (recoveredAddress.toLowerCase() !== nodeAddress.toLowerCase()) {
        return res.status(403).json({ error: "Invalid signature" });
    }

    // Ensure node hasn't already voted
    if (job.votes.some(v => v.nodeAddress.toLowerCase() === nodeAddress.toLowerCase())) {
        return res.status(400).json({ error: "Node has already voted on this job" });
    }

    job.votes.push({ nodeAddress, isBlocked, blockType, signature });

    console.log(`[Coordinator] Received vote from ${nodeAddress} for ${jobId}. Total votes: ${job.votes.length}`);

    // If we have received 3 votes, trigger consensus finalization
    if (job.votes.length >= 3 && job.status === 'pending') {
        job.status = 'finalizing';
        finalizeConsensus(jobId, job);
    }

    res.json({ message: "Vote accepted" });
});

async function finalizeConsensus(jobId, job) {
    console.log(`[Coordinator] Finalizing consensus for ${jobId}...`);
    try {
        let totalBlockedWeight = 0;
        let totalAccessibleWeight = 0;
        const nodeWeights = new Map();

        // Query smart contract for trust scores
        for (const vote of job.votes) {
            try {
                let trustScore = await registryContract.getNodeTrustScore(vote.nodeAddress);
                // Convert bigint to number
                trustScore = Number(trustScore);
                // If 0 (unregistered or slashed), give them a tiny default weight or 0.
                if (trustScore === 0) trustScore = 1; 

                nodeWeights.set(vote.nodeAddress, trustScore);

                if (vote.isBlocked) {
                    totalBlockedWeight += trustScore;
                } else {
                    totalAccessibleWeight += trustScore;
                }
            } catch(e) {
                console.error("Failed to fetch trust score for", vote.nodeAddress, e.message);
                nodeWeights.set(vote.nodeAddress, 1);
            }
        }

        const finalIsBlocked = totalBlockedWeight > totalAccessibleWeight;
        const totalWeight = totalBlockedWeight + totalAccessibleWeight;

        // Categorize nodes into correct/incorrect for smart contract rewards/penalties
        const correctNodes = [];
        const incorrectNodes = [];
        
        job.votes.forEach(vote => {
            if (vote.isBlocked === finalIsBlocked) correctNodes.push(vote.nodeAddress);
            else incorrectNodes.push(vote.nodeAddress);
        });

        // Real IPFS Upload to Pinata
        let ipfsCid = "QmMock" + Math.random().toString(36).substring(2, 15);
        if (process.env.PINATA_JWT) {
            console.log(`[Oracle] Uploading verification report to IPFS via Pinata...`);
            const reportPayload = {
                pinataContent: {
                    domain: job.domain,
                    country: job.country,
                    consensusResult: finalIsBlocked ? 'BLOCKED' : 'ACCESSIBLE',
                    confidence: Math.round((Math.max(totalBlockedWeight, totalAccessibleWeight) / totalWeight) * 100),
                    totalVotes: job.votes.length,
                    nodeResults: job.votes.map(v => ({
                        nodeAddress: v.nodeAddress,
                        isBlocked: v.isBlocked,
                        blockType: v.blockType,
                        signature: v.signature
                    })),
                    timestamp: new Date().toISOString()
                },
                pinataMetadata: {
                    name: `CensorScope_Report_${job.domain}_${job.country}.json`
                }
            };
            
            try {
                const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.PINATA_JWT}`
                    },
                    body: JSON.stringify(reportPayload)
                });
                if (pinataRes.ok) {
                    const data = await pinataRes.json();
                    ipfsCid = data.IpfsHash;
                    console.log(`[Oracle] Successfully pinned to IPFS! CID: ${ipfsCid}`);
                } else {
                    console.error(`[Oracle] Pinata upload failed: ${pinataRes.statusText}`);
                }
            } catch (err) {
                console.error(`[Oracle] Error uploading to Pinata:`, err.message);
            }
        } else {
            console.log(`[Oracle] No PINATA_JWT found in .env, using mock CID.`);
        }

        console.log(`[Oracle] Submitting transaction to blockchain for ${jobId}. Final Result: ${finalIsBlocked ? 'BLOCKED' : 'ACCESSIBLE'}`);
        
        // Oracle Submission to Smart Contract
        const tx = await registryContract.finalizeReport(
            job.domain,
            job.country,
            finalIsBlocked,
            correctNodes,
            incorrectNodes,
            ipfsCid,
            totalWeight
        );
        
        await tx.wait();
        console.log(`[Oracle] Transaction confirmed! Hash: ${tx.hash}`);

        // Extract most common blockType if blocked
        let finalBlockType = 'None';
        if (finalIsBlocked) {
            const types = job.votes.filter(v => v.isBlocked).map(v => v.blockType);
            if (types.length > 0) {
                finalBlockType = types.sort((a,b) => types.filter(v => v===a).length - types.filter(v => v===b).length).pop();
            }
        }

        // Save to completed verifications
        completedVerifications.set(jobId, {
            country: job.country,
            status: 'completed',
            isBlocked: finalIsBlocked,
            blockType: finalBlockType,
            confidence: Math.round((Math.max(totalBlockedWeight, totalAccessibleWeight) / totalWeight) * 100),
            ipfsCid: ipfsCid,
            totalVotes: job.votes.length,
            correctNodes: correctNodes.length,
            txHash: tx.hash
        });

        verificationPool.delete(jobId);

    } catch (error) {
        console.error(`[Coordinator] Failed to finalize consensus for ${jobId}:`, error);
        
        // Save the failed state so the UI doesn't hang infinitely
        completedVerifications.set(jobId, {
            country: job.country,
            status: 'failed',
            errorMsg: error.reason || error.message || "Smart Contract reverted",
            totalVotes: job.votes.length
        });
        
        verificationPool.delete(jobId);
    }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Decentralized Coordinator running on port ${PORT}`);
});
