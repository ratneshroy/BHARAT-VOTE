require('dotenv').config();
const fs = require("fs");
const solc = require("solc");
const { ethers } = require("ethers");

const source = fs.readFileSync(
    "./contracts/bharatVote.sol",
    "utf8"
);
console.log(solc.version());

const input = {
    language: "Solidity",
    sources: {
        "bharatVote.sol": { content: source },
    },
    settings: {
        outputSelection: {
            "*": {
                "*": ["abi", "evm.bytecode"],
            },
        },
    },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

const contractName = "Voting";

const contractData =
    output.contracts["bharatVote.sol"][contractName];

const abi = contractData.abi;
const bytecode = contractData.evm.bytecode.object;

const rpcUrl = "http://127.0.0.1:7545";

const privateKey = process.env.PRIVATE_KEY;

console.log("Deploying to Ganache local network...");
console.log("RPC:", rpcUrl);

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

async function deploy() {
    try {
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);

        const contract = await factory.deploy();

        await contract.waitForDeployment();

        console.log("Contract deployed at:", await contract.getAddress());
    } catch (error) {
        console.error("Deployment failed:", error);
    }
}

deploy();