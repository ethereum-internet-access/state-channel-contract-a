pragma solidity 0.5.11;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./ECDSA.sol";


contract StateChannel is Ownable {

    using SafeMath for uint256;
    using ECDSA for bytes32;
    // used as a unique channel id, increments by 1 every time a channel is opened
    uint256 public channelCount;
    uint256 public pricePerSecond = 277777777777;

    mapping (uint256 => ChannelData) public channelMapping;

    function name() public pure returns (string memory) {
        return "StateChannel";
    }

    struct ChannelData {
        address ephemeralAddress;
        address payable payer;
        uint256 deposit;
        uint256 openTime; // Timeout in case the recipient never closes.
        bool closed;
    }

    event ChannelOpened(address indexed payer,
                        uint256 indexed channelId,
                        uint256 depositAmount);

    event ChannelClosed(address indexed payer,
                        uint256 indexed channelId,
                        uint256 paidAmount,
                        uint256 refundedAmount);

    event ChannelExpired(address indexed payer, uint256 indexed channelId, uint256 refundedAmount);

    function openChannel(address ephemeralAddress) public payable returns (uint256) {
        require(msg.value >= 2000000000000000);
        // increment channel count and use it as a unique id
        uint256 channelId = channelCount + 1;
        channelCount = channelId;
        // init the channel with the creation data
        channelMapping[channelId] =
            ChannelData({ephemeralAddress: ephemeralAddress,
                        payer : msg.sender,
                        deposit : msg.value, openTime : now, closed : false });
        // log an event
        emit ChannelOpened(msg.sender, channelId, msg.value);
        return channelId;
    }

    /// the recipient can close the channel at any time by presenting a
    /// signed amount from the sender. the recipient will be sent that amount,
    /// and the remainder will go back to the sender
    function closeChannel(uint256 amount, uint256 channelId, bytes memory signature) public {
        require(isOwner(), "Only contract owner can close the channel");
        require(!channelMapping[channelId].closed, "Channel already closed");
        require(channelMapping[channelId].deposit >= amount, "Not enough amount");
        require(isValidSignature(amount, channelId, signature), "Invalid signature");
        uint256 _refundAmount = channelMapping[channelId].deposit.sub(amount);
        channelMapping[channelId].closed = true;

        msg.sender.transfer(amount);
        channelMapping[channelId].payer.transfer(_refundAmount);
        emit ChannelClosed(channelMapping[channelId].payer, channelId, amount, _refundAmount);
    }

    /// if the timeout is reached without the recipient closing the channel,
    /// then the Ether is released back to the sender.
    function claimTimeout(uint256 channelId) public payable {
        require(!channelMapping[channelId].closed);
        uint256 _expirationTime = channelMapping[channelId].openTime.
          add(channelMapping[channelId].deposit.div(pricePerSecond)).add(300);
        require(now >= _expirationTime);

        channelMapping[channelId].closed = true;

        channelMapping[channelId].payer.transfer(channelMapping[channelId].deposit);

        emit ChannelExpired(channelMapping[channelId].payer, channelId, channelMapping[channelId].deposit);
    }

    function isValidSignature(uint256 amount, uint256 channelId, bytes memory signature)
        internal
        view
        returns (bool) {
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, amount, channelId)));

        // check that the signature is from the payment sender
        return message.recover(signature) == channelMapping[channelId].ephemeralAddress;
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}
