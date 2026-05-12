// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DecentralizedRegistry {
    struct Node {
        uint256 trustScore; // 0 to 1000
        uint256 totalVotes;
        uint256 accurateVotes;
        bool isRegistered;
    }

    struct ConsensusReport {
        string url;
        string country;
        bool isBlocked;
        string ipfsCid; // Link to raw signed votes from nodes
        uint256 totalWeight;
        uint256 timestamp;
    }

    address public backendOracle;
    
    mapping(address => Node) public nodes;
    mapping(bytes32 => ConsensusReport) public reports; // hash(url, country) => Report
    
    // Track registered nodes for frontend analytics
    address[] public registeredNodes;

    event NodeRegistered(address indexed nodeAddress);
    event ConsensusLogged(string url, string country, bool isBlocked, string ipfsCid);
    event TrustScoreUpdated(address indexed nodeAddress, uint256 newScore);

    modifier onlyOracle() {
        require(msg.sender == backendOracle, "Only the backend oracle can submit consensus");
        _;
    }

    constructor() {
        backendOracle = msg.sender;
    }

    function registerNode() public {
        require(!nodes[msg.sender].isRegistered, "Node already registered");
        nodes[msg.sender] = Node({
            trustScore: 500, // Start with a baseline trust score of 500/1000
            totalVotes: 0,
            accurateVotes: 0,
            isRegistered: true
        });
        registeredNodes.push(msg.sender);
        emit NodeRegistered(msg.sender);
    }

    // Backend oracle submits the final consensus
    function finalizeReport(
        string memory _url,
        string memory _country,
        bool _isBlocked,
        address[] memory _correctNodes,
        address[] memory _incorrectNodes,
        string memory _ipfsCid,
        uint256 _totalWeight
    ) public onlyOracle {
        bytes32 domainHash = keccak256(abi.encodePacked(_url, _country));

        // Ensure 1-minute cooldown to prevent spamming (reduced from 1 days for testing)
        require(block.timestamp >= reports[domainHash].timestamp + 1 minutes, "Cooldown active for this domain/country");

        // Save report
        reports[domainHash] = ConsensusReport({
            url: _url,
            country: _country,
            isBlocked: _isBlocked,
            ipfsCid: _ipfsCid,
            totalWeight: _totalWeight,
            timestamp: block.timestamp
        });

        // Update Trust Scores
        // Reward correct nodes
        for (uint i = 0; i < _correctNodes.length; i++) {
            address nAddr = _correctNodes[i];
            if (nodes[nAddr].isRegistered) {
                nodes[nAddr].totalVotes++;
                nodes[nAddr].accurateVotes++;
                if (nodes[nAddr].trustScore < 1000) {
                    nodes[nAddr].trustScore += 10; // +10 for being right
                    if (nodes[nAddr].trustScore > 1000) nodes[nAddr].trustScore = 1000;
                }
                emit TrustScoreUpdated(nAddr, nodes[nAddr].trustScore);
            }
        }

        // Penalize incorrect nodes
        for (uint i = 0; i < _incorrectNodes.length; i++) {
            address nAddr = _incorrectNodes[i];
            if (nodes[nAddr].isRegistered) {
                nodes[nAddr].totalVotes++;
                if (nodes[nAddr].trustScore >= 50) {
                    nodes[nAddr].trustScore -= 50; // -50 penalty for being wrong/malicious
                } else {
                    nodes[nAddr].trustScore = 0;
                }
                emit TrustScoreUpdated(nAddr, nodes[nAddr].trustScore);
            }
        }

        emit ConsensusLogged(_url, _country, _isBlocked, _ipfsCid);
    }

    // Helper functions for frontend
    function getReport(string memory _url, string memory _country) public view returns (ConsensusReport memory) {
        return reports[keccak256(abi.encodePacked(_url, _country))];
    }
    
    function getRegisteredNodes() public view returns (address[] memory) {
        return registeredNodes;
    }
    
    function getNodeTrustScore(address _node) public view returns (uint256) {
        return nodes[_node].trustScore;
    }
}
