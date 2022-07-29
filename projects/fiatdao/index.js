const { sumTokensAndLPsSharedOwners } = require("../helper/unwrapLPs");
const { staking } = require("../helper/staking");
const { fetchURL } = require("../helper/utils");
const sdk = require("@defillama/sdk")
const abi = require('./abi.json');
const { default: BigNumber } = require("bignumber.js");

const fdt = "0xed1480d12be41d92f36f5f7bdd88212e381a3677";
const comitium = "0x4645d1cF3f4cE59b06008642E74E60e8F80c8b58";

async function tvl(timestamp, block) {
  const balances = {};

  // Element Finance
  const vaults = Object.entries((await fetchURL("https://raw.githubusercontent.com/fiatdao/changelog/main/deployment/deployment-mainnet.json")).data)
    .filter((e)=>e[0].startsWith("vaultEPT") && !e[0].endsWith("Actions")).map(e=>e[1].address)
  await Promise.all(vaults.map(async vault=>{
    // would be better to use multicall but im lazy
    const token = await sdk.api.abi.call({target:vault, block, abi: abi.token})
    if(token.output==="0x0000000000000000000000000000000000000000"){
      return
    }
    const tokenBalance = await sdk.api.erc20.balanceOf({target: token.output, owner: vault, block})
    const underlier = await sdk.api.abi.call({target:vault, block, abi: abi.underlierToken})
    const price = await sdk.api.abi.call({target:vault, block, abi: abi.fairPrice, params: [0, false, false]})

    sdk.util.sumSingleBalance(balances, underlier.output ==="0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA" ?"0x5f98805a4e8be255a32880fdec7f6728c6568ba0":underlier.output, 
      BigNumber(tokenBalance.output).times(price.output).div(1e18)
    .toFixed(0));
  }))

  return balances;
}

module.exports = {
  methodology:
    "TVL includes value of Rewards Pools and staking includes 
  staked in Senatus",
  ethereum: {
    tvl,
    staking: staking(comitium, fdt),
  },
};
