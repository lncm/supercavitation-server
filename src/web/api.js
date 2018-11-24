import { Router } from 'express';
// import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';

import { version } from '../../package.json';

import { getInvoice } from '../lnd/index';

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

  api.get('/invoice', async (req, res) => {
    // REST endpoint accepts full amount in satoshis and RSK address
    // Respond with LN invoice for small gas amount and
    // respond with RSK signature
    // e.g.:
    // localhost:8080/api/invoice?amount=1234&address=1234
    if (validAmount(req.query.amount)) {
      res.json(
        // verify amount is valid amount and exists
        // keep RSK address (req.query.address) for validation
        await getInvoice(req.query.amount),
      );
    } else {
      res.json({
        error: 'Not a valid amount of Satoshis',
      });
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
