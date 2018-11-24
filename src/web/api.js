import { Router } from 'express';
import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';
import { version } from '../../package.json';
import { store, getBySmallHash } from '../store/main';
import { getInvoice, invoiceStatus } from '../lnd/index';
import { listenInvoices, invoicePreImage } from '../lnd/grpc';
import { signMessage, createSwap, claimReward } from '../evm';

import { text, minAmount, timeLockNumber, depositFee, exchangeRate, reward } from '../../config.json';

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

export default () => {
  const api = Router();

  api.get('/', (req, res) => {
    res.json({ version });
  });

  api.get('/info', (req, res) => {
    res.json({ text, minAmount, timeLockNumber, depositFee, exchangeRate, reward });
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

      const smallInvoice = await getInvoice();

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

    order.fullInvoice = await getInvoice(order.amount);

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
    
    const preImage = `0x${(await invoicePreImage(fullHash))}`.toString('hex');
    const response = await claimReward(`0x${hashBytes.toString('hex')}`, preImage);
    res.json(response);
  });

  return api;
};
