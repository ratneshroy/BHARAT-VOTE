require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require("mongoose");
const { connectDB, registerVoterDB, getAllVoters, saveVoteRecord } = require("./DB-utils");
const { addRegisteredVoter, getElectionStatus, vote, getCondidates } = require("./contract-handler");

const app = express();
const PORT = process.env.ADMIN_PORT || 3001;

connectDB();

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.get('/api/config', (req, res) => {
    res.json({
        contractAddress: process.env.CONTRACT_ADDRESS,
        privateKey: process.env.PRIVATE_KEY
    });
});

app.post('/api/register-mock-batch', async (req, res) => {
    try {
        const { count } = req.body;
        if (!count || count <= 0 || count > 100) {
            return res.json({ success: false, message: 'Count must be between 1 and 100.' });
        }

        const status = await getElectionStatus();
        if (status.success && status.active) {
            return res.json({ success: false, message: 'Election is active. Cannot register new voters now.' });
        }

        const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Rohan', 'Arjun', 'Kavya', 'Priya', 'Ananya', 'Sneha', 'Pooja',
                            'Rahul', 'Vikram', 'Suresh', 'Ramesh', 'Deepak', 'Sunita', 'Meena', 'Geeta', 'Rekha', 'Sita'];
        const lastNames  = ['Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Mehta', 'Joshi', 'Nair', 'Reddy',
                            'Yadav', 'Mishra', 'Chaudhary', 'Tiwari', 'Dubey', 'Bose', 'Das', 'Iyer', 'Pillai', 'Rao'];

        const registered = [];
        const failed     = [];

        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName  = lastNames[Math.floor(Math.random() * lastNames.length)];
            const name      = `${firstName} ${lastName}`;

            const aadhaar = String(Math.floor(100000000000 + Math.random() * 900000000000));
            const dobMs   = new Date('1960-01-01').getTime() + Math.random() * (new Date('2004-01-01').getTime() - new Date('1960-01-01').getTime());
            const dob     = new Date(dobMs).toISOString().split('T')[0];
            const mobile  = String(6000000000 + Math.floor(Math.random() * 3999999999)).substring(0, 10);

            const letters = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
            const numbers = Math.floor(100 + Math.random() * 900);
            const voterId = `${letters}${numbers}`;

            const bcResult = await addRegisteredVoter(voterId);
            if (!bcResult.success) {
                failed.push({ name, reason: 'Blockchain: ' + bcResult.error });
                continue;
            }

            const dbResult = await registerVoterDB(name, voterId, dob, mobile, aadhaar);
            if (!dbResult.success) {
                failed.push({ name, voterId, reason: 'DB: ' + dbResult.error });
                continue;
            }

            registered.push({ name, voterId });
        }

        res.json({
            success: true,
            count: registered.length,
            registered,
            failedCount: failed.length,
            failed
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/simulate-voting', async (req, res) => {
    try {
        const status = await getElectionStatus();
        if (!status.success || !status.active) {
            return res.json({ success: false, message: 'Election is not active. Start the election first.' });
        }

        const candidatesResult = await getCondidates();
        if (!candidatesResult.success || !candidatesResult.data[0].length) {
            return res.json({ success: false, message: 'No candidates found on blockchain. Add candidates first.' });
        }
        const candidateIds     = candidatesResult.data[0];
        const candidateNames   = candidatesResult.data[1];
        const candidateParties = candidatesResult.data[2];

        const voters = await getAllVoters();
        if (!voters || voters.length === 0) {
            return res.json({ success: false, message: 'No registered voters found. Create mock voters first.' });
        }

        const turnoutPercent = 60 + Math.random() * 30;
        const targetCount    = Math.max(1, Math.round(voters.length * turnoutPercent / 100));

        const shuffled       = [...voters].sort(() => Math.random() - 0.5);
        const selectedVoters = shuffled.slice(0, targetCount);

        const tally = { success: 0, skipped: 0, failed: 0 };

        for (let i = 0; i < selectedVoters.length; i++) {
            const voter = selectedVoters[i];
            const idx            = Math.floor(Math.random() * candidateIds.length);
            const candidateId    = candidateIds[idx];
            const candidateName  = candidateNames[idx];
            const candidateParty = candidateParties[idx];

            const voteResult = await vote(voter.voterId, candidateId);
            if (!voteResult.success) {
                const alreadyVoted = voteResult.error && (
                    voteResult.error.toLowerCase().includes('already voted') ||
                    voteResult.error.toLowerCase().includes('revert')
                );
                if (alreadyVoted) {
                    tally.skipped++;
                } else {
                    tally.failed++;
                }
                continue;
            }

            await saveVoteRecord(voter.voterId, candidateId, candidateName, candidateParty, voteResult.transactionHash, voteResult.blockNumber);
            tally.success++;
        }

        res.json({
            success: true,
            totalRegistered: voters.length,
            turnoutPercent: Math.round(turnoutPercent),
            selectedToVote: targetCount,
            votescast: tally.success,
            skipped: tally.skipped,
            failed: tally.failed
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const Voter = mongoose.model("Voter");
        const VoteRecord = mongoose.model("VoteRecord");
        const totalVoters = await Voter.countDocuments();
        const totalVotes  = await VoteRecord.countDocuments();
        res.json({ success: true, totalVoters, totalVotes });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin', (req, res) => {
    res.redirect('/');
});

app.listen(PORT);
