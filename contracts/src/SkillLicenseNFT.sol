// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SkillLicenseNFT
 * @notice Soulbound ERC-721 NFT minted to buyers as proof of skill license ownership
 * @dev Deployed on Filecoin Virtual Machine (FVM) - Calibration Testnet
 *
 * SC-01 FIX: Made soulbound — licenses cannot be transferred after minting
 * BUG-04 FIX: O(1) hasLicense using mapping instead of O(n) loop
 * SC-03: Added minter role separate from owner for security
 */
contract SkillLicenseNFT is ERC721, ERC721Enumerable, Ownable {
    struct License {
        uint256 skillId;
        string skillName;
        string cid;
        uint256 purchaseDate;
        address buyer;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => License) public licenses;
    mapping(address => uint256[]) public ownerLicenses;

    // BUG-04 FIX: O(1) license lookup
    mapping(address => mapping(uint256 => bool)) private _hasLicenseFor;

    // SC-03: Separate minter role
    address public minter;

    event LicenseMinted(
        uint256 indexed tokenId,
        uint256 indexed skillId,
        string skillName,
        address indexed buyer
    );
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);

    modifier onlyMinter() {
        require(msg.sender == minter || msg.sender == owner(), "Not authorized to mint");
        _;
    }

    constructor() ERC721("Skillcoin License", "SKLNFT") Ownable(msg.sender) {
        minter = msg.sender;
    }

    /**
     * @notice Set the minter address (backend service wallet)
     * @dev Only callable by the contract owner
     */
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "Invalid minter address");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    /**
     * @notice Mint a license NFT to a buyer
     * @dev SC-03: Callable by minter role (not just owner)
     */
    function mintLicense(
        address recipient,
        uint256 skillId,
        string calldata skillName,
        string calldata cid
    ) external onlyMinter returns (uint256) {
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;

        _safeMint(recipient, tokenId);

        licenses[tokenId] = License({
            skillId: skillId,
            skillName: skillName,
            cid: cid,
            purchaseDate: block.timestamp,
            buyer: recipient
        });

        ownerLicenses[recipient].push(tokenId);

        // BUG-04 FIX: O(1) lookup entry
        _hasLicenseFor[recipient][skillId] = true;

        emit LicenseMinted(tokenId, skillId, skillName, recipient);
        return tokenId;
    }

    /**
     * @notice Get all token IDs owned by an address
     */
    function getOwnedSkills(address owner_) external view returns (uint256[] memory) {
        return ownerLicenses[owner_];
    }

    /**
     * @notice Check if an address has a license for a specific skill
     * @dev BUG-04 FIX: O(1) lookup instead of O(n) loop
     */
    function hasLicense(address owner_, uint256 skillId) external view returns (bool) {
        return _hasLicenseFor[owner_][skillId];
    }

    /**
     * @notice Get license details for a token
     */
    function getLicense(uint256 tokenId) external view returns (License memory) {
        return licenses[tokenId];
    }

    // SC-01 FIX: Make licenses soulbound — block all transfers except mint and burn
    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)) and burning (to == address(0))
        // Block all other transfers
        require(from == address(0) || to == address(0), "License is soulbound: transfers disabled");
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
