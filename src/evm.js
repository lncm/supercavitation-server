import Web3 from 'web3';
import HDWalletProvider from 'truffle-hdwallet-provider';
import SwapOffering from '@lncm/supercavitation-contracts/build/contracts/SwapOffering.json';

import { gas, gasPrice, evmUri, derevationPath } from './config';

const contracts = {};
const mnemonic = process.env.MNEMONIC.trim();
const provider = new HDWalletProvider(mnemonic, evmUri, 0, 1, false, derevationPath);
const web3 = new Web3(provider);

export async function getAccount() {
  return (await web3.eth.getAccounts())[0];
}

export async function signMessage(message) {
  const address = await getAccount();
  return web3.eth.sign(message, address);
}

export function messageIsValid(address, data, signature) {
  const signer = web3.eth.personal.ecRecover(data, signature);
  return signer === address;
}

export function getContract(address) {
  if (!contracts[address]) {
    contracts[address] = new web3.eth.Contract(SwapOffering.abi, address);
  }
  return contracts[address];
}

export async function contractTx({ contract, method, args, onMined, onPublished }) {
  const from = await getAccount();
  return new Promise((resolve, reject) => {
    getContract(contract).methods[method](...args).send({ from, gasPrice, gas })
      .on('error', reject)
      .on('transactionHash', onPublished)
      .on('receipt', async (tx) => {
        await onMined(tx);
        resolve(tx);
      });
  });
}
