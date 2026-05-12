# CensorScope: Comprehensive Technical Deep Dive

**CensorScope** is a hybrid, Web3-powered web application (dApp) designed to analyze global internet censorship by aggregating data from established internet measurement platforms and immutably recording those censorship events onto the Ethereum blockchain.

By synthesizing data from reliable external APIs (such as OONI, CitizenLab, and NetBlocks) through a centralized aggregation layer, CensorScope calculates a consensus. It then caches the results locally for high performance and anchors a cryptographic hash of the report onto the blockchain to ensure tamper-proof historical logging.

This document provides a highly detailed, component-by-component breakdown of the entire architecture.

---

## 🏗️ 1. Global Architecture Overview
The system is divided into four highly specialized micro-components:
1. **The Backend Aggregation Service (Node.js)**: The "Synthesizer". Fetches and aggregates censorship data from external intelligence APIs.
2. **The Local Caching Layer (SQLite)**: The "Performance Booster". Stores the aggregated consensus data to prevent redundant external API calls and serve the frontend efficiently.
3. **The Blockchain Smart Contract (Solidity)**: The "Ledger". Permanently stores cryptographic hashes of the censorship reports, enforcing a strict 24-hour domain/country logging cooldown.
4. **The Frontend Dashboard (React + Vite)**: The "Viewer". A real-time UI where users request verifications, view global censorship risks, and interact with the data.

---

## ⚙️ 2. Deep Dive: The Backend Aggregation Service (`aggregationService.js`)
The backend is a robust Node.js service that orchestrates data collection. It does not perform isolated P2P checks itself; instead, it relies on aggregating trusted sources.

### A. The External API Orchestration
When the React UI sends a request, the `aggregationService.js` reaches out to multiple simulated or real external APIs concurrently:
- **OONI Explorer**
- **CitizenLab**
- **NetBlocks**

To handle network volatility, the service wraps each API call in an automatic retry mechanism (`withRetry`), ensuring data robustness.

### B. The Majority Voting Consensus Algorithm
Once the data from the external APIs is collected, the service calculates a final verdict using a Majority Voting Consensus:
1. **Vote Tallying:** It counts how many APIs reported the domain as blocked versus accessible.
2. **Confidence Score:** The confidence is calculated mathematically. For example, if 2 out of 3 APIs report a block, the confidence is ~67%.
3. **Reason Extraction:** The service evaluates the varying reasons and block types (e.g., DNS Tampering, TCP Reset) reported by the APIs, selecting the most commonly cited reason and block type to formulate a comprehensive explanation.

### C. The Local Caching Layer (`database.js`)
To optimize performance and minimize API rate limits, the final aggregated result is cached locally using a lightweight SQLite database (`censorship.db`).
- The `censorship_logs` table stores the `domain`, `country`, `isBlocked`, `blockType`, `reason`, `confidence`, and the `dataSource`.
- The database enforces uniqueness on `(domain, country)` pairs, updating the cached row via an `ON CONFLICT DO UPDATE` clause whenever a new verification is run.

---

## ⛓️ 3. Deep Dive: The Blockchain & Smart Contract
Located in `/smart_contracts/contracts/CensorshipRegistry.sol`, this is the ultimate, tamper-proof source of truth for the historical state of the network.

### A. Data Structures
The contract stores censorship data in a `reports` array, containing `CensorshipReport` structs:
- `url` and `country` (Strings)
- `statusHash` (e.g., 'BLOCKED' or 'ACCESSIBLE')
- `dataHash` (A hash representing the aggregated JSON payload)
- `timestamp` (The exact block time the report was finalized)
- `reporter` (The wallet address that submitted the report)

### B. Cryptographic Anchoring (`dataHash`)
Instead of storing the entire multi-API JSON payload on-chain (which would cost hundreds of dollars in gas fees), the backend submits a `dataHash`. The blockchain acts as a cryptographic anchor. Anyone possessing the original JSON report can hash it and compare it against the `dataHash` stored on the blockchain, mathematically proving that the report has not been altered since it was generated.

### C. Anti-Spam Cooldown Enforcement
To prevent the blockchain from being bloated with duplicate reports and to avoid wasting gas, the Smart Contract enforces a strict domain-country cooldown:
```solidity
bytes32 domainHash = keccak256(abi.encodePacked(_url, _country));
require(block.timestamp >= lastLogTime[domainHash] + 1 days, "This domain+country combination was already logged within the last 24 hours");
```
If a user tries to submit `twitter.com` in `India` twice within 24 hours, the Smart Contract forcibly rejects and reverts the transaction.

---

## 🦊 4. The Critical Role of MetaMask
While the consensus mechanism is handled by the backend, writing the final result to the blockchain requires an Ethereum transaction.

### A. Submitting the Report
Users or backend Oracles interacting with the system must utilize an Ethereum Wallet (like MetaMask). When a consensus is reached, the frontend or backend constructs a transaction calling `addReport(url, country, statusHash, dataHash)` on the `CensorshipRegistry` contract. This ensures every report is tied to a specific `reporter` address.

---

## 💻 5. The Frontend React Application (Insight Layer)
The dashboard provides a real-time window into the aggregation process.
- **Data Visualization**: It renders dynamic states, showing the consensus results, confidence scores, and explanations pulled from the backend API.
- **Glassmorphism Design**: Built with Tailwind CSS, utilizing modern Web3 aesthetics (blurred gradients, smooth transitions, and dynamic SVG icons) to make complex censorship data easily digestible for the end-user.

---

## 🔮 6. Predictive Censorship Engine
CensorScope features a highly deterministic, **rule-based heuristics engine** running in the backend (`/api/predict`).
- **Risk Calculation**: It calculates a real-time probability score based on three core metrics:
  1. **Global Domain Risk**: Has this specific domain been censored in other countries?
  2. **Country Strictness Ratio**: What is the historical percentage of domains that this specific country has blocked?
  3. **Categorical Sensitivity**: A built-in dictionary assesses risk based on the type of content (e.g., Social Media and Adult Content are mathematically penalized with higher risk scores than standard websites).
- **Explainability**: Instead of just outputting a percentage, the engine generates a human-readable explanation dynamically explaining *why* the score was given, ensuring full transparency.

---

## 📊 7. Professional Exportable Reports
To serve cybersecurity researchers and journalists, CensorScope includes robust client-side report generation.
- **PDF Generation**: Using `jsPDF` and `jspdf-autotable`, the React frontend instantly compiles the verification results, confidence scores, and blockchain transaction hashes into a professionally formatted, branded PDF document.
- **JSON Exports**: For automated data pipelines, the UI allows downloading the raw, perfectly structured JSON payload, making the data immediately usable in Python scripts or external analytical tools.
