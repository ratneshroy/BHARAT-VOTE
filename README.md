# BharatVote

BharatVote is a decentralized, secure voting system prototype built using Ethereum (via Ganache), Node.js, and MongoDB. The system features a citizen-facing voting portal and an administrative dashboard for managing election lifecycles, candidates, and voter registrations.

## Why Blockchain for Voting?

*   **Immutable Ledger**: Once a vote is cast, the record is permanently written to the blockchain. It cannot be altered, deleted, or replaced by anyone, including system administrators.
*   **Decentralized Consensus**: By avoiding a single centralized database, trust is distributed across the blockchain network, mitigating the risk of a single point of failure or centralized manipulation.
*   **Cryptographic Verification**: Every transaction generates a cryptographic proof (transaction hash). Voters can verify their receipt hash against the ledger to audit that their vote was recorded correctly.
*   **Tamper-Proof Logic**: Election rules (such as starting, ending, and checking double-voting) are defined in the Solidity smart contract and executed automatically, preventing manual bypasses.

## Prerequisites

Make sure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v16+)
*   [MongoDB](https://www.mongodb.com/) (running locally on port `27017`)
*   [Ganache](https://trufflesuite.com/ganache/) (running locally on port `7545`)

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Configure Environment Variables**
    Create a `.env` file in the root directory (or use the existing one) with your Ganache network details:
    ```env
    CONTRACT_ADDRESS=your_deployed_contract_address
    PRIVATE_KEY=your_ganache_account_private_key
    ```

3.  **Compile & Deploy Smart Contract**
    Make sure Ganache is running on `http://127.0.0.1:7545`. Then run the deployment script to compile the contract using `solc` and deploy it:
    ```bash
    node deployContract.js
    ```
    Copy the deployed contract address output from this command and update `CONTRACT_ADDRESS` in your `.env` file.

## Running the Application

You can start both the voter portal and the admin console concurrently using:
```bash
npm run dev
```

*   **Citizen Voting Portal**: `http://localhost:3000`
*   **Admin Console**: `http://localhost:3001`

Alternatively, you can run them individually:
*   Start Voter Portal: `npm run start`
*   Start Admin Console: `npm run admin`
