import Web3 from 'web3';
import HDWalletProvider from 'truffle-hdwallet-provider';

import { evmUri, derevationPath } from '../../config.json';

const mnemonic = process.env.MNEMONIC.trim();
const provider = new HDWalletProvider(mnemonic, evmUri, 0, 1, false, derevationPath);
const web3 = new Web3(provider);

// eth.accounts().then(t => console.log(t)).catch(e => console.log(e));

async function test() {
  console.log('getting....', await web3.eth.getAccounts());
}