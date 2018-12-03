import Web3 from 'web3';

import { version } from '../package.json';
import { text, timeLockBlocks, rewardWei, minAmountSatoshis, depositFeeSatoshis, exchangeRate, supercavitationWei } from '../config.json';
import { createInvoice } from './lnd';
import { contractTx } from './evm';
import { upsert, read, waitFor } from './store';

// PRIVATE

// talks to LND, creates a new invoice
async function generateInvoice({ value }) {
  const { r_hash: preImageHashBuffer, payment_request: paymentRequest } = await createInvoice({ value });
  const preImageHash = preImageHashBuffer.toString('hex');
  // TODO perhaps do some validation to ensure the client will get the same preImageHash out, using the js lib
  return { paymentRequest, preImageHash };
}

async function handlePayments(preImageHash) {
  const { depositPreImageHash, contract, customer, amount } = await read(preImageHash);
  if (depositPreImageHash) {
    // wait for the deposit to be settled if it's set before sending the tx...
    await waitFor(depositPreImageHash, 'settled');
  }
  // publish the swap, it resolves when mined
  await contractTx({
    contract,
    method: 'createSwap',
    args: [customer, amount, rewardWei, `0x${preImageHash}`, timeLockBlocks],
    onPublished: creationTx => upsert(preImageHash, { creationTx }),
    onMined: creationMined => upsert(preImageHash, { creationMined }),
  });
  // now it's mined, we can listen for the invoice to be paid
  await waitFor(preImageHash, 'settled');
  // cool, paid, now let's claim the rewardWei by settling the contract...
  const { preImage } = await read(preImageHash);
  await contractTx({
    contract,
    method: 'completeSwap',
    args: [`0x${preImageHash}`, `0x${preImage}`],
    onPublished: settleTx => upsert(preImageHash, { settleTx }),
    onMined: settleMined => upsert(preImageHash, { settleMined }),
  });
}

// EXPORTS

export function getSwapConfig() {
  // TODO this could by dynamic, based on alice's reptuation
  return {
    text,
    timeLockBlocks,
    rewardWei,
    minAmountSatoshis,
    depositFeeSatoshis,
    exchangeRate,
    version,
    supercavitationWei,
  };
}

export async function createSwap({ contract, customer, amount: requestedAmountInSatoshis }) {
  // TODO check if alice is blacklisted
  let actualDepositFee = depositFeeSatoshis;
  const amountOfferedInWei = Web3.utils.toBN(requestedAmountInSatoshis).mul(exchangeRate);
  // TODO see if we can create the swap right now (EVM call, throw the error)
  // TODO relavant memos

  // TODO logic to skip the deposit if alice has already deposited
  const skipDeposit = !depositFeeSatoshis; // for now, skip if the config sets deposit fee to 0
  let depositData = {};
  if (!skipDeposit) {
    const { preImageHash: depositPreImageHash, paymentRequest: depositInvoice } = await generateInvoice({ value: actualDepositFee.toString() });
    depositData = { depositPreImageHash, depositInvoice };
  } else {
    actualDepositFee = 0;
  }
  // calcualte the fees
  const depositFeeInWei = Web3.utils.toBN(actualDepositFee).pow(10);
  const amountAfterFeesWei = amountOfferedInWei.sub(rewardWei).sub(supercavitationWei).sub(depositFeeInWei);
  // this is the cost of fees exlcuding exchange rate
  const totalFixedCostsWei = amountOfferedInWei.sub(amountAfterFeesWei);
  // create the actual swap
  const { paymentRequest: paymentInvoice, preImageHash } = await generateInvoice({ value: amountAfterFeesWei });
  // construct swap data
  const swapData = {
    ...depositData,
    depositFee: actualDepositFee,
    skipDeposit,
    paymentInvoice,
    preImageHash,
    contract,
    customer,
    exchangeRate,
    requestedAmountInSatoshis,
    supercavitationWei,
    amountOfferedInWei: amountOfferedInWei.toString(),
    amountAfterFeesWei: amountAfterFeesWei.toString(),
    depositFeeInWei: depositFeeInWei.toString(),
    totalFixedCostsWei: totalFixedCostsWei.toString(),
    requestedAt: new Date().toUTCString(),
  };
  // TODO add some other metadata (timestamp?)
  await upsert(preImageHash, swapData);
  // in the backgorund, we'll listen for updates to this swap and handle payment events
  handlePayments(preImageHash);
  // returned to client
  return swapData;
}

// gets called multiple times at various different points
export async function getSwapStatus({ preImageHash }) {
  // deposit not paid, await payment and return creationTx...
  const { creationTx, settleTx } = await read(preImageHash);
  if (!creationTx) {
    return { creationTx: (await waitFor(preImageHash, 'creationTx')).creationTx };
  }
  // main invoice not paid, await payment and return settleTx...
  if (!settleTx) {
    return { settleTx: (await waitFor(preImageHash, 'settleTx')).settleTx };
  }
  // settleTx is created already; return immediately, we are done.
  return { settleTx };
}
