import Web3 from 'web3';
import HDWalletProvider from 'truffle-hdwallet-provider';
import SwapOffering from '@lncm/supercavitation-contracts/build/contracts/SwapOffering.json'

import { evmUri, derevationPath } from '../../config.json';

const mnemonic = process.env.MNEMONIC.trim();
const provider = new HDWalletProvider(mnemonic, evmUri, 0, 1, false, derevationPath);

const web3 = new Web3(provider);

const contractAddress = SwapOffering.networks['31'].address;
export const contract = new web3.eth.Contract(SwapOffering.abi, contractAddress);

export default web3;
