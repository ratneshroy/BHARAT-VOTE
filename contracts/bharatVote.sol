pragma solidity ^0.8.0;

contract Voting {

    address public admin;
    bool public electionActive;

    constructor() {
        admin = msg.sender;
        electionActive = false;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    struct Candidate {
        string id;
        string name;
        string party;
        uint voteCount;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
    }

    mapping(string => Candidate) private candidates;
    mapping(string => Voter) private voters;

    string[] private candidateIds;

    event Voted(string voterId, string candidateId);

    function startElection() public onlyAdmin {
        require(!electionActive, "Election already active");
        require(candidateIds.length > 0, "No candidates added");

        electionActive = true;
    }

    function endElection() public onlyAdmin {
        require(electionActive, "Election not active");

        electionActive = false;
    }

    function addCandidate(
        string memory _candidateId,
        string memory _name,
        string memory _party
    ) public onlyAdmin {

        require(!electionActive, "Election already started");
        require(bytes(candidates[_candidateId].id).length == 0, "Candidate exists");

        candidates[_candidateId] = Candidate(
            _candidateId,
            _name,
            _party,
            0
        );

        candidateIds.push(_candidateId);
    }

    function addRegisteredVoter(string memory _voterId) public onlyAdmin {

        require(!electionActive, "Election already started");
        require(!voters[_voterId].isRegistered, "Voter already registered");

        voters[_voterId] = Voter(true, false);
    }

    function vote(
        string memory _voterId,
        string memory _candidateId
    ) public onlyAdmin {

        require(electionActive, "Election not active");
        require(voters[_voterId].isRegistered, "Voter not registered");
        require(!voters[_voterId].hasVoted, "Already voted");
        require(bytes(candidates[_candidateId].id).length != 0, "Invalid candidate");

        voters[_voterId].hasVoted = true;
        candidates[_candidateId].voteCount++;

        emit Voted(_voterId, _candidateId);
    }

    function getCandidates()
        public
        view
        returns (
            string[] memory,
            string[] memory,
            string[] memory
        )
    {
        uint len = candidateIds.length;

        string[] memory ids = new string[](len);
        string[] memory names = new string[](len);
        string[] memory parties = new string[](len);

        for (uint i = 0; i < len; i++) {
            Candidate memory c = candidates[candidateIds[i]];
            ids[i] = c.id;
            names[i] = c.name;
            parties[i] = c.party;
        }

        return (ids, names, parties);
    }

    function getCandidatesVotes()
        public
        view
        returns (
            string[] memory,
            string[] memory,
            string[] memory,
            uint[] memory
        )
    {
        uint len = candidateIds.length;

        string[] memory ids = new string[](len);
        string[] memory names = new string[](len);
        string[] memory parties = new string[](len);
        uint[] memory votes = new uint[](len);

        for (uint i = 0; i < len; i++) {
            Candidate memory c = candidates[candidateIds[i]];
            ids[i] = c.id;
            names[i] = c.name;
            parties[i] = c.party;
            votes[i] = c.voteCount;
        }

        return (ids, names, parties, votes);
    }
}