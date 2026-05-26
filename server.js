const express = require('express');
const path = require('path');
const { connectDB, registerVoterDB, getVoterById, saveVoteRecord, getVoteRecordById, getVoteRecordByHash, getVoteCount, getVoterCount } = require("./DB-utils");
const { addRegisteredVoter, vote, getCondidates, getCondidatesVotes, getElectionStatus } = require("./contract-handler");
const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});


app.use(express.static(path.join(__dirname)));

const isLoggedIn = (req) => {
    return req.headers.cookie && req.headers.cookie.includes('auth=true');
};

app.get('/', (req, res) => {

    if (isLoggedIn(req)) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login', (req, res) => {
    if (isLoggedIn(req)) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'login.html'));
});


app.get('/dashboard', (req, res) => {

    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});


app.post('/api/register', async (req, res) => {
    try {
        const { name, aadhaar, dob, mobile } = req.body;

        const status = await getElectionStatus();
        if (status.success && status.active) {
            return res.json({ success: false, message: "Election has already started. New voters cannot be registered." });
        }

        const letters = (name || "VOTER").replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
        const numbers = Math.floor(100 + Math.random() * 900);
        const voterId = `${letters}${numbers}`;

        const result = await registerVoterDB(
            name,
            voterId,
            dob,
            mobile,
            aadhaar
        );

        if (result.success) {
            const bcResult = await addRegisteredVoter(voterId);

            if (!bcResult.success) {
                return res.json({ success: false, message: "DB Saved but Blockchain Failed: " + bcResult.error });
            }

            res.json({ success: true, voterId, name, mobile, transactionHash: bcResult.transactionHash });
        } else {
            res.json({ success: false, message: result.error });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { voterId, mobile } = req.body;

        const voter = await getVoterById(voterId);
        if (!voter) {
            return res.json({ success: false, message: 'Voter ID not found' });
        }

        if (voter.mobileNumber !== mobile) {
            return res.json({ success: false, message: 'Mobile number does not match' });
        }

        console.log("Login verified securely. Starting session...");

        const authCookie = 'auth=true; Path=/; HttpOnly';
        const nameCookie = `voterName=${encodeURIComponent(voter.name)}; Path=/;`;
        const voterIdCookie = `voterId=${encodeURIComponent(voter.voterId)}; Path=/;`;

        res.setHeader('Set-Cookie', [authCookie, nameCookie, voterIdCookie]);

        res.json({
            success: true,
            message: 'Login verified securely',
            redirectUrl: '/dashboard'
        });
    } catch (error) {
        console.error("Login verification error:", error);
        res.json({ success: false, message: 'Server error during login' });
    }
});


app.get('/api/getAllCondidates', async (req, res) => {
    try {
        const result = await getCondidates();
        if (result.success) {
            const candidates = [];
            if (result.data && result.data[0]) {
                for (let i = 0; i < result.data[0].length; i++) {
                    candidates.push({
                        id: result.data[0][i],
                        name: result.data[1][i],
                        party: result.data[2][i]
                    });
                }
            }
            res.json({ success: true, candidates });
        } else {
            res.json({ success: false, message: result.error });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/vote', async (req, res) => {
    const { voterId, candidateId, candidateName, candidateParty } = req.body;
    if (!voterId || !candidateId || !candidateName || !candidateParty) {
        return res.json({ success: false, message: 'voterId, candidateId, candidateName, and candidateParty are required.' });
    }

    try {
        const result = await vote(voterId, candidateId);
        if (result.success) {
            await saveVoteRecord(voterId, candidateId, candidateName, candidateParty, result.transactionHash, result.blockNumber);
            res.json({ success: true, transactionHash: result.transactionHash, blockNumber: result.blockNumber });
        } else {
            res.json({ success: false, message: result.error });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/getVoteRecord', async (req, res) => {
    const { voterId } = req.body;
    if (!voterId) {
        return res.json({ success: false, message: 'voterId is required' });
    }

    try {
        const record = await getVoteRecordById(voterId);
        if (record) {
            res.json({ success: true, record });
        } else {
            res.json({ success: false, message: 'No record found' });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.get('/api/getResults', async (req, res) => {
    try {
        const result = await getCondidatesVotes();
        if (result.success) {
            const results = [];
            if (result.data && result.data[0]) {
                for (let i = 0; i < result.data[0].length; i++) {
                    results.push({
                        id: result.data[0][i],
                        name: result.data[1][i],
                        party: result.data[2][i],
                        votes: parseInt(result.data[3][i]) || 0
                    });
                }
            }
            res.json({ success: true, results });
        } else {
            res.json({ success: false, message: result.error });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.get('/api/getStatus', async (req, res) => {
    try {
        const result = await getElectionStatus(); // { success: true, active: isActive }
        const voteCount = await getVoteCount();
        const voterCount = await getVoterCount();
        res.json({
            success: result.success,
            active: result.active,
            ended: !result.active && voteCount > 0,
            totalVoters: voterCount
        });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.get('/api/blockchain/status', async (req, res) => {
    try {
        const { ethers } = require("ethers");
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
        const blockNumber = await provider.getBlockNumber();

        const mongoose = require("mongoose");
        const VoteRecord = mongoose.model("VoteRecord");

        const lastRecords = await VoteRecord.find().sort({ timestamp: -1 }).limit(3);
        const lastTransactions = lastRecords.map(r => r.transactionHash);

        res.json({ success: true, blockNumber, lastTransactions });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/verifyHash', async (req, res) => {
    const { hash } = req.body;
    if (!hash) {
        return res.json({ success: false, message: 'Transaction hash is required' });
    }
    try {
        const record = await getVoteRecordByHash(hash);
        if (record) {
            res.json({
                success: true,
                candidateName: record.candidateName,
                candidateParty: record.candidateParty,
                timestamp: record.timestamp,
                blockNumber: record.blockNumber
            });
        } else {
            res.json({ success: false, message: 'Transaction hash not found in the ledger database' });
        }
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/logout', (req, res) => {
    console.log("Logging out user...");
    res.setHeader('Set-Cookie', 'auth=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.json({ success: true, redirectUrl: '/login' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
