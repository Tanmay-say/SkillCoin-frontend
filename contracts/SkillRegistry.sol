// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SkillRegistry
 * @notice On-chain index of all skills published on the Skillcoin marketplace
 * @dev Deployed on Filecoin Virtual Machine (FVM) - Calibration Testnet
 *
 * SC-04 FIX: Added CID uniqueness check to prevent piracy
 * SC-02 FIX: Added recordPurchase function with PurchaseRecorded event
 */
contract SkillRegistry {
    struct SkillInfo {
        uint256 id;
        string name;
        string cid;         // IPFS CID on Filecoin
        address creator;
        uint256 price;      // in wei (USDC decimals)
        string version;
        uint256 createdAt;
        bool active;
    }

    mapping(uint256 => SkillInfo) public skills;
    mapping(string => uint256) public skillsByName;
    mapping(string => bool) public cidRegistered;  // SC-04: CID uniqueness
    uint256 public totalSkills;
    address public owner;

    event SkillRegistered(
        uint256 indexed id,
        string name,
        string cid,
        address indexed creator,
        uint256 price
    );
    event SkillUpdated(uint256 indexed id, string newCid, string newVersion);
    event SkillDeactivated(uint256 indexed id);
    event PurchaseRecorded(  // SC-02: New event
        uint256 indexed skillId,
        address indexed buyer,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyCreator(uint256 skillId) {
        require(skills[skillId].creator == msg.sender, "Only creator");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Register a new skill on-chain
     * @dev SC-04: Checks both name AND CID uniqueness
     */
    function registerSkill(
        string calldata name,
        string calldata cid,
        uint256 price,
        string calldata version
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(cid).length > 0, "CID required");
        require(skillsByName[name] == 0, "Name already registered");
        require(!cidRegistered[cid], "CID already registered");  // SC-04

        totalSkills++;
        uint256 id = totalSkills;

        skills[id] = SkillInfo({
            id: id,
            name: name,
            cid: cid,
            creator: msg.sender,
            price: price,
            version: version,
            createdAt: block.timestamp,
            active: true
        });

        skillsByName[name] = id;
        cidRegistered[cid] = true;  // SC-04

        emit SkillRegistered(id, name, cid, msg.sender, price);
        return id;
    }

    /**
     * @notice Update a skill's CID and version (new upload)
     * @dev SC-04: Checks new CID uniqueness
     */
    function updateSkill(
        uint256 skillId,
        string calldata newCid,
        string calldata newVersion
    ) external onlyCreator(skillId) {
        require(skills[skillId].active, "Skill is deactivated");
        require(!cidRegistered[newCid], "CID already registered");  // SC-04

        // Unregister old CID, register new one
        cidRegistered[skills[skillId].cid] = false;
        cidRegistered[newCid] = true;

        skills[skillId].cid = newCid;
        skills[skillId].version = newVersion;
        emit SkillUpdated(skillId, newCid, newVersion);
    }

    /**
     * @notice Deactivate a skill
     */
    function deactivateSkill(uint256 skillId) external onlyCreator(skillId) {
        skills[skillId].active = false;
        emit SkillDeactivated(skillId);
    }

    /**
     * @notice Record a purchase on-chain for auditability
     * @dev SC-02: Called by owner/backend after verified purchase
     */
    function recordPurchase(uint256 skillId, address buyer) external onlyOwner {
        require(skillId > 0 && skillId <= totalSkills, "Invalid skill ID");
        require(skills[skillId].active, "Skill is deactivated");
        emit PurchaseRecorded(skillId, buyer, block.timestamp);
    }

    /**
     * @notice Get skill by ID
     */
    function getSkill(uint256 skillId) external view returns (SkillInfo memory) {
        return skills[skillId];
    }

    /**
     * @notice Get skill by name
     */
    function getSkillByName(string calldata name) external view returns (SkillInfo memory) {
        uint256 id = skillsByName[name];
        require(id > 0, "Skill not found");
        return skills[id];
    }
}
