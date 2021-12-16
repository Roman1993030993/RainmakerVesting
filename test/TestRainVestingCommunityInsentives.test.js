const bnChai = require('bn-chai');
const chai = require("chai")
const chaiAsPromised = require("chai-as-promised");
const { increaseTime } = require("./time-travel");

const now = async () => {
  const bn = await web3.eth.getBlockNumber()
  const { timestamp } = await web3.eth.getBlock(bn)
  return timestamp;
};

const day = 24 * 60 * 60; // 1 day
const lockupTime = 30 * day; // 1 months
const period = 1; // 1 seconds 
const duration = 25 * 30 * day; // lockupTime 24 months + 1 month = 25 months
const totalSupply = web3.utils.toWei('1000000', 'ether');

chai.use(chaiAsPromised).use(bnChai(web3.utils.BN));

const { expect } = chai;

const RainVesting = artifacts.require("RainVesting");
const RainToken = artifacts.require("RainToken");

contract("TestRainVestingCommunityInsentives", (accounts) => {
  const [beneficiary1, beneficiary2, beneficiary3, other] = accounts;

  const beneficiary1tokenAmount = web3.utils.toBN(totalSupply).mul(web3.utils.toBN(30)).div(web3.utils.toBN(100));
  const beneficiary2tokenAmount = web3.utils.toBN(totalSupply).mul(web3.utils.toBN(30)).div(web3.utils.toBN(100));
  const beneficiary3tokenAmount = web3.utils.toBN(totalSupply).mul(web3.utils.toBN(40)).div(web3.utils.toBN(100));
  const BP = 1000000;

  let token;
  let tokenVesting;
  let vestingSettings;
  let tokenSettings;

  async function balanceOf(address) {
    return await token.balanceOf(address)
  }

  function toBN(number) {
    return web3.utils.toBN(number.toString());
  }

  beforeEach(async () => {

    vestingSettings = {
      start: (await web3.eth.getBlock("latest")).timestamp,
      lockupTime: lockupTime, // 1 months
      percentAfterCliff: 0,
      duration: duration // lockupTime 12 months + 2 years = 36 months
    };

    tokenSettings = {
      name: "Tooploox",
      symbol: "TPX",
      decimals: 18,
      totalSupply,
    };

    token = await RainToken.new(
      tokenSettings.name,
      tokenSettings.symbol,
      tokenSettings.totalSupply,
    ) 

    tokenVesting = await RainVesting.new(
      token.address,
      vestingSettings.start,
      vestingSettings.lockupTime,
      vestingSettings.percentAfterCliff,
      vestingSettings.duration
    )
  
    await token.transfer(tokenVesting.address, await token.balanceOf(beneficiary1));

  });

  describe("Ownable implementation", () => {
    it("sets owner on deploy", async () => {
      expect(await tokenVesting.owner()).to.equal(beneficiary1);
    });
  });

  describe("releasing tokens", () => {
    beforeEach(async () => {
      await tokenVesting.addBeneficiaries(
        [beneficiary1, beneficiary2, beneficiary3], 
        [beneficiary1tokenAmount, beneficiary2tokenAmount, beneficiary3tokenAmount]
      );
    });

    it("allows a beneficiary to release tokens", async () => {
      expect(tokenVesting.claimTokens).not.to.throw();
    });

    it("disallows others to release tokens", async () => {
      tokenVesting.claimTokens({ from: other }).then(assert.fail).catch((error) => {
        if (error.toString().indexOf("transaction: revert") === -1) {
          assert(false, error.toString());
        }
      });
    });
  });

  describe("releasing tokens in time", () => {
    beforeEach(async () => {
      await tokenVesting.addBeneficiaries(
        [beneficiary1, beneficiary2, beneficiary3], 
        [beneficiary1tokenAmount, beneficiary2tokenAmount, beneficiary3tokenAmount]
      );
    });

    it("doesn't release tokens before lockupTime", async () => {    
      await increaseTime(lockupTime-100);
      await tokenVesting.claimTokens();

      expect(await balanceOf(beneficiary1)).to.eq.BN(toBN(0));

      const periods = 11;
      await increaseTime(periods * period + 100);
      let blockNumber = (await tokenVesting.claimTokens()).receipt.blockNumber;
      let timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      const expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);
    });

    it("releases tokens after lockupTime", async () => {     
      const periods = 5;
      await increaseTime(lockupTime + periods * period);

      let blockNumber = (await tokenVesting.claimTokens()).receipt.blockNumber;
      let timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      const expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect(toBN(await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);
    });

    it("releases all tokens after at the end", async () => {
      increaseTime(duration);
      await tokenVesting.claimTokens({ from: beneficiary1 });
      
      const expectedBeneficiaryPercent = beneficiary1tokenAmount;
      
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);
      
      increaseTime(300 * day);

      tokenVesting.claimTokens().then(assert.fail).catch((error) => {
        if (error.toString().indexOf("transaction: revert") === -1) {
          assert(false, error.toString());
        }
      });

      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);
    });

    it("releases tokens progressively", async () => {
      await increaseTime(lockupTime-50);
      await tokenVesting.claimTokens({ from: beneficiary1 });
      expect((await balanceOf(beneficiary1))).to.eq.BN(toBN(0));

      const periods = 1;

      await increaseTime(periods * period + 50);

      let blockNumber = (await tokenVesting.claimTokens()).receipt.blockNumber;
      let timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      let expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);

      await increaseTime(periods * period);

      blockNumber = (await tokenVesting.claimTokens()).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);

      await increaseTime(periods * period);
      
      blockNumber = (await tokenVesting.claimTokens()).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);

      await increaseTime(10 * periods * period);
      
      blockNumber = (await tokenVesting.claimTokens()).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);
    });
  });

  describe("releasing tokens between beneficiaries", () => {

    beforeEach(async () => {
      await tokenVesting.addBeneficiaries(
        [beneficiary1, beneficiary2, beneficiary3], 
        [beneficiary1tokenAmount, beneficiary2tokenAmount, beneficiary3tokenAmount]
      );
    });

    it("releases tokens having regard shares ratio", async () => {
      const periods = 5;

      await increaseTime(lockupTime + periods * period);

      let blockNumber = (await tokenVesting.claimTokens({ from: beneficiary1 })).receipt.blockNumber;
      let timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      const expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary2 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      
      const expectedBeneficiary2Percent = (toBN(beneficiary2tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary2))).to.eq.BN(expectedBeneficiary2Percent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary3 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      const expectedBeneficiary3Percent = (toBN(beneficiary3tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary3))).to.eq.BN(expectedBeneficiary3Percent);

    });

    it("releases tokens having regard shares ratio progressively", async () => {
      const periods = 1;

      await increaseTime(lockupTime + periods * period);

      let blockNumber = (await tokenVesting.claimTokens({ from: beneficiary1 })).receipt.blockNumber;
      let timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      let expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary2 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      let expectedBeneficiary2Percent = (toBN(beneficiary2tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary2))).to.eq.BN(expectedBeneficiary2Percent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary3 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      let expectedBeneficiary3Percent = (toBN(beneficiary3tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary3))).to.eq.BN(expectedBeneficiary3Percent);

      await increaseTime(periods * period);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary1 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary2 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      expectedBeneficiary2Percent = (toBN(beneficiary2tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary2))).to.eq.BN(expectedBeneficiary2Percent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary3 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      expectedBeneficiary3Percent = (toBN(beneficiary3tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary3))).to.eq.BN(expectedBeneficiary3Percent);

      await increaseTime(periods * period);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary1 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      expectedBeneficiaryPercent = (toBN(beneficiary1tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary2 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      expectedBeneficiary2Percent = (toBN(beneficiary2tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary2))).to.eq.BN(expectedBeneficiary2Percent);

      blockNumber = (await tokenVesting.claimTokens({ from: beneficiary3 })).receipt.blockNumber;
      timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
      expectedBeneficiary3Percent = (toBN(beneficiary3tokenAmount).div(toBN(vestingSettings.start + duration).sub(toBN(timestamp).sub(toBN(vestingSettings.start + lockupTime)))));
      expect((await balanceOf(beneficiary3))).to.eq.BN(expectedBeneficiary3Percent);

    });

    it("releases all tokens after at the end to all beneficiaries", async () => {
      increaseTime(duration);
      
      await tokenVesting.claimTokens({ from: beneficiary1 });
      await tokenVesting.claimTokens({ from: beneficiary2 });
      await tokenVesting.claimTokens({ from: beneficiary3 });
      
      let expectedBeneficiaryPercent = toBN(beneficiary1tokenAmount);
      let expectedBeneficiary2Percent = toBN(beneficiary2tokenAmount);
      let expectedBeneficiary3Percent = toBN(beneficiary3tokenAmount);
      
      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);
      expect((await balanceOf(beneficiary2))).to.eq.BN(expectedBeneficiary2Percent);
      expect((await balanceOf(beneficiary3))).to.eq.BN(expectedBeneficiary3Percent);
      
      increaseTime(300 * day);

      tokenVesting.claimTokens({ from: beneficiary1 }).then(assert.fail).catch((error) => {
        if (error.toString().indexOf("transaction: revert") === -1) {
          assert(false, error.toString());
        }
      });

      tokenVesting.claimTokens({ from: beneficiary2 }).then(assert.fail).catch((error) => {
        if (error.toString().indexOf("transaction: revert") === -1) {
          assert(false, error.toString());
        }
      });

      tokenVesting.claimTokens({ from: beneficiary3 }).then(assert.fail).catch((error) => {
        if (error.toString().indexOf("transaction: revert") === -1) {
          assert(false, error.toString());
        }
      });

      expect((await balanceOf(beneficiary1))).to.eq.BN(expectedBeneficiaryPercent);
      expect((await balanceOf(beneficiary2))).to.eq.BN(expectedBeneficiary2Percent);
      expect((await balanceOf(beneficiary3))).to.eq.BN(expectedBeneficiary3Percent);

    });
  });
});