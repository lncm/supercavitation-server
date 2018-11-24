import web3 from './web3';

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