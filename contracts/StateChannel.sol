pragma solidity 0.5.11;

import "./SafeMath.sol";
import "./Ownable.sol";


contract StateChannel is Ownable {

    using SafeMath for uint256;

    mapping (address => uint256) private _balance;
    mapping (address => uint256) private _lastTokenPayment; // To give the option to revert the last token payment.

    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    /**
       @dev Returns contract name.
    */
    function name() public pure returns (string memory) {
        return "StateChannel";
    }
}
