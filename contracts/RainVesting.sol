// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract RainVesting is Ownable {
  using SafeERC20 for IERC20;

  event Released(address beneficiary, uint256 amount);

  IERC20 public token;
  uint256 public lockupTime;
  uint256 public percentUpfront;
  uint256 public start;
  uint256 public duration;

  mapping (address => uint256) public tokenAmounts;
  mapping (address => uint256) public lastReleaseDate;
  mapping (address => uint256) public releasedAmount;

  uint256 private released;
  uint256 private BP = 1000000;

  address[] public beneficiaries;

  modifier onlyBeneficiaries {
    require(msg.sender == owner() || tokenAmounts[msg.sender] > 0, "You cannot release tokens!");
    _;
  }

  constructor(
    IERC20 _token,
    uint256 _start,
    uint256 _lockupTime,
    uint256 _percentUpfront,
    uint256 _duration
  ) {
    require(_lockupTime <= _duration, "Cliff has to be lower or equal to duration");
    token = _token;
    duration = _duration;
    lockupTime = _start + _lockupTime;
    percentUpfront = _percentUpfront;
    start = _start;
  }

  function addBeneficiaries(address[] memory _beneficiaryes, uint256[] memory _tokenAmounts) onlyOwner public {
    require(_beneficiaryes.length == _tokenAmounts.length, "Invalid params");
    
    for (uint i = 0; i <_beneficiaryes.length; i++) {
      addBeneficiary(_beneficiaryes[i], _tokenAmounts[i]);
    }

    require(totalAmounts() == token.balanceOf(address(this)), "Invalid token amount");
  }

  function addBeneficiary(address _beneficiary, uint256 _tokenAmount) private {
    require(block.timestamp < lockupTime || (lockupTime == start && block.timestamp < 2 days), "Invalid timing");
    require(_beneficiary != address(0), "The beneficiary's address cannot be 0");
    require(_tokenAmount > 0, "Amount has to be greater than 0");

    if (tokenAmounts[_beneficiary] == 0) {
      beneficiaries.push(_beneficiary);
    }

    lastReleaseDate[_beneficiary] = lockupTime;
    tokenAmounts[_beneficiary] = tokenAmounts[_beneficiary] + _tokenAmount;
  }

  function claimTokens() onlyBeneficiaries public {
    require(releasedAmount[msg.sender] < tokenAmounts[msg.sender], "User already released all available tokens");

    uint256 unreleased = releasableAmount() - releasedAmount[msg.sender];
    
    if (unreleased > 0) {
      released += unreleased;
      release(msg.sender, unreleased);
      lastReleaseDate[msg.sender] = block.timestamp;
    }
  }

  function userReleasableAmount() public view returns (uint256) {
    return releasableAmount();
  }

  function releasableAmount() private view returns (uint256) {
    if (block.timestamp < lockupTime) {
      return 0;
    } else {
      uint result;

      if(percentUpfront > 0 && block.timestamp >= lockupTime) {
        result += tokenAmounts[msg.sender] * percentUpfront / BP;
      }

      if(block.timestamp < lastReleaseDate[msg.sender]) return 0;
      uint256 timePassed = block.timestamp - lockupTime;

      if (timePassed <= duration - (lockupTime - start)) {
        result += tokenAmounts[msg.sender] / ((start + duration) - timePassed);
      }  else {
        result += tokenAmounts[msg.sender];
      }

      return result;
    }
  }

  function totalAmounts() public view returns (uint256 sum) {
    for (uint i = 0; i < beneficiaries.length; i++) {
      sum += tokenAmounts[beneficiaries[i]];
    }
  }

  function release(address _beneficiary, uint256 _amount) private {
    token.safeTransfer(_beneficiary, _amount);
    releasedAmount[_beneficiary] += _amount;
    emit Released(_beneficiary, _amount);
  }
}