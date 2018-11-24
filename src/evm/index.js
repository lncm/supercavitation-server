import Web3 from 'web3';
import HDWalletProvider from 'truffle-hdwallet-provider';

import { evmUri, derevationPath } from '../../config.json';

const mnemonic = process.env.MNEMONIC.trim();
const provider = new HDWalletProvider(mnemonic, evmUri, 0, 1, false, derevationPath);
const web3 = new Web3(provider);

export async function getAccounts() {
  const accounts = await web3.eth.getAccounts();
  console.log('got accounts', accounts);
  return accounts;
}

export async function getBlockNumber() {
  const block = await web3.eth.getBlockNumber();
  console.log('got block', block);
  return block;
}
