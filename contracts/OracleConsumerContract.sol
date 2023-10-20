// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./PhatRollupAnchor.sol";

contract OracleConsumerContract is ERC20, PhatRollupAnchor, Ownable {
    event ResponseReceived(uint reqId, string reqData, uint256 value);
    event ErrorReceived(uint reqId, string reqData, uint256 errno);

    uint constant TYPE_RESPONSE = 0;
    uint constant TYPE_ERROR = 2;

    uint constant AIRDROP_AWARD = 10000;

    mapping(uint => string) requests;
    uint nextRequest = 1;

    constructor(address phatAttestor) ERC20("Huddle01", "HDL") {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function setAttestor(address phatAttestor) public {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    // airdrop all the participants given the meeting id
    function requestMeetingAirdrop(string calldata meetingId) public {
        // assemble the request
        uint id = nextRequest;
        requests[id] = meetingId;
        _pushMessage(abi.encode(id, meetingId));
        nextRequest += 1;
    }

    function _onMessageReceived(bytes calldata action) internal override {
        // Optional to check length of action
        // require(action.length == 32 * 3, "cannot parse action");
        (uint respType, uint id, uint errno, address[] memory addresses) = abi
            .decode(action, (uint, uint, uint, address[]));
        if (respType == TYPE_RESPONSE) {
            for (uint256 i; i < addresses.length; i++) {
                _mint(addresses[i], AIRDROP_AWARD);
            }
            emit ResponseReceived(id, requests[id], addresses.length);
            delete requests[id];
        } else if (respType == TYPE_ERROR) {
            emit ErrorReceived(id, requests[id], errno);
            delete requests[id];
        }
    }
}
