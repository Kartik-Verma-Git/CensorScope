// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CensorshipRegistry {
    struct CensorshipReport {
        string url;
        string country;
        string statusHash;
        string dataHash; // Replaced ipfsCid with dataHash representing the aggregated JSON payload
        uint256 timestamp;
        address reporter;
    }

    CensorshipReport[] public reports;

    // Track the last timestamp a specific domain was logged in a specific country
    // keccak256(abi.encodePacked(url, country)) => timestamp
    mapping(bytes32 => uint256) public lastLogTime;

    event ReportAdded(
        uint256 indexed reportId,
        string url,
        string country,
        string statusHash,
        string dataHash,
        uint256 timestamp,
        address reporter
    );

    function addReport(
        string memory _url,
        string memory _country,
        string memory _statusHash,
        string memory _dataHash
    ) public {
        bytes32 domainHash = keccak256(abi.encodePacked(_url, _country));
        
        // Prevent multiple entries for the same domain+country within 24 hours
        require(block.timestamp >= lastLogTime[domainHash] + 1 days, "This domain+country combination was already logged within the last 24 hours");

        CensorshipReport memory newReport = CensorshipReport({
            url: _url,
            country: _country,
            statusHash: _statusHash,
            dataHash: _dataHash,
            timestamp: block.timestamp,
            reporter: msg.sender
        });

        reports.push(newReport);
        lastLogTime[domainHash] = block.timestamp;
        
        uint256 reportId = reports.length - 1;

        emit ReportAdded(
            reportId,
            _url,
            _country,
            _statusHash,
            _dataHash,
            block.timestamp,
            msg.sender
        );
    }

    function getReportCount() public view returns (uint256) {
        return reports.length;
    }

    function getReport(uint256 _reportId) public view returns (CensorshipReport memory) {
        require(_reportId < reports.length, "Report does not exist");
        return reports[_reportId];
    }
}
