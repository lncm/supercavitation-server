import Web3 from 'web3';
import HDWalletProvider from 'truffle-hdwallet-provider';

import { evmUri, derevationPath } from '../../config.json';

const mnemonic = process.env.MNEMONIC.trim();
const provider = new HDWalletProvider(mnemonic, evmUri, 0, 1, false, derevationPath);

export default new Web3(provider);
