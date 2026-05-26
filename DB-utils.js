const mongoose = require("mongoose");


const connectDB = async () => {
    try {
        await mongoose.connect(
            "mongodb://localhost:27017/voterDB"
        );
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("DB Connection Error:", error);
        process.exit(1);
    }
};


const voterSchema = new mongoose.Schema({
    voterId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    aadharNumber: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{12}$/
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/
    }
}, { timestamps: true });

const Voter = mongoose.model("Voter", voterSchema);

const registerVoterDB = async (name, voterId, dateOfBirth, mobileNumber, aadharNumber) => {
    try {
        const voter = new Voter({
            name,
            voterId,
            dateOfBirth,
            mobileNumber,
            aadharNumber
        });

        const saved = await voter.save();
        return { success: true, data: saved };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const getAllVoters = async () => {
    try {
        const voters = await Voter.find();
        return voters;
    } catch (error) {
        throw error;
    }
};

const getVoterById = async (voterId) => {
    return await Voter.findOne({ voterId });
};
const deleteVoter = async (voterId) => {
    return await Voter.findOneAndDelete({ voterId });
};

const updateVoter = async (voterId, updateData) => {
    return await Voter.findOneAndUpdate(
        { voterId },
        updateData,
        { new: true }
    );
};
const voteRecordSchema = new mongoose.Schema({
    voterId: { type: String, required: true, unique: true },
    candidateId: { type: String, required: true },
    candidateName: { type: String, required: true },
    candidateParty: { type: String, required: true },
    transactionHash: { type: String, required: true },
    blockNumber: { type: Number },
    timestamp: { type: Date, default: Date.now }
});

const VoteRecord = mongoose.model("VoteRecord", voteRecordSchema);

const saveVoteRecord = async (voterId, candidateId, candidateName, candidateParty, transactionHash, blockNumber) => {
    try {
        const record = new VoteRecord({ voterId, candidateId, candidateName, candidateParty, transactionHash, blockNumber });
        await record.save();
        return { success: true, data: record };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const getVoteRecordById = async (voterId) => {
    return await VoteRecord.findOne({ voterId });
};

const getVoteRecordByHash = async (transactionHash) => {
    return await VoteRecord.findOne({ transactionHash });
};

const getVoteCount = async () => {
    try {
        return await VoteRecord.countDocuments();
    } catch (error) {
        return 0;
    }
};

const getVoterCount = async () => {
    try {
        return await Voter.countDocuments();
    } catch (error) {
        return 0;
    }
};

module.exports = {
    connectDB,
    registerVoterDB,
    getAllVoters,
    getVoterById,
    deleteVoter,
    updateVoter,
    saveVoteRecord,
    getVoteRecordById,
    getVoteRecordByHash,
    getVoteCount,
    getVoterCount
};