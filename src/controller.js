import Web3 from 'web3';

import { version } from '../package.json';
import { createInvoice } from './lnd';
import { contractTx, signMessage } from './evm';
import { upsert, read, waitFor } from './store';
import {
  name,
  text,
  timeLockBlocks,
  rewardWei,
  minAmountSatoshis,
  depositFeeSatoshis,
  exchangeRate,
  supercavitationWei,
} from './config';

const { utils: { toBN } } = Web3;

// PRIVATE
async function createSignedPayload(json) {
  const data = JSON.stringify(json);
  const { signature, message, address } = await signMessage(data);
  return { data, signature, message, address };
}

// talks to LND, creates a new invoice
async function generateInvoice({ value, memo }) {
  const { r_hash: preImageHashBuffer, payment_request: paymentRequest } = await createInvoice({ value, memo });
  const preImageHash = preImageHashBuffer.toString('hex');
  // TODO perhaps do some validation to ensure the client will get the same preImageHash out, using the js lib
  return { paymentRequest, preImageHash };
}

// runs in the background when a swap is created, listens for payments and initiates transactions
async function handlePayments(preImageHash) {
  const swap = await read(preImageHash);
  if (swap.depositPreImageHash) {
    // wait for the deposit to be settled if it's set before sending the tx...
    await waitFor(swap.depositPreImageHash, 'settled');
  }
  // publish the swap, it resolves when mined
  await contractTx({
    contract: swap.contract,
    method: 'createSwap',
    args: [swap.customer, swap.amountAfterFeesWei, swap.rewardWei, `0x${preImageHash}`, swap.timeLockBlocks, swap.supercavitationWei],
    onPublished: creationTx => upsert(preImageHash, { creationTx }),
    onMined: creationMined => upsert(preImageHash, { creationMined }),
  });
  // now it's mined, we can listen for the invoice to be paid
  await waitFor(preImageHash, 'settled');
  // cool, paid, now let's claim the rewardWei by settling the contract...
  const { preImage } = await read(preImageHash);
  await contractTx({
    contract: swap.contract,
    method: 'completeSwap',
    args: [`0x${preImageHash}`, `0x${preImage}`],
    onPublished: settleTx => upsert(preImageHash, { settleTx }),
    onMined: settleMined => upsert(preImageHash, { settleMined }),
  });
}

// EXPORTS

export async function createSwap({ contract, customer, amount: requestedAmountInSatoshis }) {
  // TODO check if alice is blacklisted
  // TODO actual logic to skip the deposit if alice has already deposited
  const skipDeposit = !depositFeeSatoshis; // for now, skip if the config sets deposit fee to 0 (TODO test this)
  // calcualte depositfee
  const depositFee = skipDeposit ? 0 : depositFeeSatoshis;

  // calcualte the fees
  const amountOfferedInWei = toBN(requestedAmountInSatoshis).mul(toBN(exchangeRate));
  const depositFeeInWei = toBN(depositFee).pow(toBN(10));
  const amountAfterFeesWei = amountOfferedInWei.sub(toBN(rewardWei)).sub(toBN(supercavitationWei)).sub(depositFeeInWei);

  // handle the deposit invoice, if required
  const depositData = {};
  if (!skipDeposit) {
    const memo = `Deposit to ${name} for creation of swap for ${requestedAmountInSatoshis} satoshis`;
    const { preImageHash, paymentRequest } = await generateInvoice({ memo, value: depositFee.toString() });
    depositData.depositPreImageHash = preImageHash;
    depositData.depositInvoice = paymentRequest;
  }

  // create the main invoice
  const memo = `Payment to ${name} for settlemnt of swap for ${requestedAmountInSatoshis} satoshis`;
  const { paymentRequest: paymentInvoice, preImageHash } = await generateInvoice({ memo, value: requestedAmountInSatoshis });

  // swap data to be sent to client and saved in storage
  const swap = {
    ...depositData,
    skipDeposit,
    paymentInvoice,
    preImageHash,
    depositFee,
    contract,
    customer,
    exchangeRate,
    timeLockBlocks,
    requestedAmountInSatoshis,
    supercavitationWei,
    rewardWei,
    amountAfterFeesWei: amountAfterFeesWei.toString(),
    amountOfferedInWei: amountOfferedInWei.toString(),
    depositFeeInWei: depositFeeInWei.toString(),
    requestedAt: new Date().toUTCString(),
  };

  // save to storage
  await upsert(preImageHash, swap);
  // in the backgorund, we'll listen for updates to this swap and handle payment events
  handlePayments(preImageHash);
  // send data to client
  return createSignedPayload(swap);
}

// gets called multiple times at various different points, returns when state udpates
export async function awaitSwapStatus({ preImageHash, existing }) {
  // read the swap data
  const swap = await read(preImageHash);
  if (!swap) { throw new Error('Swap does not exist'); }
  // if the client passess `existing` flag, we return the full swap
  if (existing) {
    return swap;
  }
  // deposit not paid, await payment and return creationTx...
  if (!swap.creationTx) {
    return { creationTx: (await waitFor(preImageHash, 'creationTx')).creationTx };
  }
  // main invoice not paid, await payment and return settleTx...
  if (!swap.settleTx) {
    return { settleTx: (await waitFor(preImageHash, 'settleTx')).settleTx };
  }
  // settleTx is created already; return immediately, we are done.
  return { settleTx: swap.settleTx };
}

export async function getSwapStatus(args) {
  return createSignedPayload(await awaitSwapStatus(args));
}

// sends some info to client about the swap (non-binding advertisement)
export async function getSwapConfig() {
  // TODO this could by dynamic, based on alice's reptuation
  return createSignedPayload({
    text,
    name,
    timeLockBlocks,
    rewardWei,
    minAmountSatoshis,
    depositFeeSatoshis,
    exchangeRate,
    version,
    supercavitationWei,
  });
}
