const { saveResult } = require('./database');

// Simulated External API 1: OONI Explorer
async function fetchOONI(domain, country) {
    return simulateNetworkCall('OONI', domain, country);
}

// Simulated External API 2: CitizenLab
async function fetchCitizenLab(domain, country) {
    return simulateNetworkCall('CitizenLab', domain, country);
}

// Simulated External API 3: NetBlocks
async function fetchNetBlocks(domain, country) {
    return simulateNetworkCall('NetBlocks', domain, country);
}

function simulateNetworkCall(apiName, domain, country) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Random chance of network failure to test retry logic
            if (Math.random() < 0.1) return reject(new Error(`${apiName} API Timeout`));

            // Use deterministic seeding based on domain length and country length for somewhat consistent "randomness" per API
            const seed = domain.length + country.length + apiName.length;
            const isBlocked = (Math.random() * seed) % 10 > 6; 
            
            let blockType = 'None';
            let rawReason = 'Accessible';
            
            if (isBlocked) {
                const types = ['DNS Tampering', 'TCP Reset', 'HTTP Block', 'IP Null Routing'];
                blockType = types[Math.floor((Math.random() * seed)) % types.length];
                
                const reasons = [
                    'Political Dissidence', 
                    'Pornography/Adult Content', 
                    'Copyright Infringement', 
                    'Social Media Regulation', 
                    'Gambling'
                ];
                rawReason = reasons[Math.floor((Math.random() * seed)) % reasons.length];
            }

            resolve({ api: apiName, isBlocked, blockType, rawReason });
        }, 150 + Math.random() * 200);
    });
}

async function withRetry(apiCall, domain, country, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            return await apiCall(domain, country);
        } catch (error) {
            if (i === retries) {
                console.error(`[AggregationService] Failed to fetch after ${retries} retries: ${error.message}`);
                return null;
            }
        }
    }
}

// Main Aggregation Logic
async function aggregateCensorshipData(domain, country) {
    console.log(`[AggregationService] Fetching consensus for ${domain} in ${country}...`);
    
    // Fetch from all APIs concurrently with retries
    const [ooni, citizenLab, netBlocks] = await Promise.all([
        withRetry(fetchOONI, domain, country),
        withRetry(fetchCitizenLab, domain, country),
        withRetry(fetchNetBlocks, domain, country)
    ]);

    const results = [ooni, citizenLab, netBlocks].filter(r => r !== null);
    
    if (results.length === 0) {
        throw new Error("All data sources failed.");
    }

    // Consensus Mechanism: Majority Voting
    const blockedVotes = results.filter(r => r.isBlocked).length;
    const isBlocked = blockedVotes > (results.length / 2);
    
    // Calculate Confidence Score
    let confidence = 0;
    if (isBlocked) {
        confidence = Math.round((blockedVotes / results.length) * 100);
    } else {
        confidence = Math.round(((results.length - blockedVotes) / results.length) * 100);
    }

    // Determine consensus reason and type
    let finalBlockType = 'None';
    let finalReasonCategory = 'N/A';
    let detailedExplanation = 'Accessible. No censorship detected.';

    if (isBlocked) {
        // Find most common block type
        const types = results.filter(r => r.isBlocked).map(r => r.blockType);
        finalBlockType = types.sort((a,b) => types.filter(v => v===a).length - types.filter(v => v===b).length).pop();
        
        // Find most common reason
        const reasons = results.filter(r => r.isBlocked).map(r => r.rawReason);
        finalReasonCategory = reasons.sort((a,b) => reasons.filter(v => v===a).length - reasons.filter(v => v===b).length).pop();
        
        // Generate structured explanation
        detailedExplanation = `Blocked in ${country} due to ${finalBlockType} by ISP. Likely related to government restrictions on ${finalReasonCategory}.`;
    }

    const finalResult = {
        country,
        isBlocked,
        statusHash: isBlocked ? 'BLOCKED' : 'ACCESSIBLE',
        blockType: finalBlockType,
        reason: detailedExplanation,
        category: finalReasonCategory,
        confidence,
        dataSource: results.map(r => r.api).join(', '),
        lastVerified: new Date().toISOString()
    };

    // Store in DB for persistence
    await saveResult(domain, finalResult);

    return finalResult;
}

module.exports = { aggregateCensorshipData };
