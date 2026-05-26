# BharatVote

BharatVote is a decentralized, secure voting system prototype built using Ethereum (via Ganache), Node.js, and MongoDB. The system features a citizen-facing voting portal and an administrative dashboard for managing election lifecycles, candidates, and voter registrations.

## Architecture & Components

*   **Smart Contract (`contracts/bharatVote.sol`)**: A Solidity contract (`Voting`) that manages election states, registers candidates and voters, accepts votes, and tallies results immutably on the blockchain.
*   **Voter Portal (`server.js`)**: Runs on port `3000` by default. Allows voters to log in using their Voter ID and mobile number, view active candidates, and cast encrypted votes.
*   **Admin Console (`admin-server.js`)**: Runs on port `3001` by default. Provides interfaces to add candidates, generate mock voters, simulate voter turnout, and toggle the election lifecycle (Start/End).
*   **Database Utils (`DB-utils.js`)**: Connects to MongoDB to index voter profiles and cache transaction receipt records for fast cryptographic verification.

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

4.  **Reset/Initialize Database (Optional)**
    To clear out any previous voter registration records and vote logs:
    ```bash
    npm run resetdb
    ```

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
