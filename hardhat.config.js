require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");

const path = require('path');
const envPath = path.join(__dirname, './.env');
require('dotenv').config({ path: envPath });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: "0.8.10",

  networks: {
    hardhat: {
      forking: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY_RINKEBY}`,
        accounts: [process.env.PRIVATE_KEY],
        blockNumber: 9722579,
      }
    },
    rinkeby: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY_RINKEBY}`,
        accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 50000
  }
};
