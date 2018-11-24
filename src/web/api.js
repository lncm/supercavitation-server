import { Router } from 'express';
import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';
import { version } from '../../package.json';
import { store, getBySmallHash } from '../store/main';
import { getInvoice, invoiceStatus } from '../lnd/index';
import { listenInvoices } from '../lnd/grpc';

import { signMessage } from '../evm';

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


  api.get('/smallInvoice', async (req, res) => {
    // REST endpoint accepts full amount in satoshis and RSK address
    // Respond with LN invoice for small gas amount and
    // respond with RSK signature
    // e.g.:
    // localhost:8080/api/invoice?amount=1234&address=1234
    if (validAmount(req.query.amount)) {
      if (!Web3.utils.isAddress(req.query.address)) {
        res.json({ error: 'Invalid RSK address' });
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
        data: smallInvoice,
        signature,
      });

      return;
    }

    res.json({
      error: 'Not a valid amount of Satoshis',
    });
  });

  api.get('/fullInvoice', async (req, res) => {
    req.setTimeout(0);

    if (req.query.smallHash.length !== 32) {
      res.json({ error: 'Invalid payment hash' });
      return;
    }

    const paid = invoiceStatus(req.query.smallHash);

    if (!paid) {
      // TODO: spawn a SubscribeInvoices
      // TODO: listen for small invoice payment
      await new Promise((resolve) => {
        listenInvoices(req.query.smallHash, () => {
          resolve();
        });
      });

      const order = getBySmallHash(req.query.smallHash);

      // TODO: verify that the small invoice was paid
      // TODO: pay Alice, get txid and send it to her

      order.fullInvoice = await getInvoice(order.amount);

      res.json(order.fullInvoice);
    }
  });

  api.get('/info', (req, res) => {
    res.json({
      text: 'Hello, I\'m Bob. I would never scam you. Trust me ;).',
      minAmount: 1000,
      timeLockNumber: 30,
      exchangeRate: 0.98,
      reward: 10000,
    });
  });

  return api;
};
