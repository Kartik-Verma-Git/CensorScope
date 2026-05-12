# 🌐 CensorScope

CensorScope is a hybrid, Web3-powered verification network designed to detect and log global internet censorship. It utilizes a backend aggregation service to synthesize data from multiple external intelligence sources, caches the results via SQLite for performance, and uses an Ethereum Smart Contract to immutably log the consensus results.

---

## ✨ Key Features
- **Data Aggregation**: A robust backend service that concurrently fetches and synthesizes censorship data from established external sources (like OONI, CitizenLab, and NetBlocks).
- **Consensus & Caching**: Employs a majority voting consensus mechanism, storing the final calculated verdict in a local SQLite database (`censorship.db`) for rapid retrieval.
- **Immutability**: Censorship reports are anchored to Ethereum. A cryptographic `dataHash` of the report is permanently logged to the `CensorshipRegistry.sol` smart contract, ensuring tamper-proof historical records.
- **Predictive Censorship Analysis**: An advanced heuristics engine that calculates the future risk of a domain being blocked based on historical data.
- **Exportable Reports**: Generate and download professional PDF and JSON reports instantly.

---

## 🏗️ Architecture Overview

The system consists of 3 main components that must be run simultaneously:

1. **The Blockchain (Hardhat):** The local Ethereum network running the `CensorshipRegistry.sol` smart contract.
2. **The Backend Aggregation Service:** A Node.js/Express API containing `aggregationService.js` and `database.js` that pulls verification data from external APIs, caches it, and serves it to the frontend.
3. **The Frontend UI:** The React application where users request domain verifications, view global censorship risks, and export reports.

> 📚 **Deep Dive:** For a full breakdown of the folder structure, architecture diagram, and data flow, please read the [Architecture & Security Documentation](./Architecture_and_Security.md) and the [Explanation](./Explanation.md).

---

## 🚀 How to Run the Network

You will need to open **3 separate terminal windows**.

### Step 1: Start the Blockchain (Terminal 1)
Open your first terminal and start the local Ethereum node.
```bash
cd smart_contracts
npx hardhat node
```
*Leave this running in the background.*

### Step 2: Deploy the Smart Contract (Terminal 2)
Open a new terminal to deploy the `CensorshipRegistry` contract to your running network.
```bash
cd smart_contracts
npx hardhat run scripts/deploy.js --network localhost
```
*Note: Make sure to update the deployed contract address in your backend and frontend configuration files if it changes.*

### Step 3: Start the Backend Service (Terminal 2)
In the same terminal (after deploying), start the backend API.

```bash
cd backend
npm install   # If you haven't installed dependencies yet
node server.js
```
*Leave this running. It will listen on port 5000 and automatically initialize the SQLite `censorship.db`.*

### Step 4: Start the Frontend React UI (Terminal 3)
Open a third terminal for the user interface.
```bash
cd frontend
npm install   # If you haven't installed dependencies yet
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🎯 Testing the System

1. Ensure your **MetaMask** wallet is connected to your Localhost network (Chain ID: 31337).
2. Go to the **React UI** (`http://localhost:5173`).
3. Enter a domain (e.g., `twitter.com`) and click **Request Verification**.
4. **Watch the Magic Happen**:
   - The backend `aggregationService.js` will fetch data from simulated external APIs (OONI, CitizenLab, NetBlocks), calculate the consensus, and cache it in the SQLite database.
   - The React UI will update to show the final blocked/accessible status, the network confidence score, and the Transaction Hash of the immutable log on the blockchain!

---

## 🦊 Connecting MetaMask to Localhost
If you haven't connected MetaMask to your local Hardhat node yet:
1. Open MetaMask -> Click the Network dropdown -> **Add network** -> **Add a network manually**.
2. **Network Name**: Hardhat Local
3. **New RPC URL**: `http://127.0.0.1:8545`
4. **Chain ID**: `31337`
5. **Currency Symbol**: `ETH`
6. Click **Save**.
7. Import an account using one of the Private Keys displayed in Terminal 1 when you started the node.
