import { version } from '../package.json';
import { text, timeLockBlocks, reward, minAmount, depositFee, exchangeRate } from '../config.json';
import { createInvoice } from './lnd';
import { contractTx } from './evm';
import { upsert, read, waitFor } from './store';

export function getSwapConfig() {
  // TODO this could by dynamic, based on alice's reptuation
  return {
    text,
    timeLockBlocks,
    reward,
    minAmount,
    depositFee,
    exchangeRate,
    version,
  };
}

// talks to LND, creates a new invoice
export async function generateInvoice({ value }) {
  const { r_hash: preImageHashBuffer, payment_request: paymentRequest } = await createInvoice({ value });
  const preImageHash = preImageHashBuffer.toString('hex');
  // TODO perhaps do some validation to ensure the client will get the same preImageHash out, using the js lib
  return { paymentRequest, preImageHash };
}

async function handlePayments(preImageHash) {
  const { depositPreImageHash, contract, customer, amount } = await read(preImageHash);
  if (depositPreImageHash) {
    // wait for the deposit to be settled if it's set before sending the tx...
    console.log('waiting for deposit', depositPreImageHash);
    await waitFor(depositPreImageHash, 'settled');
    console.log('deposit paid!', depositPreImageHash);
  }
  // publish the swap, it resolves when mined
  await contractTx({
    contract,
    method: 'createSwap',
    args: [customer, amount, reward, `0x${preImageHash}`, timeLockBlocks],
    onPublished: creationTx => upsert(preImageHash, { creationTx }),
    onMined: creationMined => upsert(preImageHash, { creationMined }),
  });
  // now it's mined, we can listen for the invoice to be paid
  console.log('waiting for full payment', preImageHash);
  await waitFor(preImageHash, 'settled');
  console.log('swap paid!', preImageHash);
  // cool, paid, now let's claim the reward by settling the contract...
  const { preImage } = await read(preImageHash);
  await contractTx({
    contract,
    method: 'completeSwap',
    args: [`0x${preImageHash}`, `0x${preImage}`],
    onPublished: settleTx => upsert(preImageHash, { settleTx }),
    onMined: settleMined => upsert(preImageHash, { settleMined }),
  });
  console.log('swap settled!', preImageHash);
}

// handles new requests
export async function createSwap({ contract, customer, amount }) {
  // console.log('creating swap...', { contract, customer, amount });
  // TODO check if alice is blacklisted
  // TODO see if we can create the swap right now (EVM call, throw the error)
  // TODO set a relavant memo
  const { paymentRequest: paymentInvoice, preImageHash } = await generateInvoice({ value: amount });
  const responseData = { paymentInvoice };
  const storedData = { contract, customer, amount, paymentInvoice, preImageHash };
  // TODO logic to skip the deposit if alice has already deposited
  const skipDeposit = false;
  if (!skipDeposit) {
    const depositInvoice = await generateInvoice({ value: depositFee });
    storedData.depositPreImageHash = depositInvoice.preImageHash;
    responseData.depositInvoice = depositInvoice.paymentRequest;
  }
  // TODO add some other metadata (timestamp)
  await upsert(preImageHash, storedData);
  // in the backgorund, we'll listen for updates to this swap and handle payment events
  handlePayments(preImageHash);
  // returned to client
  return responseData;
}

// gets called multiple times at various different points
export async function getSwapStatus({ preImageHash }) {
  // deposit not paid, await payment and return creationTx...
  const { creationTx, settleTx } = await read(preImageHash);
  if (!creationTx) {
    console.log('returning creationTx');
    return { creationTx: (await waitFor(preImageHash, 'creationTx')).creationTx };
  }
  // main invoice not paid, await payment and return settleTx...
  if (!settleTx) {
    console.log('returning settleTx');
    return { settleTx: (await waitFor(preImageHash, 'settleTx')).settleTx };
  }
  // settleTx is created already; return immediately, we are done.
  return { settleTx };
}
