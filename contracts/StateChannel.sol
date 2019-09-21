pragma solidity 0.5.11;

import "./SafeMath.sol";
import "./Ownable.sol";


contract StateChannel is Ownable {

    using SafeMath for uint256;

    /**
       @dev Returns contract name.
    */
    function name() public pure returns (string memory) {
        return "StateChannel";
    }
}
