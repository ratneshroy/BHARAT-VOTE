require('dotenv').config();
const { ethers } = require("ethers");
const contractAddress = process.env.CONTRACT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

const abi = [
    "function startElection()",
    "function endElection()",
    "function addCandidate(string,string,string)",
    "function addRegisteredVoter(string)",
    "function vote(string,string)",
    "function getCandidates() view returns (string[],string[],string[])",
    "function getCandidatesVotes() view returns (string[],string[],string[],uint256[])",
    "function electionActive() view returns (bool)"

];

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

let _nonce = null;

async function getNextNonce() {
    const networkNonce = await provider.getTransactionCount(wallet.address, "latest");
    if (_nonce === null || networkNonce > _nonce) {
        _nonce = networkNonce;
    }
    return _nonce++;
}

function resetNonce() {
    _nonce = null;
}

async function addRegisteredVoter(voterId) {
    try {
        const nonce = await getNextNonce();
        const tx = await contract.addRegisteredVoter(voterId, { nonce });
        await tx.wait();
        return { success: true, transactionHash: tx.hash };
    } catch (error) {
        resetNonce();
        console.error("Error in addRegisteredVoter:", error);
        return { success: false, error: error.message };
    }
}

async function vote(voterId, candidateId) {
    try {
        const nonce = await getNextNonce();
        const tx = await contract.vote(voterId, candidateId, { nonce });
        const receipt = await tx.wait();
        return { success: true, transactionHash: tx.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
        resetNonce();
        console.error("Error in vote:", error);
        return { success: false, error: error.message };
    }
}

async function getCondidates() {
    try {
        const data = await contract.getCandidates();
        return { success: true, data: data };
    } catch (error) {
        console.error("Error in getCondidates:", error);
        return { success: false, error: error.message };
    }
}

async function getCondidatesVotes() {
    try {
        const data = await contract.getCandidatesVotes();
        const serializedData = [
            data[0],
            data[1],
            data[2],
            data[3].map(voteCount => voteCount.toString())
        ];
        return { success: true, data: serializedData };
    } catch (error) {
        console.error("Error in getCondidatesVotes:", error);
        return { success: false, error: error.message };
    }
}

async function getElectionStatus() {
    try {
        const isActive = await contract.electionActive();
        return { success: true, active: isActive };
    } catch (error) {
        console.error("Error fetching state:", error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    addRegisteredVoter,
    vote,
    getCondidates,
    getCondidatesVotes,
    getElectionStatus
};
