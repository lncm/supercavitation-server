import { Router } from 'express';
import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';
import { version } from '../../package.json';
import { store, getBySmallHash } from '../store/main';
import { getInvoice, invoiceStatus } from '../lnd/index';
import { listenInvoices, invoicePreImage } from '../lnd/grpc';
import { signMessage, createSwap, claimReward } from '../evm';

import {
  text,
  timeLockNumber,
  reward,
  minAmount,
  depositFee,
  exchangeRate,
} from '../../config.json';

function validAmount(amount) {
  // Validate amount of Satoshis
  // Amount must be greater than 0
  // Amount must be valid integer
  // Amount must not be more than 2.1^14
  // const { BN } = BigNumber;

  const bNum = new BigNumber(amount);

  // const amountBN = Web3.utils.toBN(amount);
  return !!(bNum.isInteger() && bNum >= 0 && bNum < 2.1 * 1e14);
}

// convert sat to BTC; trim to 8 decimal places; remove trailing zeros
function satToBtc(amt) {
  return parseFloat((amt / 1e8).toFixed(8))
    .toString();
}

export default () => {
  const api = Router();

  api.get('/', (req, res) => {
    res.json({ version });
  });

  api.get('/info', (req, res) => {
    res.json({
      text,
      timeLockNumber,
      reward,
      minAmount,
      depositFee,
      exchangeRate,
    });
  });

  // TODO skip this step if user has already deposited...
  api.get('/smallInvoice', async (req, res) => {
    // REST endpoint accepts full amount in satoshis and RSK address
    // Respond with LN invoice for small gas amount and
    // respond with RSK signature
    // e.g.:
    // localhost:8080/api/invoice?amount=1234&address=1234
    if (validAmount(req.query.amount)) {
      if (!Web3.utils.isAddress(req.query.address)) {
        res.json({ error: 'Invalid RSK address' });
        return;
      }

      const btcAmt = satToBtc(req.query.amount);

      const smallInvoice = await getInvoice(`Deposit for ${btcAmt} BTC`);

      store({
        rskAddress: req.query.address,
        amount: req.query.amount,
        smallHash: smallInvoice.hash,
        fullHash: undefined,
      });

      const signature = await signMessage(smallInvoice);
      res.json({
        msg: smallInvoice,
        signature,
      });

      return;
    }

    res.json({
      error: 'Not a valid amount of Satoshis',
    });
  });

  api.post('/fullInvoice', async (req, res) => {
    req.setTimeout(0);

    const { smallHash } = req.body;
    const hashBytes = Buffer.from(smallHash, 'base64');

    if (hashBytes.length !== 32) {
      res.json({ error: 'Invalid payment hash' });
      return;
    }

    const paid = await invoiceStatus(smallHash);

    if (!paid) {
      await new Promise((resolve) => {
        listenInvoices(smallHash, () => {
          resolve();
        });
      });
    }

    const order = getBySmallHash(smallHash);

    const btcAmt = satToBtc(order.amount);

    order.fullInvoice = await getInvoice(`Full payment of ${btcAmt} BTC`, order.amount);

    const txid = await createSwap(order.rskAddress, order.amount, `0x${hashBytes.toString('hex')}`);

    res.json({
      msg: order.fullInvoice,
      txid,
    });
  });

  api.post('/checkPayment', async (req, res) => {
    req.setTimeout(0);

    const { fullHash } = req.body;
    const hashBytes = Buffer.from(fullHash, 'base64');

    if (hashBytes.length !== 32) {
      res.json({ error: 'Invalid payment hash' });
      return;
    }

    const paid = await invoiceStatus(fullHash);

    if (!paid) {
      await new Promise((resolve) => {
        listenInvoices(fullHash, () => {
          resolve();
        });
      });
    }

    // if it's paid, claim the reward!

    const preImage = `0x${(await invoicePreImage(fullHash)).toString('hex')}`;
    const preImageHash = `0x${hashBytes.toString('hex')}`;
    console.log({ preImage, preImageHash });
    const response = await claimReward(preImageHash, preImage);
    res.json(response);
  });

  return api;
};
