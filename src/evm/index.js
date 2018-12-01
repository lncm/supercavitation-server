import web3, { contract } from './web3';
import { reward, timeLockNumber } from '../../config.json';

const gasPrice = 1;

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

export async function signMessage(message) {
  const address = (await web3.eth.getAccounts())[0];
  return web3.eth.sign(message, address);
}

export function messageIsValid(address, data, signature) {
  const signer = web3.eth.personal.ecRecover(data, signature);
  return signer === address;
}

// createSwap('0x0f18cd0F5B7CcE9d6DCC246F80B0fCdd7a2AF150', 1, '0x5100d3bc8bf2b4f54e95c443777cf8b6e1c4e9aad7f12a920f26a0fb83f3a136');

export async function createSwap(customer, amount, preImageHash) {
  const [from] = await getAccounts();
  const txId = await new Promise((resolve) => {
    console.log({ customer, amount, reward, preImageHash, timeLockNumber, from, gasPrice });
    contract.methods.createSwap(customer, amount, reward, preImageHash, timeLockNumber).send({ from, gasPrice })
      .on('transactionHash', tx => resolve(tx));
  });
  return txId;
}

export async function claimReward(preImageHash, preImage) {
  console.log('checking ', preImageHash);
  // first check the status of the swap, if its already claimed we can ignore
  const { state } = await contract.methods.getSwap(preImageHash).call();
  if (state !== '0') {
    return { complete: true };
  }
  const [from] = await getAccounts();
  const txId = await new Promise((resolve) => {
    contract.methods.completeSwap(preImageHash, preImage).send({ from, gasPrice })
      .on('transactionHash', tx => resolve(tx));
  });
  return { txId };
}
