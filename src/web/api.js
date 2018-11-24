import { Router } from 'express';
import { version } from '../../package.json';

import { getInvoice } from '../lnd/index';

export default () => {
  const api = Router();

  api.get('/', (req, res) => {
    res.json({ version });
  });

  api.get('/hello', (req, res) => {
    res.json({ text: 'Hello World' });
  });

  api.get('/invoice', async (req, res) => {
    // REST endpoint accepts full amount and RSK address
    // Respond with LN invoice for small gas amount and
    // respond with RSK signature
    // e.g.:
    // localhost:8080/api/invoice?amount=1234&address=1234

    res.json(
      // verify amount is valid amount and exists
      // keep RSK address (req.query.address) for validation
      await getInvoice(req.query.amount),
    );
  });

  api.get('/info', (req, res) => {
    res.json({
      text: "Hello, I'm Bob. I would never scam you. Trust me ;).",
      minAmount: 1000,
      timeLockNumber: 30,
      exchangeRate: 0.98,
      reward: 10000,
    });
  });

  return api;
};
