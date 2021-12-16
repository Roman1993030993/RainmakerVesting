const RainToken = artifacts.require("RainToken");
const RainVesting = artifacts.require("RainVesting");

const initialSupply = web3.utils.toWei("1000000000", 'ether');
const day = 24 * 60 * 60;
const month = 30 * day;

module.exports = async (deployer) => {
  await deployer.deploy(RainToken, "symbol", "name", initialSupply);

  // let currentTimestamp = (await web3.eth.getBlock("latest")).timestamp;

  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 12 * month, 0, 48 * month, 1); // Pre Seed
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 12 * month, 0, 48 * month, 1); // Seed
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 8 * month, 0, 40 * month, 1,); // Strategic
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 6 * month, 0, 30 * month, 1); // T1
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 4 * month, 0, 17 * month, 1); // T2
  
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 12, 0, 36 * month, 1); // Team
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 1, 0, 36 * month, 1); // Avisor
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 0, 0, 48 * month, 1); // Marketing & Ops
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 0, 12500, 12, 1); // Liquidity
  // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 0, 10000, 24 * month, 1); // Treasury
 // await deployer.deploy(RainVesting, (await RainToken.deployed()).address, currentTimestamp, 1, 0, 36 * month, 1); // Community Insentives

  




  // let RainToken = await RainToken.deployed();
  // await RainToken.transfer((await RainVesting.deployed()).address, initialSupply);
};