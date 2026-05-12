# 🌐 CensorScope Architecture & Security Documentation

CensorScope is a hybrid censorship intelligence platform. It aggregates data from trusted internet measurement APIs, calculates a transparent consensus, caches it locally for high performance, and immutably logs a cryptographic hash of the results to a decentralized blockchain registry.

---

## 1. 📁 Full Folder Structure

```text
CensorScope/
├── backend/                  # The Aggregation Service & Cache Layer
│   ├── .env                  # Environment variables
│   ├── package.json          # Express, Ethers, SQLite dependencies
│   ├── server.js             # Main API routing and Blockchain Oracle
│   ├── database.js           # SQLite database initialization and queries
│   ├── aggregationService.js # Fetches and calculates consensus from OONI/CitizenLab
│   └── censorship.db         # Local SQLite cache (generated at runtime)
│
├── frontend/                 # React UI (Insight Layer)
│   ├── src/
│   │   ├── App.jsx           # Main Dashboard and Data Visualization
│   │   ├── index.css         # Tailwind & Glassmorphism styles
│   │   └── main.jsx          # React DOM mounting
│   ├── package.json          # React, Tailwind, Ethers v6, Chart.js, Lucide-react
│   ├── tailwind.config.js    # Design system configuration
│   └── vite.config.js        # Vite bundler config
│
├── smart_contracts/          # Ethereum Blockchain Logic
│   ├── contracts/
│   │   └── CensorshipRegistry.sol  # Immutable Logging & Anti-Spam Constraints
│   ├── scripts/
│   │   └── deploy.js         # Hardhat deployment script
│   └── hardhat.config.js     # Blockchain network configuration
│
└── README.md                 # Setup and execution instructions
```

---

## 2. 📊 Architecture Diagram (Text-Based)

```text
       [ USER (Browser) ]
              │
              │ 1. Requests Domain Verification
              ▼
    ┌─────────────────────────────────┐
    │ BACKEND AGGREGATION SERVICE     │
    │ (Express.js)                    │
    │                                 │
    │  2. Fetch external sources      │
    │   ├──► [ OONI Explorer ]        │
    │   ├──► [ CitizenLab ]           │
    │   └──► [ NetBlocks ]            │
    │                                 │
    │  3. Calculate Majority Vote     │
    │                                 │
    │  4. Save to Local Cache         │
    │   └──► [ SQLite DB ]            │
    │                                 │
    │  5. Submit Tx & dataHash        │
    └─────────┬───────────────────────┘
              │ 
              ▼
    ┌───────────────────┐
    │ SMART CONTRACT    │ ──► Immutability: Logs dataHash & statusHash
    │ (CensorshipRegistry)│ ──► Cooldown: Prevents 24h duplicate logging
    └───────────────────┘
```

---

## 3. 🔐 Security & Immutability Considerations

### Cryptographic Anchoring (`dataHash`)
Instead of pushing large JSON objects (containing granular reasons, types, and confidence scores) directly to the Ethereum blockchain—which would be cost-prohibitive—CensorScope utilizes Cryptographic Anchoring.
The backend generates a `dataHash` of the aggregated JSON payload and submits only that hash, along with the `statusHash` (e.g., 'BLOCKED' or 'ACCESSIBLE'), to the `CensorshipRegistry.sol` contract. This mathematically proves that the historical report cached in the SQLite database hasn't been tampered with since the moment it was logged.

### Replay & Spam Protection (Blockchain Cooldowns)
The Smart Contract enforces a strict 24-hour cooldown per `keccak256(domain, country)`. 
```solidity
require(block.timestamp >= lastLogTime[domainHash] + 1 days, "This domain+country combination was already logged within the last 24 hours");
```
This prevents malicious actors or compromised backend services from spamming the blockchain with duplicate reports and wasting gas fees. 

### Predictive Analytics & Determinism
The Predictive Censorship engine (`/api/predict`) was intentionally designed as a rule-based heuristics algorithm rather than a black-box AI model. 
1. **Determinism**: By querying the historical logs, the engine calculates risk scores transparently.
2. **Explainability**: Black-box models are a security risk in intelligence tooling. The heuristics engine guarantees that every probability score is accompanied by a mathematically traceable explanation detailing exactly *why* a domain is deemed high or low risk in a specific country.

---

## 4. 🚀 Production Deployment Steps

### Phase 1: Smart Contracts
1. Obtain an RPC URL from Alchemy or Infura for **Polygon Mumbai** or **Ethereum Sepolia**.
2. Add your deployment wallet Private Key to `smart_contracts/.env`.
3. Run: `npx hardhat run scripts/deploy.js --network sepolia`
4. Copy the deployed contract address.

### Phase 2: Backend Aggregation Service & SQLite
1. Deploy the `backend/` folder to a service like **Render**, **Railway**, or **AWS EC2**.
2. **Crucial:** Because this architecture uses SQLite (`censorship.db`), ensure your deployment environment supports **Persistent Storage Volumes**. If deployed on ephemeral storage (like Heroku free tier), your cache will wipe on every restart.
3. Set the Environment Variables:
   - `PORT=5000`
   - `PRIVATE_KEY=your_secure_wallet_key` (Used to sign Ethereum transactions to the Registry).

### Phase 3: Frontend
1. Update `API_BASE_URL` in `frontend/src/App.jsx` to point to your deployed backend.
2. Update `CONTRACT_ADDRESS` to your deployed Sepolia/Mumbai address.
3. Deploy the `frontend/` folder to **Vercel** or **Netlify**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
